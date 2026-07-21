import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { planContentBatches } from "./batching";
import { generatePipelineContent, isSupportedGenerationType } from "./generator";
import { persistGeneratedDraft } from "./persistence";
import { contentHash, inspectGeneratedContent } from "./quality";
import { assessContentWithAI, repairGeneratedContent, type AIQualityAssessment } from "./quality-ai";
import { evaluatePersistedContent } from "./quality-service";

export async function prepareContentJob(jobId:string,batchSize=20){
  const job=await db.contentGenerationJob.findUnique({where:{id:jobId},include:{_count:{select:{items:true}}}});if(!job)throw new Error("CONTENT_JOB_NOT_FOUND");if(job._count.items>0)return job;
  const batches=planContentBatches(job.totalItems,batchSize);
  await db.$transaction(async tx=>{for(const batch of batches){const row=await tx.contentGenerationBatch.create({data:{jobId,sequence:batch.sequence,totalItems:batch.count}});await tx.contentGenerationItem.createMany({data:Array.from({length:batch.count},(_,offset)=>({jobId,batchId:row.id,sequence:batch.start+offset+1,contentType:job.type,input:{...(job.configuration&&typeof job.configuration==="object"?job.configuration as object:{}),sequence:batch.start+offset+1}}))})}});
  return db.contentGenerationJob.findUniqueOrThrow({where:{id:jobId}});
}

export async function claimNextItem(jobId:string){
  for(let attempt=0;attempt<5;attempt++){
    const item=await db.contentGenerationItem.findFirst({where:{jobId,status:"PENDING"},orderBy:{sequence:"asc"}});if(!item)return null;
    const claimed=await db.contentGenerationItem.updateMany({where:{id:item.id,status:"PENDING"},data:{status:"PROCESSING",startedAt:new Date()}});if(claimed.count===1)return{...item,status:"PROCESSING" as const};
  }return null;
}

export async function processNextContentItem(jobId:string){
  const job=await db.contentGenerationJob.findUnique({where:{id:jobId}});if(!job)throw new Error("CONTENT_JOB_NOT_FOUND");if(job.status!=="PROCESSING")return{processed:false,reason:"JOB_NOT_PROCESSING"};if(!isSupportedGenerationType(job.type))throw new Error(`UNSUPPORTED_GENERATION_JOB:${job.type}`);
  const item=await claimNextItem(jobId);if(!item){await finalizeJob(jobId);return{processed:false,reason:"NO_PENDING_ITEMS"}};
  try{
    const input=item.input&&typeof item.input==="object"&&!Array.isArray(item.input)?item.input as Record<string,unknown>:{};
    let output:unknown=await generatePipelineContent(job.type,{level:typeof input.level==="string"?input.level:undefined,topic:typeof input.topic==="string"?input.topic:undefined,audience:typeof input.audience==="string"?input.audience:undefined,seed:item.id,sequence:item.sequence},job.createdByUserId??undefined,job.maxTokens??undefined,job.aiModelId??undefined);
    let inspection=inspectGeneratedContent(job.type,output);let repairAttempted=false;let assessment:AIQualityAssessment|null=null;let aiError:string|null=null;
    if(inspection.errors.length){repairAttempted=true;try{output=await repairGeneratedContent(job.type,output,inspection.errors,job.createdByUserId??undefined,job.aiModelId??undefined);inspection=inspectGeneratedContent(job.type,output)}catch{/* Keep the valid structured draft for manual review. */}}
    try{assessment=await assessContentWithAI(job.type,output,job.createdByUserId??undefined,job.aiModelId??undefined)}catch(error){aiError=error instanceof Error?error.message:"AI_QUALITY_FAILED"}
    const aiFailed=assessment?assessment.qualityScore<75||!assessment.safe||!assessment.grammarCorrect||!assessment.translationAccurate||!assessment.uniqueAnswers:false;
    const aiIssues=assessment&&aiFailed?[...assessment.issues,...(!assessment.safe?["AI_UNSAFE"]:[]),...(!assessment.grammarCorrect?["AI_GRAMMAR_ERROR"]:[]),...(!assessment.translationAccurate?["AI_TRANSLATION_ERROR"]:[]),...(!assessment.uniqueAnswers?["AI_AMBIGUOUS_ANSWER"]:[])]:[];
    if(aiIssues.length&&!repairAttempted){repairAttempted=true;try{output=await repairGeneratedContent(job.type,output,aiIssues,job.createdByUserId??undefined,job.aiModelId??undefined);inspection=inspectGeneratedContent(job.type,output);assessment=await assessContentWithAI(job.type,output,job.createdByUserId??undefined,job.aiModelId??undefined);aiError=null}catch{/* Preserve the draft and original AI findings for review. */}}
    const content=await persistGeneratedDraft(job.type,output,jobId);
    const quality=await evaluatePersistedContent({type:job.type,output,reference:content,jobId,itemId:item.id,actorUserId:job.createdByUserId??undefined,preferredModelId:job.aiModelId??undefined,inspection,repairAttempted,assessment,aiError});
    await db.$transaction(async tx=>{await tx.contentGenerationItem.update({where:{id:item.id},data:{status:quality.passed?"DRAFT":"REVIEW_REQUIRED",output:output as Prisma.InputJsonValue,contentType:content.contentType,contentId:content.contentId,normalizedHash:inspection.normalizedHash,originalHash:contentHash(JSON.stringify(output)),finishedAt:new Date()}});await tx.contentGenerationJob.update({where:{id:jobId},data:{completedItems:{increment:1},currentProgress:((job.completedItems+job.failedItems+1)/job.totalItems)*100}});if(item.batchId)await tx.contentGenerationBatch.update({where:{id:item.batchId},data:{completedItems:{increment:1}}})});
    await finalizeBatch(item.batchId);await finalizeJob(jobId);return{processed:true,itemId:item.id,...content};
  }catch(error){await recordFailure(item.id,item.batchId,job,error);await finalizeBatch(item.batchId);await finalizeJob(jobId);return{processed:true,itemId:item.id,error:error instanceof Error?error.message:"GENERATION_FAILED"}}
}

async function recordFailure(itemId:string,batchId:string|null,job:Awaited<ReturnType<typeof db.contentGenerationJob.findUniqueOrThrow>>,error:unknown){const message=error instanceof Error?error.message:"GENERATION_FAILED";const item=await db.contentGenerationItem.findUniqueOrThrow({where:{id:itemId}});const retry=item.retryCount<job.maxRetries;await db.$transaction(async tx=>{await tx.contentGenerationItem.update({where:{id:itemId},data:{status:retry?"PENDING":"FAILED",retryCount:{increment:1},errorCode:message.split(":",1)[0],errorMessage:message.slice(0,2000),finishedAt:retry?null:new Date()}});if(!retry){await tx.contentGenerationJob.update({where:{id:job.id},data:{failedItems:{increment:1}}});if(batchId)await tx.contentGenerationBatch.update({where:{id:batchId},data:{failedItems:{increment:1}}})}})}
async function finalizeBatch(batchId:string|null){if(!batchId)return;const batch=await db.contentGenerationBatch.findUnique({where:{id:batchId}});if(batch&&batch.completedItems+batch.failedItems>=batch.totalItems){const reviews=await db.contentGenerationItem.count({where:{batchId,status:"REVIEW_REQUIRED"}});await db.contentGenerationBatch.update({where:{id:batchId},data:{status:batch.failedItems>0||reviews>0?"REVIEW_REQUIRED":"DRAFT",finishedAt:new Date()}})}}
async function finalizeJob(jobId:string){const job=await db.contentGenerationJob.findUnique({where:{id:jobId}});if(job&&job.completedItems+job.failedItems>=job.totalItems){const reviews=await db.contentGenerationItem.count({where:{jobId,status:"REVIEW_REQUIRED"}});await db.contentGenerationJob.update({where:{id:jobId},data:{status:job.failedItems>0||reviews>0?"REVIEW_REQUIRED":"DRAFT",currentProgress:100,finishedAt:new Date()}})}}

export async function runContentJobs(maxItems=20){let processed=0;while(processed<maxItems){const job=await db.contentGenerationJob.findFirst({where:{status:"PROCESSING",type:{in:["VOCABULARY_GENERATION","READING_GENERATION","GRAMMAR_GENERATION","SCENARIO_GENERATION"]}},orderBy:[{priority:"asc"},{createdAt:"asc"}]});if(!job)break;await prepareContentJob(job.id);const result=await processNextContentItem(job.id);if(!result.processed)break;processed++}return processed}

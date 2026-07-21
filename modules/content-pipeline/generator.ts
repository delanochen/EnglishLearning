import type { AIUsagePurpose, ContentGenerationJobType } from "@prisma/client";
import { routedStructured } from "@/modules/ai/gateway";
import { pipelineGrammarSchema, pipelineReadingSchema, pipelineScenarioSchema, pipelineVocabularySchema } from "./generation-schemas";
import { generationMessages, type GenerationContext } from "./prompts";

const contracts={
  VOCABULARY_GENERATION:{purpose:"VOCABULARY",schema:pipelineVocabularySchema,name:"PipelineVocabulary"},
  READING_GENERATION:{purpose:"READING",schema:pipelineReadingSchema,name:"PipelineReading"},
  GRAMMAR_GENERATION:{purpose:"GRAMMAR",schema:pipelineGrammarSchema,name:"PipelineGrammar"},
  SCENARIO_GENERATION:{purpose:"SCENARIO",schema:pipelineScenarioSchema,name:"PipelineScenario"},
} as const;

export type SupportedGenerationType=keyof typeof contracts;
export function isSupportedGenerationType(type:ContentGenerationJobType):type is SupportedGenerationType{return type in contracts}

export async function generatePipelineContent(type:SupportedGenerationType,context:GenerationContext,actorUserId?:string,maxTokens?:number,preferredModelId?:string){
  const request={schemaInstructions:JSON.stringify(schemaExample[type]),messages:generationMessages(type,context),temperature:.65,maxTokens:maxTokens??5000};
  switch(type){
    case "VOCABULARY_GENERATION":return routedStructured("VOCABULARY" satisfies AIUsagePurpose,{...request,schema:pipelineVocabularySchema,schemaName:contracts[type].name},actorUserId,preferredModelId);
    case "READING_GENERATION":return routedStructured("READING" satisfies AIUsagePurpose,{...request,schema:pipelineReadingSchema,schemaName:contracts[type].name},actorUserId,preferredModelId);
    case "GRAMMAR_GENERATION":return routedStructured("GRAMMAR" satisfies AIUsagePurpose,{...request,schema:pipelineGrammarSchema,schemaName:contracts[type].name},actorUserId,preferredModelId);
    case "SCENARIO_GENERATION":return routedStructured("SCENARIO" satisfies AIUsagePurpose,{...request,schema:pipelineScenarioSchema,schemaName:contracts[type].name},actorUserId,preferredModelId);
  }
}

const schemaExample:Record<SupportedGenerationType,unknown>={
  VOCABULARY_GENERATION:{word:"string",phonetic:"string",partOfSpeech:"string",definitionEn:"string",definitionZh:"string",level:"A1",topic:"string",collocations:["string"],synonyms:[],antonyms:[],examples:[{sentence:"string",translation:"string"},{sentence:"string",translation:"string"}],pronunciationText:"string",exercises:[{prompt:"string",options:["A","B","C"],answerKey:"A",explanation:"string"}]},
  READING_GENERATION:{title:"string",body:"100+ chars",translation:"string",level:"A1",audience:"string",topic:"string",targetVocabulary:[],targetGrammar:[],summary:"string",questions:[{type:"MULTIPLE_CHOICE",prompt:"string",options:["A","B"],answerKey:"A",explanation:"string"}],oralRetellingPrompt:"string",writingExtensionPrompt:"string"},
  GRAMMAR_GENERATION:{slug:"lowercase-hyphen",title:"string",ruleEn:"string",ruleZh:"string",level:"A1",commonErrors:[],useCases:[],contrastExamples:[{correct:"string",incorrect:"string",note:"string"}],examples:[{sentence:"string",translation:"string",isError:false,explanation:"string"}],exercises:[{type:"MULTIPLE_CHOICE",prompt:"string",options:["A","B"],answerKey:"A",explanation:"string"}]},
  SCENARIO_GENERATION:{category:"string",title:"string",intro:"string",level:"A2",cultureTips:["string"],misunderstandings:["string"],naturalExpressions:["string"],dialogues:[{speaker:"Customer",roleName:"顾客",textEn:"string",textZh:"string",cameraCue:"string"}],exercises:[{type:"MULTIPLE_CHOICE",prompt:"string",options:["A","B"],answerKey:"A",explanation:"string"}],listeningScript:"string",rolePlayPrompt:"string",vocabulary:[{word:"string",meaningZh:"string",example:"string"}]},
};

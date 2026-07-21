import { Prisma, type ContentGenerationJobType } from "@prisma/client";
import { db } from "@/lib/db";
import { contentJobQueue } from "./bullmq";
import { transitionContentJob } from "./jobs";

type PlanDefinition = { key: string; type: ContentGenerationJobType; target: number; configuration: Prisma.InputJsonObject };

const grammarTopics = ["be verbs", "simple present", "present continuous", "simple past", "simple future", "countable and uncountable nouns", "articles", "pronouns", "prepositions", "comparatives", "superlatives", "modal verbs", "present perfect", "passive voice", "relative clauses", "conditionals", "reported speech", "high-school complex sentences"];
const scenarioTopics = ["restaurant", "supermarket", "Costco", "Walmart", "bank", "hospital", "school", "DMV", "gas station", "airport", "hotel", "auto repair", "job search", "job interview", "warehouse", "office", "home rental", "phone call", "return", "complaint", "delivery", "Uber", "parent-teacher communication"];

export const initializationDefinitions: PlanDefinition[] = [
  ...([ ["PRE_A1",300], ["A1",800], ["A2",1200], ["B1",1500], ["B2",1500] ] as const).map(([level,target])=>({key:`vocabulary-${level}`,type:"VOCABULARY_GENERATION" as const,target,configuration:{level,topic:"general high-frequency English",initialization:true,initializationKey:`vocabulary-${level}`}})),
  {key:"vocabulary-high-school-academic",type:"VOCABULARY_GENERATION",target:1000,configuration:{level:"C1",topic:"high-school academic vocabulary",audience:"high-school",curriculumBand:"HIGH_SCHOOL_ACADEMIC",initialization:true,initializationKey:"vocabulary-high-school-academic"}},
  ...([ ["PRE_A1",30], ["A1",50], ["A2",50], ["B1",50], ["B2",40] ] as const).map(([level,target])=>({key:`reading-${level}`,type:"READING_GENERATION" as const,target,configuration:{level,topic:"varied daily life and learning",audience:"family learner",initialization:true,initializationKey:`reading-${level}`}})),
  {key:"reading-high-school",type:"READING_GENERATION",target:50,configuration:{level:"B2",topic:"high-school academic and practical topics",audience:"high-school",initialization:true,initializationKey:"reading-high-school"}},
  {key:"reading-us-life",type:"READING_GENERATION",target:50,configuration:{level:"A2",topic:"American daily life",audience:"newcomer to the United States",initialization:true,initializationKey:"reading-us-life",itemSpecs:scenarioTopics.map(topic=>({topic:`American life: ${topic}`}))}},
  {key:"grammar-core",type:"GRAMMAR_GENERATION",target:grammarTopics.length,configuration:{level:"A2",audience:"family learners",initialization:true,initializationKey:"grammar-core",itemSpecs:grammarTopics.map((topic,index)=>({topic,level:index<5?"A1":index<13?"A2":index<17?"B1":"B2"}))}},
  {key:"scenario-us-life",type:"SCENARIO_GENERATION",target:scenarioTopics.length,configuration:{level:"A2",audience:"family members living in the United States",initialization:true,initializationKey:"scenario-us-life",itemSpecs:scenarioTopics.map(topic=>({topic}))}},
];

async function currentCount(definition: PlanDefinition) {
  const level = typeof definition.configuration.level === "string" ? definition.configuration.level as "PRE_A1"|"A1"|"A2"|"B1"|"B2"|"C1"|"C2" : undefined;
  if (definition.type === "VOCABULARY_GENERATION") return db.vocabulary.count({ where: definition.key.includes("academic") ? { level: "C1", topic: { contains: "academic", mode: "insensitive" } } : { level } });
  if (definition.type === "READING_GENERATION") return db.readingArticle.count({ where: definition.key.includes("high-school") ? { audience: { contains: "high-school", mode: "insensitive" } } : definition.key.includes("us-life") ? { topic: { contains: "American", mode: "insensitive" } } : { level } });
  if (definition.type === "GRAMMAR_GENERATION") return db.grammarTopic.count({ where: { title: { in: grammarTopics, mode: "insensitive" } } });
  return db.scenarioLesson.count({ where: { title: { in: scenarioTopics, mode: "insensitive" } } });
}

export async function ensureInitializationPlan(options: { onlyWhenEmpty?: boolean; actorUserId?: string } = {}) {
  if (options.onlyWhenEmpty) {
    const counts = await Promise.all([db.vocabulary.count(),db.readingArticle.count(),db.grammarTopic.count(),db.scenarioLesson.count()]);
    if (counts.some(Boolean)) return { created: 0, skipped: "CONTENT_LIBRARY_NOT_EMPTY", jobs: [] };
  }
  const jobs = []; let created = 0;
  for (const definition of initializationDefinitions) {
    const existing = await db.contentGenerationJob.findFirst({ where: { configuration: { path: ["initializationKey"], equals: definition.key } }, orderBy: { createdAt: "desc" } });
    if (existing && !["FAILED","CANCELED","ARCHIVED"].includes(existing.status)) { jobs.push(existing); continue; }
    const count = await currentCount(definition); const missing = Math.max(0, definition.target-count); if (!missing) continue;
    const job = await db.contentGenerationJob.create({ data: { type: definition.type, totalItems: missing, priority: 500, maxRetries: 1, createdByUserId: options.actorUserId, configuration: { ...definition.configuration, target: definition.target, existingCount: count }, logs: [{at:new Date().toISOString(),event:"INITIALIZATION_JOB_PLANNED",target:definition.target,existing:count}] } });
    jobs.push(job); created++;
  }
  return { created, skipped: null, jobs };
}

export async function startInitializationJobs(actorUserId: string) {
  const jobs = await db.contentGenerationJob.findMany({ where: { status: "PENDING", configuration: { path: ["initialization"], equals: true } }, orderBy: { createdAt: "asc" } });
  for (const current of jobs) { const job=await transitionContentJob(current.id,"PROCESSING",actorUserId,"INITIALIZATION_JOB_STARTED");await contentJobQueue().enqueue({jobId:job.id,priority:job.priority}); }
  return jobs.length;
}

export async function initializationStatus() {
  const jobs = await db.contentGenerationJob.findMany({ where: { configuration: { path: ["initialization"], equals: true } }, orderBy: { createdAt: "asc" } });
  const total=jobs.reduce((sum,job)=>sum+job.totalItems,0),completed=jobs.reduce((sum,job)=>sum+job.completedItems,0),failed=jobs.reduce((sum,job)=>sum+job.failedItems,0);
  return { jobs,total,completed,failed,progress:total?Math.round(((completed+failed)/total)*10000)/100:0 };
}

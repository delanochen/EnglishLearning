import { z } from "zod";
import { grammarCourseSchema, readingArticleSchema, scenarioCourseSchema, vocabularyCourseSchema } from "@/modules/ai/content-schemas";

const practiceQuestion=z.object({prompt:z.string().min(3),options:z.array(z.string().min(1)).min(2),answerKey:z.string().min(1),explanation:z.string().min(1)}).superRefine((value,ctx)=>{if(!value.options.includes(value.answerKey))ctx.addIssue({code:"custom",message:"answerKey must exactly match one option",path:["answerKey"]})});

export const pipelineVocabularySchema=vocabularyCourseSchema.extend({
  examples:z.array(z.object({sentence:z.string().min(5),translation:z.string().min(2)})).min(2),
  exercises:z.array(practiceQuestion).min(3),
  pronunciationText:z.string().min(1),
});
export const pipelineReadingSchema=readingArticleSchema.refine(value=>value.questions.length>=5,{message:"At least five reading questions are required",path:["questions"]});
export const pipelineGrammarSchema=grammarCourseSchema.refine(value=>value.exercises.length>=10,{message:"At least ten grammar exercises are required",path:["exercises"]});
export const pipelineScenarioSchema=scenarioCourseSchema.extend({
  listeningScript:z.string().min(100),rolePlayPrompt:z.string().min(20),vocabulary:z.array(z.object({word:z.string(),meaningZh:z.string(),example:z.string()})).min(6),
});

export type PipelineVocabularyOutput=z.infer<typeof pipelineVocabularySchema>;
export type PipelineReadingOutput=z.infer<typeof pipelineReadingSchema>;
export type PipelineGrammarOutput=z.infer<typeof pipelineGrammarSchema>;
export type PipelineScenarioOutput=z.infer<typeof pipelineScenarioSchema>;

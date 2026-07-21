import type { ContentGenerationJobType } from "@prisma/client";

export type GenerationContext={level?:string;topic?:string;audience?:string;seed?:string;sequence:number;requirements?:Record<string,unknown>};

const system:Partial<Record<ContentGenerationJobType,string>>={
  VOCABULARY_GENERATION:"Create one original, copyright-safe English vocabulary lesson. Include natural Chinese support, two original examples, useful collocations, pronunciation text, and unambiguous multiple-choice practice.",
  READING_GENERATION:"Create one original graded English reading lesson. Match the requested CEFR level, include Chinese support and at least five answerable comprehension/application questions.",
  GRAMMAR_GENERATION:"Create one complete bilingual grammar lesson with correct/error examples, contrasts, common errors, use cases, and at least ten exercises with unique answers.",
  SCENARIO_GENERATION:"Create one substantial American-life task lesson with a realistic long dialogue, culture guidance, listening script, role play, vocabulary and at least six questions. Do not imitate copyrighted scripts.",
};

export function generationMessages(type:ContentGenerationJobType,context:GenerationContext){
  const instruction=system[type]; if(!instruction)throw new Error(`UNSUPPORTED_GENERATION_JOB:${type}`);
  return [{role:"system" as const,content:`${instruction} Content must be safe for families and must not include real personal data, medical/legal/financial advice, advertisements, copied passages, or source claims that cannot be verified.`},{role:"user" as const,content:JSON.stringify(context)}];
}

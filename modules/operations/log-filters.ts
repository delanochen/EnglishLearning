import { z } from "zod";

const purposes=["TUTOR","VOCABULARY","READING","QUIZ","GRAMMAR","WRITING","LEARNING_PLAN","TRANSLATION","SPEECH_RECOGNITION","TTS","IMAGE_GENERATION","VIDEO_GENERATION"] as const;
const schema=z.object({kind:z.enum(["ai","audit","login"]).catch("ai"),status:z.enum(["SUCCESS","FAILED"]).optional().catch(undefined),purpose:z.enum(purposes).optional().catch(undefined),query:z.string().trim().max(80).catch("")});

export function parseAdminLogFilters(input:Record<string,string|undefined>){return schema.parse(input);}
export const aiPurposes=purposes;

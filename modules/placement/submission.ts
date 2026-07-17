import { z } from "zod";

const optionalAudioIdSchema = z.string().uuid().optional();

export function parseOptionalSpeakingAudioId(value: FormDataEntryValue | null) {
  return optionalAudioIdSchema.parse(String(value ?? "") || undefined);
}

import { z } from "zod";
export const familySchema = z.object({ name: z.string().trim().min(2).max(60), timezone: z.string().trim().min(3).max(80) });
export const familyUpdateSchema = familySchema.extend({ familyId: z.string().uuid() });
export const memberSchema = z.object({
  familyId: z.string().uuid(), displayName: z.string().trim().min(1).max(60), nickname: z.string().trim().max(60).optional(),
  memberType: z.enum(["PARENT", "LEARNER", "CHILD"]), ageBand: z.enum(["CHILD", "TEEN", "ADULT", "SENIOR"]),
  dailyMinutes: z.coerce.number().int().min(10).max(60),
  dailyVocabularyGoal: z.coerce.number().int().min(3).max(50).default(10)
});

export const memberUpdateSchema = z.object({
  familyId: z.string().uuid(),
  memberId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(60),
  nickname: z.string().trim().max(60).optional(),
  memberType: z.enum(["OWNER", "PARENT", "LEARNER", "CHILD"]),
  ageBand: z.enum(["CHILD", "TEEN", "ADULT", "SENIOR"]).optional(),
  dailyMinutes: z.coerce.number().int().min(10).max(60).optional(),
  dailyVocabularyGoal: z.coerce.number().int().min(3).max(50).optional(),
  goals: z.string().max(500).optional(), interests: z.string().max(500).optional(), weakAreas: z.string().max(500).optional()
});

export const memberStateSchema = z.object({ familyId: z.string().uuid(), memberId: z.string().uuid() });

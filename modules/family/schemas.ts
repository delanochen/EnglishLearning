import { z } from "zod";
export const familySchema = z.object({ name: z.string().trim().min(2).max(60), timezone: z.string().trim().min(3).max(80) });
export const memberSchema = z.object({
  familyId: z.string().uuid(), displayName: z.string().trim().min(1).max(60), nickname: z.string().trim().max(60).optional(),
  memberType: z.enum(["PARENT", "LEARNER", "CHILD"]), ageBand: z.enum(["CHILD", "TEEN", "ADULT", "SENIOR"]),
  dailyMinutes: z.coerce.number().int().min(10).max(60)
});

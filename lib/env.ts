import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_TRUST_HOST: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export function getEnv() { return schema.parse(process.env); }

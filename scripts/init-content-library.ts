import { db } from "../lib/db";
import { ensureInitializationPlan } from "../modules/content-pipeline/initialization";

ensureInitializationPlan({ onlyWhenEmpty: true })
  .then((result) => console.log(`Content initialization plan: ${result.created} job(s) created${result.skipped ? `; ${result.skipped}` : ""}.`))
  .finally(() => db.$disconnect());

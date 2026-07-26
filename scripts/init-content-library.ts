import { db } from "../lib/db";
import { ensureInitializationPlan, startInitializationJobs } from "../modules/content-pipeline/initialization";

async function main() {
  const administrator = await db.user.findFirst({
    where: { status: "ACTIVE", roles: { some: { role: { code: "SYSTEM_ADMIN" }, familyId: null } } },
    select: { id: true },
  });
  if (!administrator) throw new Error("CONTENT_INITIALIZATION_ADMIN_REQUIRED");
  const result = await ensureInitializationPlan({ actorUserId: administrator.id });
  const started = await startInitializationJobs(administrator.id);
  console.log(`Content initialization plan: ${result.created} job(s) created; ${started} pending job(s) started.`);
}

main()
  .finally(() => db.$disconnect());

import { PrismaClient } from "@prisma/client";
import { readSecret } from "../lib/secret-file";
import { hashPassword } from "../lib/password";

const db = new PrismaClient();

async function main() {
  const email = (await readSecret("initial_admin_email", "INITIAL_ADMIN_EMAIL")).toLowerCase();
  const password = await readSecret("initial_admin_password", "INITIAL_ADMIN_PASSWORD");
  const name = process.env.INITIAL_ADMIN_NAME ?? "System Administrator";
  if (password.length < 12) throw new Error("Initial administrator password must contain at least 12 characters.");
  const role = await db.role.findUniqueOrThrow({ where: { code: "SYSTEM_ADMIN" } });
  const existing = await db.user.findUnique({ where: { email } });
  const user = existing ?? await db.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  if (!existing?.passwordHash) await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  const assigned = await db.userRole.findFirst({ where: { userId: user.id, roleId: role.id, familyId: null } });
  if (!assigned) await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  console.log(`Administrator ready: ${email.replace(/(^.).*(@.*$)/, "$1***$2")}`);
}

main().finally(() => db.$disconnect());

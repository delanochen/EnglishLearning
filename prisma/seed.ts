import { PrismaClient, RoleScope } from "@prisma/client";

const db = new PrismaClient();
const permissions = [
  ["system.manage", "system", "manage"], ["family.manage", "family", "manage"],
  ["family.read", "family", "read"], ["profile.manage", "profile", "manage"],
  ["profile.read.own", "profile", "read-own"], ["report.read.family", "report", "read-family"]
] as const;
const roleMap = {
  SYSTEM_ADMIN: permissions.map(([code]) => code),
  FAMILY_OWNER: ["family.manage", "family.read", "profile.manage", "report.read.family"],
  PARENT: ["family.read", "profile.manage", "report.read.family"],
  LEARNER: ["family.read", "profile.read.own"],
  CHILD: ["profile.read.own"]
};

async function main() {
  for (const [code, resource, action] of permissions) {
    await db.permission.upsert({ where: { code }, update: {}, create: { code, resource, action } });
  }
  for (const [code, permissionCodes] of Object.entries(roleMap)) {
    const role = await db.role.upsert({
      where: { code }, update: {},
      create: { code, name: code.replaceAll("_", " "), scope: code === "SYSTEM_ADMIN" ? RoleScope.SYSTEM : RoleScope.FAMILY }
    });
    const rows = await db.permission.findMany({ where: { code: { in: permissionCodes } } });
    for (const permission of rows) await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {},
      create: { roleId: role.id, permissionId: permission.id }
    });
  }
}

main().finally(() => db.$disconnect());

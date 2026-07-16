import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageSystem } from "@/modules/authorization/policy";

export default async function AdminPage() {
  const session = await auth(); const context = await getAccessContext(session!.user.id); if (!canManageSystem(context)) notFound();
  const [users, families, audits] = await Promise.all([db.user.count({ where: { deletedAt: null } }), db.family.count({ where: { deletedAt: null } }), db.auditLog.findMany({ take: 8, orderBy: { createdAt: "desc" } })]);
  const links = [["/admin/users","用户管理"],["/admin/families","家庭管理"],["/admin/roles","角色与权限"],["/admin/plans","学习计划"],["/admin/content","课程与内容"],["/admin/files","上传文件"],["/admin/logs","系统日志"],["/admin/settings","系统设置"],["/admin/ai","AI 模型"],["/admin/operations","运维与备份"]];
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">System admin</p><h1 className="mt-2 text-4xl font-black">管理后台</h1><section className="mt-8 grid gap-4 sm:grid-cols-3"><div className="metric"><span className="text-muted">用户</span><strong className="text-4xl">{users}</strong></div><div className="metric"><span className="text-muted">家庭</span><strong className="text-4xl">{families}</strong></div><div className="metric"><span className="text-muted">系统状态</span><strong className="text-2xl text-brand">正常</strong></div></section><section className="card mt-6"><h2 className="text-xl font-bold">管理中心</h2><div className="mt-4 flex flex-wrap gap-3">{links.map(([href,label],index)=><Link href={href} className={index===0?"button-primary":"button-ghost"} key={href}>{label}</Link>)}</div></section><section className="card mt-6"><h2 className="text-xl font-bold">最近审计记录</h2><div className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">{audits.map((audit) => <div className="flex justify-between gap-5 py-3 text-sm" key={audit.id}><span>{audit.action} · {audit.resourceType}</span><time className="text-muted">{audit.createdAt.toLocaleString("zh-CN")}</time></div>)}{!audits.length && <p className="py-5 text-muted">暂无操作记录</p>}</div></section></div>;
}

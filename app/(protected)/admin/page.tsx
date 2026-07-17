import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageSystem } from "@/modules/authorization/policy";

export default async function AdminPage() {
  const session = await auth(); const context = await getAccessContext(session!.user.id); if (!canManageSystem(context)) notFound();
  const [users, families, audits] = await Promise.all([db.user.count({ where: { deletedAt: null } }), db.family.count({ where: { deletedAt: null } }), db.auditLog.findMany({ take: 8, orderBy: { createdAt: "desc" } })]);
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const t = english ? { title:"Administration", users:"Users", families:"Families", status:"System status", healthy:"Healthy", center:"Management center", audits:"Recent audit records", empty:"No audit records", links:["Users","Families","Roles & permissions","Learning plans","Courses & content","AI reading generation","Uploaded files","System logs","System settings","AI models","Operations & backups"] } : { title:"管理后台", users:"用户", families:"家庭", status:"系统状态", healthy:"正常", center:"管理中心", audits:"最近审计记录", empty:"暂无操作记录", links:["用户管理","家庭管理","角色与权限","学习计划","课程与内容","AI 阅读生成","上传文件","系统日志","系统设置","AI 模型","运维与备份"] };
  const paths = ["/admin/users","/admin/families","/admin/roles","/admin/plans","/admin/content","/admin/content/generate-reading","/admin/files","/admin/logs","/admin/settings","/admin/ai","/admin/operations"];
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">System admin</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1><section className="mt-8 grid gap-4 sm:grid-cols-3"><div className="metric"><span className="text-muted">{t.users}</span><strong className="text-4xl">{users}</strong></div><div className="metric"><span className="text-muted">{t.families}</span><strong className="text-4xl">{families}</strong></div><div className="metric"><span className="text-muted">{t.status}</span><strong className="text-2xl text-brand">{t.healthy}</strong></div></section><section className="card mt-6"><h2 className="text-xl font-bold">{t.center}</h2><div className="mt-4 flex flex-wrap gap-3">{paths.map((href,index)=><Link href={href} className={index===0?"button-primary":"button-ghost"} key={href}>{t.links[index]}</Link>)}</div></section><section className="card mt-6"><h2 className="text-xl font-bold">{t.audits}</h2><div className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">{audits.map((audit) => <div className="flex justify-between gap-5 py-3 text-sm" key={audit.id}><span>{audit.action} · {audit.resourceType}</span><time className="text-muted">{audit.createdAt.toLocaleString(english?"en-US":"zh-CN")}</time></div>)}{!audits.length && <p className="py-5 text-muted">{t.empty}</p>}</div></section></div>;
}

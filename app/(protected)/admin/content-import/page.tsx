import Link from "next/link";
import { ContentImportCenter } from "@/components/content-import-center";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";

export default async function ContentImportPage() {
  await requireSystemAdmin();
  const [licenses,sources] = await Promise.all([db.contentLicense.findMany({orderBy:{name:"asc"}}),db.importSource.findMany({include:{license:true},orderBy:{createdAt:"desc"}})]);
  return <div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Licensed imports</p><h1 className="mt-2 text-4xl font-black">公开资源与许可证</h1><p className="mt-2 max-w-3xl text-muted">只导入具有明确再利用许可、经过管理员批准且 robots.txt 允许的公开内容。所有结果先保存为原始草稿。</p></div><Link className="button-ghost" href="/admin/content-center">返回内容中心</Link></div><div className="mt-7"><ContentImportCenter licenses={licenses.map(x=>({id:x.id,name:x.name,type:x.type,publicationAllowed:x.publicationAllowed}))} sources={sources.map(x=>({id:x.id,name:x.name,baseUrl:x.baseUrl,enabled:x.enabled,approved:x.approved,license:{id:x.license.id,name:x.license.name,type:x.license.type,publicationAllowed:x.license.publicationAllowed}}))}/></div></div>;
}

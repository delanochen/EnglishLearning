import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageSystem } from "@/modules/authorization/policy";
import { formatBytes, getOperationsStatus } from "@/modules/operations/status";
import { createManualBackup, deleteBackup } from "@/modules/operations/backup-actions";

export default async function OperationsPage() {
  const session = await auth();
  const context = await getAccessContext(session!.user.id);
  if (!canManageSystem(context)) notFound();
  const status = await getOperationsStatus();

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Operations</p><h1 className="mt-2 text-4xl font-black">系统运维状态</h1></div><form action={createManualBackup}><button className="button-primary">立即创建完整备份</button></form></div>
    <p className="mt-3 text-sm text-muted">手动备份包含数据库、上传文件、配置快照及 SHA-256 校验清单；操作过程写入审计日志。</p>
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="metric"><span className="text-muted">数据库大小</span><strong className="text-3xl">{formatBytes(status.databaseBytes)}</strong></div>
      <div className="metric"><span className="text-muted">用户 / 活动</span><strong className="text-3xl">{status.users} / {status.activities}</strong></div>
      <div className="metric"><span className="text-muted">24h AI 失败</span><strong className={status.failedAI ? "text-3xl text-amber-700" : "text-3xl text-green-700"}>{status.failedAI}</strong></div>
      <div className="metric"><span className="text-muted">服务状态</span><strong className="text-2xl text-green-700">运行中</strong></div>
    </section>
    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="card"><h2 className="text-xl font-black">存储空间</h2>{[["Uploads", status.uploadDisk], ["Logs", status.logDisk]].map(([label, value]) => { const disk = typeof value === "object" ? value : null; const usedPercent = disk ? Math.round((1 - disk.free / disk.total) * 100) : null; return <div className="mt-5" key={String(label)}><div className="flex justify-between"><strong>{String(label)}</strong><span>{disk ? `${usedPercent}% 已用 · ${formatBytes(disk.free)} 可用` : "无法读取"}</span></div>{disk && <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className={usedPercent! >= 90 ? "h-full bg-red-600" : usedPercent! >= 75 ? "h-full bg-amber-500" : "h-full bg-brand"} style={{ width: `${usedPercent}%` }}/></div>}</div>; })}</div>
      <div className="card"><h2 className="text-xl font-black">最近备份</h2><div className="mt-4 space-y-3">{status.backups.map((backup) => <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800" key={backup.name}><strong>{backup.name}</strong><p className="text-sm text-muted">{backup.modifiedAt.toLocaleString("zh-CN")}</p><div className="mt-2 flex flex-wrap gap-2">{["database.dump", "uploads.tar.gz", "settings.dump", "manifest.txt", "checksums.sha256"].map((file) => <a className="text-xs font-bold text-brand" href={`/api/admin/backups/${backup.name}/${file}`} key={file}>{file}</a>)}</div><form action={deleteBackup} className="mt-3 flex gap-2"><input type="hidden" name="name" value={backup.name}/><input className="input min-w-0" name="confirmation" placeholder={`输入 ${backup.name} 确认删除`} required/><button className="button-ghost text-red-700">删除</button></form></div>)}{!status.backups.length && <p className="text-muted">尚未发现完整备份。点击上方按钮创建第一份备份。</p>}</div></div>
    </section>
    <section className="card mt-5"><h2 className="text-xl font-black">运维命令</h2><pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">{`docker compose ps\ndocker compose logs --tail=200 app postgres\ndocker compose --profile operations run --rm backup`}</pre><p className="mt-4 text-sm text-muted">恢复属于破坏性操作，必须按照备份恢复文档停止应用、校验清单并显式确认；恢复脚本会留下操作记录所需的时间戳和校验结果。</p></section>
  </div>;
}

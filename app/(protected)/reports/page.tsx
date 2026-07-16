import type { MonthlyReport, WeeklyReport } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfilePicker } from "@/components/profile-picker";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { generateReport } from "@/modules/reports/actions";

type Metrics = { durationMinutes?: number; activityCount?: number; averageScore?: number | null; completionRate?: number; strongestModule?: string | null };
type Report = WeeklyReport | MonthlyReport;

function ReportCard({ label, report }: { label: string; report: Report | null }) {
  if (!report) return <section className="card"><h2 className="text-xl font-black">{label}</h2><p className="mt-4 text-muted">尚未生成。</p></section>;
  const metrics = report.metrics as Metrics;
  return <section className="card"><p className="font-bold text-brand">{label} · 第 {report.version} 版</p><h2 className="mt-1 text-xl font-black">{report.periodStart.toLocaleDateString("zh-CN")} — {report.periodEnd.toLocaleDateString("zh-CN")}</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><span className="text-sm text-muted">学习时长</span><p className="text-2xl font-black">{metrics.durationMinutes ?? 0} 分</p></div><div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><span className="text-sm text-muted">完成率</span><p className="text-2xl font-black">{metrics.completionRate ?? 0}%</p></div><div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><span className="text-sm text-muted">活动数</span><p className="text-2xl font-black">{metrics.activityCount ?? 0}</p></div><div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><span className="text-sm text-muted">平均成绩</span><p className="text-2xl font-black">{metrics.averageScore ?? "—"}</p></div></div><h3 className="mt-5 font-black">优势</h3><ul className="mt-2 list-disc pl-5 text-muted">{report.strengths.map((item) => <li key={item}>{item}</li>)}</ul>{report.weakAreas.length > 0 && <><h3 className="mt-4 font-black">需要关注</h3><ul className="mt-2 list-disc pl-5 text-muted">{report.weakAreas.map((item) => <li key={item}>{item}</li>)}</ul></>}<h3 className="mt-4 font-black">建议</h3><ul className="mt-2 list-disc pl-5 text-muted">{report.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const session = await auth(); const query = await searchParams; const profiles = await getAccessibleProfiles(session!.user.id); const selected = profiles.find((profile) => profile.id === query.profile) ?? profiles[0];
  const [weekly, monthly] = selected ? await Promise.all([db.weeklyReport.findFirst({ where: { learnerProfileId: selected.id }, orderBy: { generatedAt: "desc" } }), db.monthlyReport.findFirst({ where: { learnerProfileId: selected.id }, orderBy: { generatedAt: "desc" } })]) : [null, null];
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Reports</p><h1 className="mt-2 text-4xl font-black">学习报告</h1><ProfilePicker profiles={profiles} selectedId={selected?.id} pathname="/reports"/>{selected && <div className="mt-6 flex gap-3"><form action={generateReport}><input type="hidden" name="profileId" value={selected.id}/><button className="button-primary" name="type" value="WEEKLY">生成周报</button></form><form action={generateReport}><input type="hidden" name="profileId" value={selected.id}/><button className="button-ghost" name="type" value="MONTHLY">生成月报</button></form></div>}<div className="mt-6 grid gap-5 lg:grid-cols-2"><ReportCard label="最新周报" report={weekly}/><ReportCard label="最新月报" report={monthly}/></div></div>;
}

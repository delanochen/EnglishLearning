import type { MonthlyReport, WeeklyReport } from "@prisma/client";
import { cookies } from "next/headers";
import { auth } from "@/auth"; import { db } from "@/lib/db"; import { getAccessibleProfiles } from "@/modules/learner/access"; import { getActiveProfile } from "@/modules/learner/selection"; import { generateReport } from "@/modules/reports/actions";

type Metrics = { durationMinutes?: number; activityCount?: number; averageScore?: number | null; completionRate?: number; strongestModule?: string | null };
type Report = WeeklyReport | MonthlyReport;

function ReportCard({ label, report, english }: { label: string; report: Report | null; english: boolean }) {
  const t = english ? { none: "Not generated yet.", version: "version", duration: "Study time", minutes: "min", completion: "Completion", activities: "Activities", average: "Average score", strengths: "Strengths", attention: "Needs attention", recommendations: "Recommendations" } : { none: "尚未生成。", version: "第", duration: "学习时长", minutes: "分", completion: "完成率", activities: "活动数", average: "平均成绩", strengths: "优势", attention: "需要关注", recommendations: "建议" };
  if (!report) return <section className="card"><h2 className="text-xl font-black">{label}</h2><p className="mt-4 text-muted">{t.none}</p></section>;
  const metrics = report.metrics as Metrics; const locale = english ? "en-US" : "zh-CN";
  return <section className="card"><p className="font-bold text-brand">{label} · {t.version} {report.version}</p><h2 className="mt-1 text-xl font-black">{report.periodStart.toLocaleDateString(locale)} — {report.periodEnd.toLocaleDateString(locale)}</h2><div className="mt-5 grid grid-cols-2 gap-3"><Metric label={t.duration} value={`${metrics.durationMinutes ?? 0} ${t.minutes}`}/><Metric label={t.completion} value={`${metrics.completionRate ?? 0}%`}/><Metric label={t.activities} value={metrics.activityCount ?? 0}/><Metric label={t.average} value={metrics.averageScore ?? "—"}/></div><List title={t.strengths} items={report.strengths}/>{report.weakAreas.length > 0 && <List title={t.attention} items={report.weakAreas}/>}<List title={t.recommendations} items={report.recommendations}/></section>;
}

export default async function ReportsPage() {
  const session = await auth(); const english = (await cookies()).get("ui_locale")?.value === "en"; const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  const [weekly, monthly] = selected ? await Promise.all([db.weeklyReport.findFirst({ where: { learnerProfileId: selected.id }, orderBy: { generatedAt: "desc" } }), db.monthlyReport.findFirst({ where: { learnerProfileId: selected.id }, orderBy: { generatedAt: "desc" } })]) : [null, null];
  const t = english ? { title: "Learning reports", weekly: "Generate weekly report", monthly: "Generate monthly report", latestWeekly: "Latest weekly report", latestMonthly: "Latest monthly report" } : { title: "学习报告", weekly: "生成周报", monthly: "生成月报", latestWeekly: "最新周报", latestMonthly: "最新月报" };
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Reports</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1>{selected && <div className="mt-6 flex gap-3"><form action={generateReport}><input type="hidden" name="profileId" value={selected.id}/><button className="button-primary" name="type" value="WEEKLY">{t.weekly}</button></form><form action={generateReport}><input type="hidden" name="profileId" value={selected.id}/><button className="button-ghost" name="type" value="MONTHLY">{t.monthly}</button></form></div>}<div className="mt-6 grid gap-5 lg:grid-cols-2"><ReportCard label={t.latestWeekly} report={weekly} english={english}/><ReportCard label={t.latestMonthly} report={monthly} english={english}/></div></div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><span className="text-sm text-muted">{label}</span><p className="text-2xl font-black">{value}</p></div>; }
function List({ title, items }: { title: string; items: string[] }) { return <><h3 className="mt-5 font-black">{title}</h3><ul className="mt-2 list-disc pl-5 text-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul></>; }


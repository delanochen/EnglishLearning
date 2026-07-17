import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { selectLearnerProfile } from "@/modules/learner/selection-actions";

export default async function ProfilesPage() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const profiles = await getAccessibleProfiles(session!.user.id);
  const t = english
    ? { eyebrow: "Who is learning?", title: "Choose a family member", help: "All learning modules will use this member until you switch here again.", level: "Level", pending: "Placement pending", minutes: "min/day", enter: "Start learning", empty: "No learner profiles are available yet.", manage: "Manage family members" }
    : { eyebrow: "谁来学习？", title: "选择家庭成员", help: "选择后，所有学习功能都会使用该成员；需要时可从侧栏统一切换。", level: "等级", pending: "待水平测试", minutes: "分钟/天", enter: "开始学习", empty: "目前没有可用的学习档案。", manage: "管理家庭成员" };
  return <div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">{t.eyebrow}</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1><p className="mt-2 text-muted">{t.help}</p><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{profiles.map((profile) => <form action={selectLearnerProfile} className="card flex flex-col" key={profile.id}><input type="hidden" name="profileId" value={profile.id}/><h2 className="text-2xl font-black">{profile.name}</h2><p className="mt-2 text-muted">{t.level}: {profile.level?.replace("_", "-") ?? t.pending}</p><p className="mt-1 text-muted">{profile.dailyMinutes} {t.minutes}</p><button className="button-primary mt-6 w-full">{t.enter}</button></form>)}</div>{!profiles.length && <div className="card mt-7"><p className="text-muted">{t.empty}</p><Link className="button-primary mt-5 inline-block" href="/family">{t.manage}</Link></div>}</div>;
}

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";
import { achievementMetrics } from "@/modules/achievements/service";
import { xpLevel } from "@/modules/achievements/level";

const categoryNames={CONSISTENCY:["坚持打卡","Consistency"],TIME:["学习时间","Study time"],GROWTH:["成长等级","Growth"],VOCABULARY:["词汇","Vocabulary"],READING:["阅读","Reading"],SPEAKING:["口语","Speaking"],SCENARIO:["生活场景","US life"],EXPLORATION:["探索","Exploration"],MASTERY:["能力","Mastery"],GENERAL:["综合","General"]} as const;

export default async function AchievementsPage(){
  const session=await auth();const english=(await cookies()).get("ui_locale")?.value==="en";const selected=await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  if(!selected)return <div className="card">{english?"Choose a learner profile first.":"请先选择学习成员。"}</div>;
  const [profile,achievements,metrics]=await Promise.all([
    db.learnerProfile.findUniqueOrThrow({where:{id:selected.id},select:{totalXp:true,achievements:{include:{achievement:true}}}}),
    db.achievement.findMany({where:{active:true},orderBy:[{category:"asc"},{threshold:"asc"}]}),achievementMetrics(selected.id),
  ]);
  const owned=new Map(profile.achievements.map(item=>[item.achievementId,item]));const level=xpLevel(profile.totalXp);const earned=profile.achievements.filter(item=>item.earnedAt).length;
  const groups=achievements.reduce<Record<string,typeof achievements>>((result,item)=>{(result[item.category]??=[]).push(item);return result},{});
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Achievements</p><h1 className="mt-2 text-4xl font-black">{english?"Badge wall":"我的勋章墙"}</h1><p className="mt-2 text-muted">{selected.name} · {english?level.en:level.zh} · {earned}/{achievements.length} {english?"unlocked":"枚已解锁"}</p>
    <section className="card mt-7"><div className="flex items-end justify-between gap-4"><div><p className="text-sm text-muted">{english?"Growth level":"成长等级"}</p><h2 className="text-2xl font-black">{english?level.en:level.zh}</h2></div><strong>{profile.totalXp} XP</strong></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-brand" style={{width:`${level.progress}%`}}/></div>{level.nextMin&&<p className="mt-2 text-sm text-muted">{english?`${level.nextMin-profile.totalXp} XP to the next level`:`距离下一等级还差 ${level.nextMin-profile.totalXp} XP`}</p>}</section>
    {Object.entries(groups).map(([category,items])=><section className="mt-8" key={category}><h2 className="text-2xl font-black">{categoryNames[category as keyof typeof categoryNames]?.[english?1:0]??category}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=>{const user=owned.get(item.id);const progress=Math.min(metrics[item.metric]??user?.progress??0,item.threshold);const unlocked=Boolean(user?.earnedAt);return <article className={unlocked?"card border-2 border-brand/30 bg-brand/5":"card opacity-70"} key={item.id}><div className="flex items-start justify-between"><span className="text-4xl">{item.icon}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">+{item.rewardXp} XP</span></div><h3 className="mt-3 text-lg font-black">{english?(item.nameEn??item.name):item.name}</h3><p className="mt-1 text-sm text-muted">{english?(item.descriptionEn??item.description):item.description}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-brand" style={{width:`${Math.min(100,progress/item.threshold*100)}%`}}/></div><p className="mt-2 text-xs font-bold">{progress}/{item.threshold}{unlocked?` · ${english?"Unlocked":"已获得"}`:""}</p></article>})}</div></section>)}</div>;
}

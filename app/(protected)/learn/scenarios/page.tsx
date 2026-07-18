import Link from "next/link";
import {cookies} from "next/headers";
import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getAccessibleProfiles} from "@/modules/learner/access";
import {getActiveProfile} from "@/modules/learner/selection";
import {selectExactLevelItems} from "@/modules/content/level-selection";

export default async function ScenariosPage({searchParams}:{searchParams:Promise<{profile?:string;category?:string}>}){
  const session=await auth();const english=(await cookies()).get("ui_locale")?.value==="en";const query=await searchParams;
  const selected=await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  const lessonsRaw=await db.scenarioLesson.findMany({where:{status:"PUBLISHED",...(query.category?{category:query.category}:{}),...(selected?.level?{level:selected.level}:{})},include:{dialogues:true,vocabulary:{orderBy:{order:"asc"}},progress:selected?{where:{learnerProfileId:selected.id}}:false},orderBy:[{category:"asc"},{title:"asc"}]});
  const lessons=selectExactLevelItems(lessonsRaw,selected?.level,item=>item.level);
  const categories=await db.scenarioLesson.findMany({where:{status:"PUBLISHED"},distinct:["category"],select:{category:true}});
  const t=english?{title:"US life scenarios",help:"Practice useful vocabulary, natural expressions, culture, dictation, and role-play.",all:"All",original:"Original",ai:"AI generated",lines:"dialogue lines",done:"Completed",start:"Practice again",empty:"No scenario lessons have been published yet."}:{title:"美国生活场景课",help:"学习常用词汇、自然表达、文化习惯、听写和角色扮演；完成后仍可反复练习。",all:"全部",original:"原创",ai:"AI 生成",lines:"句对话",done:"已完成",start:"再次练习",empty:"场景课程库尚未发布内容。"};
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">US Life English</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1><p className="mt-2 text-muted">{t.help}</p><div className="mt-5 flex flex-wrap gap-2"><Link className={!query.category?"button-primary":"button-ghost"} href="/learn/scenarios">{t.all}</Link>{categories.map(({category})=><Link className={query.category===category?"button-primary":"button-ghost"} href={`/learn/scenarios?category=${encodeURIComponent(category)}`} key={category}>{category}</Link>)}</div><div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{selected&&lessons.map(lesson=><Link className="card hover:border-brand" href={`/learn/scenarios/${lesson.id}`} key={lesson.id}><div className="flex justify-between"><span className="font-bold text-brand">{lesson.category} · {lesson.level}</span><span className="text-xs text-muted">{lesson.sourceType==="ORIGINAL"?t.original:t.ai}</span></div><h2 className="mt-3 text-2xl font-black">{lesson.title}</h2><p className="mt-3 line-clamp-3 text-muted">{lesson.intro}</p><div className="mt-4 flex flex-wrap gap-1">{lesson.vocabulary.map(item=><span className="rounded-full bg-brand/10 px-2 py-1 text-xs" title={`${item.meaningZh} · ${item.example??""}`} key={item.id}>{item.word}{!english&&` · ${item.meaningZh}`}</span>)}</div><p className="mt-5 font-bold">{lesson.dialogues.length} {t.lines} · {lesson.progress[0]?.completedAt?`${t.done} ${Math.round((lesson.progress[0].score??0)*100)} · ${t.start} →`:`${t.start} →`}</p></Link>)}</div>{selected&&!lessons.length&&<div className="card mt-7">{t.empty}</div>}</div>;
}

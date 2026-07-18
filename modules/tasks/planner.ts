export type PlannedTask={taskType:"VOCABULARY"|"READING"|"LISTENING"|"SPEAKING"|"AI_TUTOR"|"GRAMMAR"|"WRITING"|"QUIZ";title:string;description:string;estimatedMinutes:number;xpReward:number};
export type LearnerTaskContext={profileId?:string;level?:string|null;interests?:string[];goals?:string[];availableTaskTypes?:PlannedTask["taskType"][]};

const modules=[{taskType:"READING",title:"完成一篇分级阅读",description:"阅读文章并回答理解题"},{taskType:"LISTENING",title:"听力理解训练",description:"听原文并完成理解题"},{taskType:"SPEAKING",title:"口语跟读或自由表达",description:"录音、识别并查看评分"},{taskType:"GRAMMAR",title:"薄弱语法复习",description:"完成多类型语法练习"},{taskType:"WRITING",title:"英语写作练习",description:"提交一个新版本并查看反馈"},{taskType:"QUIZ",title:"综合小测验",description:"复习本周词汇和错题"},{taskType:"AI_TUTOR",title:"和 AI 老师对话",description:"围绕生活主题练习表达"}]as const;
const weakAreaTerms:Record<(typeof modules)[number]["taskType"],string[]>={READING:["reading","阅读"],LISTENING:["listening","听力"],SPEAKING:["speaking","pronunciation","口语","发音"],GRAMMAR:["grammar","语法"],WRITING:["writing","写作"],QUIZ:["quiz","test","mistake","测验","错题"],AI_TUTOR:["conversation","expression","tutor","对话","表达"]};

function stableSeed(value=""){let seed=0;for(const character of value)seed=(seed*31+character.charCodeAt(0))%2147483647;return seed}
function personalize<T extends {title:string;description:string}>(task:T,context:LearnerTaskContext):T{const level=context.level?.replace("_","-");const interest=context.interests?.find(Boolean);return{...task,title:level?`${task.title} · ${level}`:task.title,description:interest?`${task.description}，优先结合“${interest}”主题`:task.description}}

export function planDailyTasks(dailyMinutes:number,rotationDay=0,weakAreas:string[]=[],context:LearnerTaskContext={}):PlannedTask[]{
  const minutes=Math.max(10,Math.min(120,Math.round(dailyMinutes)));const vocabularyTask=personalize({taskType:"VOCABULARY" as const,title:"今日单词学习与复习",description:"复习到期单词并学习新词"},context);
  if(minutes<20)return[{...vocabularyTask,estimatedMinutes:minutes,xpReward:10}];
  const availableModules=context.availableTaskTypes?.length?modules.filter(module=>context.availableTaskTypes!.includes(module.taskType)):modules;const pool=availableModules.length?availableModules:modules.filter(module=>["READING","SPEAKING","AI_TUTOR"].includes(module.taskType));
  const vocabulary=Math.max(6,Math.round(minutes*.3));const mainMinutes=Math.max(8,Math.round(minutes*.4));const remaining=minutes-vocabulary-mainMinutes;const weak=weakAreas.join(" ").toLowerCase();const offset=stableSeed(context.profileId)%pool.length;
  const weakModule=pool.find(module=>weakAreaTerms[module.taskType].some(term=>weak.includes(term)));
  const preferred=weakModule??pool[(rotationDay+offset)%pool.length];const secondary=pool[(rotationDay+offset+3)%pool.length];
  const result:PlannedTask[]=[{...vocabularyTask,estimatedMinutes:vocabulary,xpReward:10},{...personalize(preferred,context),estimatedMinutes:mainMinutes,xpReward:15}];
  if(remaining>=5)result.push({...personalize(secondary,context),estimatedMinutes:remaining,xpReward:15});else result[1].estimatedMinutes+=remaining;return result;
}

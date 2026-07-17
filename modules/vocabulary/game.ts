export type GameAnswer={vocabularyId:string;questionType:"MEANING"|"AUDIO"|"SPELLING"|"CONTEXT";answer:string;responseMs:number};
export function normalizeAnswer(value:string){return value.trim().toLocaleLowerCase("en-US").replace(/[’']/g,"'");}
export function gameScore(results:boolean[]){let streak=0,maxStreak=0,bonus=0;for(const correct of results){streak=correct?streak+1:0;maxStreak=Math.max(maxStreak,streak);if(streak===3)bonus+=2;if(streak===5)bonus+=5;}const correct=results.filter(Boolean).length;return{correct,maxStreak,score:correct*10+bonus*2,earnedXp:correct*2+bonus};}
export function weekStart(date=new Date()){const day=date.getUTCDay();const start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));start.setUTCDate(start.getUTCDate()-(day===0?6:day-1));return start;}


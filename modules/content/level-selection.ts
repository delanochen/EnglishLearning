import { vocabularyLevelFallbacks } from "@/modules/vocabulary/levels";

export function selectClosestLevelItems<T>(items:T[],targetLevel:string|null|undefined,getLevel:(item:T)=>string){
  if(!targetLevel)return items;
  for(const level of vocabularyLevelFallbacks(targetLevel as Parameters<typeof vocabularyLevelFallbacks>[0])){
    const matches=items.filter(item=>getLevel(item)===level);
    if(matches.length)return matches;
  }
  return [];
}

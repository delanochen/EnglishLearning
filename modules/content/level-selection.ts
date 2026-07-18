export function selectExactLevelItems<T>(items:T[],targetLevel:string|null|undefined,getLevel:(item:T)=>string){
  if(!targetLevel)return [];
  return items.filter(item=>getLevel(item)===targetLevel);
}

import type { CefrLevel } from "@prisma/client";

const cefrOrder:CefrLevel[]=["PRE_A1","A1","A2","B1","B2","C1","C2"];

export function vocabularyLevelFallbacks(level:CefrLevel){
  const current=cefrOrder.indexOf(level);
  return [...cefrOrder].sort((a,b)=>{
    const distance=Math.abs(cefrOrder.indexOf(a)-current)-Math.abs(cefrOrder.indexOf(b)-current);
    return distance||cefrOrder.indexOf(a)-cefrOrder.indexOf(b);
  });
}

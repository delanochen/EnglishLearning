export function shouldCreateNextTaskBatch(statuses:string[]){
  return !statuses.some(status=>status!=="COMPLETED");
}

export function planContentBatches(totalItems:number,batchSize=20){
  if(!Number.isInteger(totalItems)||totalItems<1)throw new Error("INVALID_TOTAL_ITEMS");
  if(!Number.isInteger(batchSize)||batchSize<20||batchSize>50)throw new Error("INVALID_BATCH_SIZE");
  const batches:Array<{sequence:number;start:number;count:number}>=[];
  for(let start=0,sequence=1;start<totalItems;start+=batchSize,sequence++)batches.push({sequence,start,count:Math.min(batchSize,totalItems-start)});
  return batches;
}

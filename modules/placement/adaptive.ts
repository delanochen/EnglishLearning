import type{PlacementQuestion}from"./questions";
export function chooseAdaptiveQuestion(remaining:PlacementQuestion[],currentDifficulty:number,correct:boolean){if(!remaining.length)return undefined;const target=Math.max(1,Math.min(3,currentDifficulty+(correct?1:-1)));return[...remaining].sort((a,b)=>Math.abs(a.maxScore-target)-Math.abs(b.maxScore-target)||a.id.localeCompare(b.id))[0]}
export function openAnswerIsStrong(answer:string,difficulty:number){const words=answer.trim().split(/\s+/).filter(Boolean).length;return words>=Math.max(5,difficulty*6)}

export function updateGrammarMastery(mastery: number, correct: boolean) {
  const next = Math.max(0, Math.min(1, mastery + (correct ? 0.12 : -0.1)));
  const days = correct ? Math.max(2, Math.round(2 + next * 12)) : 1;
  return { mastery: next, weaknessScore: 1 - next, reviewAfterDays: days };
}

function normalize(value:string){return value.toLowerCase().replace(/[^a-z0-9'\s]/g,"").replace(/\s+/g," ").trim()}
export function scoreGrammarAnswer(type:string,answer:string,answerKey:string){const value=normalize(answer);const key=normalize(answerKey);if(!value)return false;if(type==="SENTENCE_CREATION"||type==="AI_DIALOGUE")return value.split(" ").length>=4&&/\b(i|we|you|he|she|they|it|there)\b/.test(value);if(type==="TRANSLATION"){const keyWords=new Set(key.split(" ").filter(x=>x.length>2));const actual=new Set(value.split(" "));return keyWords.size>0&&[...keyWords].filter(x=>actual.has(x)).length/keyWords.size>=.7}return value===key}

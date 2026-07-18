export function parseWordNetLine(line:string,partOfSpeech:string){
  if(!/^\d/.test(line)||!line.includes(" | "))return null;const [data,glossRaw]=line.split(" | ",2);const tokens=data.trim().split(/\s+/);const count=Number.parseInt(tokens[3],16);if(!Number.isFinite(count)||count<1)return null;const words:string[]=[];for(let index=0;index<count;index++)words.push(tokens[4+index*2].replaceAll("_"," "));
  const gloss=glossRaw.split(";")[0]?.trim();const example=glossRaw.match(/"([^"]+)"/)?.[1];if(!gloss)return null;return{words,gloss,example,partOfSpeech};
}

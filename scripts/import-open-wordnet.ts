import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient, type CefrLevel } from "@prisma/client";
import { parseWordNetLine } from "../modules/vocabulary/open-wordnet";

const db=new PrismaClient();
const directory=process.env.OEWN_DICT_DIR??"/tmp/oewn/dict";
const limit=Math.max(1,Math.min(50_000,Number(process.env.OEWN_LIMIT??5000)));
const skip=Math.max(0,Math.min(200_000,Number(process.env.OEWN_SKIP??0)));
const level=(process.env.OEWN_LEVEL??"B1") as CefrLevel;
const levels:CefrLevel[]=["PRE_A1","A1","A2","B1","B2","C1","C2"];
const files=[['data.noun','noun'],['data.verb','verb'],['data.adj','adjective'],['data.adv','adverb']] as const;

async function main(){if(!levels.includes(level))throw new Error(`Unsupported OEWN_LEVEL: ${level}`);let imported=0;let uniqueIndex=0;const seen=new Set<string>();for(const [filename,partOfSpeech] of files){const content=await readFile(join(directory,filename),"utf8");for(const line of content.split(/\r?\n/)){const entry=parseWordNetLine(line,partOfSpeech);if(!entry)continue;for(const rawWord of entry.words){const word=rawWord.toLowerCase();if(!/^[a-z][a-z '-]{1,48}$/i.test(word))continue;const key=`${word}\u0000${partOfSpeech}`;if(seen.has(key))continue;seen.add(key);if(uniqueIndex++<skip)continue;if(imported>=limit){console.log(`Imported or updated ${imported} unique Open English WordNet entries at level ${level} after skipping ${skip}.`);return;}const row=await db.vocabulary.upsert({where:{word_partOfSpeech:{word,partOfSpeech}},update:{definitionEn:entry.gloss,level,topic:"Open English WordNet",sourceName:"Open English WordNet 2025",sourceUrl:"https://en-word.net/",sourceLicense:"CC BY 4.0"},create:{word,partOfSpeech,definitionEn:entry.gloss,level,topic:"Open English WordNet",status:"PUBLISHED",sourceName:"Open English WordNet 2025",sourceUrl:"https://en-word.net/",sourceLicense:"CC BY 4.0"}});if(entry.example)await db.vocabularyExample.upsert({where:{id:`${row.id}`},update:{difficulty:level},create:{vocabularyId:row.id,sentence:entry.example,collocations:[],difficulty:level}}).catch(()=>undefined);imported++;if(imported%500===0)console.log(`Imported ${imported} words...`);}}
  }console.log(`Imported or updated ${imported} unique Open English WordNet entries at level ${level} after skipping ${skip}.`);}
main().finally(()=>db.$disconnect());

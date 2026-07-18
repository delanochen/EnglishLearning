import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient, type CefrLevel } from "@prisma/client";
import { parseWordNetLine } from "../modules/vocabulary/open-wordnet";

const db=new PrismaClient();
const directory=process.env.OEWN_DICT_DIR??"/tmp/oewn/dict";
const limit=Math.max(1,Math.min(50_000,Number(process.env.OEWN_LIMIT??5000)));
const level=(process.env.OEWN_LEVEL??"B1") as CefrLevel;
const files=[['data.noun','noun'],['data.verb','verb'],['data.adj','adjective'],['data.adv','adverb']] as const;

async function main(){let imported=0;for(const [filename,partOfSpeech] of files){const content=await readFile(join(directory,filename),"utf8");for(const line of content.split(/\r?\n/)){const entry=parseWordNetLine(line,partOfSpeech);if(!entry)continue;for(const word of entry.words){if(imported>=limit)return; if(!/^[a-z][a-z '-]{1,48}$/i.test(word))continue;const row=await db.vocabulary.upsert({where:{word_partOfSpeech:{word:word.toLowerCase(),partOfSpeech}},update:{definitionEn:entry.gloss,sourceName:"Open English WordNet 2025",sourceUrl:"https://en-word.net/",sourceLicense:"CC BY 4.0"},create:{word:word.toLowerCase(),partOfSpeech,definitionEn:entry.gloss,level,topic:"Open English WordNet",status:"PUBLISHED",sourceName:"Open English WordNet 2025",sourceUrl:"https://en-word.net/",sourceLicense:"CC BY 4.0"}});if(entry.example)await db.vocabularyExample.upsert({where:{id:`${row.id}`},update:{},create:{vocabularyId:row.id,sentence:entry.example,collocations:[],difficulty:level}}).catch(()=>undefined);imported++;if(imported%500===0)console.log(`Imported ${imported} words...`);}}
  }console.log(`Imported or updated ${imported} Open English WordNet entries at level ${level}.`);}
main().finally(()=>db.$disconnect());

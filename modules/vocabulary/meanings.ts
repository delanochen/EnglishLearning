import {db} from "@/lib/db";
import {routedStructured} from "@/modules/ai/gateway";
import {vocabularyTranslationsSchema} from "@/modules/ai/content-schemas";

type TranslationWord={id:string;word:string;partOfSpeech:string|null;definitionEn:string;meanings:Array<{locale:string;definition:string}>};

export async function ensureChineseVocabularyMeanings(words:TranslationWord[],userId:string){
  const existing=new Map(words.flatMap(word=>word.meanings.filter(meaning=>meaning.locale==="zh-CN").map(meaning=>[word.id,meaning.definition] as const)));
  const missing=words.filter(word=>!existing.has(word.id));
  if(!missing.length)return existing;
  try{
    const output=await routedStructured("TRANSLATION",{schema:vocabularyTranslationsSchema,schemaName:"VocabularyTranslations",schemaInstructions:'{"translations":[{"id":"the exact UUID from the input","definitionZh":"concise, natural Simplified Chinese dictionary definition"}]}',messages:[{role:"system",content:"Translate each English dictionary definition into concise Simplified Chinese. Preserve the intended sense and part of speech. Return every input id exactly once; do not translate the English headword itself unless needed for clarity."},{role:"user",content:JSON.stringify(missing.map(word=>({id:word.id,word:word.word,partOfSpeech:word.partOfSpeech,definitionEn:word.definitionEn})))}],temperature:.2,maxTokens:Math.max(800,missing.length*100)},userId);
    const allowed=new Set(missing.map(word=>word.id));
    const translations=output.translations.filter(item=>allowed.has(item.id));
    await db.$transaction(translations.map(item=>db.vocabularyMeaning.upsert({where:{vocabularyId_locale_senseOrder:{vocabularyId:item.id,locale:"zh-CN",senseOrder:1}},update:{definition:item.definitionZh},create:{vocabularyId:item.id,locale:"zh-CN",senseOrder:1,definition:item.definitionZh}})));
    for(const item of translations)existing.set(item.id,item.definitionZh);
  }catch{
    // Vocabulary learning remains available when translation routing is unavailable.
  }
  return existing;
}

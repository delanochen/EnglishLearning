import { db } from "../lib/db";
import { runContentJobs } from "../modules/content-pipeline/processor";

const maxItems=Math.max(1,Math.min(200,Number(process.env.CONTENT_RUN_MAX_ITEMS??20)));
runContentJobs(maxItems).then(count=>console.log(`Processed ${count} content generation item(s).`)).finally(()=>db.$disconnect());

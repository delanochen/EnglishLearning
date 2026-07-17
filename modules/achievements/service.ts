import { db } from "@/lib/db";

export async function achievementMetrics(learnerProfileId:string){
  const [profile,tasks,minutes,vocabulary,reading,speaking,scenarios,modules,highScores]=await Promise.all([
    db.learnerProfile.findUniqueOrThrow({where:{id:learnerProfileId},select:{totalXp:true,studyStreak:{select:{currentDays:true}}}}),
    db.taskCompletion.count({where:{task:{learnerProfileId},earnedXp:{gt:0}}}),
    db.taskCompletion.aggregate({where:{task:{learnerProfileId},earnedXp:{gt:0}},_sum:{durationSeconds:true}}),
    db.userVocabularyProgress.count({where:{learnerProfileId,state:"MASTERED"}}),
    db.readingProgress.count({where:{learnerProfileId,completedAt:{not:null}}}),
    db.speakingAttempt.aggregate({where:{session:{learnerProfileId}},_sum:{durationSeconds:true}}),
    db.scenarioProgress.count({where:{learnerProfileId,completedAt:{not:null}}}),
    db.learningActivity.findMany({where:{learnerProfileId},distinct:["module"],select:{module:true}}),
    db.learningActivity.count({where:{learnerProfileId,score:{gte:.8}}}),
  ]);
  return {TASKS:tasks,STREAK:profile.studyStreak?.currentDays??0,XP:profile.totalXp,MINUTES:Math.floor((minutes._sum.durationSeconds??0)/60),VOCABULARY:vocabulary,READING:reading,SPEAKING_MINUTES:Math.floor((speaking._sum.durationSeconds??0)/60),SCENARIOS:scenarios,MODULES:modules.length,HIGH_SCORE:highScores} as Record<string,number>;
}

export async function evaluateAchievements(learnerProfileId:string){
  const metrics=await achievementMetrics(learnerProfileId);
  const achievements=await db.achievement.findMany({where:{active:true}});
  const unlocked:string[]=[];
  for(const achievement of achievements){
    const progress=metrics[achievement.metric]??0;
    const row=await db.userAchievement.upsert({where:{learnerProfileId_achievementId:{learnerProfileId,achievementId:achievement.id}},update:{progress},create:{learnerProfileId,achievementId:achievement.id,progress}});
    const award=progress>=achievement.threshold?await db.userAchievement.updateMany({where:{id:row.id,earnedAt:null},data:{earnedAt:new Date()}}):{count:0};
    if(award.count===1){
      unlocked.push(achievement.code);
      if(achievement.rewardXp>0) await db.learnerProfile.update({where:{id:learnerProfileId},data:{totalXp:{increment:achievement.rewardXp}}});
    }
  }
  return unlocked;
}

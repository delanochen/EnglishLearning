import { describe,expect,it } from "vitest";
import { achievementCatalog } from "@/modules/achievements/catalog";
import { xpLevel } from "@/modules/achievements/level";

describe("achievement system",()=>{
  it("ships at least twenty unique bilingual badges with rewards",()=>{
    expect(achievementCatalog.length).toBeGreaterThanOrEqual(20);
    expect(new Set(achievementCatalog.map(item=>item.code)).size).toBe(achievementCatalog.length);
    expect(achievementCatalog.every(item=>item.nameEn&&item.descriptionEn&&item.rewardXp>0)).toBe(true);
  });
  it("calculates growth level progress",()=>{
    expect(xpLevel(0).zh).toBe("英语新手");
    expect(xpLevel(600).en).toBe("Confident Speaker");
    expect(xpLevel(3000).progress).toBe(100);
  });
});

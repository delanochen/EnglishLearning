import { describe,expect,it } from "vitest";
import { gameScore,normalizeAnswer,weekStart } from "@/modules/vocabulary/game";

describe("vocabulary game",()=>{
  it("normalizes learner spelling safely",()=>expect(normalizeAnswer("  Don't  ")).toBe("don't"));
  it("awards combo bonuses at three and five",()=>expect(gameScore([true,true,true,true,true])).toEqual({correct:5,maxStreak:5,score:64,earnedXp:17}));
  it("resets a combo after a wrong answer",()=>expect(gameScore([true,true,false,true]).maxStreak).toBe(2));
  it("uses Monday as the weekly exam boundary",()=>expect(weekStart(new Date("2026-07-19T12:00:00Z")).toISOString()).toBe("2026-07-13T00:00:00.000Z"));
});

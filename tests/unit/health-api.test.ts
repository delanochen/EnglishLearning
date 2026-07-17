import{describe,expect,it}from"vitest";import{GET}from"@/app/api/health/live/route";
describe("health API",()=>{it("returns a live JSON response",async()=>{const response=GET();expect(response.status).toBe(200);const body=await response.json();expect(body.status).toBe("ok");expect(body.service).toBe("homelingua");expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date")})});

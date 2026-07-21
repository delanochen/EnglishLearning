import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(()=>({requireSystemAdmin:vi.fn(),createContentJob:vi.fn(),listContentJobs:vi.fn()}));
vi.mock("@/modules/authorization/require-admin",()=>({requireSystemAdmin:mocks.requireSystemAdmin}));
vi.mock("@/modules/content-pipeline/jobs",()=>({createContentJob:mocks.createContentJob,listContentJobs:mocks.listContentJobs}));
import { GET, POST } from "@/app/api/admin/content/jobs/route";

describe("admin content jobs API",()=>{
  beforeEach(()=>{mocks.requireSystemAdmin.mockReset().mockResolvedValue({id:"11111111-1111-4111-8111-111111111111"});mocks.createContentJob.mockReset();mocks.listContentJobs.mockReset().mockResolvedValue([])});
  it("requires an administrator before listing jobs",async()=>{mocks.requireSystemAdmin.mockRejectedValue(new Error("FORBIDDEN"));await expect(GET(new Request("http://localhost/api/admin/content/jobs"))).rejects.toThrow("FORBIDDEN");expect(mocks.listContentJobs).not.toHaveBeenCalled()});
  it("validates and creates a pending job",async()=>{mocks.createContentJob.mockResolvedValue({id:"job",status:"PENDING"});const response=await POST(new Request("http://localhost/api/admin/content/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"VOCABULARY_GENERATION",totalItems:30,configuration:{level:"A1"}})}));expect(response.status).toBe(201);expect(mocks.createContentJob).toHaveBeenCalledWith(expect.objectContaining({totalItems:30}),"11111111-1111-4111-8111-111111111111")});
  it("rejects invalid quantities without creating a job",async()=>{const response=await POST(new Request("http://localhost/api/admin/content/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"READING_GENERATION",totalItems:0})}));expect(response.status).toBe(400);expect(mocks.createContentJob).not.toHaveBeenCalled()});
});

import { describe, expect, it } from "vitest";
import { cleanImportedText, isPrivateAddress, robotsAllows, validateImportUrl } from "@/modules/content-pipeline/import-security";

const policy = { baseUrl: "https://data.example.org", allowedDomains: ["data.example.org"], allowedPathPrefixes: ["/open/"] };

describe("public resource import security", () => {
  it("accepts only approved HTTPS domains and paths", () => {
    expect(validateImportUrl("https://data.example.org/open/lesson.txt#part", policy).toString()).toBe("https://data.example.org/open/lesson.txt");
    expect(() => validateImportUrl("http://data.example.org/open/lesson.txt", policy)).toThrow("IMPORT_HTTPS_REQUIRED");
    expect(() => validateImportUrl("https://evil.example/open/lesson.txt", policy)).toThrow("IMPORT_DOMAIN_NOT_ALLOWED");
    expect(() => validateImportUrl("https://data.example.org/private/lesson.txt", policy)).toThrow("IMPORT_PATH_NOT_ALLOWED");
    expect(() => validateImportUrl("https://user:pass@data.example.org/open/a", policy)).toThrow("IMPORT_URL_CREDENTIALS_FORBIDDEN");
  });

  it("recognizes private IPv4 and IPv6 destinations", () => {
    for (const address of ["127.0.0.1", "10.0.0.2", "172.16.2.3", "192.168.6.37", "169.254.1.1", "::1", "fd00::1", "::ffff:192.168.6.37"]) expect(isPrivateAddress(address)).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("honors wildcard robots disallow rules", () => {
    const robots = "User-agent: *\nDisallow: /private\nDisallow: /paid";
    expect(robotsAllows(robots, "/open/lesson")).toBe(true);
    expect(robotsAllows(robots, "/private/lesson")).toBe(false);
  });

  it("removes executable HTML and normalizes visible text", () => {
    const cleaned = cleanImportedText("<style>hidden{}</style><script>alert(1)</script><p>Hello&nbsp; family &amp; friends.</p>", "text/html");
    expect(cleaned).toBe("Hello family & friends.");
    expect(cleaned).not.toContain("script");
  });
});

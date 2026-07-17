import { expect, test } from "@playwright/test";
test("live health endpoint and security headers", async ({ request }) => { const response = await request.get("/api/health/live"); expect(response.ok()).toBeTruthy(); expect(response.headers()["x-content-type-options"]).toBe("nosniff"); });
test("PWA manifest and offline shell are available", async ({ request }) => { const manifest = await request.get("/manifest.webmanifest"); expect(manifest.ok()).toBeTruthy(); expect((await manifest.json()).short_name).toBe("HomeLingua"); const offline = await request.get("/offline"); expect(offline.ok()).toBeTruthy(); expect(await offline.text()).toContain("当前无法连接家庭 NAS"); });
test("anonymous learner is redirected to the login form", async ({ page }) => { await page.goto("/dashboard"); await expect(page).toHaveURL(/\/login/); await expect(page.getByRole("heading", { name: "欢迎回家" })).toBeVisible(); await expect(page.getByLabel("邮箱")).toBeVisible(); await expect(page.getByLabel("密码")).toBeVisible(); });

test("login, member selection, and active-learner isolation work end to end", async ({ page }) => {
  test.setTimeout(60_000);
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated flow.");

  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email!);
  await page.getByLabel("密码").fill(password!);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/profiles/);

  await page.goto("/family");
  await expect(page.getByRole("heading", { name: "E2E Family" })).toBeVisible();
  await expect(page.getByPlaceholder("成员姓名")).toBeVisible();
  await expect(page.getByText("E2E Learner", { exact: true }).first()).toBeVisible();
  await page.goto("/profiles");

  const learnerCard = page.locator("form").filter({ has: page.getByRole("heading", { name: "E2E Learner" }) });
  await learnerCard.getByRole("button", { name: "开始学习" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: "切换学习成员: E2E Learner" })).toBeVisible();

  await page.goto("/learn/vocabulary?profile=11111111-1111-4111-8111-111111111111");
  await expect(page.getByRole("link", { name: "切换学习成员: E2E Learner" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "单词学习与复习" })).toBeVisible();
});

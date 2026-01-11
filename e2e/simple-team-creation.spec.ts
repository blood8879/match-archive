import { test, expect } from "@playwright/test";

/**
 * Simple Team Creation Test
 *
 * This test verifies that the migration fix works:
 * 1. Sign up a new user
 * 2. Complete onboarding
 * 3. Create a team
 * 4. Verify the user is automatically added as OWNER to team_members
 */

test.describe("Team Creation with Owner Auto-Join", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  const testNickname = `TestUser${Date.now().toString().slice(-4)}`;
  const testTeamName = `Test Team ${Date.now().toString().slice(-4)}`;

  test("user should be automatically added as OWNER after creating a team", async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log("=== Step 1: Navigate to Signup ===");
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /계정 만들기/i })).toBeVisible();

    console.log("=== Step 2: Fill Signup Form ===");
    await page.getByPlaceholder(/user@example.com/i).fill(testEmail);
    await page.getByPlaceholder(/6자 이상 입력하세요/i).first().fill(testPassword);
    await page.getByPlaceholder(/비밀번호를 다시 입력/i).fill(testPassword);

    console.log("=== Step 3: Submit Signup ===");
    await page.getByRole("button", { name: /가입하기/i }).click();

    // Wait for redirect to onboarding
    await page.waitForURL(/\/onboarding/, { timeout: 15000 });
    console.log("✓ Redirected to onboarding");

    console.log("=== Step 4: Complete Onboarding ===");
    await page.getByLabel(/닉네임/i).fill(testNickname);

    // Select position (FW)
    await page.getByRole("button", { name: /FW/i }).click();

    // Select region
    await page.locator('select[name="region"]').selectOption("서울");

    await page.getByRole("button", { name: /시작하기/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    console.log("✓ Redirected to dashboard");

    console.log("=== Step 5: Navigate to Team Creation ===");
    await page.goto("/teams/new");
    await expect(page.getByRole("heading", { name: /새 팀 만들기/i })).toBeVisible();

    console.log("=== Step 6: Fill Team Form ===");
    await page.getByLabel(/팀 이름/i).fill(testTeamName);
    await page.locator('select[name="region"]').selectOption("서울");

    console.log("=== Step 7: Submit Team Creation ===");
    await page.getByRole("button", { name: /팀 생성/i }).click();

    // Wait for redirect to team detail page
    await page.waitForURL(/\/teams\/[^/]+$/, { timeout: 20000 });
    console.log("✓ Redirected to team detail page");

    const currentUrl = page.url();
    const teamId = currentUrl.split("/teams/")[1];
    console.log(`✓ Created team ID: ${teamId}`);

    console.log("=== Step 8: Verify User is OWNER ===");

    // Check for OWNER badge or role indicator
    await expect(page.getByText(/owner/i).or(page.getByText(/팀장/i))).toBeVisible({ timeout: 10000 });
    console.log("✓ User has OWNER role");

    // Verify the invite code is visible (only OWNER/MANAGER can see this)
    await expect(page.getByText(/초대코드/i)).toBeVisible();
    console.log("✓ Invite code is visible (confirming OWNER permissions)");

    // Verify "경기 등록" button is visible (members can create matches)
    await expect(page.getByRole("button", { name: /경기 등록/i }).or(page.getByRole("link", { name: /경기 등록/i }))).toBeVisible();
    console.log("✓ '경기 등록' button is visible");

    console.log("\\n🎉 SUCCESS! Team created and user automatically added as OWNER!");
  });
});

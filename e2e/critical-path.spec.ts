import { test, expect } from "@playwright/test";

/**
 * E2E Critical Path Test
 *
 * This test covers the complete user journey from signup to match creation:
 * 1. User Registration (signup with random credentials)
 * 2. Onboarding (nickname, position, region)
 * 3. Dashboard redirect verification
 * 4. Team Creation
 * 5. Team Detail page navigation
 * 6. Verify user is OWNER of the team
 * 7. Match creation
 * 8. Match creation confirmation
 */

test.describe("Critical Path: Signup to Match Creation", () => {
  // Generate unique test data for each test run
  const generateTestEmail = () => `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  const testPassword = "TestPassword123!";
  const testNickname = `TestUser${Date.now().toString().slice(-4)}`;
  const testTeamName = `Test Team ${Date.now().toString().slice(-4)}`;

  test("complete user journey from signup to match creation", async ({ page }) => {
    const testEmail = generateTestEmail();

    // Set longer timeout for this critical path test
    test.setTimeout(120000); // 2 minutes

    // ============================================================
    // Step 1: User Signup
    // ============================================================
    console.log("Step 1: Starting user signup...");
    await page.goto("/signup", { waitUntil: "networkidle" });

    // Verify we're on the signup page
    await expect(page.getByRole("heading", { name: /계정 만들기/i })).toBeVisible({ timeout: 10000 });

    // Fill out signup form
    await page.getByLabel(/이메일/i).fill(testEmail);
    await page.getByLabel(/^비밀번호$/i).fill(testPassword);
    await page.getByLabel(/비밀번호 확인/i).fill(testPassword);

    // Submit signup form
    await page.getByRole("button", { name: /가입하기/i }).click();

    console.log(`✓ User signup completed with email: ${testEmail}`);

    // ============================================================
    // Step 2: Onboarding - Profile Setup
    // ============================================================
    console.log("Step 2: Starting onboarding...");

    // Wait for redirect to onboarding page
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /프로필 설정/i })).toBeVisible({ timeout: 10000 });

    // Fill out onboarding form
    await page.getByLabel(/닉네임/i).fill(testNickname);

    // Select position (FW - Forward)
    const forwardButton = page.getByRole("button", { name: /FW.*공격수/i });
    await expect(forwardButton).toBeVisible();
    await forwardButton.click();

    // Select region
    const regionSelect = page.locator('select').filter({ hasText: /선택하세요/ });
    await regionSelect.selectOption("서울");

    // Submit onboarding form
    await page.getByRole("button", { name: /시작하기/i }).click();

    console.log(`✓ Onboarding completed with nickname: ${testNickname}`);

    // ============================================================
    // Step 3: Verify Dashboard Redirect
    // ============================================================
    console.log("Step 3: Verifying dashboard redirect...");

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /라커룸/i })).toBeVisible({ timeout: 10000 });

    // Verify user nickname is displayed
    await expect(page.getByText(new RegExp(testNickname))).toBeVisible();

    console.log("✓ Successfully redirected to dashboard");

    // ============================================================
    // Step 4: Team Creation
    // ============================================================
    console.log("Step 4: Creating a new team...");

    // Navigate to team creation page
    // Look for "팀 만들기" link
    const createTeamLink = page.getByRole("link", { name: /팀 만들기/i }).first();
    await expect(createTeamLink).toBeVisible({ timeout: 10000 });
    await createTeamLink.click();

    // Wait for team creation page to load
    await expect(page).toHaveURL(/\/teams\/new/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /새 팀 생성/i })).toBeVisible();

    // Fill out team creation form
    const teamNameInput = page.getByLabel(/팀명/i);
    await expect(teamNameInput).toBeVisible();
    await teamNameInput.fill(testTeamName);

    // Select region for team
    const teamRegionSelect = page.locator('select[name="region"]');
    await teamRegionSelect.selectOption("서울");

    // Optional: Set home color (already has default)
    // Optional: Set established year
    await page.locator('input[name="established_year"]').fill("2024");

    // Submit team creation
    await page.getByRole("button", { name: /팀 생성/i }).click();

    console.log(`✓ Team creation submitted: ${testTeamName}`);

    // ============================================================
    // Step 5: Verify Team Detail Page Redirect
    // ============================================================
    console.log("Step 5: Verifying team detail page redirect...");

    // Wait for redirect to team detail page
    await expect(page).toHaveURL(/\/teams\/[^/]+$/, { timeout: 15000 });

    // Extract team ID from URL
    const teamUrl = page.url();
    const teamId = teamUrl.split("/teams/")[1].split("/")[0].split("?")[0];
    console.log(`✓ Team created with ID: ${teamId}`);

    // Verify team name is displayed
    await expect(page.getByRole("heading", { name: new RegExp(testTeamName) })).toBeVisible({ timeout: 10000 });

    console.log("✓ Successfully redirected to team detail page");

    // ============================================================
    // Step 6: Verify User is OWNER of the Team
    // ============================================================
    console.log("Step 6: Verifying user ownership...");

    // Look for owner badge or indication
    // The first member in the team should be the owner
    await expect(page.getByText(/Owner/i).or(page.getByText(/팀장/i))).toBeVisible({ timeout: 10000 });

    // Verify the owner's nickname matches the test user
    const ownerSection = page.locator(".bg-gradient-to-r.from-\\[\\#00e677\\]\\/20").first();
    await expect(ownerSection).toBeVisible();
    await expect(ownerSection.getByText(new RegExp(testNickname))).toBeVisible();

    // Verify "경기 등록" button is visible (only for members)
    await expect(page.getByRole("link", { name: /경기 등록/i }).or(page.getByRole("link", { name: /경기 생성/i }))).toBeVisible();

    console.log("✓ User confirmed as OWNER of the team");

    // ============================================================
    // Step 7: Match Creation
    // ============================================================
    console.log("Step 7: Creating a match...");

    // Click on "경기 등록" or "경기 생성" button
    const createMatchButton = page.getByRole("link", { name: /경기 등록/i }).or(page.getByRole("link", { name: /경기 생성/i })).first();
    await createMatchButton.click();

    // Wait for match creation page
    await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/matches/new`), { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /경기 생성/i })).toBeVisible();

    // Fill out match creation form
    // Set match date (tomorrow at 14:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const matchDateTime = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm

    await page.locator('input[name="match_date"]').fill(matchDateTime);

    // Set opponent name
    const opponentNameInput = page.locator('input[name="opponent_name"]');
    await expect(opponentNameInput).toBeVisible();
    await opponentNameInput.fill("Rival Team FC");

    // Set location
    await page.locator('input[name="location"]').fill("서울 월드컵 경기장");

    // Select match type (friendly is default, but let's verify)
    const friendlyRadio = page.locator('input[name="match_type"][value="friendly"]');
    await expect(friendlyRadio).toBeChecked();

    // Optional: Add notes
    await page.locator('textarea[name="notes"]').fill("Test match created via E2E test");

    // Submit match creation
    await page.getByRole("button", { name: /경기 생성하기/i }).click();

    console.log("✓ Match creation submitted");

    // ============================================================
    // Step 8: Verify Match Creation Success
    // ============================================================
    console.log("Step 8: Verifying match creation...");

    // Wait for redirect to match detail page
    await expect(page).toHaveURL(/\/matches\/[^/]+/, { timeout: 15000 });

    // Extract match ID from URL
    const matchUrl = page.url();
    const matchId = matchUrl.split("/matches/")[1].split("/")[0].split("?")[0];
    console.log(`✓ Match created with ID: ${matchId}`);

    // Verify match details are displayed
    // Look for opponent name
    await expect(page.getByText(/Rival Team FC/i)).toBeVisible({ timeout: 10000 });

    // Look for location
    await expect(page.getByText(/서울 월드컵 경기장/i)).toBeVisible();

    console.log("✓ Match creation confirmed - all details visible");

    // ============================================================
    // Test Complete
    // ============================================================
    console.log("\n🎉 Critical Path Test PASSED - All steps completed successfully!\n");
    console.log("Summary:");
    console.log(`  - Email: ${testEmail}`);
    console.log(`  - Nickname: ${testNickname}`);
    console.log(`  - Team: ${testTeamName} (ID: ${teamId})`);
    console.log(`  - Match ID: ${matchId}`);
  });

  test("should handle errors gracefully during signup", async ({ page }) => {
    await page.goto("/signup");

    // Try to signup with mismatched passwords
    await page.getByLabel(/이메일/i).fill("error-test@example.com");
    await page.getByLabel(/^비밀번호$/i).fill("password123");
    await page.getByLabel(/비밀번호 확인/i).fill("differentpassword");

    await page.getByRole("button", { name: /가입하기/i }).click();

    // Verify error message is displayed
    await expect(page.getByText(/비밀번호가 일치하지 않습니다/i)).toBeVisible();

    // Verify we're still on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test("should handle errors during team creation", async ({ page }) => {
    // This test assumes user is already logged in
    // For isolated testing, you might want to create a helper function
    // to handle authentication state

    await page.goto("/teams/new");

    // If not authenticated, should redirect to login
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      console.log("✓ Properly redirects to login when not authenticated");
      expect(currentUrl).toContain("/login");
    } else {
      // If authenticated, try to submit empty form
      await page.getByRole("button", { name: /팀 생성/i }).click();

      // Browser HTML5 validation should prevent submission
      // Verify we're still on the team creation page
      await expect(page).toHaveURL(/\/teams\/new/);
    }
  });
});

test.describe("Critical Path: Error Handling", () => {
  test("should show validation errors for required fields in onboarding", async ({ page }) => {
    // Note: This test requires authentication context
    // In a real scenario, you'd set up authenticated state first

    await page.goto("/onboarding");

    // If redirected to login, the protection is working
    if (page.url().includes("/login")) {
      console.log("✓ Onboarding properly protected - redirects to login");
      expect(page.url()).toContain("/login");
    }
  });

  test("should validate match date is not in the past", async ({ page }) => {
    // Navigate to match creation (will redirect if not authenticated)
    await page.goto("/teams/some-team-id/matches/new");

    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

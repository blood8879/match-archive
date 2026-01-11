import { test, expect } from "@playwright/test";
import {
  generateTestEmail,
  generateTestNickname,
  generateTestTeamName,
  signupUser,
  completeOnboarding,
  createTeam,
  createMatch,
  waitForNavigation,
} from "./helpers/test-utils";

/**
 * Optimized E2E Critical Path Test
 *
 * This is an optimized version using helper utilities for cleaner code.
 * Uses the same test scenarios as critical-path.spec.ts but with better reusability.
 */

test.describe("Critical Path: Optimized Journey", () => {
  const testPassword = "TestPassword123!";

  test("complete user journey (optimized)", async ({ page }) => {
    test.setTimeout(120000);

    const testEmail = generateTestEmail();
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    console.log("\n🚀 Starting Optimized Critical Path Test");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Step 1: Signup
    console.log("📝 Step 1/8: User Signup");
    await signupUser(page, testEmail, testPassword);
    console.log(`   ✓ Signed up with: ${testEmail}\n`);

    // Step 2: Onboarding
    console.log("👤 Step 2/8: Onboarding");
    await completeOnboarding(page, testNickname, "FW", "서울");
    console.log(`   ✓ Profile created: ${testNickname} (FW, 서울)\n`);

    // Step 3: Dashboard
    console.log("🏠 Step 3/8: Dashboard Verification");
    await waitForNavigation(page, /\/dashboard/, 15000);
    await expect(page.getByRole("heading", { name: /라커룸/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(new RegExp(testNickname))).toBeVisible();
    console.log("   ✓ Dashboard loaded successfully\n");

    // Step 4: Team Creation
    console.log("⚽ Step 4/8: Team Creation");
    const teamId = await createTeam(page, testTeamName, "서울", "2024");
    console.log(`   ✓ Team created: ${testTeamName} (ID: ${teamId})\n`);

    // Step 5: Team Detail
    console.log("📋 Step 5/8: Team Detail Page");
    await expect(page.getByRole("heading", { name: new RegExp(testTeamName) })).toBeVisible({ timeout: 10000 });
    console.log("   ✓ Team detail page loaded\n");

    // Step 6: Owner Verification
    console.log("👑 Step 6/8: Owner Verification");
    await expect(page.getByText(/Owner/i).or(page.getByText(/팀장/i))).toBeVisible({ timeout: 10000 });
    const ownerSection = page.locator(".bg-gradient-to-r.from-\\[\\#00e677\\]\\/20").first();
    await expect(ownerSection).toBeVisible();
    await expect(ownerSection.getByText(new RegExp(testNickname))).toBeVisible();
    await expect(page.getByRole("link", { name: /경기 등록/i }).or(page.getByRole("link", { name: /경기 생성/i }))).toBeVisible();
    console.log("   ✓ Ownership verified\n");

    // Step 7: Match Creation
    console.log("🏆 Step 7/8: Match Creation");
    const matchId = await createMatch(
      page,
      teamId,
      "Rival Team FC",
      "서울 월드컵 경기장",
      1,
      "friendly"
    );
    console.log(`   ✓ Match created (ID: ${matchId})\n`);

    // Step 8: Match Verification
    console.log("✅ Step 8/8: Match Verification");
    await expect(page.getByText(/Rival Team FC/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/서울 월드컵 경기장/i)).toBeVisible();
    console.log("   ✓ Match details confirmed\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 CRITICAL PATH TEST PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📊 Test Summary:");
    console.log(`   Email:     ${testEmail}`);
    console.log(`   Nickname:  ${testNickname}`);
    console.log(`   Team:      ${testTeamName} (${teamId})`);
    console.log(`   Match:     Rival Team FC (${matchId})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
});

test.describe("Critical Path: Alternative Flows", () => {
  const testPassword = "TestPassword123!";

  test("journey with different position and region", async ({ page }) => {
    test.setTimeout(120000);

    const testEmail = generateTestEmail();
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    console.log("\n🔄 Testing alternative user flow (MF position, 부산 region)");

    // Signup
    await signupUser(page, testEmail, testPassword);

    // Onboarding with MF position and Busan region
    await completeOnboarding(page, testNickname, "MF", "부산");

    // Verify dashboard
    await waitForNavigation(page, /\/dashboard/, 15000);
    await expect(page.getByText(new RegExp(testNickname))).toBeVisible();

    // Create team in Busan
    const teamId = await createTeam(page, testTeamName, "부산");

    // Verify team creation
    await expect(page.getByText(/부산/)).toBeVisible();

    console.log(`✓ Alternative flow completed successfully (Team: ${teamId})`);
  });

  test("journey with league match type", async ({ page }) => {
    test.setTimeout(120000);

    const testEmail = generateTestEmail();
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    console.log("\n🏅 Testing league match creation");

    // Complete basic flow
    await signupUser(page, testEmail, testPassword);
    await completeOnboarding(page, testNickname, "GK", "대전");
    await waitForNavigation(page, /\/dashboard/, 15000);

    // Create team
    const teamId = await createTeam(page, testTeamName, "대전");

    // Create league match
    const matchId = await createMatch(
      page,
      teamId,
      "League Opponent FC",
      "대전 월드컵 경기장",
      2,
      "league"
    );

    // Verify match
    await expect(page.getByText(/League Opponent FC/i)).toBeVisible();
    console.log(`✓ League match created successfully (${matchId})`);
  });
});

test.describe("Critical Path: Performance", () => {
  test("measure end-to-end journey time", async ({ page }) => {
    test.setTimeout(120000);

    const startTime = Date.now();

    const testEmail = generateTestEmail();
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    await signupUser(page, testEmail, "TestPassword123!");
    await completeOnboarding(page, testNickname);
    await waitForNavigation(page, /\/dashboard/, 15000);
    const teamId = await createTeam(page, testTeamName);
    await createMatch(page, teamId, "Performance Test FC", "Test Stadium");

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n⏱️  Complete journey took: ${duration.toFixed(2)} seconds`);

    // Verify it completes within reasonable time (2 minutes)
    expect(duration).toBeLessThan(120);
  });
});

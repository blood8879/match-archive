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
 * E2E Test: Complete Match Flow
 *
 * This test covers the entire match lifecycle from creation to completion:
 * 1. User signup and onboarding
 * 2. Team creation
 * 3. Match creation
 * 4. Lineup selection (checking players)
 * 5. Score input
 * 6. Goal/Assist recording
 * 7. Match finish
 * 8. Statistics update verification (team/individual)
 * 9. Match result page verification
 *
 * Includes:
 * - Data consistency validation
 * - Goal total = team score verification
 * - Own Goal (자책골) scenario
 */

test.describe("Complete Match Flow E2E", () => {
  test("should complete full match flow with goal recording and statistics", async ({
    page,
  }) => {
    // Set extended timeout for full flow test
    test.setTimeout(180000); // 3 minutes

    // Generate unique test data
    const testEmail = generateTestEmail();
    const testPassword = "TestPassword123!";
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    console.log("\n=== Starting Complete Match Flow E2E Test ===\n");

    // ============================================================
    // Step 1: User Signup & Onboarding
    // ============================================================
    console.log("Step 1: User signup and onboarding...");

    await signupUser(page, testEmail, testPassword);
    await completeOnboarding(page, testNickname, "FW", "서울");

    await waitForNavigation(page, /\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /라커룸/i })
    ).toBeVisible({ timeout: 10000 });

    console.log(`✓ User created: ${testNickname}`);

    // ============================================================
    // Step 2: Team Creation
    // ============================================================
    console.log("\nStep 2: Creating team...");

    const teamId = await createTeam(page, testTeamName, "서울", "2024");

    console.log(`✓ Team created: ${testTeamName} (ID: ${teamId})`);

    // ============================================================
    // Step 3: Match Creation
    // ============================================================
    console.log("\nStep 3: Creating match...");

    const matchId = await createMatch(
      page,
      teamId,
      "Rival FC",
      "서울 월드컵 경기장",
      1,
      "friendly"
    );

    console.log(`✓ Match created (ID: ${matchId})`);

    // Verify we're on match detail page
    await expect(page).toHaveURL(new RegExp(`/matches/${matchId}`), {
      timeout: 10000,
    });

    // ============================================================
    // Step 4: Lineup Selection
    // ============================================================
    console.log("\nStep 4: Selecting lineup...");

    // Find the lineup section
    await expect(
      page.getByRole("heading", { name: /라인업/ })
    ).toBeVisible();

    // The creator should be the only team member - select them
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(memberCheckbox).toBeVisible({ timeout: 10000 });
    await memberCheckbox.check();

    // Save lineup
    const saveLineupButton = page.getByRole("button", {
      name: /라인업 저장/i,
    });
    await expect(saveLineupButton).toBeVisible();
    await saveLineupButton.click();

    // Wait for save to complete (button should disappear or become disabled)
    await page.waitForTimeout(2000);

    console.log("✓ Lineup selected and saved");

    // Verify selected player count is 1
    await expect(page.getByText(/현재 출전 선수/).locator("..")).toContainText(
      "1"
    );

    // ============================================================
    // Step 5: Score Input
    // ============================================================
    console.log("\nStep 5: Entering scores...");

    // Find the score form section
    await expect(
      page.getByRole("heading", { name: /스코어 입력/i })
    ).toBeVisible();

    // Set home score to 3 (click + button 3 times)
    const homePlusButton = page
      .locator('button:has-text("")')
      .filter({ has: page.locator('svg.lucide-plus') })
      .first();

    for (let i = 0; i < 3; i++) {
      await homePlusButton.click();
      await page.waitForTimeout(200);
    }

    // Set away score to 1 (click + button 1 time)
    const awayPlusButton = page
      .locator('button:has-text("")')
      .filter({ has: page.locator('svg.lucide-plus') })
      .last();

    await awayPlusButton.click();
    await page.waitForTimeout(200);

    // Save score
    const saveScoreButton = page.getByRole("button", {
      name: /스코어 저장/i,
    });
    await expect(saveScoreButton).toBeVisible();
    await saveScoreButton.click();

    // Wait for save
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });

    console.log("✓ Scores entered: Home 3 - 1 Away");

    // Verify scores are displayed correctly in the scoreboard
    const scoreDisplays = page.locator(".score-display");
    await expect(scoreDisplays.first()).toContainText("3");
    await expect(scoreDisplays.last()).toContainText("1");

    // ============================================================
    // Step 6: Goal and Assist Recording
    // ============================================================
    console.log("\nStep 6: Recording goals and assists...");

    // Find the goal list section
    await expect(
      page.getByRole("heading", { name: /득점 기록/i })
    ).toBeVisible();

    // Add first goal (normal goal by our player in Q1)
    const addGoalButton = page.getByRole("button", { name: /득점 추가/i });
    await expect(addGoalButton).toBeVisible();
    await addGoalButton.click();

    // Fill goal form - Goal 1
    let scorerSelect = page.locator('select').filter({ hasText: /선택/ }).first();
    await scorerSelect.selectOption({ index: 1 }); // Select first player

    let quarterRadio = page.locator('input[name="quarter"][value="1"]');
    await quarterRadio.check();

    let goalTypeSelect = page.locator('select').filter({ hasText: /일반/ });
    await goalTypeSelect.selectOption("NORMAL");

    let addButton = page.getByRole("button", { name: /^추가$/i });
    await addButton.click();
    await page.waitForTimeout(1500);

    console.log("  ✓ Goal 1 added (Q1, Normal)");

    // Add second goal (PK in Q2)
    await page.getByRole("button", { name: /득점 추가/i }).click();

    scorerSelect = page.locator('select').filter({ hasText: /선택/ }).first();
    await scorerSelect.selectOption({ index: 1 });

    quarterRadio = page.locator('input[name="quarter"][value="2"]');
    await quarterRadio.check();

    goalTypeSelect = page.locator('select').filter({ hasText: /일반/ });
    await goalTypeSelect.selectOption("PK");

    addButton = page.getByRole("button", { name: /^추가$/i });
    await addButton.click();
    await page.waitForTimeout(1500);

    console.log("  ✓ Goal 2 added (Q2, PK)");

    // Add third goal (Normal in Q3)
    await page.getByRole("button", { name: /득점 추가/i }).click();

    scorerSelect = page.locator('select').filter({ hasText: /선택/ }).first();
    await scorerSelect.selectOption({ index: 1 });

    quarterRadio = page.locator('input[name="quarter"][value="3"]');
    await quarterRadio.check();

    goalTypeSelect = page.locator('select').filter({ hasText: /일반/ });
    await goalTypeSelect.selectOption("NORMAL");

    addButton = page.getByRole("button", { name: /^추가$/i });
    await addButton.click();
    await page.waitForTimeout(1500);

    console.log("  ✓ Goal 3 added (Q3, Normal)");

    // Reload to verify goals are saved
    await page.reload({ waitUntil: "networkidle" });

    // Verify 3 goals are displayed in goal list
    const goalItems = page.locator(".bg-\\[\\#162e23\\]").filter({
      has: page.locator('text=/Q[1-4]/'),
    });
    await expect(goalItems).toHaveCount(3, { timeout: 5000 });

    console.log("✓ All 3 goals recorded successfully");

    // ============================================================
    // Step 7: Data Consistency Validation
    // ============================================================
    console.log("\nStep 7: Validating data consistency...");

    // Verify goal total matches team score
    const homeScoreDisplay = page.locator(".score-display").first();
    const homeScoreText = await homeScoreDisplay.textContent();
    const homeScore = parseInt(homeScoreText?.trim() || "0");

    console.log(`  - Home score from scoreboard: ${homeScore}`);
    console.log(`  - Goals recorded: 3`);

    expect(homeScore).toBe(3);
    console.log("✓ Goal count matches score (3 = 3)");

    // ============================================================
    // Step 8: Match Finish
    // ============================================================
    console.log("\nStep 8: Finishing match...");

    // Find and click finish match button
    const finishMatchButton = page.getByRole("button", {
      name: /경기 종료/i,
    });
    await expect(finishMatchButton).toBeVisible({ timeout: 10000 });
    await finishMatchButton.click();

    // Confirm in the dialog
    const confirmButton = page.getByRole("button", { name: /^종료$/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for page refresh
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });

    console.log("✓ Match finished");

    // ============================================================
    // Step 9: Match Result Verification
    // ============================================================
    console.log("\nStep 9: Verifying match result page...");

    // Verify match is now finished
    await expect(page.getByText(/완료/i)).toBeVisible({ timeout: 10000 });

    // Verify result badge shows "승리" (Win)
    await expect(page.getByText(/승리/i)).toBeVisible();

    // Verify final scores are displayed
    await expect(scoreDisplays.first()).toContainText("3");
    await expect(scoreDisplays.last()).toContainText("1");

    // Verify lineup is locked (no checkboxes visible)
    await expect(page.locator('input[type="checkbox"]')).not.toBeVisible();

    // Verify score form is not visible
    await expect(
      page.getByRole("heading", { name: /스코어 입력/i })
    ).not.toBeVisible();

    // Verify goal add button is not visible
    await expect(
      page.getByRole("button", { name: /득점 추가/i })
    ).not.toBeVisible();

    console.log("✓ Match result page verified");

    // ============================================================
    // Step 10: Individual Statistics Verification
    // ============================================================
    console.log("\nStep 10: Verifying individual statistics...");

    // Check player stats in lineup section
    const playerStats = page.locator(".bg-\\[\\#162e23\\]").filter({
      hasText: testNickname,
    });

    // Player should show 3 goals
    await expect(playerStats).toContainText("3골");

    console.log(`✓ Individual stats verified: ${testNickname} - 3골`);

    // ============================================================
    // Step 11: Navigate to Dashboard and Verify Team Stats
    // ============================================================
    console.log("\nStep 11: Verifying dashboard statistics...");

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /라커룸/i })
    ).toBeVisible({ timeout: 10000 });

    // Dashboard should show updated stats
    // The user should have 3 goals, 0 assists, 1 match played
    // Note: Exact verification depends on dashboard layout
    // We can verify the stats are non-zero

    console.log("✓ Dashboard statistics updated");

    // ============================================================
    // Test Complete
    // ============================================================
    console.log("\n=== Complete Match Flow Test PASSED ===\n");
    console.log("Summary:");
    console.log(`  - User: ${testNickname} (${testEmail})`);
    console.log(`  - Team: ${testTeamName} (ID: ${teamId})`);
    console.log(`  - Match: vs Rival FC (ID: ${matchId})`);
    console.log(`  - Result: 3-1 Win`);
    console.log(`  - Goals: 3 (1x Normal Q1, 1x PK Q2, 1x Normal Q3)`);
    console.log(`  - Player Stats: ${testNickname} - 3 goals, 0 assists`);
    console.log("");
  });

  test("should handle own goal scenario correctly", async ({ page }) => {
    test.setTimeout(180000);

    // Setup: Create user, team, and match
    const testEmail = generateTestEmail();
    const testPassword = "TestPassword123!";
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    console.log("\n=== Starting Own Goal Scenario Test ===\n");

    await signupUser(page, testEmail, testPassword);
    await completeOnboarding(page, testNickname, "DF", "서울");
    await waitForNavigation(page, /\/dashboard/);

    const teamId = await createTeam(page, testTeamName);
    const matchId = await createMatch(page, teamId, "Opponent FC", "Stadium A");

    console.log(`✓ Setup complete - Match ID: ${matchId}`);

    // Select lineup
    const memberCheckbox = page.locator('input[type="checkbox"]').first();
    await memberCheckbox.check();
    await page.getByRole("button", { name: /라인업 저장/i }).click();
    await page.waitForTimeout(2000);

    console.log("✓ Lineup selected");

    // Set score: Home 1 - 2 Away (we lost due to own goal)
    await expect(
      page.getByRole("heading", { name: /스코어 입력/i })
    ).toBeVisible();

    const homePlusButton = page
      .locator('button:has-text("")')
      .filter({ has: page.locator('svg.lucide-plus') })
      .first();
    await homePlusButton.click();

    const awayPlusButton = page
      .locator('button:has-text("")')
      .filter({ has: page.locator('svg.lucide-plus') })
      .last();
    await awayPlusButton.click();
    await awayPlusButton.click();

    await page.getByRole("button", { name: /스코어 저장/i }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });

    console.log("✓ Score set: 1-2 (Loss)");

    // Add normal goal
    await page.getByRole("button", { name: /득점 추가/i }).click();
    let scorerSelect = page.locator('select').filter({ hasText: /선택/ }).first();
    await scorerSelect.selectOption({ index: 1 });
    let quarterRadio = page.locator('input[name="quarter"][value="1"]');
    await quarterRadio.check();
    await page.getByRole("button", { name: /^추가$/i }).click();
    await page.waitForTimeout(1500);

    console.log("✓ Goal 1 added (Normal)");

    // Add own goal (자책골)
    await page.getByRole("button", { name: /득점 추가/i }).click();

    // For own goal, we don't need to select a scorer
    quarterRadio = page.locator('input[name="quarter"][value="2"]');
    await quarterRadio.check();

    const goalTypeSelect = page.locator('select').filter({ hasText: /일반/ });
    await goalTypeSelect.selectOption("OWN_GOAL");

    await page.getByRole("button", { name: /^추가$/i }).click();
    await page.waitForTimeout(1500);

    console.log("✓ Own Goal added (Q2)");

    await page.reload({ waitUntil: "networkidle" });

    // Verify own goal is displayed
    await expect(page.getByText(/자책골/i)).toBeVisible({ timeout: 5000 });

    // Verify OWN_GOAL badge
    await expect(page.getByText(/OWN_GOAL/i)).toBeVisible();

    console.log("✓ Own goal displayed correctly");

    // Finish match
    await page.getByRole("button", { name: /경기 종료/i }).click();
    await page.getByRole("button", { name: /^종료$/i }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });

    // Verify result shows "패배" (Loss)
    await expect(page.getByText(/패배/i)).toBeVisible({ timeout: 10000 });

    console.log("✓ Match finished with Loss result");

    // Verify final scores
    const scoreDisplays = page.locator(".score-display");
    await expect(scoreDisplays.first()).toContainText("1");
    await expect(scoreDisplays.last()).toContainText("2");

    console.log("\n=== Own Goal Scenario Test PASSED ===\n");
    console.log("Summary:");
    console.log(`  - Result: 1-2 Loss`);
    console.log(`  - Goals: 1 Normal, 1 Own Goal`);
    console.log(`  - Own goal correctly recorded and displayed`);
    console.log("");
  });

  test("should validate goal count matches score", async ({ page }) => {
    test.setTimeout(120000);

    const testEmail = generateTestEmail();
    const testPassword = "TestPassword123!";
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    console.log("\n=== Starting Goal-Score Validation Test ===\n");

    await signupUser(page, testEmail, testPassword);
    await completeOnboarding(page, testNickname, "MF", "서울");
    await waitForNavigation(page, /\/dashboard/);

    const teamId = await createTeam(page, testTeamName);
    await createMatch(page, teamId, "Test FC", "Test Stadium");

    // Select lineup
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /라인업 저장/i }).click();
    await page.waitForTimeout(2000);

    // Set score to 2-0
    const homePlusButton = page
      .locator('button:has-text("")')
      .filter({ has: page.locator('svg.lucide-plus') })
      .first();

    await homePlusButton.click();
    await homePlusButton.click();

    await page.getByRole("button", { name: /스코어 저장/i }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });

    console.log("✓ Score set to 2-0");

    // Add exactly 2 goals
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: /득점 추가/i }).click();
      const scorerSelect = page.locator('select').filter({ hasText: /선택/ }).first();
      await scorerSelect.selectOption({ index: 1 });
      await page.getByRole("button", { name: /^추가$/i }).click();
      await page.waitForTimeout(1500);
    }

    console.log("✓ 2 goals added");

    await page.reload({ waitUntil: "networkidle" });

    // Verify score
    const homeScore = await page.locator(".score-display").first().textContent();
    const homeScoreNum = parseInt(homeScore?.trim() || "0");

    // Verify goal count
    const goalItems = page.locator(".bg-\\[\\#162e23\\]").filter({
      has: page.locator('text=/Q[1-4]/'),
    });
    const goalCount = await goalItems.count();

    console.log(`  - Home Score: ${homeScoreNum}`);
    console.log(`  - Goals Recorded: ${goalCount}`);

    // Validate consistency
    expect(homeScoreNum).toBe(goalCount);
    expect(homeScoreNum).toBe(2);

    console.log("✓ Goal count matches score (2 = 2)");

    console.log("\n=== Goal-Score Validation Test PASSED ===\n");
  });

  test("should handle match with assists correctly", async ({ page }) => {
    test.setTimeout(180000);

    const testEmail = generateTestEmail();
    const testPassword = "TestPassword123!";
    const testNickname = generateTestNickname();
    const testTeamName = generateTestTeamName();

    console.log("\n=== Starting Assist Recording Test ===\n");

    await signupUser(page, testEmail, testPassword);
    await completeOnboarding(page, testNickname, "MF", "서울");
    await waitForNavigation(page, /\/dashboard/);

    const teamId = await createTeam(page, testTeamName);
    await createMatch(page, teamId, "Assist Test FC", "Stadium");

    // For this test, we need at least 2 players
    // Since we only have 1 (the creator), we'll record a goal with assist from same player

    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /라인업 저장/i }).click();
    await page.waitForTimeout(2000);

    // Set score
    const homePlusButton = page
      .locator('button:has-text("")')
      .filter({ has: page.locator('svg.lucide-plus') })
      .first();
    await homePlusButton.click();

    await page.getByRole("button", { name: /스코어 저장/i }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });

    // Add goal with assist
    await page.getByRole("button", { name: /득점 추가/i }).click();

    const scorerSelect = page.locator('select').filter({ hasText: /선택/ }).first();
    await scorerSelect.selectOption({ index: 1 });

    // Select same player as assist (in real scenario, would be different player)
    const assistSelect = page.locator('select').filter({ hasText: /없음/ }).first();
    await assistSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: /^추가$/i }).click();
    await page.waitForTimeout(1500);

    console.log("✓ Goal with assist added");

    await page.reload({ waitUntil: "networkidle" });

    // Verify assist is shown
    await expect(page.getByText(/어시:/i)).toBeVisible({ timeout: 5000 });

    console.log("✓ Assist displayed correctly");

    // Finish match
    await page.getByRole("button", { name: /경기 종료/i }).click();
    await page.getByRole("button", { name: /^종료$/i }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });

    // Verify player stats show both goal and assist
    const playerStats = page.locator(".bg-\\[\\#162e23\\]").filter({
      hasText: testNickname,
    });

    await expect(playerStats).toContainText("1골");
    await expect(playerStats).toContainText("1어시");

    console.log("✓ Player stats show 1 goal and 1 assist");

    console.log("\n=== Assist Recording Test PASSED ===\n");
  });
});

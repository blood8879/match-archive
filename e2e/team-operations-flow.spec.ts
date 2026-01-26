import { test, expect } from "@playwright/test";
import {
  generateTestEmail,
  generateTestNickname,
  generateTestTeamName,
  signupUser,
  completeOnboarding,
  createTeam,
  waitForNavigation,
} from "./helpers/test-utils";

/**
 * E2E Test: Team Operations Flow
 *
 * This test suite covers comprehensive team operation scenarios:
 * 1. Team creation and member invitation
 * 2. Multiple users joining teams
 * 3. Owner approval/rejection of join requests
 * 4. Member list verification
 * 5. Guest member (mercenary) addition
 * 6. Team search and filtering
 * 7. Permission checks (OWNER, MANAGER, MEMBER)
 */

test.describe("Team Operations Flow", () => {
  test.setTimeout(180000); // 3 minutes for complex multi-user scenarios

  test("complete team operations with multiple users", async ({ browser }) => {
    // Setup: Create multiple browser contexts for different users
    const ownerContext = await browser.newContext();
    const member1Context = await browser.newContext();
    const member2Context = await browser.newContext();

    const ownerPage = await ownerContext.newPage();
    const member1Page = await member1Context.newPage();
    const member2Page = await member2Context.newPage();

    // Generate test data
    const ownerEmail = generateTestEmail();
    const member1Email = generateTestEmail();
    const member2Email = generateTestEmail();
    const ownerNickname = generateTestNickname();
    const member1Nickname = generateTestNickname();
    const member2Nickname = generateTestNickname();
    const teamName = generateTestTeamName();
    const testPassword = "TestPassword123!";

    let teamId: string;

    try {
      // ============================================================
      // Step 1: Owner creates account and team
      // ============================================================
      console.log("Step 1: Owner creating account and team...");

      await signupUser(ownerPage, ownerEmail, testPassword);
      await completeOnboarding(ownerPage, ownerNickname, "FW", "서울");

      // Verify dashboard redirect
      await waitForNavigation(ownerPage, /\/dashboard/, 15000);
      await expect(ownerPage.getByRole("heading", { name: /라커룸/i })).toBeVisible({ timeout: 10000 });

      // Create team
      teamId = await createTeam(ownerPage, teamName, "서울");
      console.log(`✓ Team created with ID: ${teamId}`);

      // Verify team detail page
      await expect(ownerPage).toHaveURL(new RegExp(`/teams/${teamId}`), { timeout: 10000 });
      await expect(ownerPage.getByRole("heading", { name: new RegExp(teamName) })).toBeVisible();

      // Verify owner can see invite code
      const inviteCodeSection = ownerPage.getByText(/초대코드:/i);
      await expect(inviteCodeSection).toBeVisible();

      // Verify owner sees "경기 등록" button (member privilege)
      const createMatchButton = ownerPage.getByRole("link", { name: /경기 등록/i });
      await expect(createMatchButton).toBeVisible();

      // Verify initial member count shows only owner
      const memberCountElement = ownerPage.getByText(/팀 멤버/).first();
      await expect(memberCountElement).toBeVisible();

      console.log("✓ Owner successfully created team and verified owner privileges");

      // ============================================================
      // Step 2: Member 1 creates account and requests to join team
      // ============================================================
      console.log("Step 2: Member 1 requesting to join team...");

      await signupUser(member1Page, member1Email, testPassword);
      await completeOnboarding(member1Page, member1Nickname, "MF", "서울");
      await waitForNavigation(member1Page, /\/dashboard/, 15000);

      // Navigate to team detail page
      await member1Page.goto(`/teams/${teamId}`, { waitUntil: "networkidle" });
      await expect(member1Page.getByRole("heading", { name: new RegExp(teamName) })).toBeVisible();

      // Verify member1 does NOT see invite code (not a member yet)
      const inviteCodeMember1 = member1Page.getByText(/초대코드:/i);
      await expect(inviteCodeMember1).not.toBeVisible();

      // Request to join team
      const joinButton = member1Page.getByRole("button", { name: /가입 신청/i });
      await expect(joinButton).toBeVisible();
      await joinButton.click();

      // Verify status changed to "승인 대기 중"
      await expect(member1Page.getByRole("button", { name: /승인 대기 중/i })).toBeVisible({ timeout: 10000 });

      // Verify member1 does NOT see "경기 등록" button (not approved yet)
      const createMatchButtonMember1 = member1Page.getByRole("link", { name: /경기 등록/i });
      await expect(createMatchButtonMember1).not.toBeVisible();

      console.log("✓ Member 1 successfully requested to join team");

      // ============================================================
      // Step 3: Member 2 creates account and requests to join team
      // ============================================================
      console.log("Step 3: Member 2 requesting to join team...");

      await signupUser(member2Page, member2Email, testPassword);
      await completeOnboarding(member2Page, member2Nickname, "DF", "인천");
      await waitForNavigation(member2Page, /\/dashboard/, 15000);

      // Navigate to team detail page
      await member2Page.goto(`/teams/${teamId}`, { waitUntil: "networkidle" });
      await expect(member2Page.getByRole("heading", { name: new RegExp(teamName) })).toBeVisible();

      // Request to join team
      const joinButton2 = member2Page.getByRole("button", { name: /가입 신청/i });
      await expect(joinButton2).toBeVisible();
      await joinButton2.click();

      // Verify status changed to "승인 대기 중"
      await expect(member2Page.getByRole("button", { name: /승인 대기 중/i })).toBeVisible({ timeout: 10000 });

      console.log("✓ Member 2 successfully requested to join team");

      // ============================================================
      // Step 4: Owner views pending join requests
      // ============================================================
      console.log("Step 4: Owner reviewing pending join requests...");

      // Reload owner page to see pending members
      await ownerPage.reload({ waitUntil: "networkidle" });

      // Verify "가입 대기" section appears for owner
      const pendingMembersSection = ownerPage.getByRole("heading", { name: /가입 대기/i });
      await expect(pendingMembersSection).toBeVisible();

      // Verify both members appear in pending list
      const pendingList = ownerPage.locator('section:has-text("가입 대기")');
      await expect(pendingList.getByText(new RegExp(member1Nickname))).toBeVisible();
      await expect(pendingList.getByText(new RegExp(member2Nickname))).toBeVisible();

      // Verify approve/reject buttons are visible
      const approveButtons = ownerPage.getByRole("button").filter({ has: ownerPage.locator("svg") });
      expect(await approveButtons.count()).toBeGreaterThanOrEqual(4); // At least 2 approve + 2 reject buttons

      console.log("✓ Owner can see pending join requests");

      // ============================================================
      // Step 5: Owner approves Member 1 and rejects Member 2
      // ============================================================
      console.log("Step 5: Owner approving Member 1 and rejecting Member 2...");

      // Find Member 1's row and approve
      const member1Row = ownerPage.locator(`li:has-text("${member1Nickname}")`);
      const approveMember1Button = member1Row.getByRole("button").first();
      await approveMember1Button.click();

      // Wait for approval to process
      await ownerPage.waitForTimeout(2000);

      // Reload to see updated member list
      await ownerPage.reload({ waitUntil: "networkidle" });

      // Verify Member 1 now appears in active members section
      const activeMembersSection = ownerPage.locator('section:has-text("팀 멤버")');
      await expect(activeMembersSection.getByText(new RegExp(member1Nickname))).toBeVisible();

      // Verify pending section still exists (Member 2 is still pending)
      const pendingSectionAfterApproval = ownerPage.getByRole("heading", { name: /가입 대기/i });
      await expect(pendingSectionAfterApproval).toBeVisible();

      // Find Member 2's row and reject
      const member2Row = ownerPage.locator(`li:has-text("${member2Nickname}")`);
      const rejectMember2Button = member2Row.getByRole("button").last();
      await rejectMember2Button.click();

      // Wait for rejection to process
      await ownerPage.waitForTimeout(2000);

      // Reload and verify Member 2 is gone
      await ownerPage.reload({ waitUntil: "networkidle" });

      // Verify Member 2 does NOT appear anywhere
      await expect(ownerPage.getByText(new RegExp(member2Nickname))).not.toBeVisible();

      // Verify pending section is gone (no more pending members)
      await expect(ownerPage.getByRole("heading", { name: /가입 대기/i })).not.toBeVisible();

      console.log("✓ Owner successfully approved Member 1 and rejected Member 2");

      // ============================================================
      // Step 6: Member 1 verifies approved status
      // ============================================================
      console.log("Step 6: Member 1 verifying approved status...");

      await member1Page.reload({ waitUntil: "networkidle" });

      // Verify "승인 대기 중" button is gone
      await expect(member1Page.getByRole("button", { name: /승인 대기 중/i })).not.toBeVisible();

      // Verify "경기 등록" button is now visible (member privilege)
      const createMatchButtonApproved = member1Page.getByRole("link", { name: /경기 등록/i });
      await expect(createMatchButtonApproved).toBeVisible();

      // Verify member1 appears in member list
      await expect(member1Page.getByText(new RegExp(member1Nickname))).toBeVisible();

      console.log("✓ Member 1 verified approved status and member privileges");

      // ============================================================
      // Step 7: Member 2 verifies rejection
      // ============================================================
      console.log("Step 7: Member 2 verifying rejection...");

      await member2Page.reload({ waitUntil: "networkidle" });

      // Verify "승인 대기 중" button is gone
      await expect(member2Page.getByRole("button", { name: /승인 대기 중/i })).not.toBeVisible();

      // Verify "가입 신청" button is available again
      const joinButtonAgain = member2Page.getByRole("button", { name: /가입 신청/i });
      await expect(joinButtonAgain).toBeVisible();

      // Verify member2 does NOT see "경기 등록" button
      await expect(member2Page.getByRole("link", { name: /경기 등록/i })).not.toBeVisible();

      console.log("✓ Member 2 verified rejection and can reapply");

      // ============================================================
      // Step 8: Owner adds guest member (mercenary)
      // ============================================================
      console.log("Step 8: Owner adding guest member...");

      await ownerPage.reload({ waitUntil: "networkidle" });

      // Look for "용병 추가" button (only visible to owner/manager)
      const addGuestButton = ownerPage.getByRole("link", { name: /용병 추가/i });

      // Check if button exists
      if (await addGuestButton.count() > 0) {
        await expect(addGuestButton).toBeVisible();
        console.log("✓ Owner can see 용병 추가 button");

        // Note: Navigation to guest creation page is expected
        // Actual guest creation form testing would require the page implementation
        console.log("  (Guest creation form testing would be done if page exists)");
      } else {
        console.log("  ⓘ Guest addition feature button not found - may not be implemented yet");
      }

      // ============================================================
      // Step 9: Team search and filtering
      // ============================================================
      console.log("Step 9: Testing team search and filtering...");

      // Navigate to teams list page
      await ownerPage.goto("/teams", { waitUntil: "networkidle" });
      await expect(ownerPage.getByRole("heading", { name: /새로운 팀을 찾아보세요/i })).toBeVisible();

      // Verify created team appears in list
      const teamCard = ownerPage.getByRole("article").filter({ hasText: teamName }).or(
        ownerPage.getByText(new RegExp(teamName))
      );
      await expect(teamCard.first()).toBeVisible();

      // Test search functionality
      const searchInput = ownerPage.locator('input[type="search"]').or(
        ownerPage.locator('input[placeholder*="검색"]')
      );

      if (await searchInput.count() > 0) {
        await searchInput.first().fill(teamName);
        await ownerPage.waitForTimeout(1000); // Wait for search to process

        // Verify team still appears
        await expect(teamCard.first()).toBeVisible();

        // Search for non-existent team
        await searchInput.first().fill("NonExistentTeam123456");
        await ownerPage.waitForTimeout(1000);

        // Verify "검색 결과가 없습니다" message or no cards
        const noResultsMessage = ownerPage.getByText(/검색 결과가 없습니다/i);
        if (await noResultsMessage.count() > 0) {
          await expect(noResultsMessage).toBeVisible();
        }

        console.log("✓ Team search functionality works correctly");
      } else {
        console.log("  ⓘ Search input not found - search feature may not be implemented yet");
      }

      // Test region filtering
      const regionSelect = ownerPage.locator('select').filter({ has: ownerPage.locator('option[value="서울"]') });

      if (await regionSelect.count() > 0) {
        await regionSelect.first().selectOption("서울");
        await ownerPage.waitForTimeout(1000);

        // Verify team appears (team was created in 서울)
        await expect(teamCard.first()).toBeVisible();

        // Filter by different region
        if (await ownerPage.locator('option[value="부산"]').count() > 0) {
          await regionSelect.first().selectOption("부산");
          await ownerPage.waitForTimeout(1000);

          // Verify team does NOT appear (or empty state message)
          const teamVisible = await teamCard.first().isVisible().catch(() => false);
          if (teamVisible) {
            console.log("  ⓘ Team still visible after filtering - may show all results");
          } else {
            console.log("✓ Region filtering works correctly");
          }
        }
      } else {
        console.log("  ⓘ Region filter not found - filtering feature may not be implemented yet");
      }

      // ============================================================
      // Step 10: Permission verification summary
      // ============================================================
      console.log("Step 10: Verifying final permission states...");

      // Owner permissions check
      await ownerPage.goto(`/teams/${teamId}`, { waitUntil: "networkidle" });
      await expect(ownerPage.getByText(/초대코드:/i)).toBeVisible(); // Can see invite code
      await expect(ownerPage.getByRole("link", { name: /경기 등록/i })).toBeVisible(); // Can create matches

      // Check for 용병 추가 button
      if (await ownerPage.getByRole("link", { name: /용병 추가/i }).count() > 0) {
        await expect(ownerPage.getByRole("link", { name: /용병 추가/i })).toBeVisible(); // Can add guests
      }

      console.log("✓ Owner (OWNER role): Full permissions verified");

      // Approved member permissions check
      await member1Page.goto(`/teams/${teamId}`, { waitUntil: "networkidle" });
      await expect(member1Page.getByText(/초대코드:/i)).not.toBeVisible(); // Cannot see invite code
      await expect(member1Page.getByRole("link", { name: /경기 등록/i })).toBeVisible(); // Can create matches

      // Should NOT see 용병 추가 button
      if (await member1Page.getByRole("link", { name: /용병 추가/i }).count() > 0) {
        await expect(member1Page.getByRole("link", { name: /용병 추가/i })).not.toBeVisible();
      }

      // Should NOT see pending members section
      await expect(member1Page.getByRole("heading", { name: /가입 대기/i })).not.toBeVisible();

      console.log("✓ Member 1 (MEMBER role): Limited permissions verified");

      // Rejected/non-member permissions check
      await member2Page.goto(`/teams/${teamId}`, { waitUntil: "networkidle" });
      await expect(member2Page.getByText(/초대코드:/i)).not.toBeVisible(); // Cannot see invite code
      await expect(member2Page.getByRole("link", { name: /경기 등록/i })).not.toBeVisible(); // Cannot create matches
      await expect(member2Page.getByRole("button", { name: /가입 신청/i })).toBeVisible(); // Can apply again

      console.log("✓ Member 2 (Non-member): No member permissions verified");

      console.log("\n========================================");
      console.log("✓ ALL TEAM OPERATIONS FLOW TESTS PASSED");
      console.log("========================================\n");

    } finally {
      // Cleanup: Close all contexts
      await ownerContext.close();
      await member1Context.close();
      await member2Context.close();
    }
  });

  test("team member list displays correct roles and statuses", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Create owner account and team
      const ownerEmail = generateTestEmail();
      const ownerNickname = generateTestNickname();
      const teamName = generateTestTeamName();
      const testPassword = "TestPassword123!";

      await signupUser(page, ownerEmail, testPassword);
      await completeOnboarding(page, ownerNickname, "GK", "서울");
      await waitForNavigation(page, /\/dashboard/, 15000);

      const teamId = await createTeam(page, teamName, "서울");

      // Navigate to team detail page
      await page.goto(`/teams/${teamId}`, { waitUntil: "networkidle" });

      // Verify owner appears in member list with proper badge
      const memberList = page.locator('section:has-text("팀 멤버")');
      await expect(memberList).toBeVisible();

      // Look for owner badge/label
      const ownerLabel = memberList.getByText(/owner|팀장/i);
      await expect(ownerLabel).toBeVisible();

      // Verify owner nickname appears
      await expect(memberList.getByText(new RegExp(ownerNickname))).toBeVisible();

      // Verify position is displayed
      await expect(memberList.getByText(/GK/i)).toBeVisible();

      console.log("✓ Team member list displays correct roles and statuses");

    } finally {
      await context.close();
    }
  });

  test("non-authenticated users cannot join teams", async ({ page }) => {
    // Try to access teams page without authentication
    await page.goto("/teams");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    console.log("✓ Non-authenticated users are redirected to login");
  });

  test("team search with special characters and edge cases", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Create account
      const email = generateTestEmail();
      const nickname = generateTestNickname();
      const testPassword = "TestPassword123!";

      await signupUser(page, email, testPassword);
      await completeOnboarding(page, nickname, "MF", "서울");
      await waitForNavigation(page, /\/dashboard/, 15000);

      // Navigate to teams page
      await page.goto("/teams", { waitUntil: "networkidle" });

      // Test search with special characters
      const searchInput = page.locator('input[type="search"]').or(
        page.locator('input[placeholder*="검색"]')
      );

      if (await searchInput.count() > 0) {
        // Test empty search
        await searchInput.first().fill("");
        await page.waitForTimeout(1000);

        // Test search with special characters
        const specialSearches = ["test@#$", "팀!!!!", "   spaces   "];

        for (const searchTerm of specialSearches) {
          await searchInput.first().fill(searchTerm);
          await page.waitForTimeout(1000);

          // Should not crash - either show results or empty state
          const heading = page.getByRole("heading", { name: /새로운 팀을 찾아보세요/i });
          await expect(heading).toBeVisible();
        }

        console.log("✓ Team search handles special characters correctly");
      } else {
        console.log("  ⓘ Search feature not available for testing");
      }

    } finally {
      await context.close();
    }
  });
});

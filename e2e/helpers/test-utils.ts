/**
 * E2E Test Utilities
 *
 * Common helper functions for E2E tests
 */

import { Page, expect } from "@playwright/test";

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate unique nickname
 */
export function generateTestNickname(): string {
  return `TestUser${Date.now().toString().slice(-4)}`;
}

/**
 * Generate unique team name
 */
export function generateTestTeamName(): string {
  return `Test Team ${Date.now().toString().slice(-4)}`;
}

/**
 * Wait for navigation with custom timeout
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await expect(page).toHaveURL(urlPattern, { timeout });
}

/**
 * Fill and submit signup form
 */
export async function signupUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/signup", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /계정 만들기/i })).toBeVisible({ timeout: 10000 });

  await page.getByLabel(/이메일/i).fill(email);
  await page.getByLabel(/^비밀번호$/i).fill(password);
  await page.getByLabel(/비밀번호 확인/i).fill(password);

  await page.getByRole("button", { name: /가입하기/i }).click();
}

/**
 * Complete onboarding process
 */
export async function completeOnboarding(
  page: Page,
  nickname: string,
  position: "FW" | "MF" | "DF" | "GK" = "FW",
  region: string = "서울"
): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: /프로필 설정/i })).toBeVisible({ timeout: 10000 });

  await page.getByLabel(/닉네임/i).fill(nickname);

  // Select position
  const positionMap = {
    FW: /FW.*공격수/i,
    MF: /MF.*미드필더/i,
    DF: /DF.*수비수/i,
    GK: /GK.*골키퍼/i,
  };

  const positionButton = page.getByRole("button", { name: positionMap[position] });
  await expect(positionButton).toBeVisible();
  await positionButton.click();

  // Select region
  const regionSelect = page.locator('select').filter({ hasText: /선택하세요/ });
  await regionSelect.selectOption(region);

  await page.getByRole("button", { name: /시작하기/i }).click();
}

/**
 * Create a new team
 */
export async function createTeam(
  page: Page,
  teamName: string,
  region: string = "서울",
  establishedYear?: string
): Promise<string> {
  // Navigate from dashboard
  const createTeamLink = page.getByRole("link", { name: /팀 만들기/i }).first();
  await expect(createTeamLink).toBeVisible({ timeout: 10000 });
  await createTeamLink.click();

  // Wait for team creation page
  await expect(page).toHaveURL(/\/teams\/new/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: /새 팀 생성/i })).toBeVisible();

  // Fill form
  const teamNameInput = page.getByLabel(/팀명/i);
  await expect(teamNameInput).toBeVisible();
  await teamNameInput.fill(teamName);

  const teamRegionSelect = page.locator('select[name="region"]');
  await teamRegionSelect.selectOption(region);

  if (establishedYear) {
    await page.locator('input[name="established_year"]').fill(establishedYear);
  }

  // Submit
  await page.getByRole("button", { name: /팀 생성/i }).click();

  // Wait for redirect and extract team ID
  await expect(page).toHaveURL(/\/teams\/[^/]+$/, { timeout: 15000 });
  const teamUrl = page.url();
  const teamId = teamUrl.split("/teams/")[1].split("/")[0].split("?")[0];

  return teamId;
}

/**
 * Create a match
 */
export async function createMatch(
  page: Page,
  teamId: string,
  opponentName: string,
  location: string,
  daysFromNow: number = 1,
  matchType: "friendly" | "league" | "tournament" = "friendly"
): Promise<string> {
  // Navigate to match creation
  const createMatchButton = page.getByRole("link", { name: /경기 등록/i })
    .or(page.getByRole("link", { name: /경기 생성/i }))
    .first();
  await createMatchButton.click();

  // Wait for page load
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/matches/new`), { timeout: 10000 });
  await expect(page.getByRole("heading", { name: /경기 생성/i })).toBeVisible();

  // Set match date
  const matchDate = new Date();
  matchDate.setDate(matchDate.getDate() + daysFromNow);
  matchDate.setHours(14, 0, 0, 0);
  const matchDateTime = matchDate.toISOString().slice(0, 16);

  await page.locator('input[name="match_date"]').fill(matchDateTime);

  // Set opponent
  const opponentNameInput = page.locator('input[name="opponent_name"]');
  await expect(opponentNameInput).toBeVisible();
  await opponentNameInput.fill(opponentName);

  // Set location
  await page.locator('input[name="location"]').fill(location);

  // Select match type if not friendly
  if (matchType !== "friendly") {
    const matchTypeRadio = page.locator(`input[name="match_type"][value="${matchType}"]`);
    await matchTypeRadio.check();
  }

  // Submit
  await page.getByRole("button", { name: /경기 생성하기/i }).click();

  // Wait for redirect and extract match ID
  await expect(page).toHaveURL(/\/matches\/[^/]+/, { timeout: 15000 });
  const matchUrl = page.url();
  const matchId = matchUrl.split("/matches/")[1].split("/")[0].split("?")[0];

  return matchId;
}

/**
 * Verify element is visible with custom timeout
 */
export async function verifyVisible(
  page: Page,
  selector: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  const element = typeof selector === "string"
    ? page.locator(selector)
    : page.getByText(selector);

  await expect(element).toBeVisible({ timeout });
}

/**
 * Wait for specific time (use sparingly, prefer waitForNavigation)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Take a screenshot with custom name
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

/**
 * Get current timestamp for unique identifiers
 */
export function getTimestamp(): string {
  return Date.now().toString().slice(-8);
}

/**
 * Extract ID from URL path
 */
export function extractIdFromUrl(url: string, pathPrefix: string): string {
  return url.split(`${pathPrefix}/`)[1].split("/")[0].split("?")[0];
}

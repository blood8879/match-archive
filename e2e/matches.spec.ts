import { test, expect } from "@playwright/test";

test.describe("Match Pages - Protected Route Behavior", () => {
  test("matches page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/matches");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("match creation page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/teams/some-team-id/matches/new");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("match detail page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/matches/some-match-id");
    
    await expect(page).toHaveURL(/\/login/);
  });
});

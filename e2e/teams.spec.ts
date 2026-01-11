import { test, expect } from "@playwright/test";

test.describe("Team Pages - Protected Route Behavior", () => {
  test("teams page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/teams");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("team creation page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/teams/new");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("team detail page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/teams/some-team-id");
    
    await expect(page).toHaveURL(/\/login/);
  });
});

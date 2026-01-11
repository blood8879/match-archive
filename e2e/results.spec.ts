import { test, expect } from "@playwright/test";

test.describe("Result Input - Protected Route Behavior", () => {
  test("match detail (for result input) redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/matches/test-match-id");
    
    await expect(page).toHaveURL(/\/login/);
  });
});

import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display landing page with auth options", async ({ page }) => {
    await page.goto("/");
    
    await expect(page.getByRole("heading", { name: /Match Archive/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /시작하기/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /로그인/i })).toBeVisible();
  });

  test("should navigate to signup page from landing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /시작하기/i }).click();
    
    await expect(page).toHaveURL("/signup");
    await expect(page.getByRole("heading", { name: /회원가입/i })).toBeVisible();
  });

  test("should navigate to login page from landing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /로그인/i }).click();
    
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: /로그인/i })).toBeVisible();
  });
});

test.describe("Signup Page", () => {
  test("should display signup form elements", async ({ page }) => {
    await page.goto("/signup");
    
    await expect(page.getByRole("heading", { name: /회원가입/i })).toBeVisible();
    await expect(page.getByLabel(/이메일/i)).toBeVisible();
    await expect(page.getByLabel(/^비밀번호$/i)).toBeVisible();
    await expect(page.getByLabel(/비밀번호 확인/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /가입하기/i })).toBeVisible();
  });

  test("should have required validation on email", async ({ page }) => {
    await page.goto("/signup");
    
    const emailInput = page.getByLabel(/이메일/i);
    await expect(emailInput).toHaveAttribute("required");
  });

  test("should show password mismatch error", async ({ page }) => {
    await page.goto("/signup");
    
    await page.getByLabel(/이메일/i).fill("test@example.com");
    await page.getByLabel(/^비밀번호$/i).fill("password123");
    await page.getByLabel(/비밀번호 확인/i).fill("differentpassword");
    
    await page.getByRole("button", { name: /가입하기/i }).click();
    
    await expect(page.getByText(/비밀번호가 일치하지 않습니다/i)).toBeVisible();
  });

  test("should show short password error", async ({ page }) => {
    await page.goto("/signup");
    
    await page.getByLabel(/이메일/i).fill("test@example.com");
    await page.getByLabel(/^비밀번호$/i).fill("12345");
    await page.getByLabel(/비밀번호 확인/i).fill("12345");
    
    await page.getByRole("button", { name: /가입하기/i }).click();
    
    await expect(page.getByText(/비밀번호는 6자 이상/i)).toBeVisible();
  });

  test("should navigate to login from signup", async ({ page }) => {
    await page.goto("/signup");
    
    await page.getByRole("link", { name: /로그인/i }).click();
    
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Login Page", () => {
  test("should display login form elements", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.getByRole("heading", { name: /로그인/i })).toBeVisible();
    await expect(page.getByLabel(/이메일/i)).toBeVisible();
    await expect(page.getByLabel(/비밀번호/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /로그인/i })).toBeVisible();
  });

  test("should have required validation on fields", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.getByLabel(/이메일/i)).toHaveAttribute("required");
    await expect(page.getByLabel(/비밀번호/i)).toHaveAttribute("required");
  });

  test("should navigate to signup from login", async ({ page }) => {
    await page.goto("/login");
    
    await page.getByRole("link", { name: /회원가입/i }).click();
    
    await expect(page).toHaveURL("/signup");
  });
});

test.describe("Protected Routes Redirect", () => {
  test("should redirect unauthenticated user from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated user from teams to login", async ({ page }) => {
    await page.goto("/teams");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated user from matches to login", async ({ page }) => {
    await page.goto("/matches");
    
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated user from profile to login", async ({ page }) => {
    await page.goto("/profile");
    
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Onboarding Page - Protected Route", () => {
  test("should redirect unauthenticated user from onboarding to login", async ({ page }) => {
    await page.goto("/onboarding");
    
    await expect(page).toHaveURL(/\/login/);
  });
});

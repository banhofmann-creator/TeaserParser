import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Authentication", () => {
  test("shows login form on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("BTP");
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Sign In");
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.fill("#username", "demo");
    await page.fill("#password", "wrongpassword");
    await page.click('button[type="submit"]');
    // Should stay on login page — the login form should still be visible
    await page.waitForTimeout(2000);
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Sign In");
  });

  test("logs in as demo user", async ({ page }) => {
    await login(page, "demo", "demo");
    // Should see the app shell with user info
    await expect(page.locator("header")).toContainText("Demo User");
    await expect(page.locator("header")).toContainText("user");
  });

  test("logs in as admin user", async ({ page }) => {
    await login(page, "admin", "admin");
    await expect(page.locator("header")).toContainText("Admin");
    await expect(page.locator("header")).toContainText("admin");
  });

  test("logout returns to login form", async ({ page }) => {
    await login(page, "demo", "demo");
    await page.click("text=Logout");
    await expect(page.locator("#username")).toBeVisible({ timeout: 5000 });
  });
});

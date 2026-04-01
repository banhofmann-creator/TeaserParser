import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("sidebar shows all navigation items", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.locator("button", { hasText: "Map" })).toBeVisible();
    await expect(nav.locator("button", { hasText: "Table" })).toBeVisible();
    await expect(nav.locator("button", { hasText: "Dashboard" })).toBeVisible();
    await expect(nav.locator("button", { hasText: "Documents" })).toBeVisible();
    await expect(nav.locator("button", { hasText: "Upload" })).toBeVisible();
  });

  test("navigate to Table view", async ({ page }) => {
    await navigateTo(page, "Table");
    // Should see the filter bar or the table
    await expect(page.locator("text=Filters:").or(page.locator("text=No opportunities"))).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Upload view", async ({ page }) => {
    await navigateTo(page, "Upload");
    await expect(page.locator("text=Drag & drop")).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Dashboard view", async ({ page }) => {
    await navigateTo(page, "Dashboard");
    await expect(page.locator("text=PowerBI Dashboard")).toBeVisible({ timeout: 5000 });
  });

  test("navigate to Documents view", async ({ page }) => {
    await navigateTo(page, "Documents");
    // FileManager should be visible
    await expect(page.locator("main")).toBeVisible();
  });

  test("chat panel opens and closes", async ({ page }) => {
    // Click chat toggle button
    await page.click('button[title="Open AI Chat"]');
    await expect(page.locator("text=AI Chat")).toBeVisible({ timeout: 3000 });
    // Close it
    await page.click("aside button:has-text('×')");
    // Chat toggle should reappear
    await expect(page.locator('button[title="Open AI Chat"]')).toBeVisible({ timeout: 3000 });
  });
});

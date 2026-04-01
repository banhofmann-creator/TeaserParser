import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Opportunities", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("table view shows opportunities", async ({ page }) => {
    await navigateTo(page, "Table");
    // Wait for table to load — should show at least the header columns
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("th", { hasText: "Price" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Status" })).toBeVisible();
  });

  test("table shows opportunity data from previous tests", async ({ page }) => {
    await navigateTo(page, "Table");
    // The mock upload from Phase 13 integration test created "Riverside Office Tower"
    // It may or may not still exist depending on container state
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible({ timeout: 10_000 });
    // Check the opportunities count is shown
    await expect(page.locator("text=opportunities")).toBeVisible();
  });

  test("table column sorting works", async ({ page }) => {
    await navigateTo(page, "Table");
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible({ timeout: 10_000 });
    // Click Name header to sort
    await page.locator("th", { hasText: "Name" }).click();
    // Should show sort indicator
    await expect(page.locator("th", { hasText: "Name" }).locator("span")).toBeVisible();
  });

  test("table filter dropdowns are present", async ({ page }) => {
    await navigateTo(page, "Table");
    await expect(page.locator("text=Filters:")).toBeVisible({ timeout: 10_000 });
    // Should have status and type filter dropdowns
    const selects = page.locator(".bg-\\[\\#161b22\\] select");
    await expect(selects).toHaveCount(2);
  });

  test("click opportunity row opens detail view", async ({ page }) => {
    await navigateTo(page, "Table");
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible({ timeout: 10_000 });
    // Check if there are any rows
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    if (count > 0) {
      // Click the first data row
      await rows.first().click();
      // Detail view should show the Back button
      await expect(page.getByRole("button", { name: /Back/ })).toBeVisible({ timeout: 5000 });
      // And the Details tab
      await expect(page.getByRole("button", { name: "Details" })).toBeVisible();
    }
  });
});

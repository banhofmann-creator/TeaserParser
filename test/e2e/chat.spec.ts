import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Chat", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("chat panel opens and shows content", async ({ page }) => {
    await page.click('button[title="Open AI Chat"]');
    await expect(page.locator("text=AI Chat")).toBeVisible({ timeout: 3000 });
    // The panel should have the chat input
    await expect(page.locator('aside input[placeholder*="AI assistant"]')).toBeVisible({ timeout: 5000 });
  });

  test("send a chat message and get response", async ({ page }) => {
    await page.click('button[title="Open AI Chat"]');
    await expect(page.locator("text=AI Chat")).toBeVisible({ timeout: 3000 });

    // Type and send a message
    const chatInput = page.locator('aside input[placeholder*="AI assistant"], aside input[placeholder*="Thinking"]');
    await chatInput.fill("Hello");
    await chatInput.press("Enter");

    // Wait for assistant response — use .first() since chat history may have duplicates
    await expect(page.locator("aside >> text=Hello Demo User").first()).toBeVisible({ timeout: 10_000 });
  });

  test("chat shows response to analysis question", async ({ page }) => {
    await page.click('button[title="Open AI Chat"]');
    await expect(page.locator("text=AI Chat")).toBeVisible({ timeout: 3000 });

    const chatInput = page.locator('aside input[placeholder*="AI assistant"], aside input[placeholder*="Thinking"]');
    await chatInput.fill("What are the top opportunities?");
    await chatInput.press("Enter");

    // Should eventually get the response — use .first() for duplicate safety
    await expect(page.locator("aside >> text=cap rates").first()).toBeVisible({ timeout: 10_000 });
  });
});

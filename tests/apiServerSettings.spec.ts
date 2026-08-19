import { test, expect } from "@playwright/test";

test.describe("Custom API Server Settings & Resolution Mode", () => {
  test("should allow configuring custom API server and reflect status in UI", async ({ page }) => {
    await page.goto("/");

    // 1. Open Settings Sheet
    const settingsBtn = page.getByRole("button", { name: /Settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 2. Verify Settings Header and Query Resolution Settings section
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.locator("text=Query Resolution Settings")).toBeVisible();

    // 3. Select 'Custom API Server' mode
    const modeSelect = page.locator("text=Resolution Mode").locator("..").locator("button");
    await modeSelect.click();
    await page.getByRole("option", { name: /Custom API Server/i }).click();

    // 4. Verify input fields for URL and Token are enabled
    const urlInput = page.locator("input[placeholder*='https://api.yourdomain.com']");
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEnabled();

    const tokenInput = page.locator("text=Query Resolution Settings").locator("xpath=ancestor::div[contains(@class, 'space-y-4')]").locator("input[placeholder*='Bearer Token']");
    await expect(tokenInput).toBeVisible();
    await expect(tokenInput).toBeEnabled();

    // 5. Fill in test custom server details
    await urlInput.fill("https://api.test-server.example.com");
    await tokenInput.fill("secret-bearer-token-123");

    // 6. Apply Settings
    const applyBtn = page.getByRole("button", { name: "Apply" });
    await applyBtn.click();

    // 8. Confirm Sheet closes and Custom Server badge appears in Header
    await expect(page.locator("header").getByText("Custom Server", { exact: true })).toBeVisible();

    // 9. Re-open Settings and verify values persisted
    await settingsBtn.click();
    await expect(page.locator("input[placeholder*='https://api.yourdomain.com']")).toHaveValue("https://api.test-server.example.com");

    // 10. Click Reset Defaults
    const resetBtn = page.getByRole("button", { name: "Reset Defaults" });
    await resetBtn.click();

    // 11. Verify Custom Server badge disappears from Header
    await expect(page.locator("header").getByText("Custom Server", { exact: true })).not.toBeVisible();
  });
});

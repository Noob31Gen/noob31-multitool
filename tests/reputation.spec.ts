import { test, expect } from "@playwright/test";

test.describe("Domain Reputation Fail-Close End-to-End Tests", () => {
  test("should fail-close (score 0, status Fail) when lookups fail due to invalid DNS server", async ({ page }) => {
    // 1. Visit root to set local storage settings
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "url-scanner-settings",
        JSON.stringify({
          dohProvider: "custom",
          customDnsUrl: "https://invalid.dns.server-fail-close/dns-query",
          corsProvider: "none",
          customCorsUrl: "",
          theme: "dark",
          persistenceEnabled: true,
        })
      );
    });

    // 2. Go to Domain Reputation page
    await page.goto("/security/domain-reputation");

    // 3. Confirm page header
    await expect(page.locator("h1")).toContainText("Domain Reputation Check");

    // 4. Fill domain input and submit
    const searchInput = page.locator("input[placeholder='example.com']");
    await searchInput.fill("google.com");
    await searchInput.press("Enter");

    // 5. Wait for lookup to run and complete (fail-close response)
    // The query will fail-close to Fail and score 0. Let's assert the Fail badge/text is visible.
    const reputationStatus = page.locator("h3:has-text('Reputation Status') + div");
    await expect(reputationStatus).toBeVisible({ timeout: 15000 });
    await expect(reputationStatus).toHaveText("Fail");

    // Assert the score is 0
    const reputationScore = page.locator("h3:has-text('Reputation Status') + div + div");
    await expect(reputationScore).toHaveText("0");
  });
});

import { test, expect } from "@playwright/test";

test.describe("Threat Intelligence Explorer End-to-End Tests", () => {
  test("should load the explorer page and perform search query with auto-classification", async ({ page }) => {
    // 1. Visit Threat Intel page
    await page.goto("/security/threat-intel");

    // 2. Assert page header is present
    await expect(page.locator("h1")).toContainText("Threat Intelligence Explorer");

    // 3. Confirm default detection indicator shows keyword
    const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
    await expect(detector).toContainText("General Keyword");

    // 4. Fill in an IP Address target to trigger auto-detection
    const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
    await searchInput.fill("148.228.16.3");

    // 5. Assert detection indicator updates immediately in the browser
    await expect(detector).toContainText("IP Address");

    // 6. Submit the form
    await searchInput.press("Enter");

    // 7. Verify loading state is shown and resolves to success
    const resultsContainer = page.locator("text=Target Indicator");
    await expect(resultsContainer).toBeVisible({ timeout: 15000 });

    // 8. Assert details card matches query
    await expect(page.locator("h2.font-mono")).toContainText("148.228.16.3");

    // 9. Assert tabs exist and can be toggled
    const otxTab = page.locator("button[role='tab'][value='otx']");
    await expect(otxTab).toBeVisible();

    const phishstatsTab = page.locator("button[role='tab'][value='phishstats']");
    await expect(phishstatsTab).toBeVisible();

    // 10. Click PhishStats tab and verify results table or empty notice is present
    await phishstatsTab.click();
    const phishstatsContent = page.locator("[data-slot='tabs-content'][value='phishstats']");
    await expect(phishstatsContent).toBeVisible();
  });

  test("should handle file hash query detection and render details tabs", async ({ page }) => {
    await page.goto("/security/threat-intel");

    const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
    const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");

    // Input MD5 file hash
    await searchInput.fill("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    await expect(detector).toContainText("File Hash");

    // Submit
    await searchInput.press("Enter");

    // Wait for the results to load
    const resultsContainer = page.locator("text=Target Indicator");
    await expect(resultsContainer).toBeVisible({ timeout: 15000 });

    // Verify MalwareBazaar tab is present
    const mbTab = page.locator("button[role='tab'][value='malwarebazaar']");
    await expect(mbTab).toBeVisible();
  });

  test("should check that redirect links on external portal panel exist", async ({ page }) => {
    await page.goto("/security/threat-intel");

    const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
    await searchInput.fill("google.com");

    const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
    await expect(detector).toContainText("Domain Name");

    await searchInput.press("Enter");

    // Wait for results
    await expect(page.locator("text=Target Indicator")).toBeVisible({ timeout: 15000 });

    // Verify redirect panel shows appropriate actions (e.g. VirusTotal Domain, AlienVault OTX)
    const portalButton = page.locator("button:has-text('VirusTotal Domain')");
    await expect(portalButton).toBeVisible();
  });
});

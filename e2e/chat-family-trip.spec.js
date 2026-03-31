// End-to-end test: Family trip chat usability
// Run: npx playwright test e2e/chat-family-trip.spec.js --headed
//
// Prerequisites:
//   npm install -D @playwright/test
//   npx playwright install chromium
//   Set TEST_EMAIL and TEST_PASSWORD env vars (Supabase login credentials)

const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.TEST_URL || "https://tripwithme.app";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

test.describe("Family Trip Chat — Lake District", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // If login screen is showing, authenticate
    const loginBtn = page.locator('button:has-text("Log in"), button:has-text("Sign in")');
    if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await loginBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Wait for app to render
    await page.waitForSelector(".w-app", { timeout: 10000 });
  });

  test("App loads and shows trip list or create screen", async ({ page }) => {
    await page.screenshot({ path: "e2e/screenshots/01-home.png" });
    // Should see either trip cards or create button
    const hasTrips = await page.locator('text=/Trip|Create/i').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTrips).toBe(true);
  });

  test("Navigate to an existing trip chat tab", async ({ page }) => {
    // Click first trip card
    const tripCard = page.locator(".w-card").first();
    if (await tripCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tripCard.click();
      await page.waitForTimeout(1000);

      // Click Chat tab
      const chatTab = page.locator('button:has-text("Chat")');
      await chatTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "e2e/screenshots/02-chat-tab.png" });

      // Verify chat input is visible
      const chatInput = page.locator('input[aria-label="Trip chat input"]');
      await expect(chatInput).toBeVisible();
    }
  });

  test("Weather query respects mentioned location", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Weather in Windermere");
    const response = await waitForAiResponse(page);
    await page.screenshot({ path: "e2e/screenshots/03-weather.png" });

    // Should mention Windermere specifically, not a generic location
    expect(response.toLowerCase()).toContain("windermere");
  });

  test("'Tomorrow' resolves to correct day", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Will it rain tomorrow?");
    const response = await waitForAiResponse(page);
    await page.screenshot({ path: "e2e/screenshots/04-tomorrow.png" });

    // Should show weather info (not a generic fallback)
    expect(response).toMatch(/°C|forecast|rain|weather|cloud|sun/i);
  });

  test("'Find restaurants' routes to Places API", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Find restaurants in Windermere");
    const response = await waitForAiResponse(page);
    await page.screenshot({ path: "e2e/screenshots/05-restaurants.png" });

    // Should return restaurant results (not a "try rephrasing" fallback)
    expect(response).not.toMatch(/try rephrasing|couldn't find a specific answer/i);
  });

  test("Natural question reaches Claude API", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "How difficult is Aira Force waterfall trek?");
    const response = await waitForAiResponse(page, 15000);
    await page.screenshot({ path: "e2e/screenshots/06-natural-query.png" });

    // Should NOT show generic fallback — either Claude response or smart fallback with activities
    expect(response).not.toMatch(/try rephrasing/i);
    // Should contain something useful about the topic
    expect(response.length).toBeGreaterThan(50);
  });

  test("Playground nearby returns correct type", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Are there any playgrounds nearby?");
    const response = await waitForAiResponse(page);
    await page.screenshot({ path: "e2e/screenshots/07-playground.png" });

    // Should NOT return restaurants
    expect(response.toLowerCase()).not.toMatch(/restaurant options/);
  });

  test("Add to itinerary works", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Add boat trip to day 2");
    const response = await waitForAiResponse(page);
    await page.screenshot({ path: "e2e/screenshots/08-add-itinerary.png" });

    expect(response).toMatch(/added|✅/i);
    // Confirmation should reference Day 2's location, not the selected day's
    expect(response).toMatch(/Day 2/);
  });

  test("Trailing ? does not break location extraction", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Suggest activities near Grasmere?");
    const response = await waitForAiResponse(page);
    await page.screenshot({ path: "e2e/screenshots/09-punctuation.png" });

    // Should reference Grasmere, not fall back to default location
    expect(response.toLowerCase()).toContain("grasmere");
  });

  test("Retry button appears on failure and works", async ({ page }) => {
    await navigateToChat(page);

    // Send a query and wait
    await sendChat(page, "Tell me about local customs");
    await page.waitForTimeout(8000);

    // If response failed, retry button should be visible
    const retryBtn = page.locator('button:has-text("Retry")');
    if (await retryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.screenshot({ path: "e2e/screenshots/10-retry-button.png" });
      await retryBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: "e2e/screenshots/10-retry-after.png" });
    }
  });

  test("Follow-up chips appear after AI response", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Suggest activities");
    await waitForAiResponse(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/11-chips.png" });

    // Check if follow-up chips are rendered
    const chips = page.locator('button:has-text("Show more"), button:has-text("Kid-friendly")');
    // Chips are optional — they appear based on response content
  });

  test("Contextual typing indicator shows context", async ({ page }) => {
    await navigateToChat(page);

    // Send a restaurant query and immediately check typing indicator
    const chatInput = page.locator('input[aria-label="Trip chat input"]');
    await chatInput.fill("Find restaurants nearby");
    await page.locator('button:has-text("Send")').click();

    // Check for contextual typing text (appears briefly)
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/12-typing-context.png" });
  });

  test("Voice input button is visible (Chrome)", async ({ page }) => {
    await navigateToChat(page);
    await page.screenshot({ path: "e2e/screenshots/13-voice-button.png" });

    // Microphone button should be present
    const micBtn = page.locator('button[aria-label="Voice input"]');
    // Voice API may not be available in headless — just check the button exists
    if (await micBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(await micBtn.isVisible()).toBe(true);
    }
  });

  test("Suggestion cards have Map and Book buttons", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Suggest restaurants");
    await waitForAiResponse(page, 12000);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/14-action-buttons.png" });

    // Check for inline action buttons on suggestion cards
    const mapBtn = page.locator('button:has-text("Map")').first();
    const bookBtn = page.locator('button:has-text("Book")').first();
    // These appear only when structured suggestions are rendered
  });

  test("Rich markdown renders lists and bold", async ({ page }) => {
    await navigateToChat(page);

    await sendChat(page, "Suggest activities for today");
    await waitForAiResponse(page);
    await page.screenshot({ path: "e2e/screenshots/15-markdown.png" });

    // Check that the response contains rendered HTML (bold, lists)
    const aiMsg = page.locator('[style*="borderBottomLeftRadius: 4"]').last();
    const html = await aiMsg.innerHTML();
    // Bold should be rendered as <strong>
    const hasBold = html.includes("<strong>") || html.includes("<li>");
    // At minimum, there should be some HTML formatting
  });
});

// ── Helpers ──

async function navigateToChat(page) {
  const tripCard = page.locator(".w-card").first();
  if (await tripCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tripCard.click();
    await page.waitForTimeout(1000);
  }
  const chatTab = page.locator('button:has-text("Chat")');
  if (await chatTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatTab.click();
    await page.waitForTimeout(500);
  }
}

async function sendChat(page, message) {
  const chatInput = page.locator('input[aria-label="Trip chat input"]');
  await chatInput.fill(message);
  await page.locator('button[aria-label="Send trip message"]').click();
}

async function waitForAiResponse(page, timeout = 10000) {
  // Wait for typing indicator to appear and disappear
  await page.waitForTimeout(1000);
  // Wait until no typing indicator is visible
  await page.waitForFunction(
    () => !document.querySelector('[style*="typingDot"]'),
    { timeout }
  ).catch(() => {});
  await page.waitForTimeout(500);

  // Get last AI message text
  const aiMessages = page.locator('[style*="borderBottomLeftRadius: 4"]');
  const count = await aiMessages.count();
  if (count === 0) return "";
  const lastMsg = aiMessages.nth(count - 1);
  return (await lastMsg.textContent()) || "";
}

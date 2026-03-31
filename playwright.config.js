const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_URL || "https://tripwithme.app",
    screenshot: "on",
    trace: "on-first-retry",
    viewport: { width: 390, height: 844 }, // iPhone 14 size
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});

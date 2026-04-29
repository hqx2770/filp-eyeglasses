const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    viewport: { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-1080p',
      use: { viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'desktop-768',
      use: { viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npx serve . -l 8080',
    port: 8080,
    reuseExistingServer: true,
  },
});

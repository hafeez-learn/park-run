import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://hafeez-learn.github.io/park-run/',
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['iPhone 12'],
        channel: 'chrome',
      },
    },
  ],
  webServer: null,
});
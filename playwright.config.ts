import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        // Hide Playwright's low-level API steps (they echo fill values, e.g. the password); the @step titles
        // already describe each action. Keep assertion steps.
        detail: false,
        reportMatchers: true,
        environmentInfo: {
          'Base URL': env.baseUrl,
          'Signup path': env.signupPath,
          'Node': process.version,
          'OS': `${process.platform} ${process.arch}`,
        },
      },
    ],
  ],
  use: {
    baseURL: env.baseUrl,
    // The app tags its controls with data-qa — make getByTestId() use it.
    testIdAttribute: 'data-qa',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

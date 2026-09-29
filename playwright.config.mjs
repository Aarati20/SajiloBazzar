// Playwright config. Tests run against the live site on Vercel.
// Run them with:  npx playwright test
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://sajilo-bazzar.vercel.app',
    screenshot: 'only-on-failure',
  },
});

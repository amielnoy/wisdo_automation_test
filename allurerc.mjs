import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Talkspace Signup — Playwright',
  output: './allure-report',
  // Trend/flaky data across runs. CI restores this file from the published GitHub Pages site before generating.
  historyPath: './allure-history/history.jsonl',
  historyLimit: 30,
  plugins: {
    awesome: {
      options: {
        reportName: 'Talkspace Signup — Playwright',
        reportLanguage: 'en',
        groupBy: ['epic', 'feature', 'story'],
      },
    },
  },
});

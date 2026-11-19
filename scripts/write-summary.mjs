// Writes a Markdown test summary (counts, per-test table, Allure report link) to the GitHub Actions
// job summary. Reads allure-results; with CI retries a test has one result file per attempt, so the
// latest attempt decides its status and passing after a failed attempt counts as flaky.
// Usage: node scripts/write-summary.mjs [resultsDir]   (REPORT_URL env = link to the published report)
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'allure-results';
const attempts = new Map();
for (const file of readdirSync(dir).filter((f) => f.endsWith('-result.json'))) {
  const result = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  attempts.set(result.historyId, [...(attempts.get(result.historyId) ?? []), result]);
}

const tests = [...attempts.values()]
  .map((runs) => {
    runs.sort((a, b) => a.stop - b.stop);
    const last = runs.at(-1);
    const flaky = last.status === 'passed' && runs.length > 1;
    return { name: last.name, status: flaky ? 'flaky' : last.status, seconds: (last.stop - last.start) / 1000 };
  })
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const icon = { passed: '✅', flaky: '⚠️', failed: '❌', broken: '💥', skipped: '⏭️', unknown: '❔' };
const count = (s) => tests.filter((t) => t.status === s).length;
const totals = ['passed', 'flaky', 'failed', 'broken', 'skipped']
  .filter((s) => count(s) > 0)
  .map((s) => `${icon[s]} ${count(s)} ${s}`)
  .join(' · ');

const reportUrl = process.env.REPORT_URL;
const md = [
  '## 🧪 Playwright test results',
  '',
  `**${tests.length} tests:** ${totals}`,
  '',
  reportUrl
    ? `📊 **Allure report:** [${reportUrl}](${reportUrl})`
    : '📊 Allure report is not published for pull requests. Download the `playwright-report` artifact instead.',
  '',
  '| | Test | Duration |',
  '|---|---|---|',
  ...tests.map((t) => `| ${icon[t.status] ?? icon.unknown} | ${t.name.replace(/\|/g, '\\|')} | ${t.seconds.toFixed(1)}s |`),
  '',
].join('\n');

appendFileSync(process.env.GITHUB_STEP_SUMMARY ?? '/dev/stdout', md + '\n');

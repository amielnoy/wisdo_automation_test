// Removes sensitive Playwright attachments from allure-results before the report is published publicly:
//  - trace: records typed values (the password) and network traffic (auth tokens)
//  - error-context: its page snapshot prints password input values in plain text
// Screenshots and videos stay (the password field is masked in them). Everything remains in the
// CI "test-results" artifact for debugging.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'allure-results';
const isSensitive = (a) => /trace|error-context/i.test(a.name ?? '') || /playwright-trace|zip/i.test(a.type ?? '');
let removed = 0;

const strip = (node) => {
  for (const a of (node.attachments ?? []).filter(isSensitive)) {
    rmSync(join(dir, a.source), { force: true });
    removed++;
  }
  node.attachments = (node.attachments ?? []).filter((a) => !isSensitive(a));
  (node.steps ?? []).forEach(strip);
};

for (const file of readdirSync(dir).filter((f) => f.endsWith('-result.json') || f.endsWith('-container.json'))) {
  const path = join(dir, file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  strip(json);
  (json.befores ?? []).forEach(strip);
  (json.afters ?? []).forEach(strip);
  writeFileSync(path, JSON.stringify(json));
}
console.log(`Removed ${removed} sensitive attachment(s) from ${dir}`);

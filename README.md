# Talkspace Signup — Playwright + TypeScript

[![Playwright Tests](https://github.com/amielnoy/wisdo_automation_test/actions/workflows/playwright.yml/badge.svg)](https://github.com/amielnoy/wisdo_automation_test/actions/workflows/playwright.yml)

**Live Allure report:** https://amielnoy.github.io/wisdo_automation_test/

Automated tests for the signup flow at
`https://app.canary.talkspace.com/signup/autoswitchpt`, covering registration and email verification:
**10 test definitions, 18 test cases** (tests 5 and 6 are data-driven from JSON).

## Architecture: 3 layers

```text
tests/          ← WHAT we verify. Arrange/Act/Assert only. The only place with expect().
  signup/
    registration.spec.ts        (tests 1–8; 5 and 6 are data-driven)
    email-verification.spec.ts  (tests 9–10)
src/flows/      ← HOW a user achieves a goal. Composes page actions into journeys. No assertions.
  SignupFlow.ts, EmailVerificationFlow.ts
src/pages/      ← WHERE things are. Locators + atomic actions per screen. No business logic.
  BasePage.ts, SignupPage.ts, VerifyEmailPage.ts (OTP screen), EmailLinkSentPage.ts (duplicate signup)

test-data/                    JSON cases for the data-driven tests (fields to set + expected results)
src/data/validationCases.ts   loads and validates the JSON cases
src/data/userFactory.ts       unique test users (Gmail plus-aliases of amielnoy@gmail.com)
src/fixtures/test.ts          custom Playwright fixtures inject flows, mailbox and test data into tests
src/utils/step.ts             step(): one API for reported steps, as a @step decorator or a function
src/utils/mailbox/            inbox abstraction + Gmail IMAP implementation (reads the OTP email)
src/config/env.ts             all config, overridable via .env
scripts/                      CI helpers: strip sensitive report attachments, write the job summary
allurerc.mjs                  Allure 3 report config (history, grouping)
.github/workflows/            GitHub Actions pipeline
```

A UI change touches only `pages/`, a flow change only `flows/`, and tests read like specifications.

## Playwright practices used

- **Stable locators:** `testIdAttribute: 'data-qa'` reuses the app's own QA hooks; role-based locators everywhere else. No CSS or XPath.
- **Web-first assertions** (`toBeVisible`, `toHaveAttribute`, `toHaveURL`) that auto-retry. No manual sleeps.
- **Test isolation:** every test gets a fresh context and a **never-used email** (`amielnoy+ts<timestamp><rand>@gmail.com`), so tests run in parallel and can be re-run.
- **Fixtures instead of `beforeAll` setup.** Tests that need inbox access **skip** cleanly when `GMAIL_APP_PASSWORD` isn't set.
- **Data-driven tests** from JSON, validated when the data loads.
- **Assertions that can fail:** negative checks prove that something did not happen. For example, a blocked submit must send no registration request; an error already on screen doesn't count.
- **Debuggability:** trace, video, and screenshot are kept on failure, plus an HTML report and an Allure report with nested steps.
- **Tags** (`@smoke`, `@e2e`) for selective runs.

## Run

```bash
npm install
npx playwright install chromium
cp .env.example .env        # optionally set GMAIL_APP_PASSWORD
npm test                    # all tests
npm run test:smoke          # read-only page checks (no account created)
npm run test:e2e            # creates real accounts on canary
npm run test:demo           # headed, one worker, 5s pause after each test (TEST_DELAY_MS)
npm run typecheck
npm run report              # Playwright HTML report
npm run allure:generate && npm run allure:open   # Allure report
```

### Email verification setup

Tests 9–10 read the real Gmail inbox over IMAP. Enable 2FA on the Google account, create an
**App Password**, and put it in `.env` as `GMAIL_APP_PASSWORD`. Without it, those tests are skipped.

## Test list

| # | Test | Type |
|---|------|------|
| 1 | Renders all fields, US is the default country | smoke |
| 2 | Password show/hide toggle | smoke |
| 3 | Legal links: correct href, `target=_blank`, `rel=noopener` | smoke |
| 4 | Empty submit is blocked with "Please enter an email." | negative |
| 5 | **Data-driven**, 5 cases from `test-data/invalid-emails.json`: malformed emails are rejected, by the browser's own check or by the app, and no registration request is sent | negative |
| 6 | **Data-driven**, 5 cases from `test-data/password-rules.json`: live errors and strength label; blocked submits send no registration request | negative |
| 7 | Duplicate email: no enumeration, routed to link verification | negative |
| 8 | Valid signup → OTP screen (6 inputs, resend, address shown) | e2e |
| 9 | Verification email (sender, subject, 6-digit code) delivered to the alias | e2e |
| 10 | Entering the emailed code verifies the account | e2e |

## Data-driven tests

Tests 5 and 6 load their cases from JSON in `test-data/`. Each case has a `name`, the `fields` to set (merged onto a valid generated user) and the `expected` results. Adding a row adds a test. The loader (`src/data/validationCases.ts`) checks every case when it loads, so a malformed entry fails with a clear error instead of becoming a test that checks nothing. A blocked submit is proven by `SignupFlow.submitAndWatchRegistration()`: the account-creating `POST /v2/registration` must never be sent. An error that was already on screen before the click would prove nothing.

All expected results were observed on the live app before being written to the JSON.

## Email verification mechanics

Talkspace sends a **6-digit code** (subject "Verify your email address", from team@talkspace.com, expires in 10 minutes).
`extractVerificationCode` (`src/utils/mailbox/Mailbox.ts`) looks for the digits after "use this code". `VerifyEmailPage.enterCode` types one digit per box, and the screen submits itself after the last digit.

## Allure reporting

- **Steps everywhere:** `step()` (`src/utils/step.ts`) is one API for reported steps. As a decorator, `@step('Enter email "{0}"')` describes every page and flow action and can include argument values. As a function, `await step('Verify …', async () => …)` groups the assertions in tests. Each test reads as nested business steps, for example "Register new user …" → "Fill the signup form" → "Enter email …".
- **Labels:** epic → feature → story, severity, owner. The data-driven cases also record their inputs as Allure parameters.
- **Evidence:** tests 9–10 attach the received verification email as plain text, with links removed.
- **No secrets in the public report:** Playwright's low-level steps are hidden (`detail: false`) because they echo typed values such as the password. Password steps are titled without the value. Before publishing, `scripts/strip-sensitive-attachments.mjs` removes traces (typed values, auth tokens) and error-context files (their page snapshots print password fields in plain text). Both are still in the CI `test-results` artifact.

## CI (GitHub Actions)

`.github/workflows/playwright.yml` runs on every push and pull request to `main`, and can also be started manually from the Actions tab with an optional **reason**.

- **Test job:** `npm ci` → typecheck → install Chromium → run all tests (2 workers, 2 retries) → build the Allure report (also when tests fail) → write the job summary.
- **Job summary:** totals, a per-test status table (a test that passes only on retry shows as flaky), and the Allure report link.
- **Publish job:** for pushes to `main` and manual runs, it deploys the Allure report to GitHub Pages and adds the published link to the summary. Report history is restored from the live site before each run, so trends and flaky-test detection build up across runs.
- **Run titles:** pushes use the commit's first line. Manual runs show `Manual run: <reason>`, or `Manual run on <branch> by <actor>` without a reason.
- **Artifacts:** the Playwright HTML report on every run; traces and videos when a test fails.
- Actions are on their current majors (Node 24 runtime): `checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`.

To run tests 9–10 in CI, add the Gmail App Password as the repository secret `GMAIL_APP_PASSWORD` (Settings → Secrets and variables → Actions). From a terminal, pipe the value in. Inside a non-interactive shell, a bare `gh secret set` saves an **empty** secret, and tests 9–10 then skip silently:

```bash
grep '^GMAIL_APP_PASSWORD=' .env | cut -d= -f2- | tr -d ' \n' | gh secret set GMAIL_APP_PASSWORD
```

## Verification status

All 18 test cases pass locally and in CI (latest CI run: 18 passed, 0 flaky). Every locator, message and expected result was taken from the live app: the DOM, the snapshots and screenshots of real runs, or live checks through the Playwright MCP. The data-driven tests were mutation-checked: wrong expectations in the JSON make them fail, and the registration-request detector catches a real submit.

## Findings from the runs

- **Duplicate signup is not reported as an error.** Re-registering an existing email routes to `/email-verification/sent` ("We sent an email with a verification link") instead of the OTP screen. This prevents account enumeration. Test 7 asserts this behavior; confirm with the team that it is intended.
- **Two verification mechanisms:** new accounts get a 6-digit OTP, while duplicate signups get a verification link.
- **Misleading email validation copy.** A malformed address (`amielnoy@gmail`) shows "Please enter an email.", the same message as an empty field.
- **Email validation is split between browser and app.** The form has no `novalidate`, so most malformed addresses get the browser's native message, not the app's. The user sees two different styles of error for the same kind of mistake.
- **Two password rules:** under 8 characters → "Password must be at least 8 characters."; 8 or more but guessable (e.g. `12345678`, `Passw0rd!`) → "Password not secure enough…". Both block the submit.
- **Strength is scored against the nickname and email.** `amielnoy123` is "Strong" on an empty form but "Weak" once the nickname `amielnoy` is filled in. The form therefore fills the nickname before the password.
- **Slow account creation:** 10–25s on canary, so the flows wait up to 30s.

## Not covered (next candidates)

An expired or incorrect OTP code, Resend Code, Update email, the non-US country path, the link in the duplicate-signup email, and whether the strength score updates if the nickname changes after the password was typed.

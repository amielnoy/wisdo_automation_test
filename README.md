# Talkspace Signup — Playwright + TypeScript

[![Playwright Tests](https://github.com/amielnoy/wisdo_automation_test/actions/workflows/playwright.yml/badge.svg)](https://github.com/amielnoy/wisdo_automation_test/actions/workflows/playwright.yml)

Automated tests for the signup flow at
`https://app.canary.talkspace.com/signup/autoswitchpt`, covering registration and email verification.

## Architecture: 3 layers

```
tests/          ← WHAT we verify. Arrange/Act/Assert only. The only place with expect().
  signup/
    registration.spec.ts        (tests 1–8)
    email-verification.spec.ts  (tests 9–10)
src/flows/      ← HOW a user achieves a goal. Composes page actions into journeys. No assertions.
  SignupFlow.ts, EmailVerificationFlow.ts
src/pages/      ← WHERE things are. Locators + atomic actions per screen. No business logic.
  BasePage.ts, SignupPage.ts, VerifyEmailPage.ts

src/fixtures/test.ts    custom Playwright fixtures inject flows/mailbox/test data into tests
src/data/userFactory.ts unique test users (Gmail plus-aliases of amielnoy@gmail.com)
src/utils/mailbox/      inbox abstraction + Gmail IMAP implementation
src/config/env.ts       all config, overridable via .env
```

A UI change touches only `pages/`, a flow change only `flows/`, and tests read like specifications.

## Playwright practices used
- **Stable locators:** `testIdAttribute: 'data-qa'` reuses the app's own QA hooks; role-based locators everywhere else. No CSS or XPath.
- **Web-first assertions** (`toBeVisible`, `toHaveAttribute`, `toHaveURL`) that auto-retry. No manual sleeps.
- **Test isolation:** every test gets a fresh context and a **never-used email** (`amielnoy+ts<timestamp><rand>@gmail.com`), so tests run in parallel and can be re-run.
- **Fixtures instead of `beforeAll` setup.** Tests that need inbox access **skip** cleanly when `GMAIL_APP_PASSWORD` isn't set.
- **Debuggability:** trace, video, and screenshot are kept on failure, plus an HTML report.
- **Tags** (`@smoke`, `@e2e`) for selective runs.

## Run
```bash
npm install
npx playwright install chromium
cp .env.example .env        # optionally set GMAIL_APP_PASSWORD
npm test                    # all tests
npm run test:smoke          # read-only page checks (no account created)
npm run test:e2e            # creates real accounts on canary
npm run report
```

## CI (GitHub Actions)
`.github/workflows/playwright.yml` runs on every push and pull request to `main`, and can also be started manually from the Actions tab. Steps: `npm ci` → typecheck → install Chromium → run all tests (2 workers, 2 retries in CI). The HTML report is always uploaded as an artifact. Traces and videos are uploaded when a test fails.

To run tests 9–10 in CI, add the Gmail App Password as a repository secret named `GMAIL_APP_PASSWORD` (Settings → Secrets and variables → Actions, or `gh secret set GMAIL_APP_PASSWORD`). Without it, those two tests are skipped.

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
| 5 | Malformed email rejected | negative |
| 6 | Password under 8 characters: live error and "Strength: Weak", submit blocked | negative |
| 7 | Duplicate email: no enumeration, routed to link verification | negative |
| 8 | Valid signup → OTP screen (6 inputs, resend, address shown) | e2e |
| 9 | Verification email (sender, subject, 6-digit code) delivered to the alias | e2e |
| 10 | Entering the emailed code verifies the account | e2e |

## Email verification mechanics
Talkspace sends a **6-digit code** (subject "Verify your email address", from team@talkspace.com, expires in 10 minutes).
`extractVerificationCode` (`src/utils/mailbox/Mailbox.ts`) looks for the digits after "use this code". `VerifyEmailPage.enterCode` types one digit per box, and the screen submits itself after the last digit.

## Verification status
All 10 tests pass against canary (2 consecutive full runs, ~34s each, 0 flaky). Every locator and message was taken from the live app, either the DOM or the snapshots and screenshots of real runs.

## Findings from the runs
- **Duplicate signup is not reported as an error.** Re-registering an existing email routes to `/email-verification/sent` ("We sent an email with a verification link") instead of the OTP screen. This prevents account enumeration. Test 7 asserts this behavior; confirm with the team that it is intended.
- **Misleading email validation copy.** A malformed address (`amielnoy@gmail`) shows "Please enter an email.", the same message as an empty field.
- **Two verification mechanisms:** new accounts get a 6-digit OTP, while duplicate signups get a verification link.
- **Slow account creation:** 10–25s on canary, so the flows wait up to 30s.

## Not covered (next candidates)
An expired or incorrect OTP code, Resend Code, Update email, the non-US country path, and the link in the duplicate-signup email.

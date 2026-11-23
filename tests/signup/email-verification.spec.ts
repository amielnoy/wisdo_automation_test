import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/test';
import { step } from '../../src/utils/step';
import { extractVerificationCode } from '../../src/utils/mailbox/Mailbox';
import { VerifyEmailPage } from '../../src/pages/VerifyEmailPage';

/**
 * Requires GMAIL_APP_PASSWORD. The `mailbox` fixture skips these tests otherwise,
 * so the suite stays green on machines without inbox access.
 */
test.describe('Signup — email verification', { tag: '@e2e' }, () => {
  // Registration (~20s) + inbox wait (up to 60s) + OTP entry must fit, so the mailbox's own
  // "No email arrived" error fires before Playwright's generic test timeout.
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async () => {
    await allure.epic('Signup');
    await allure.feature('Email verification');
    await allure.owner('amielnoy');
    await allure.severity(allure.Severity.BLOCKER);
  });

  test('9. a verification email with a 6-digit code is delivered to the new address', async ({ signupFlow, emailVerificationFlow, newUser }) => {
    await allure.story('Verification email');
    const since = new Date(Date.now() - 60_000); // tolerate clock skew between runner and mail server

    await signupFlow.registerNewUser(newUser);
    const email = await emailVerificationFlow.waitForVerificationEmail(newUser.email, since);

    await step('Verify sender, subject, expiry notice and 6-digit code', async () => {
      expect(email.from).toContain('team@talkspace.com');
      expect(email.subject).toBe('Verify your email address');
      expect(email.text).toMatch(/expire after 10 minutes/i);
      expect(extractVerificationCode(email)).toMatch(/^\d{6}$/);
    });
  });

  test('10. entering the emailed code verifies the account', async ({ page, signupFlow, emailVerificationFlow, newUser }) => {
    await allure.story('OTP verification');
    const since = new Date(Date.now() - 60_000);

    await signupFlow.registerNewUser(newUser);
    const email = await emailVerificationFlow.waitForVerificationEmail(newUser.email, since);
    await emailVerificationFlow.verifyWithEmailedCode(email);

    await step('Verify the user leaves the OTP screen', async () => {
      await expect(page).not.toHaveURL(VerifyEmailPage.URL, { timeout: 30_000 });
      await expect(signupFlow.verifyEmailPage.title).toBeHidden();
    });
  });
});

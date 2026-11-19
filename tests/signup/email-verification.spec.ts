import { test, expect } from '../../src/fixtures/test';
import { extractVerificationCode } from '../../src/utils/mailbox/Mailbox';
import { VerifyEmailPage } from '../../src/pages/VerifyEmailPage';

/**
 * Requires GMAIL_APP_PASSWORD. The `mailbox` fixture skips these tests otherwise,
 * so the suite stays green on machines without inbox access.
 */
test.describe('Signup — email verification', { tag: '@e2e' }, () => {
  test('9. a verification email with a 6-digit code is delivered to the new address', async ({ signupFlow, emailVerificationFlow, newUser }) => {
    const since = new Date(Date.now() - 60_000); // tolerate clock skew between runner and mail server
    await signupFlow.registerNewUser(newUser);
    await expect(signupFlow.verifyEmailPage.title).toBeVisible();

    const email = await emailVerificationFlow.waitForVerificationEmail(newUser.email, since);

    expect(email.from).toContain('team@talkspace.com');
    expect(email.subject).toBe('Verify your email address');
    expect(email.text).toMatch(/expire after 10 minutes/i);
    expect(extractVerificationCode(email)).toMatch(/^\d{6}$/);
  });

  test('10. entering the emailed code verifies the account', async ({ page, signupFlow, emailVerificationFlow, newUser }) => {
    const since = new Date(Date.now() - 60_000);
    await signupFlow.registerNewUser(newUser);
    await expect(signupFlow.verifyEmailPage.title).toBeVisible();
    const email = await emailVerificationFlow.waitForVerificationEmail(newUser.email, since);

    await emailVerificationFlow.verifyWithEmailedCode(email);

    await expect(page).not.toHaveURL(VerifyEmailPage.URL, { timeout: 30_000 });
    await expect(signupFlow.verifyEmailPage.title).toBeHidden();
  });
});

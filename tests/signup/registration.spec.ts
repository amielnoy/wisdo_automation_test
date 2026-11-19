import { test, expect } from '../../src/fixtures/test';
import { buildUser } from '../../src/data/userFactory';
import { env } from '../../src/config/env';
import { SignupFlow } from '../../src/flows/SignupFlow';
import { EmailLinkSentPage } from '../../src/pages/EmailLinkSentPage';

const SIGNUP_URL = new RegExp(env.signupPath);

test.describe('Signup — registration', () => {
  test.beforeEach(async ({ signupFlow }) => {
    await signupFlow.openSignup();
  });

  test('1. renders all registration fields with United States as default country', { tag: '@smoke' }, async ({ signupFlow }) => {
    const p = signupFlow.signupPage;
    await expect(p.heading).toBeVisible();
    await expect(p.emailInput).toBeVisible();
    await expect(p.emailInput).toHaveAttribute('type', 'email');
    await expect(p.passwordInput).toHaveAttribute('type', 'password');
    await expect(p.nicknameInput).toBeVisible();
    await expect(p.countrySelectedValue).toHaveText('United States');
    await expect(p.stateDropdown).toBeVisible();
    await expect(p.submitButton).toBeEnabled();
  });

  test('2. password visibility toggle reveals and hides the password', { tag: '@smoke' }, async ({ signupFlow }) => {
    const p = signupFlow.signupPage;
    await p.fillPassword(env.password);

    await p.showPassword();
    await expect(p.passwordInput).toHaveAttribute('type', 'text');
    await expect(p.passwordInput).toHaveValue(env.password);
    await expect(p.hidePasswordButton).toBeVisible();

    await p.hidePassword();
    await expect(p.passwordInput).toHaveAttribute('type', 'password');
    await expect(p.showPasswordButton).toBeVisible();
  });

  test('3. legal consent links point to the correct policies and open safely in a new tab', { tag: '@smoke' }, async ({ signupFlow }) => {
    const p = signupFlow.signupPage;
    const expected = [
      [p.telemedicineLink, 'https://www.talkspace.com/public/telemedicine'],
      [p.termsLink, 'https://www.talkspace.com/public/terms'],
      [p.privacyLink, 'https://www.talkspace.com/public/privacy-policy'],
      [p.statePrivacyRightsLink, 'https://www.talkspace.com/public/notice-of-us-state-privacy-rights'],
    ] as const;

    for (const [link, href] of expected) {
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
    await expect(p.loginLink).toHaveAttribute('href', '/login');
  });

  test('4. submitting an empty form is blocked and keeps the user on signup', async ({ page, signupFlow }) => {
    await signupFlow.signupPage.submit();

    // Wait for the error first so the URL check below can't pass before a navigation would have happened.
    await expect(signupFlow.signupPage.emailError).toBeVisible();
    await expect(page).toHaveURL(SIGNUP_URL);
  });

  test('5. rejects an invalid email format', async ({ page, signupFlow }) => {
    await signupFlow.submitForm(buildUser({ email: 'amielnoy@gmail' }));

    // Same copy as an empty field: "Please enter an email." (UX finding, see SignupPage.emailError).
    await expect(signupFlow.signupPage.emailError).toBeVisible();
    await expect(signupFlow.signupPage.emailInput).toHaveValue('amielnoy@gmail');
    await expect(page).toHaveURL(SIGNUP_URL);
  });

  test('6. rejects a password shorter than 8 characters', async ({ page, signupFlow }) => {
    const p = signupFlow.signupPage;
    await signupFlow.fillForm(buildUser({ password: '123' }));

    // Validated live, before submit.
    await expect(p.passwordLengthError).toBeVisible();
    await expect(p.passwordStrength('Weak')).toBeVisible();

    await p.submit();
    await expect(p.passwordLengthError).toBeVisible();
    await expect(page).toHaveURL(SIGNUP_URL);
  });

  test('7. re-registering an existing email does not reveal the account and sends a link instead of an OTP', async ({ browser, page, signupFlow, newUser }) => {
    // Arrange: create the account once in an isolated context.
    const firstContext = await browser.newContext();
    const firstRun = new SignupFlow(await firstContext.newPage());
    await firstRun.registerNewUser(newUser);
    await firstContext.close();

    // Act: sign up again with the same email.
    await signupFlow.submitForm({ ...newUser, nickname: `${newUser.nickname}2` });

    // Assert: no "already registered" error (anti-enumeration). The user is routed to link-based verification.
    const linkSent = signupFlow.emailLinkSentPage;
    await expect(page).toHaveURL(EmailLinkSentPage.URL, { timeout: 30_000 });
    await expect(linkSent.sentToMessage(newUser.email)).toBeVisible();
    await expect(linkSent.resendEmailButton).toBeVisible();
    await expect(signupFlow.verifyEmailPage.codeInputs).toHaveCount(0);
  });

  test('8. a valid registration lands on the OTP verification screen for that address', { tag: '@e2e' }, async ({ page, signupFlow, newUser }) => {
    await signupFlow.submitForm(newUser);
    await signupFlow.waitForVerificationScreen();

    const verify = signupFlow.verifyEmailPage;
    expect(new URL(page.url()).searchParams.get('email')).toBe(newUser.email);
    await expect(verify.title).toBeVisible();
    await expect(verify.sentToMessage(newUser.email)).toBeVisible();
    await expect(verify.codeInputs).toHaveCount(6);
    await expect(verify.resendButton).toBeVisible();
  });
});

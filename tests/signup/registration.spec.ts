import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/test';
import { buildUser } from '../../src/data/userFactory';
import { env } from '../../src/config/env';
import { SignupFlow } from '../../src/flows/SignupFlow';
import { EmailLinkSentPage } from '../../src/pages/EmailLinkSentPage';

const SIGNUP_URL = new RegExp(env.signupPath);

test.describe('Signup — registration', () => {
  test.beforeEach(async ({ signupFlow }) => {
    await allure.epic('Signup');
    await allure.feature('Registration');
    await allure.owner('amielnoy');
    await signupFlow.openSignup();
  });

  test('1. renders all registration fields with United States as default country', { tag: '@smoke' }, async ({ signupFlow }) => {
    await allure.story('Signup form');
    await allure.severity(allure.Severity.CRITICAL);
    const p = signupFlow.signupPage;

    await test.step('Verify the form fields are present with correct input types', async () => {
      await expect(p.heading).toBeVisible();
      await expect(p.emailInput).toBeVisible();
      await expect(p.emailInput).toHaveAttribute('type', 'email');
      await expect(p.passwordInput).toHaveAttribute('type', 'password');
      await expect(p.nicknameInput).toBeVisible();
    });
    await test.step('Verify country defaults to United States and a state can be chosen', async () => {
      await expect(p.countrySelectedValue).toHaveText('United States');
      await expect(p.stateDropdown).toBeVisible();
    });
    await test.step('Verify "Create account" is enabled', async () => {
      await expect(p.submitButton).toBeEnabled();
    });
  });

  test('2. password visibility toggle reveals and hides the password', { tag: '@smoke' }, async ({ signupFlow }) => {
    await allure.story('Signup form');
    await allure.severity(allure.Severity.MINOR);
    const p = signupFlow.signupPage;
    await p.fillPassword(env.password);

    await p.showPassword();
    await test.step('Verify the password is shown in plain text', async () => {
      await expect(p.passwordInput).toHaveAttribute('type', 'text');
      await expect(p.passwordInput).toHaveValue(env.password);
      await expect(p.hidePasswordButton).toBeVisible();
    });

    await p.hidePassword();
    await test.step('Verify the password is masked again', async () => {
      await expect(p.passwordInput).toHaveAttribute('type', 'password');
      await expect(p.showPasswordButton).toBeVisible();
    });
  });

  test('3. legal consent links point to the correct policies and open safely in a new tab', { tag: '@smoke' }, async ({ signupFlow }) => {
    await allure.story('Legal consent');
    await allure.severity(allure.Severity.NORMAL);
    const p = signupFlow.signupPage;
    const expected = [
      ['Telemedicine', p.telemedicineLink, 'https://www.talkspace.com/public/telemedicine'],
      ['Terms of use', p.termsLink, 'https://www.talkspace.com/public/terms'],
      ['Privacy policy', p.privacyLink, 'https://www.talkspace.com/public/privacy-policy'],
      ['Notice of US State Privacy Rights', p.statePrivacyRightsLink, 'https://www.talkspace.com/public/notice-of-us-state-privacy-rights'],
    ] as const;

    for (const [name, link, href] of expected) {
      await test.step(`Verify "${name}" link → ${href} (new tab, noopener)`, async () => {
        await expect(link).toHaveAttribute('href', href);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener/);
      });
    }
    await test.step('Verify "Log in" link → /login', async () => {
      await expect(p.loginLink).toHaveAttribute('href', '/login');
    });
  });

  test('4. submitting an empty form is blocked and keeps the user on signup', async ({ page, signupFlow }) => {
    await allure.story('Form validation');
    await allure.severity(allure.Severity.NORMAL);

    await signupFlow.signupPage.submit();

    await test.step('Verify the email error is shown and the user stays on signup', async () => {
      // Wait for the error first so the URL check can't pass before a navigation would have happened.
      await expect(signupFlow.signupPage.emailError).toBeVisible();
      await expect(page).toHaveURL(SIGNUP_URL);
    });
  });

  test('5. rejects an invalid email format', async ({ page, signupFlow }) => {
    await allure.story('Form validation');
    await allure.severity(allure.Severity.NORMAL);

    await signupFlow.submitForm(buildUser({ email: 'amielnoy@gmail' }));

    await test.step('Verify the malformed email is rejected and kept in the field', async () => {
      // Same copy as an empty field: "Please enter an email." (UX finding, see SignupPage.emailError).
      await expect(signupFlow.signupPage.emailError).toBeVisible();
      await expect(signupFlow.signupPage.emailInput).toHaveValue('amielnoy@gmail');
      await expect(page).toHaveURL(SIGNUP_URL);
    });
  });

  test('6. rejects a password shorter than 8 characters', async ({ page, signupFlow }) => {
    await allure.story('Form validation');
    await allure.severity(allure.Severity.NORMAL);
    const p = signupFlow.signupPage;

    await signupFlow.fillForm(buildUser({ password: '123' }));
    await test.step('Verify live validation: length error and "Strength: Weak"', async () => {
      await expect(p.passwordLengthError).toBeVisible();
      await expect(p.passwordStrength('Weak')).toBeVisible();
    });

    await p.submit();
    await test.step('Verify submission is blocked', async () => {
      await expect(p.passwordLengthError).toBeVisible();
      await expect(page).toHaveURL(SIGNUP_URL);
    });
  });

  test('7. re-registering an existing email does not reveal the account and sends a link instead of an OTP', async ({ browser, page, signupFlow, newUser }) => {
    await allure.story('Duplicate account');
    await allure.severity(allure.Severity.CRITICAL);

    await test.step('Precondition: an account already exists for the email', async () => {
      const firstContext = await browser.newContext();
      const firstRun = new SignupFlow(await firstContext.newPage());
      await firstRun.registerNewUser(newUser);
      await firstContext.close();
    });

    await signupFlow.submitForm({ ...newUser, nickname: `${newUser.nickname}2` });

    await test.step('Verify no "already registered" error and routing to link-based verification', async () => {
      const linkSent = signupFlow.emailLinkSentPage;
      await expect(page).toHaveURL(EmailLinkSentPage.URL, { timeout: 30_000 });
      await expect(linkSent.sentToMessage(newUser.email)).toBeVisible();
      await expect(linkSent.resendEmailButton).toBeVisible();
      await expect(signupFlow.verifyEmailPage.codeInputs).toHaveCount(0);
    });
  });

  test('8. a valid registration lands on the OTP verification screen for that address', { tag: '@e2e' }, async ({ page, signupFlow, newUser }) => {
    await allure.story('Successful registration');
    await allure.severity(allure.Severity.BLOCKER);

    await signupFlow.submitForm(newUser);
    await signupFlow.waitForVerificationScreen();

    await test.step('Verify the OTP screen targets the registered email', async () => {
      const verify = signupFlow.verifyEmailPage;
      expect(new URL(page.url()).searchParams.get('email')).toBe(newUser.email);
      await expect(verify.title).toBeVisible();
      await expect(verify.sentToMessage(newUser.email)).toBeVisible();
      await expect(verify.codeInputs).toHaveCount(6);
      await expect(verify.resendButton).toBeVisible();
    });
  });
});

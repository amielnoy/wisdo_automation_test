import { Page } from '@playwright/test';
import { SignupPage } from '../pages/SignupPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { EmailLinkSentPage } from '../pages/EmailLinkSentPage';
import { SignupUser } from '../data/userFactory';
import { step } from '../utils/step';

// Account creation is slow on canary (15–25s observed), well above the default 10s expect timeout.
const REGISTRATION_TIMEOUT = 30_000;

/**
 * Business-level signup journeys. Composes page-object actions; contains no assertions,
 * so tests stay the only place that decides pass/fail.
 */
export class SignupFlow {
  readonly signupPage: SignupPage;
  readonly verifyEmailPage: VerifyEmailPage;
  readonly emailLinkSentPage: EmailLinkSentPage;

  constructor(private readonly page: Page) {
    this.signupPage = new SignupPage(page);
    this.verifyEmailPage = new VerifyEmailPage(page);
    this.emailLinkSentPage = new EmailLinkSentPage(page);
  }

  @step('Open the signup page')
  async openSignup() {
    await this.signupPage.open();
    await this.signupPage.heading.waitFor();
  }

  /** Fills every field but does not submit — lets tests vary one field and assert on validation. */
  @step('Fill the signup form')
  async fillForm(user: Partial<SignupUser>) {
    if (user.email !== undefined) await this.signupPage.fillEmail(user.email);
    // Nickname before password: the strength meter scores the password against the nickname/email,
    // so they must already be filled when the password is typed.
    if (user.nickname !== undefined) await this.signupPage.fillNickname(user.nickname);
    if (user.password !== undefined) await this.signupPage.fillPassword(user.password);
    if (user.stateCode !== undefined) await this.signupPage.selectState(user.stateCode);
  }

  /** The POST that creates the account (observed on canary: clientapi…/v2/registration). */
  static readonly REGISTRATION_API = /\/v2\/registration$/;

  /**
   * Clicks "Create account" and reports whether the registration request was sent within `windowMs`.
   * This is how a test proves a submit was blocked: an error that was already on screen before the
   * click says nothing about what the click did. Proving a negative needs a bounded wait; the request
   * fires immediately on a valid submit, so 5s is a wide margin.
   */
  @step('Click "Create account" and watch for the registration request')
  async submitAndWatchRegistration(windowMs = 5_000): Promise<boolean> {
    const sent = this.page
      .waitForRequest((r) => r.method() === 'POST' && SignupFlow.REGISTRATION_API.test(new URL(r.url()).pathname), { timeout: windowMs })
      .then(() => true, () => false);
    await this.signupPage.submit();
    return sent;
  }

  @step('Fill and submit the signup form')
  async submitForm(user: Partial<SignupUser>) {
    await this.fillForm(user);
    await this.signupPage.submit();
  }

  /** Full happy path: open → fill → submit → wait for the OTP screen. Returns the user so tests can check the inbox for it. */
  @step('Register new user {0.email}')
  async registerNewUser(user: SignupUser): Promise<SignupUser> {
    await this.openSignup();
    await this.submitForm(user);
    await this.waitForVerificationScreen();
    return user;
  }

  @step('Wait for the OTP verification screen')
  async waitForVerificationScreen() {
    await this.page.waitForURL(VerifyEmailPage.URL, { timeout: REGISTRATION_TIMEOUT });
  }
}

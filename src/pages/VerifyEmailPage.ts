import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/**
 * /email-verification/otp?email=…&token=… shown right after "Create account".
 * Six single-digit inputs, no submit button (the form submits once all digits are entered).
 * Locators taken from the page snapshot of a real run.
 */
export class VerifyEmailPage extends BasePage {
  readonly path = '/email-verification/otp';
  static readonly URL = /\/email-verification\/otp/;

  readonly title: Locator;
  readonly codeInputs: Locator;
  readonly resendButton: Locator;
  readonly updateEmailButton: Locator;

  constructor(page: Page) {
    super(page);
    // Rendered as a <p>, not a heading, so role=heading never matches.
    this.title = page.getByText('Before matching with a provider, verify your email');
    this.codeInputs = page.getByRole('textbox', { name: /^Input verification code \d$/ });
    // The button's text sits in a nested <p>, so it has no reliable accessible name; filter by text instead.
    this.resendButton = page.getByRole('button').filter({ hasText: 'Resend Code' });
    this.updateEmailButton = page.getByRole('button', { name: 'Update email' });
  }

  sentToMessage(email: string): Locator {
    return this.page.getByText(`We sent a one-time code to ${email}`);
  }

  /** One digit per box; the last digit triggers submission. */
  @step('Enter verification code {0}')
  async enterCode(code: string) {
    for (const [i, digit] of [...code].entries()) {
      await this.codeInputs.nth(i).fill(digit);
    }
  }

  @step('Click "Resend Code"')
  async resendCode() {
    await this.resendButton.click();
  }
}

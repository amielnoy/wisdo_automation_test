import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/**
 * /email-verification/sent#email=… shown when signing up with an email that already has an account.
 * Link-based verification (no OTP inputs). The app shows this instead of an "already registered"
 * error, which avoids revealing which emails have accounts. Observed on a real run.
 */
export class EmailLinkSentPage extends BasePage {
  readonly path = '/email-verification/sent';
  static readonly URL = /\/email-verification\/sent/;

  readonly title: Locator;
  readonly resendEmailButton: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByText('Before matching with a provider, verify your email');
    this.resendEmailButton = page.getByRole('button').filter({ hasText: 'Resend email' });
  }

  sentToMessage(email: string): Locator {
    return this.page.getByText(`We sent an email with a verification link to ${email}`);
  }

  @step('Click "Resend email"')
  async resendEmail() {
    await this.resendEmailButton.click();
  }
}

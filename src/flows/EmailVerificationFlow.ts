import { Page } from '@playwright/test';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { Mailbox, ReceivedEmail, extractVerificationCode } from '../utils/mailbox/Mailbox';

export class EmailVerificationFlow {
  readonly verifyEmailPage: VerifyEmailPage;

  constructor(
    page: Page,
    private readonly mailbox: Mailbox,
  ) {
    this.verifyEmailPage = new VerifyEmailPage(page);
  }

  async waitForVerificationEmail(to: string, since: Date): Promise<ReceivedEmail> {
    return this.mailbox.waitForEmail({ to, since });
  }

  /** Reads the OTP from the email and types it into the verify screen, as the user would. Returns the code used. */
  async verifyWithEmailedCode(email: ReceivedEmail): Promise<string> {
    const code = extractVerificationCode(email);
    await this.verifyEmailPage.enterCode(code);
    return code;
  }
}

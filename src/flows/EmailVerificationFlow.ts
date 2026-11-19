import { Page, test } from '@playwright/test';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { Mailbox, ReceivedEmail, extractVerificationCode } from '../utils/mailbox/Mailbox';
import { step } from '../utils/step';

export class EmailVerificationFlow {
  readonly verifyEmailPage: VerifyEmailPage;

  constructor(
    page: Page,
    private readonly mailbox: Mailbox,
  ) {
    this.verifyEmailPage = new VerifyEmailPage(page);
  }

  @step('Wait for the verification email to {0}')
  async waitForVerificationEmail(to: string, since: Date): Promise<ReceivedEmail> {
    const email = await this.mailbox.waitForEmail({ to, since });
    // Evidence in the report: the email exactly as received (the code expires in 10 minutes, so it's safe to keep).
    await test.info().attach('verification-email.html', { body: email.html || email.text, contentType: 'text/html' });
    await test.info().attach('verification-email-headers.txt', {
      body: `From: ${email.from}\nTo: ${email.to}\nSubject: ${email.subject}\nDate: ${email.date.toISOString()}`,
      contentType: 'text/plain',
    });
    return email;
  }

  /** Reads the OTP from the email and types it into the verify screen, as the user would. Returns the code used. */
  @step('Verify the account with the emailed code')
  async verifyWithEmailedCode(email: ReceivedEmail): Promise<string> {
    const code = extractVerificationCode(email);
    await this.verifyEmailPage.enterCode(code);
    return code;
  }
}

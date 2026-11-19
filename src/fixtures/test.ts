import { test as base, expect } from '@playwright/test';
import { SignupFlow } from '../flows/SignupFlow';
import { EmailVerificationFlow } from '../flows/EmailVerificationFlow';
import { GmailImapMailbox } from '../utils/mailbox/GmailImapMailbox';
import { Mailbox } from '../utils/mailbox/Mailbox';
import { SignupUser, buildUser } from '../data/userFactory';
import { env } from '../config/env';

type Fixtures = {
  signupFlow: SignupFlow;
  emailVerificationFlow: EmailVerificationFlow;
  mailbox: Mailbox;
  newUser: SignupUser;
  delayBetweenTests: void;
};

/**
 * Custom fixtures: tests ask for what they need by name and Playwright wires it up.
 * No `new SomePage(page)` boilerplate inside specs.
 */
export const test = base.extend<Fixtures>({
  signupFlow: async ({ page }, use) => {
    await use(new SignupFlow(page));
  },

  mailbox: async ({}, use, testInfo) => {
    testInfo.skip(!env.gmailAppPassword, 'GMAIL_APP_PASSWORD not set — inbox checks skipped');
    await use(new GmailImapMailbox(env.baseEmail, env.gmailAppPassword!));
  },

  emailVerificationFlow: async ({ page, mailbox }, use) => {
    await use(new EmailVerificationFlow(page, mailbox));
  },

  newUser: async ({}, use) => {
    await use(buildUser());
  },

  /**
   * Demo aid: TEST_DELAY_MS pauses after each test. Depends on `page` so its teardown runs
   * before the page closes, leaving the final state on screen during the pause in headed runs.
   */
  delayBetweenTests: [
    async ({ page }, use) => {
      await use();
      if (env.testDelayMs > 0) await page.waitForTimeout(env.testDelayMs);
    },
    { auto: true },
  ],
});

export { expect };

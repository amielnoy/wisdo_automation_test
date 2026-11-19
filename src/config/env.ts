import 'dotenv/config';

/** Single source of truth for runtime configuration. Override any value via .env or the shell. */
export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://app.canary.talkspace.com',
  signupPath: process.env.SIGNUP_PATH ?? '/signup/autoswitchpt',

  // Base identity — each test derives a unique Gmail "plus" alias from it.
  baseEmail: process.env.TEST_EMAIL ?? 'amielnoy@gmail.com',
  nickname: process.env.TEST_NICKNAME ?? 'amielnoy',
  password: process.env.TEST_PASSWORD ?? 'Str0ng!Passw0rd#2026',

  // Optional: Gmail App Password for reading verification emails over IMAP.
  // When unset, the email-verification inbox tests are skipped (not failed).
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD,

  // Pause after each test (ms), for watching headed demo runs. 0 = off.
  testDelayMs: Number(process.env.TEST_DELAY_MS ?? 0),
};

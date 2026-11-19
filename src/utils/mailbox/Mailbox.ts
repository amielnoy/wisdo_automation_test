export interface ReceivedEmail {
  subject: string;
  from: string;
  to: string;
  html: string;
  text: string;
  date: Date;
}

/** Inbox abstraction so flows don't care whether mail comes from Gmail IMAP, Mailosaur, MailSlurp, etc. */
export interface Mailbox {
  waitForEmail(opts: { to: string; since: Date; timeoutMs?: number }): Promise<ReceivedEmail>;
}

/**
 * Pulls the 6-digit code out of Talkspace's "Verify your email address" email.
 * Body reads: "...use this code to verify your email address. This code will expire after 10 minutes. 915407"
 * Anchors on the code sentence first so a stray 6-digit number elsewhere (footer, address) can't be picked up.
 */
export function extractVerificationCode(email: ReceivedEmail): string {
  const body = email.text || email.html.replace(/<[^>]+>/g, ' ');
  const anchored = body.match(/use this code[\s\S]{0,200}?\b(\d{6})\b/i);
  const code = anchored?.[1] ?? body.match(/\b(\d{6})\b/)?.[1];
  if (!code) {
    throw new Error(`No 6-digit verification code found in email "${email.subject}" to ${email.to}`);
  }
  return code;
}

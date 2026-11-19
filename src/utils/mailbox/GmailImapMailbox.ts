import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Mailbox, ReceivedEmail } from './Mailbox';

/**
 * Reads the real Gmail inbox over IMAP using an App Password.
 * Uses Gmail's X-GM-RAW search so we can match the exact "+alias" recipient.
 */
export class GmailImapMailbox implements Mailbox {
  constructor(
    private readonly user: string,
    private readonly appPassword: string,
    private readonly pollIntervalMs = 5_000,
  ) {}

  async waitForEmail({ to, since, timeoutMs = 90_000 }: { to: string; since: Date; timeoutMs?: number }): Promise<ReceivedEmail> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const email = await this.findLatest(to, since);
      if (email) return email;
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
    throw new Error(`No email to ${to} arrived within ${timeoutMs}ms`);
  }

  private async findLatest(to: string, since: Date): Promise<ReceivedEmail | undefined> {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: this.user, pass: this.appPassword },
      logger: false,
    });
    try {
      await client.connect();
    } catch (e: any) {
      // Surface Google's reason (e.g. "Application-specific password required") instead of imapflow's generic error.
      throw new Error(`Gmail IMAP login failed for ${this.user}: ${e.responseText ?? e.message}`);
    }
    try {
      // "All Mail" also catches messages Gmail filed under Promotions/Updates. Resolve it by the
      // IMAP special-use flag: its display name is localized (e.g. Hebrew UI), so '[Gmail]/All Mail' isn't guaranteed.
      const folders = await client.list();
      const allMail = folders.find((f) => f.specialUse === '\\All')?.path ?? 'INBOX';
      const lock = await client.getMailboxLock(allMail);
      try {
        const uids = await client.search({ gmraw: `from:team@talkspace.com to:${to} newer_than:1d` }, { uid: true });
        if (!uids || uids.length === 0) return undefined;
        const latest = await client.fetchOne(String(uids[uids.length - 1]), { source: true }, { uid: true });
        if (!latest || !latest.source) return undefined;
        const parsed = await simpleParser(latest.source);
        const date = parsed.date ?? new Date();
        if (date < since) return undefined;
        return {
          subject: parsed.subject ?? '',
          from: parsed.from?.text ?? '',
          to,
          html: typeof parsed.html === 'string' ? parsed.html : '',
          text: parsed.text ?? '',
          date,
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }
}

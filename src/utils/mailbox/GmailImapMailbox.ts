import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Mailbox, ReceivedEmail } from './Mailbox';

/** Wrong credentials won't fix themselves on the next poll, so this one is not retried. */
class ImapLoginError extends Error {}

/**
 * imapflow sets `authenticationFailed` on any NO/BAD reply to LOGIN, which includes Gmail pushing back on load
 * ("[ALERT] Too many simultaneous connections", "[UNAVAILABLE]", "[THROTTLED]"). Those pass, so only response
 * codes that mean "these credentials will never work" count as permanent. Anything unrecognised is retried:
 * a wrongly retried permanent failure costs the inbox timeout, a wrongly failed transient one is a flaky test.
 */
function isPermanentLoginFailure(e: any): boolean {
  if (!e.authenticationFailed) return false;
  if (['AUTHENTICATIONFAILED', 'AUTHORIZATIONFAILED', 'EXPIRED'].includes(e.serverResponseCode)) return true;
  return /application-specific password/i.test(e.responseText ?? ''); // App Password missing: needs a config fix
}

/**
 * Reads the real Gmail inbox over IMAP using an App Password.
 * Uses Gmail's X-GM-RAW search so we can match the exact "+alias" recipient.
 */
export class GmailImapMailbox implements Mailbox {
  constructor(
    private readonly user: string,
    private readonly appPassword: string,
    private readonly pollIntervalMs = 5_000,
    // A healthy poll (login, list, lock, search, fetch) takes 3-7s. Gmail occasionally stalls one, and imapflow's
    // own socket timeout is minutes, so without this cap a single stuck poll eats the whole test budget.
    private readonly pollTimeoutMs = 15_000,
  ) {}

  async waitForEmail({ to, since, timeoutMs = 60_000 }: { to: string; since: Date; timeoutMs?: number }): Promise<ReceivedEmail> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        const email = await this.poll(to, since, Math.min(this.pollTimeoutMs, deadline - Date.now()));
        if (email) return email;
      } catch (e) {
        if (e instanceof ImapLoginError) throw e;
        lastError = e; // stalled poll, dropped connection or throttled login: try again on the next poll
      }
      await new Promise((r) => setTimeout(r, Math.max(0, Math.min(this.pollIntervalMs, deadline - Date.now()))));
    }
    const reason = lastError ? ` (last poll failed: ${lastError instanceof Error ? lastError.message : lastError})` : '';
    throw new Error(`No email to ${to} arrived within ${timeoutMs}ms${reason}`);
  }

  /** One search on a fresh connection, abandoned (socket closed) if it runs past `budgetMs`. */
  private async poll(to: string, since: Date, budgetMs: number): Promise<ReceivedEmail | undefined> {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: this.user, pass: this.appPassword },
      logger: false,
    });
    client.on('error', () => {}); // a socket error after close() must not crash the worker
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`IMAP poll exceeded ${budgetMs}ms`)), budgetMs);
    });
    try {
      return await Promise.race([this.findLatest(client, to, since), timeout]);
    } finally {
      clearTimeout(timer);
      client.close(); // no-op after a clean logout; tears down the socket of a stalled poll
    }
  }

  private async findLatest(client: ImapFlow, to: string, since: Date): Promise<ReceivedEmail | undefined> {
    try {
      await client.connect();
    } catch (e: any) {
      // Surface Google's reason (e.g. "Application-specific password required") instead of imapflow's generic error.
      const message = `Gmail IMAP login failed for ${this.user}: ${e.responseText ?? e.message}`;
      throw isPermanentLoginFailure(e) ? new ImapLoginError(message) : new Error(message);
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

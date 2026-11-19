import invalidEmailsJson from '../../test-data/invalid-emails.json';
import passwordRulesJson from '../../test-data/password-rules.json';
import { SignupUser } from './userFactory';

export interface InvalidEmailCase {
  name: string;
  fields: Partial<SignupUser>;
  expected: { blockedBy: 'browser' } | { blockedBy: 'app'; error: string };
}

export interface PasswordRuleCase {
  name: string;
  fields: Partial<SignupUser>;
  expected: { errors: string[]; strength: string; submitBlocked: boolean };
}

/**
 * Fail at load time on a malformed case. Otherwise a typo in the JSON would quietly
 * become a test that checks nothing.
 */
function check(file: string, name: unknown, ok: boolean, problem: string): void {
  if (!ok) throw new Error(`${file}: case "${String(name)}" ${problem}`);
}

export const invalidEmailCases: InvalidEmailCase[] = invalidEmailsJson.cases.map((c) => {
  const file = 'test-data/invalid-emails.json';
  const e = c.expected as Record<string, unknown>;
  check(file, c.name, typeof c.fields?.email === 'string', 'needs fields.email');
  check(file, c.name, e.blockedBy === 'browser' || e.blockedBy === 'app', "needs expected.blockedBy 'browser' or 'app'");
  check(file, c.name, e.blockedBy !== 'app' || typeof e.error === 'string', "with blockedBy 'app' needs expected.error");
  return c as InvalidEmailCase;
});

export const passwordRuleCases: PasswordRuleCase[] = passwordRulesJson.cases.map((c) => {
  const file = 'test-data/password-rules.json';
  check(file, c.name, typeof c.fields?.password === 'string', 'needs fields.password');
  check(file, c.name, Array.isArray(c.expected?.errors), 'needs expected.errors (use [] for an accepted password)');
  check(file, c.name, typeof c.expected?.strength === 'string', 'needs expected.strength');
  check(file, c.name, !(c.expected.submitBlocked && c.expected.errors.length === 0), 'cannot submit an accepted password (it would create an account)');
  return c as PasswordRuleCase;
});

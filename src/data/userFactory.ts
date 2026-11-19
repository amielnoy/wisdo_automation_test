import { env } from '../config/env';

export interface SignupUser {
  email: string;
  password: string;
  nickname: string;
  /** Two-letter US state code, matches the dropdown's data-qa suffix (stateDropdownOption-NY). */
  stateCode: string;
}

/**
 * Builds a unique Gmail plus-alias from the base email, e.g.
 * amielnoy@gmail.com → amielnoy+ts1732031234567x3f@gmail.com.
 * Gmail delivers it to the base inbox, so every test gets a fresh, never-registered address.
 */
export function uniqueEmail(baseEmail = env.baseEmail): string {
  const [local, domain] = baseEmail.split('@');
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  return `${local}+ts${suffix}@${domain}`;
}

export function buildUser(overrides: Partial<SignupUser> = {}): SignupUser {
  return {
    email: uniqueEmail(),
    password: env.password,
    nickname: env.nickname,
    stateCode: 'NY',
    ...overrides,
  };
}

import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { env } from '../config/env';
import { step } from '../utils/step';

/** /signup/autoswitchpt — "Create your account". Selectors verified against the live DOM (data-qa attributes). */
export class SignupPage extends BasePage {
  readonly path = env.signupPath;

  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly showPasswordButton: Locator;
  readonly hidePasswordButton: Locator;
  readonly nicknameInput: Locator;
  readonly countryDropdown: Locator;
  readonly countrySelectedValue: Locator;
  readonly stateDropdown: Locator;
  readonly stateInput: Locator;
  readonly submitButton: Locator;
  readonly telemedicineLink: Locator;
  readonly termsLink: Locator;
  readonly privacyLink: Locator;
  readonly statePrivacyRightsLink: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Create your account' });
    this.emailInput = page.getByTestId('emailInput');
    this.passwordInput = page.getByTestId('createAccountPasswordInput');
    this.showPasswordButton = page.getByRole('button', { name: 'see password' });
    // The toggle's accessible name flips with state: 'see password' ⇄ 'hide password'.
    this.hidePasswordButton = page.getByRole('button', { name: 'hide password' });
    this.nicknameInput = page.getByTestId('nicknameInput');
    this.countryDropdown = page.getByTestId('countryDropdown');
    this.countrySelectedValue = page.getByTestId('countryDropdownSelectedValue');
    this.stateDropdown = page.getByTestId('stateDropdown');
    this.stateInput = page.getByTestId('stateDropdownInput');
    this.submitButton = page.getByTestId('createAccountSubmitButton');
    this.telemedicineLink = page.getByTestId('telemedicineLink');
    this.termsLink = page.getByTestId('createAccountTermsLink');
    this.privacyLink = page.getByTestId('createAccountPrivacyLink');
    this.statePrivacyRightsLink = page.getByTestId('createAccountNoticeOfUSStatePrivacyRightsLink');
    this.loginLink = page.getByTestId('loginLink');
  }

  @step('Enter email "{0}"')
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  @step('Enter password')
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  @step('Enter nickname "{0}"')
  async fillNickname(nickname: string) {
    await this.nicknameInput.fill(nickname);
  }

  /** react-select: open the menu, then click the option by its stable data-qa code (e.g. stateDropdownOption-NY). */
  @step('Select state {0}')
  async selectState(stateCode: string) {
    await this.stateDropdown.click();
    await this.page.getByTestId(`stateDropdownOption-${stateCode}`).click();
  }

  @step('Click "see password"')
  async showPassword() {
    await this.showPasswordButton.click();
  }

  @step('Click "hide password"')
  async hidePassword() {
    await this.hidePasswordButton.click();
  }

  @step('Click "Create account"')
  async submit() {
    await this.submitButton.click();
  }

  // Validation copy observed on canary. Note: the email error reads "Please enter an email." for an
  // empty field AND for a malformed address, so the copy doesn't tell the user what's actually wrong.
  get emailError(): Locator {
    return this.page.getByText('Please enter an email.');
  }

  /** Password rules are validated live while typing, before submit. */
  get passwordLengthError(): Locator {
    return this.page.getByText('Password must be at least 8 characters.');
  }

  passwordStrength(level: 'Weak' | 'Medium' | 'Strong'): Locator {
    return this.page.getByText(`Strength: ${level}`);
  }
}

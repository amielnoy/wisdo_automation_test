import { Page, test } from '@playwright/test';

/** Shared plumbing for page objects. Page objects expose locators + atomic actions only — no assertions, no business flows. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async open(): Promise<void> {
    // Inline step (not @step) because the title needs the instance's path.
    await test.step(`Navigate to ${this.path}`, () => this.page.goto(this.path).then(() => undefined), { box: true });
  }
}

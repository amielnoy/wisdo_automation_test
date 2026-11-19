import { Page } from '@playwright/test';

/** Shared plumbing for page objects. Page objects expose locators + atomic actions only — no assertions, no business flows. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async open(): Promise<void> {
    await this.page.goto(this.path);
  }
}

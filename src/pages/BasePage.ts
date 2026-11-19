import { Page } from '@playwright/test';
import { step } from '../utils/step';

/** Shared plumbing for page objects. Page objects expose locators + atomic actions only — no assertions, no business flows. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async open(): Promise<void> {
    // step() as a function (not @step) because the description needs the instance's path.
    await step(`Navigate to ${this.path}`, async () => {
      await this.page.goto(this.path);
    });
  }
}

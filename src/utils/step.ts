import { test } from '@playwright/test';

type AsyncMethod<This, Args extends unknown[], Return> = (this: This, ...args: Args) => Promise<Return>;
type StepDecorator = <This, Args extends unknown[], Return>(
  target: AsyncMethod<This, Args, Return>,
  context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

/**
 * One API for every reported step, in the Allure report and Playwright's HTML report.
 *
 * As a decorator on page/flow methods. The description may reference arguments:
 *   `{0}` → first argument, `{0.email}` → a property of it.
 *     @step('Enter email "{0}"')
 *     async fillEmail(email: string) { … }
 *
 * As a function inside tests:
 *     await step('Verify the OTP screen targets the registered email', async () => { … });
 *
 * Never put secrets (passwords) in descriptions.
 * `box: true` makes failures point at the test line that called the step, not inside the framework.
 */
export function step(description: string): StepDecorator;
export function step<T>(description: string, body: () => Promise<T>): Promise<T>;
export function step<T>(description: string, body?: () => Promise<T>): StepDecorator | Promise<T> {
  if (body) return test.step(description, body, { box: true });

  return function <This, Args extends unknown[], Return>(target: AsyncMethod<This, Args, Return>) {
    return function (this: This, ...args: Args) {
      const title = description.replace(/\{(\d+)(?:\.(\w+))?\}/g, (_match, index: string, prop?: string) => {
        const arg = args[Number(index)] as Record<string, unknown> | undefined;
        return String(prop ? arg?.[prop] : arg);
      });
      return test.step(title, () => target.call(this, ...args), { box: true });
    };
  };
}

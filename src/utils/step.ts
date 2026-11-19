import { test } from '@playwright/test';

type AsyncMethod<This, Args extends unknown[], Return> = (this: This, ...args: Args) => Promise<Return>;

/**
 * Wraps a page/flow method in test.step, so every call shows up as a named step
 * in the Allure report and Playwright's HTML report, nested by call depth.
 *
 * Title placeholders: `{0}` → first argument, `{0.email}` → a property of it.
 * Never put secrets (passwords) in titles.
 * `box: true` makes failures point at the test line that called the method, not inside the framework.
 */
export function step(title: string) {
  return function <This, Args extends unknown[], Return>(
    target: AsyncMethod<This, Args, Return>,
    _context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
  ): AsyncMethod<This, Args, Return> {
    return function (this: This, ...args: Args) {
      const name = title.replace(/\{(\d+)(?:\.(\w+))?\}/g, (_match, index: string, prop?: string) => {
        const arg = args[Number(index)] as Record<string, unknown> | undefined;
        return String(prop ? arg?.[prop] : arg);
      });
      return test.step(name, () => target.call(this, ...args), { box: true });
    };
  };
}

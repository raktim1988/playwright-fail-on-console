import * as _playwright_test from '@playwright/test';
import { Page } from '@playwright/test';
export { expect } from '@playwright/test';

/** Console levels accepted by {@link WatchOptions.levels}. */
type ConsoleLevel = 'error' | 'warn' | 'warning' | 'info' | 'log' | 'debug';
interface WatchOptions {
    /** Console levels to capture. Default: ['error'] */
    levels?: ConsoleLevel[];
    /** Messages matching this pattern are ignored (string = substring match, RegExp = regex) */
    ignore?: Array<string | RegExp>;
    /** If true, throw immediately when a message fires instead of collecting. Default: false */
    failImmediately?: boolean;
}
interface ConsoleMessage {
    level: string;
    text: string;
    url: string;
}
interface ConsoleWatcher {
    messages(): ConsoleMessage[];
    assertNone(): void;
    stop(): void;
}
declare function watchConsole(page: Page, options?: WatchOptions): ConsoleWatcher;
type FailOnConsoleFixtures = {
    failOnConsoleError: ConsoleWatcher;
    failOnConsoleWarn: ConsoleWatcher;
};
declare const test: _playwright_test.TestType<_playwright_test.PlaywrightTestArgs & _playwright_test.PlaywrightTestOptions & FailOnConsoleFixtures, _playwright_test.PlaywrightWorkerArgs & _playwright_test.PlaywrightWorkerOptions>;

export { type ConsoleLevel, type ConsoleMessage, type ConsoleWatcher, type WatchOptions, test, watchConsole };

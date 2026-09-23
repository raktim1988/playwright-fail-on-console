import * as _playwright_test from '@playwright/test';
import { Page } from '@playwright/test';
export { expect } from '@playwright/test';

/** Console levels accepted by {@link WatchOptions.levels}. */
type ConsoleLevel = 'error' | 'warn' | 'warning' | 'info' | 'log' | 'debug';
/**
 * Marker `level` used for uncaught page exceptions. Deliberately not a
 * `ConsoleLevel` — Playwright emits these on the separate `pageerror` event,
 * never on the `console` event.
 */
declare const PAGE_ERROR_LEVEL = "pageerror";
interface WatchOptions {
    /** Console levels to capture. Default: ['error'] */
    levels?: ConsoleLevel[];
    /**
     * Also capture uncaught exceptions and unhandled rejections via
     * `page.on('pageerror')`. These never appear on the `console` event, so
     * without this a page that is actively throwing is reported as clean.
     * Default: false (opt-in, for backwards compatibility).
     */
    pageErrors?: boolean;
    /** Messages matching this pattern are ignored (string = substring match, RegExp = regex) */
    ignore?: Array<string | RegExp>;
    /**
     * If true, throw immediately when a message fires instead of collecting.
     * Default: false. Note this applies to console messages only — see
     * {@link WatchOptions.pageErrors}.
     */
    failImmediately?: boolean;
}
interface ConsoleMessage {
    level: string;
    text: string;
    url: string;
    /** The original Error, for `pageerror` entries only. Gives access to `.stack`. */
    error?: Error;
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
    failOnBrowserErrors: ConsoleWatcher;
};
declare const test: _playwright_test.TestType<_playwright_test.PlaywrightTestArgs & _playwright_test.PlaywrightTestOptions & FailOnConsoleFixtures, _playwright_test.PlaywrightWorkerArgs & _playwright_test.PlaywrightWorkerOptions>;

export { type ConsoleLevel, type ConsoleMessage, type ConsoleWatcher, PAGE_ERROR_LEVEL, type WatchOptions, test, watchConsole };

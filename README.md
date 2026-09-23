# playwright-fail-on-console

> Like `jest-fail-on-console` — but for Playwright.

Your Playwright test passed. The page logged `console.error: Payment SDK failed to initialise`. Nobody noticed. This package makes Playwright notice.

It also catches the thing most people miss: **uncaught page exceptions never reach the `console` event at all.** A page throwing `TypeError: undefined is not a function` produces *zero* console events — so a hand-rolled `page.on('console')` check reports it as clean. See [Console errors vs page errors](#console-errors-vs-page-errors).

`jest-fail-on-console` has ~375k weekly installs. `vitest-fail-on-console` exists. `cypress-fail-on-console-error` exists. Until now, Playwright had nothing.

## Install

```bash
npm install -D playwright-fail-on-console
```

## Quick start — fixture (recommended)

```typescript
import { test, expect } from 'playwright-fail-on-console'

test('checkout flow', async ({ page, failOnConsoleError }) => {
  await page.goto('/checkout')
  // console.error fires → test FAILS with the exact message
})
```

Drop it into your existing fixture chain with `mergeTests`:

```typescript
import { mergeTests } from '@playwright/test'
import { test as failOnConsole } from 'playwright-fail-on-console'
import { test as myFixtures } from './my-fixtures'

export const test = mergeTests(myFixtures, failOnConsole)
```

## Manual usage — `watchConsole()`

For existing test files where you want explicit control:

```typescript
import { test, expect } from '@playwright/test'
import { watchConsole } from 'playwright-fail-on-console'

test('checkout flow', async ({ page }) => {
  const watcher = watchConsole(page, {
    levels: ['error', 'warn'],
    ignore: ['Expected server response time']
  })

  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Pay' }).click()

  watcher.assertNone() // throws if any console.error or .warn fired
})
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `levels` | `Array<'error'\|'warn'\|'warning'\|'info'\|'log'\|'debug'>` | `['error']` | Console levels to capture |
| `pageErrors` | `boolean` | `false` | Also capture uncaught exceptions / unhandled rejections via `page.on('pageerror')` |
| `ignore` | `Array<string\|RegExp>` | `[]` | Ignore messages containing this string or matching this regex |
| `failImmediately` | `boolean` | `false` | Throw the moment a message fires rather than collecting until `assertNone()` |

### A note on `warn` vs `warning`

Playwright reports `console.warn()` with `ConsoleMessage.type() === 'warning'`,
not `'warn'`. Both spellings are accepted in `levels` and mean the same thing,
so `levels: ['warn']` reliably captures `console.warn()` calls.

The `level` field on a captured message always reports Playwright's raw value
(`'warning'`), so assertions written against `type()` keep working:

```typescript
const watcher = watchConsole(page, { levels: ['warn'] })
// ... console.warn('Deprecation: old API endpoint used') fires
watcher.messages()[0].level // 'warning'
```

## Fixtures provided

| Fixture | Watches | Fails when |
|---------|---------|------------|
| `failOnConsoleError` | `console.error` | Any error fires during the test |
| `failOnConsoleWarn` | `console.error` + `console.warn` | Any error or warning fires |
| `failOnBrowserErrors` | `console.error` + uncaught exceptions | Either channel fires |

## Console errors vs page errors

These are two different Playwright events, and most hand-rolled checks only listen to one.

| | Emitted on | Example |
|---|---|---|
| Console message | `page.on('console')` | `console.error('payment failed')` |
| Page error | `page.on('pageerror')` | `TypeError: undefined is not a function` |

An uncaught exception **produces no console event whatsoever.** DevTools *displays* it in the Console pane, which is why almost everyone assumes `page.on('console')` covers it. It does not.

```typescript
const watcher = watchConsole(page, { levels: ['error'], pageErrors: true })
```

Or use the fixture:

```typescript
test('checkout flow', async ({ page, failOnBrowserErrors }) => {
  await page.goto('/checkout')
  // console.error OR an uncaught TypeError → test FAILS
})
```

Captured page errors arrive with `level: 'pageerror'` and the original `Error` object on `.error`, so you can inspect `.name` and `.stack`.

> **Note:** page errors are always collected and asserted at the end, never thrown from the listener — throwing inside a `pageerror` callback [causes unpredictable behaviour in Playwright](https://github.com/microsoft/playwright/issues/28056). `failImmediately` therefore applies to console messages only.

## How this compares to Playwright's built-in APIs

Playwright **1.56+** added `page.consoleMessages()` and `page.pageErrors()` for retrieving what a page emitted. If all you need is to read messages at one point in a single test, those are built in — use them.

This package is for the case they don't cover:

| | Native 1.56+ | This package |
|---|---|---|
| Retrieve messages | ✅ | ✅ |
| **Automatically fail the test** | ❌ you write the assertion in every test | ✅ one fixture, applies suite-wide |
| Ignore-list known noise | ❌ manual filtering | ✅ `ignore: [/ResizeObserver/]` |
| Console + page errors in one assertion | ❌ two separate calls | ✅ single `assertNone()` |
| Retention limit | 200 entries | unbounded |
| Playwright < 1.56 | ❌ | ✅ (supports >= 1.30) |

Playwright maintainers have [explicitly declined](https://github.com/microsoft/playwright/issues/40880) to build auto-failing into core — *"we were not able to come with an easy enough API that would be better than existing solutions."* This is one of those solutions.

## What you get when it fails

```
Error: [playwright-fail-on-console] 2 browser message(s) detected:
  1. [error] Failed to load resource: net::ERR_FAILED
     at: https://shop.example.com/checkout
  2. [pageerror] TypeError: Cannot read properties of undefined (reading 'total')
     at: https://shop.example.com/checkout
```

## FAQ

**Why not just add `page.on('console', ...)` myself?**
You forget to. Every time. And even when you remember, `page.on('console')` misses uncaught exceptions entirely — see [Console errors vs page errors](#console-errors-vs-page-errors). This makes it automatic — add the fixture once, protected everywhere.

**Will this break my existing tests?**
Only if they have real `console.error` calls you were already ignoring. Use the `ignore` option to allowlist known noise while you clean up.

**Does this work with Playwright's `mergeTests`?**
Yes — it's a standard Playwright fixture and composes cleanly.

## License

MIT

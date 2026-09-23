# playwright-fail-on-console

> Like `jest-fail-on-console` — but for Playwright.

Your Playwright test passed. The page logged `console.error: Payment SDK failed to initialise`. Nobody noticed. This package makes Playwright notice.

`jest-fail-on-console` has tens of thousands of weekly installs. `vitest-fail-on-console` exists. `cypress-fail-on-console-error` exists. Until now, Playwright had nothing.

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

## What you get when it fails

```
Error: [playwright-fail-on-console] 2 console message(s) detected:
  1. [error] Failed to load resource: net::ERR_FAILED
     at: https://shop.example.com/checkout
  2. [error] Uncaught (in promise) TypeError: Cannot read properties of undefined
     at: https://shop.example.com/checkout
```

## FAQ

**Why not just add `page.on('console', ...)` myself?**
You forget to. Every time. Then a 404 or unhandled rejection silently passes your test suite for three weeks until a user files a bug. This makes it automatic — add the fixture once, protected everywhere.

**Will this break my existing tests?**
Only if they have real `console.error` calls you were already ignoring. Use the `ignore` option to allowlist known noise while you clean up.

**Does this work with Playwright's `mergeTests`?**
Yes — it's a standard Playwright fixture and composes cleanly.

## License

MIT

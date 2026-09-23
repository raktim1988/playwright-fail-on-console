import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { watchConsole } from '../src/index'

/** Renders a page that fires the given console calls. */
async function emit(page: Page, script: string): Promise<void> {
  await page.setContent(`<html><body><script>${script}</script></body></html>`)
}

test.describe('level matching', () => {
  test("'warn' captures console.warn despite Playwright reporting 'warning'", async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['error', 'warn'] })

    await emit(page, `console.warn('Deprecation: old API endpoint used');console.log('ignored')`)

    const messages = watcher.messages()
    expect(messages).toHaveLength(1)
    expect(messages[0].level).toBe('warning')
    expect(messages[0].text).toContain('Deprecation')
  })

  test("'warning' is accepted as an alias for 'warn'", async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['warning'] })

    await emit(page, `console.warn('heads up')`)

    expect(watcher.messages()).toHaveLength(1)
  })

  test('levels not configured are not captured', async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['error'] })

    await emit(page, `console.warn('w');console.info('i');console.log('l')`)

    expect(watcher.messages()).toHaveLength(0)
  })

  test('defaults to error only', async ({ page }) => {
    const watcher = watchConsole(page)

    await emit(page, `console.warn('w');console.error('boom')`)

    const messages = watcher.messages()
    expect(messages).toHaveLength(1)
    expect(messages[0].level).toBe('error')
  })

  test('info and log levels are captured when configured', async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['info', 'log'] })

    await emit(page, `console.info('i');console.log('l');console.error('e')`)

    expect(
      watcher
        .messages()
        .map(m => m.level)
        .sort()
    ).toEqual(['info', 'log'])
  })
})

test.describe('ignore patterns', () => {
  test('suppresses known noise by string and regex', async ({ page }) => {
    const watcher = watchConsole(page, {
      levels: ['error'],
      ignore: ['Expected server response', /third-party-sdk/i],
    })

    await emit(
      page,
      `console.error('Expected server response time exceeded');` +
        `console.error('Third-Party-SDK: analytics failed');` +
        `console.error('REAL ERROR: checkout unresponsive')`
    )

    const messages = watcher.messages()
    expect(messages).toHaveLength(1)
    expect(messages[0].text).toContain('REAL ERROR')
  })

  test('ignore applies to warn level too', async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['warn'], ignore: [/deprecat/i] })

    await emit(page, `console.warn('Deprecation notice');console.warn('real warning')`)

    const messages = watcher.messages()
    expect(messages).toHaveLength(1)
    expect(messages[0].text).toBe('real warning')
  })
})

test.describe('assertNone', () => {
  test('passes silently when nothing captured', async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['error'] })

    await emit(page, `console.log('all good')`)

    expect(() => watcher.assertNone()).not.toThrow()
  })

  test('throws a summary listing captured messages', async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['error', 'warn'] })

    await emit(page, `console.error('bad thing');console.warn('risky thing')`)

    expect(() => watcher.assertNone()).toThrow(/2 console message\(s\) detected/)
    expect(() => watcher.assertNone()).toThrow(/\[warning\] risky thing/)
  })
})

test.describe('stop', () => {
  test('detaches the listener so later messages are not captured', async ({ page }) => {
    const watcher = watchConsole(page, { levels: ['error'] })

    await emit(page, `console.error('first')`)
    watcher.stop()
    await emit(page, `console.error('second')`)

    const messages = watcher.messages()
    expect(messages).toHaveLength(1)
    expect(messages[0].text).toBe('first')
  })
})

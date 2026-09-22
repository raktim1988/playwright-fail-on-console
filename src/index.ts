import { test as base, Page, ConsoleMessage as PWConsoleMessage } from '@playwright/test'

export interface WatchOptions {
  /** Console levels to capture. Default: ['error'] */
  levels?: Array<'error' | 'warn' | 'info' | 'log'>
  /** Messages matching this pattern are ignored (string = substring match, RegExp = regex) */
  ignore?: Array<string | RegExp>
  /** If true, throw immediately when a message fires instead of collecting. Default: false */
  failImmediately?: boolean
}

export interface ConsoleMessage {
  level: string
  text: string
  url: string
}

export interface ConsoleWatcher {
  messages(): ConsoleMessage[]
  assertNone(): void
  stop(): void
}

export function watchConsole(page: Page, options: WatchOptions = {}): ConsoleWatcher {
  const levels = options.levels ?? ['error']
  const ignore = options.ignore ?? []
  const captured: ConsoleMessage[] = []

  function isIgnored(text: string): boolean {
    return ignore.some(pattern =>
      typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
    )
  }

  function handler(msg: PWConsoleMessage): void {
    if (!levels.includes(msg.type() as 'error' | 'warn' | 'info' | 'log')) return
    const text = msg.text()
    if (isIgnored(text)) return
    const entry: ConsoleMessage = {
      level: msg.type(),
      text,
      url: page.url(),
    }
    captured.push(entry)
    if (options.failImmediately) {
      throw new Error(
        `[playwright-fail-on-console] console.${entry.level} detected:\n  ${entry.text}\n  at: ${entry.url}`
      )
    }
  }

  page.on('console', handler)

  return {
    messages: () => [...captured],
    assertNone(): void {
      if (captured.length === 0) return
      const summary = captured
        .map((m, i) => `  ${i + 1}. [${m.level}] ${m.text}\n     at: ${m.url}`)
        .join('\n')
      throw new Error(
        `[playwright-fail-on-console] ${captured.length} console message(s) detected:\n${summary}`
      )
    },
    stop(): void {
      page.off('console', handler)
    },
  }
}

type FailOnConsoleFixtures = {
  failOnConsoleError: ConsoleWatcher
  failOnConsoleWarn: ConsoleWatcher
}

export const test = base.extend<FailOnConsoleFixtures>({
  failOnConsoleError: async ({ page }, use) => {
    const watcher = watchConsole(page, { levels: ['error'] })
    await use(watcher)
    watcher.stop()
    watcher.assertNone()
  },
  failOnConsoleWarn: async ({ page }, use) => {
    const watcher = watchConsole(page, { levels: ['error', 'warn'] })
    await use(watcher)
    watcher.stop()
    watcher.assertNone()
  },
})

export { expect } from '@playwright/test'

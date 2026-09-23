import { test as base, Page, ConsoleMessage as PWConsoleMessage } from '@playwright/test'

/** Console levels accepted by {@link WatchOptions.levels}. */
export type ConsoleLevel = 'error' | 'warn' | 'warning' | 'info' | 'log' | 'debug'

/**
 * Playwright reports `console.warn()` as type `'warning'`, so a literal
 * `'warn'` comparison never matches. Map each accepted level onto every raw
 * `ConsoleMessage.type()` value that should satisfy it.
 */
const LEVEL_ALIASES: Record<ConsoleLevel, string[]> = {
  error: ['error'],
  warn: ['warn', 'warning'],
  warning: ['warn', 'warning'],
  info: ['info'],
  log: ['log'],
  debug: ['debug'],
}

/** Raw `type()` value -> the console method that produced it, for error text. */
const CONSOLE_METHOD: Record<string, string> = {
  warning: 'warn',
}

/**
 * Marker `level` used for uncaught page exceptions. Deliberately not a
 * `ConsoleLevel` — Playwright emits these on the separate `pageerror` event,
 * never on the `console` event.
 */
export const PAGE_ERROR_LEVEL = 'pageerror'

export interface WatchOptions {
  /** Console levels to capture. Default: ['error'] */
  levels?: ConsoleLevel[]
  /**
   * Also capture uncaught exceptions and unhandled rejections via
   * `page.on('pageerror')`. These never appear on the `console` event, so
   * without this a page that is actively throwing is reported as clean.
   * Default: false (opt-in, for backwards compatibility).
   */
  pageErrors?: boolean
  /** Messages matching this pattern are ignored (string = substring match, RegExp = regex) */
  ignore?: Array<string | RegExp>
  /**
   * If true, throw immediately when a message fires instead of collecting.
   * Default: false. Note this applies to console messages only — see
   * {@link WatchOptions.pageErrors}.
   */
  failImmediately?: boolean
}

export interface ConsoleMessage {
  level: string
  text: string
  url: string
  /** The original Error, for `pageerror` entries only. Gives access to `.stack`. */
  error?: Error
}

export interface ConsoleWatcher {
  messages(): ConsoleMessage[]
  assertNone(): void
  stop(): void
}

export function watchConsole(page: Page, options: WatchOptions = {}): ConsoleWatcher {
  const levels = options.levels ?? ['error']
  const matchedTypes = new Set(levels.flatMap(level => LEVEL_ALIASES[level] ?? [level]))
  const ignore = options.ignore ?? []
  const captured: ConsoleMessage[] = []

  function isIgnored(text: string): boolean {
    return ignore.some(pattern =>
      typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
    )
  }

  function handler(msg: PWConsoleMessage): void {
    if (!matchedTypes.has(msg.type())) return
    const text = msg.text()
    if (isIgnored(text)) return
    const entry: ConsoleMessage = {
      level: msg.type(),
      text,
      url: page.url(),
    }
    captured.push(entry)
    if (options.failImmediately) {
      const method = CONSOLE_METHOD[entry.level] ?? entry.level
      throw new Error(
        `[playwright-fail-on-console] console.${method} detected:\n  ${entry.text}\n  at: ${entry.url}`
      )
    }
  }

  page.on('console', handler)

  /**
   * Uncaught exceptions arrive on a separate event and are never mirrored onto
   * `console`. We only ever collect here — throwing from a `pageerror` listener
   * causes unpredictable behaviour in Playwright, so `failImmediately` is
   * deliberately not honoured for this channel.
   * See https://github.com/microsoft/playwright/issues/28056
   */
  function errorHandler(error: Error): void {
    const text = error.message || String(error)
    if (isIgnored(text)) return
    captured.push({ level: PAGE_ERROR_LEVEL, text, url: page.url(), error })
  }

  if (options.pageErrors) page.on('pageerror', errorHandler)

  return {
    messages: () => [...captured],
    assertNone(): void {
      if (captured.length === 0) return
      const summary = captured
        .map((m, i) => {
          const label = m.error?.name ? `${m.error.name}: ${m.text}` : m.text
          return `  ${i + 1}. [${m.level}] ${label}\n     at: ${m.url}`
        })
        .join('\n')
      const noun = options.pageErrors ? 'browser message(s)' : 'console message(s)'
      throw new Error(
        `[playwright-fail-on-console] ${captured.length} ${noun} detected:\n${summary}`
      )
    },
    stop(): void {
      page.off('console', handler)
      if (options.pageErrors) page.off('pageerror', errorHandler)
    },
  }
}

type FailOnConsoleFixtures = {
  failOnConsoleError: ConsoleWatcher
  failOnConsoleWarn: ConsoleWatcher
  failOnBrowserErrors: ConsoleWatcher
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
  failOnBrowserErrors: async ({ page }, use) => {
    const watcher = watchConsole(page, { levels: ['error'], pageErrors: true })
    await use(watcher)
    watcher.stop()
    watcher.assertNone()
  },
})

export { expect } from '@playwright/test'

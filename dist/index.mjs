// src/index.ts
import { test as base } from "@playwright/test";
import { expect } from "@playwright/test";
var LEVEL_ALIASES = {
  error: ["error"],
  warn: ["warn", "warning"],
  warning: ["warn", "warning"],
  info: ["info"],
  log: ["log"],
  debug: ["debug"]
};
var CONSOLE_METHOD = {
  warning: "warn"
};
var PAGE_ERROR_LEVEL = "pageerror";
function watchConsole(page, options = {}) {
  const levels = options.levels ?? ["error"];
  const matchedTypes = new Set(levels.flatMap((level) => LEVEL_ALIASES[level] ?? [level]));
  const ignore = options.ignore ?? [];
  const captured = [];
  function isIgnored(text) {
    return ignore.some(
      (pattern) => typeof pattern === "string" ? text.includes(pattern) : pattern.test(text)
    );
  }
  function handler(msg) {
    if (!matchedTypes.has(msg.type())) return;
    const text = msg.text();
    if (isIgnored(text)) return;
    const entry = {
      level: msg.type(),
      text,
      url: page.url()
    };
    captured.push(entry);
    if (options.failImmediately) {
      const method = CONSOLE_METHOD[entry.level] ?? entry.level;
      throw new Error(
        `[playwright-fail-on-console] console.${method} detected:
  ${entry.text}
  at: ${entry.url}`
      );
    }
  }
  page.on("console", handler);
  function errorHandler(error) {
    const text = error.message || String(error);
    if (isIgnored(text)) return;
    captured.push({ level: PAGE_ERROR_LEVEL, text, url: page.url(), error });
  }
  if (options.pageErrors) page.on("pageerror", errorHandler);
  return {
    messages: () => [...captured],
    assertNone() {
      if (captured.length === 0) return;
      const summary = captured.map((m, i) => {
        const label = m.error?.name ? `${m.error.name}: ${m.text}` : m.text;
        return `  ${i + 1}. [${m.level}] ${label}
     at: ${m.url}`;
      }).join("\n");
      const noun = options.pageErrors ? "browser message(s)" : "console message(s)";
      throw new Error(
        `[playwright-fail-on-console] ${captured.length} ${noun} detected:
${summary}`
      );
    },
    stop() {
      page.off("console", handler);
      if (options.pageErrors) page.off("pageerror", errorHandler);
    }
  };
}
var test = base.extend({
  failOnConsoleError: async ({ page }, use) => {
    const watcher = watchConsole(page, { levels: ["error"] });
    await use(watcher);
    watcher.stop();
    watcher.assertNone();
  },
  failOnConsoleWarn: async ({ page }, use) => {
    const watcher = watchConsole(page, { levels: ["error", "warn"] });
    await use(watcher);
    watcher.stop();
    watcher.assertNone();
  },
  failOnBrowserErrors: async ({ page }, use) => {
    const watcher = watchConsole(page, { levels: ["error"], pageErrors: true });
    await use(watcher);
    watcher.stop();
    watcher.assertNone();
  }
});
export {
  PAGE_ERROR_LEVEL,
  expect,
  test,
  watchConsole
};

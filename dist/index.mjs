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
  return {
    messages: () => [...captured],
    assertNone() {
      if (captured.length === 0) return;
      const summary = captured.map((m, i) => `  ${i + 1}. [${m.level}] ${m.text}
     at: ${m.url}`).join("\n");
      throw new Error(
        `[playwright-fail-on-console] ${captured.length} console message(s) detected:
${summary}`
      );
    },
    stop() {
      page.off("console", handler);
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
  }
});
export {
  expect,
  test,
  watchConsole
};

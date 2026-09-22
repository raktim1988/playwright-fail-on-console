"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  expect: () => import_test2.expect,
  test: () => test,
  watchConsole: () => watchConsole
});
module.exports = __toCommonJS(index_exports);
var import_test = require("@playwright/test");
var import_test2 = require("@playwright/test");
function watchConsole(page, options = {}) {
  const levels = options.levels ?? ["error"];
  const ignore = options.ignore ?? [];
  const captured = [];
  function isIgnored(text) {
    return ignore.some(
      (pattern) => typeof pattern === "string" ? text.includes(pattern) : pattern.test(text)
    );
  }
  function handler(msg) {
    if (!levels.includes(msg.type())) return;
    const text = msg.text();
    if (isIgnored(text)) return;
    const entry = {
      level: msg.type(),
      text,
      url: page.url()
    };
    captured.push(entry);
    if (options.failImmediately) {
      throw new Error(
        `[playwright-fail-on-console] console.${entry.level} detected:
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
var test = import_test.test.extend({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  expect,
  test,
  watchConsole
});

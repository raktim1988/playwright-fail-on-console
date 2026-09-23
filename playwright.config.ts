import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: 'list',
  use: {
    // Tests drive the page via setContent only — no network access required.
    baseURL: undefined,
  },
})

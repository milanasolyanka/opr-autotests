import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: 0,
  repeatEach: 3,
  workers: 2,
  timeout: 60000,

  use: {
    headless: true,
    storageState: "storageState.json",
    // скриншоты
    screenshot: "only-on-failure",
    // видео
    video: "on-first-retry",
    // video: "off",
    // трейсы (очень полезно для дебага)
    trace: "retain-on-failure",
    // ТАЙМАУТ ДЛЯ КАЖДОГО ДЕЙСТВИЯ
    actionTimeout: 60000,
    // ТАЙМАУТ ДЛЯ НАВИГАЦИИ
    navigationTimeout: 60000,
  },

  reporter: [["html", { open: "never" }], ["allure-playwright"]],

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "firefox",
      use: { browserName: "firefox" },
    },
    {
      name: "webkit",
      use: { browserName: "webkit" },
    },
  ],
});

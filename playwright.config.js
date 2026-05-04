import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",

  retries: 0,

  // ВАЖНО: повтор тестов
  repeatEach: 1,

  use: {
    headless: true,

    // скриншоты
    screenshot: "only-on-failure",

    // видео
    video: "retain-on-failure",

    // трейсы (очень полезно для дебага)
    trace: "retain-on-failure",
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

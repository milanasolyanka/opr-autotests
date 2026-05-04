import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-01: Вход через e-mail и пароль", () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      recordVideo: { dir: "videos/" },
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      extraHTTPHeaders: {
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    page = await context.newPage();
    await page.setDefaultTimeout(30000);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("Успешный вход с лендинга", async () => {
    await test.step('Переход на логин"', async () => {
      await page.goto(process.env.BASE_URL! + "/login", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Ждём загрузки формы
      await page.waitForSelector(
        ".auntefication_layout, .tir-tabs, .tir-input",
        {
          timeout: 15000,
        },
      );
    });

    await test.step("Ввод email", async () => {
      const emailInput = page.locator('input[test="login_i_login"]');
      await emailInput.waitFor({ state: "visible", timeout: 10000 });
      await emailInput.fill(process.env.TEST_EMAIL!);
    });

    await test.step("Ввод пароля", async () => {
      const passwordInput = page.locator('input[test="login_i_password"]');
      // await passwordInput.waitFor({ state: "visible" });
      await passwordInput.fill(process.env.TEST_PASSWORD!);
    });

    await test.step("Отправка формы", async () => {
      const submitButton = page.locator('button[test="login_b_login"]');
      await submitButton.click();
    });

    await test.step("Ожидание редиректа на дашборд", async () => {
      await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    });

    await test.step('Проверка заголовка "Классы"', async () => {
      const classesHeader = page.locator("h1", { hasText: "Классы" });
      await expect(classesHeader).toBeVisible({ timeout: 10000 });
    });

    await test.step("Проверка элемента дашборда (user-menu)", async () => {
      const userMenu = page.locator(".cabinet_header_content");
      await expect(userMenu).toBeVisible();
    });
  });
});

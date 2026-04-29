import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

test.describe("FT-01: Вход через e-mail и пароль", () => {
  let page: Page;
  let context: BrowserContext; // сохраняем ссылку на контекст

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      recordVideo: { dir: "videos/" },
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await page.setDefaultTimeout(30000);
    console.log("[INFO] Браузер запущен, контекст создан.");
  });

  test.afterEach(async () => {
    // Явно закрываем контекст – это финализирует запись видео на диск
    await context.close();

    try {
      const video = page.video();
      if (video) {
        const videoPath = await video.path(); // теперь путь доступен
        if (videoPath) {
          const testName = test.info().title.replace(/[^a-z0-9]/gi, "_");
          const targetDir = path.join(process.cwd(), "videos");
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const targetPath = path.join(targetDir, `${testName}.webm`);
          // Копируем файл (синхронно, чтобы гарантировать сохранение)
          fs.copyFileSync(videoPath, targetPath);
          console.log(`[INFO] Видео сохранено: ${targetPath}`);
        } else {
          console.warn("[WARNING] Путь к видео не найден.");
        }
      }
    } catch (error) {
      console.error(`[WARNING] Не удалось сохранить видео: ${error}`);
    }

    console.log("[INFO] Тест завершён.");
  });

  test("Успешный вход с лендинга", async () => {
    console.log("[STEP 1] Переход на лендинг...");
    await page.goto(process.env.BASE_URL!);
    await page.waitForLoadState("domcontentloaded");

    // 1. Нажать кнопку "ВОЙТИ" в шапке
    console.log('[STEP 2] Нажатие кнопки "ВОЙТИ"...');
    const loginButton = page.locator('button[test="start_b_login"]');
    await loginButton.waitFor({ state: "visible" });
    await loginButton.click();
    console.log('[INFO] Клик по кнопке "ВОЙТИ" выполнен.');

    // Ждём переход на страницу входа (гибкое регулярное выражение)
    console.log("[INFO] Ожидание перехода на страницу входа...");
    await page.waitForURL(/\/login|\/Account\/Login/i, { timeout: 15000 });
    console.log(`[INFO] Текущий URL: ${page.url()}`);

    // Дополнительно ждём появления поля email, чтобы убедиться, что форма загрузилась
    const emailInput = page.locator('input[test="login_i_login"]');
    await emailInput.waitFor({ state: "visible" });

    // 2. Заполняем email
    console.log("[STEP 3] Ввод email...");
    await emailInput.waitFor({ state: "visible" });
    await emailInput.fill(process.env.TEST_EMAIL!);
    console.log(`[INFO] Email введён: ${process.env.TEST_EMAIL}`);

    // 3. Заполняем пароль
    console.log("[STEP 4] Ввод пароля...");
    const passwordInput = page.locator('input[test="login_i_password"]');
    await passwordInput.waitFor({ state: "visible" });
    await passwordInput.fill(process.env.TEST_PASSWORD!);
    console.log(`[INFO] Пароль введён (скрыто).`);

    // 4. Нажать кнопку входа
    console.log("[STEP 5] Отправка формы...");
    const submitButton = page.locator('button[test="login_b_login"]');
    await submitButton.click();
    console.log('[INFO] Кнопка "Войти в аккаунт" нажата.');

    // 5. Ожидаем редирект на дашборд (страница классов)
    console.log("[STEP 6] Ожидание редиректа на дашборд...");
    await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    console.log(`[INFO] Редирект выполнен, текущий URL: ${page.url()}`);

    // 6. Проверяем, что отобразился заголовок "Классы"
    console.log('[STEP 7] Проверка наличия заголовка "Классы"...');
    const classesHeader = page.locator("h1", { hasText: "Классы" });
    await expect(classesHeader).toBeVisible({ timeout: 10000 });
    console.log('[SUCCESS] Заголовок "Классы" виден на странице.');

    // Дополнительная проверка: наличие блока с классами (можно проверить элемент .sidebar_layout или .cabinet_header_content)
    console.log("[STEP 8] Проверка элемента дашборда (user-menu)...");
    const userMenu = page.locator(".cabinet_header_content");
    await expect(userMenu).toBeVisible();
    console.log("[SUCCESS] Элемент навигации дашборда виден.");

    console.log("[OK] Тест FT-01 пройден успешно!");
  });
});

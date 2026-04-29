import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-05: Создание нового урока внутри учебника", () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      recordVideo: { dir: "videos/" },
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await page.setDefaultTimeout(60000);
    console.log("[INFO] Браузер запущен, контекст создан.");
  });

  test.afterEach(async () => {
    await context.close();
    console.log(
      "[INFO] Тест завершён. Видео автоматически сохранено в папку 'videos/'",
    );
  });

  test("Создание урока в учебнике", async () => {
    const bookId = process.env.BOOK_ID!;

    // ===== 1. Логин =====
    console.log("[STEP 1] Переход на лендинг...");
    await page.goto(process.env.BASE_URL!);
    await page.waitForLoadState("domcontentloaded");

    console.log('[STEP 2] Нажатие кнопки "ВОЙТИ"...');
    await page.locator('button[test="start_b_login"]').click();

    console.log("[INFO] Ожидание перехода на страницу входа...");
    await page.waitForURL(/\/login|\/Account\/Login/i, { timeout: 15000 });

    console.log("[STEP 3] Ввод email...");
    await page
      .locator('input[test="login_i_login"]')
      .fill(process.env.TEST_EMAIL!);

    console.log("[STEP 4] Ввод пароля...");
    await page
      .locator('input[test="login_i_password"]')
      .fill(process.env.TEST_PASSWORD!);

    console.log("[STEP 5] Отправка формы...");
    await page.locator('button[test="login_b_login"]').click();

    console.log("[STEP 6] Ожидание редиректа на дашборд...");
    await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    console.log(`[INFO] Успешный вход, текущий URL: ${page.url()}`);

    // ===== 2. Переход к учебнику =====
    console.log(`[STEP 7] Переход к учебнику с ID: ${bookId}...`);
    await page.goto(
      `https://progressme.ru/cabinet/school/materials/book/${bookId}/content`,
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      },
    );

    // Ждём загрузки страницы учебника
    await page.waitForSelector(".book-page-content", { timeout: 15000 });
    console.log("[INFO] Страница учебника загружена");

    // ===== 3. Нажатие кнопки "Создать урок" =====
    console.log('[STEP 8] Нажатие кнопки "Создать урок"...');

    // Ищем кнопку "Создать урок" (внутри .unit_list_btns)
    const createLessonBtn = page.locator(".unit_list_btns-action-create", {
      hasText: "Создать урок",
    });
    await createLessonBtn.waitFor({ state: "visible", timeout: 10000 });
    await createLessonBtn.click();
    console.log("[INFO] Модальное окно открыто");

    // Ждём появления модалки
    const modal = page.locator(".tir-modal");
    await modal.waitFor({ state: "visible", timeout: 10000 });

    // ===== 4. Заполнение названия урока =====
    const timestamp = Date.now();
    const lessonName = `Урок ${timestamp}`;
    console.log(`[STEP 9] Ввод названия урока: "${lessonName}"`);

    const nameInput = modal.locator('input[placeholder="Введите название"]');
    await nameInput.waitFor({ state: "visible" });
    await nameInput.fill(lessonName);

    // ===== 5. Нажатие кнопки "Создать" в модалке =====
    console.log('[STEP 10] Нажатие кнопки "Создать"...');
    const createBtn = modal.locator("button", { hasText: "Создать" });
    await createBtn.click();

    // ===== 6. Ожидание перехода в редактор урока =====
    console.log("[STEP 11] Ожидание загрузки редактора урока...");
    await page.waitForURL(
      /\/lesson-editor\/book\/\d+\/lesson\/\d+\/section\/\d+/,
      { timeout: 30000 },
    );
    console.log(`[INFO] Текущий URL (редактор): ${page.url()}`);

    // Проверяем, что редактор урока загрузился (есть элемент с классом lesson-viewer-layout)
    await page.waitForSelector(".lesson-viewer-layout", { timeout: 15000 });
    console.log("[SUCCESS] Редактор урока загружен");

    // Извлекаем ID урока из URL
    const urlMatch = page.url().match(/\/lesson\/(\d+)\//);
    const lessonId = urlMatch ? urlMatch[1] : null;
    console.log(`[INFO] ID созданного урока: ${lessonId}`);

    // ===== 7. Возврат к учебнику и проверка появления урока =====
    console.log("[STEP 12] Возврат к учебнику для проверки...");
    await page.goto(
      `https://progressme.ru/cabinet/school/materials/book/${bookId}/content`,
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      },
    );

    await page.waitForSelector(".book-page-content", { timeout: 15000 });

    console.log(`[STEP 13] Поиск созданного урока "${lessonName}" в списке...`);

    // Ищем урок в списке (внутри .unit_li .info p)
    const createdLesson = page.locator(".unit_li .info p", {
      hasText: lessonName,
    });
    await expect(createdLesson).toBeVisible({ timeout: 10000 });
    console.log(`[SUCCESS] Урок "${lessonName}" отображается в списке!`);

    console.log("[OK] Тест FT-05 пройден успешно!");
  });
});

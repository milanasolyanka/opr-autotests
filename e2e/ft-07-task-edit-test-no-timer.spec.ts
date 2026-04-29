import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-07: Редактирование задания", () => {
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

  test("Редактирование задания test_title", async () => {
    const bookId = process.env.BOOK_ID!;
    const lessonId = process.env.LESSON_ID!;
    const sectionId = process.env.SECTION_ID!;
    const editorUrl = `https://progressme.ru/lesson-editor/book/${bookId}/lesson/${lessonId}/section/${sectionId}`;

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

    // ===== 2. Переход в редактор урока =====
    console.log(`[STEP 7] Переход в редактор урока: ${editorUrl}...`);
    await page.goto(editorUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector(".lesson-viewer-layout", { timeout: 15000 });
    console.log("[INFO] Редактор урока загружен");

    // ===== 3. Поиск задания test_title =====
    console.log('[STEP 8] Поиск задания с заголовком "test_title"...');
    const targetExercise = page.locator(".exercise-wrapper-title-text div", {
      hasText: "test_title",
    });
    await targetExercise.waitFor({ state: "visible", timeout: 10000 });
    console.log('[INFO] Задание "test_title" найдено');

    // Находим контейнер задания (родительский элемент)
    const exerciseContainer = targetExercise.locator(
      'xpath=ancestor::div[@class="exercise-wrapper exercise-common-ui-components"]',
    );

    // ===== 4. Открытие меню (три точки) =====
    console.log("[STEP 9] Нажатие на кнопку меню (три точки)...");
    const moreButton = exerciseContainer.locator(
      ".exercise-common-ui-components-actions-icon.iconedv-More",
    );
    await moreButton.click();
    await page.waitForTimeout(500);

    // ===== 5. Выбор пункта "Редактировать" (с тэгом "Новая версия") =====
    console.log('[STEP 10] Выбор "Редактировать" из меню...');
    const editButton = page.locator(
      ".exercise-common-ui-components-actions-text",
      { hasText: "Новая версия" },
    );
    await editButton.click();
    console.log("[INFO] Конструктор редактирования открыт");

    // Ждём загрузки конструктора
    await page.waitForSelector(".exercise-visual-constructor", {
      timeout: 15000,
    });

    // ===== 6. Изменение текста вопроса =====
    const newQuestionText = `Изменённый вопрос ${Date.now()}`;
    console.log(`[STEP 11] Изменение текста вопроса на: "${newQuestionText}"`);

    // Находим поле вопроса и очищаем его
    const questionEditable = page.locator(
      ".question-block__title-input .contenteditable-input__editable",
    );
    await questionEditable.waitFor({ state: "visible", timeout: 10000 });

    // Очищаем существующий текст
    await questionEditable.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    // Вводим новый текст
    await questionEditable.fill(newQuestionText);
    console.log("[INFO] Текст вопроса изменён");

    // ===== 7. Сохранение изменений =====
    console.log('[STEP 12] Нажатие кнопки "Сохранить"...');
    const saveBtn = page.locator(".constructor-footer_inner button", {
      hasText: "Сохранить",
    });
    await saveBtn.click();
    console.log("[INFO] Изменения сохранены");

    // ===== 8. Проверка, что изменения применились =====
    console.log("[STEP 13] Проверка, что изменения отображаются в уроке...");
    await page.waitForTimeout(3000);

    // Проверяем, что заголовок задания остался test_title
    const titleAfterEdit = page.locator(".exercise-wrapper-title-text div", {
      hasText: "test_title",
    });
    await expect(titleAfterEdit).toBeVisible({ timeout: 10000 });
    console.log('[SUCCESS] Заголовок "test_title" не изменился');

    // Проверяем, что текст вопроса обновился
    const updatedQuestion = page.locator(".exercise-test-question", {
      hasText: newQuestionText,
    });
    await expect(updatedQuestion).toBeVisible({ timeout: 10000 });
    console.log(`[SUCCESS] Текст вопроса обновлён на: "${newQuestionText}"`);

    console.log("[OK] Тест FT-07 пройден успешно!");
  });
});

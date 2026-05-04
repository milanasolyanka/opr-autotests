import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-07: Редактирование задания", () => {
  let page: Page;
  let context: BrowserContext;
  let newQuestionText: string;

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
    await page.setDefaultTimeout(60000);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("Редактирование задания test_title", async () => {
    const bookId = process.env.BOOK_ID!;
    const lessonId = process.env.LESSON_ID!;
    const sectionId = process.env.SECTION_ID!;
    const editorUrl = `https://progressme.ru/lesson-editor/book/${bookId}/lesson/${lessonId}/section/${sectionId}`;
    newQuestionText = `Изменённый вопрос ${Date.now()}`;

    // ===== 1. Логин =====
    await test.step("Переход на страницу входа", async () => {
      await page.goto(process.env.BASE_URL! + "/login", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(
        ".auntefication_layout, .tir-tabs, .tir-input",
        {
          timeout: 15000,
        },
      );
    });

    await test.step("Ввод email и пароля", async () => {
      await page
        .locator('input[test="login_i_login"]')
        .fill(process.env.TEST_EMAIL!);
      await page
        .locator('input[test="login_i_password"]')
        .fill(process.env.TEST_PASSWORD!);
    });

    await test.step("Отправка формы входа", async () => {
      await page.locator('button[test="login_b_login"]').click();
    });

    await test.step("Ожидание редиректа на дашборд", async () => {
      await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    });

    // ===== 2. Переход в редактор урока =====
    await test.step(`Переход в редактор урока`, async () => {
      await page.goto(editorUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(".lesson-viewer-layout", { timeout: 15000 });
    });

    // ===== 3. Поиск задания test_title =====
    await test.step('Поиск задания с заголовком "test_title"', async () => {
      const targetExercise = page.locator(".exercise-wrapper-title-text div", {
        hasText: "test_title",
      });
      await targetExercise.waitFor({ state: "visible", timeout: 10000 });
    });

    // ===== 4. Открытие меню и выбор "Редактировать" =====
    await test.step('Открытие меню и выбор "Редактировать"', async () => {
      const targetExercise = page.locator(".exercise-wrapper-title-text div", {
        hasText: "test_title",
      });
      const exerciseContainer = targetExercise.locator(
        'xpath=ancestor::div[@class="exercise-wrapper exercise-common-ui-components"]',
      );

      const moreButton = exerciseContainer.locator(
        ".exercise-common-ui-components-actions-icon.iconedv-More",
      );
      await moreButton.click();
      await page.waitForTimeout(500);

      const editButton = page.locator(
        ".exercise-common-ui-components-actions-text",
        { hasText: "Новая версия" },
      );
      await editButton.click();
      await page.waitForSelector(".exercise-visual-constructor", {
        timeout: 15000,
      });
    });

    // ===== 5. Изменение текста вопроса =====
    await test.step(`Изменение текста вопроса на: "${newQuestionText}"`, async () => {
      const questionEditable = page.locator(
        ".question-block__title-input .contenteditable-input__editable",
      );
      await questionEditable.waitFor({ state: "visible", timeout: 10000 });
      await questionEditable.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Delete");
      await questionEditable.fill(newQuestionText);
    });

    // ===== 6. Сохранение изменений =====
    await test.step('Нажатие кнопки "Сохранить"', async () => {
      const saveBtn = page.locator(".constructor-footer_inner button", {
        hasText: "Сохранить",
      });
      await saveBtn.click();
    });

    // ===== 7. Проверка, что изменения применились =====
    await test.step("Проверка, что изменения отображаются в уроке", async () => {
      await page.waitForTimeout(3000);

      const titleAfterEdit = page.locator(".exercise-wrapper-title-text div", {
        hasText: "test_title",
      });
      await expect(titleAfterEdit).toBeVisible({ timeout: 10000 });

      const updatedQuestion = page.locator(".exercise-test-question", {
        hasText: newQuestionText,
      });
      await expect(updatedQuestion).toBeVisible({ timeout: 10000 });
    });
  });
});

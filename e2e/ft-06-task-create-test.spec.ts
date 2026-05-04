import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-06: Создание нового задания (выбор ответа)", () => {
  let page: Page;
  let context: BrowserContext;
  let exerciseTitle: string;
  let questionText: string;
  let answer1Text: string;
  let answer2Text: string;

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

  test("Создание задания типа 'Тест без таймера'", async () => {
    const bookId = process.env.BOOK_ID!;
    const lessonId = process.env.LESSON_ID!;
    const sectionId = process.env.SECTION_ID!;
    const editorUrl = `https://progressme.ru/lesson-editor/book/${bookId}/lesson/${lessonId}/section/${sectionId}`;

    const timestamp = Date.now();
    exerciseTitle = `${timestamp}`;
    questionText = `Вопрос ${timestamp}`;
    answer1Text = `Ответ ${timestamp} A`;
    answer2Text = `Ответ ${timestamp} B`;

    // ===== 1. Логин =====
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
    await test.step(`Переход в редактор урока: ${editorUrl}`, async () => {
      await page.goto(editorUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(".lesson-viewer-layout", { timeout: 15000 });
    });

    // ===== 3. Нажатие кнопки "Добавить упражнение" =====
    await test.step('Нажатие кнопки "Добавить упражнение"', async () => {
      const addExerciseBtn = page.locator(
        ".lesson-viewer-change-add-button_add-exercise-button",
      );
      await addExerciseBtn.waitFor({ state: "visible", timeout: 10000 });
      await addExerciseBtn.click();
    });

    // ===== 4. Выбор "Новый конструктор" =====
    await test.step('Выбор "Новый конструктор"', async () => {
      await page.waitForTimeout(500);
      const newConstructorBtn = page.locator(
        ".choose-constructor-type-button",
        {
          hasText: "Новый конструктор",
        },
      );
      await newConstructorBtn.click();
    });

    // ===== 5. Выбор типа "Тест без таймера" =====
    await test.step('Поиск и выбор "Тест без таймера"', async () => {
      await page.waitForSelector(".type-form_list", { timeout: 15000 });

      const testWithoutTimer = page.locator(".exercise-type", {
        hasText: "Тест без таймера",
      });

      await testWithoutTimer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await testWithoutTimer.waitFor({ state: "visible", timeout: 5000 });
      await testWithoutTimer.click();
    });

    // ===== 6. Заполнение данных задания =====
    await test.step(`Ввод заголовка: "${exerciseTitle}"`, async () => {
      const titleEditable = page.locator(
        ".exercise-visual-constructor-title-text-editor .html-editor-inline",
      );
      await titleEditable.waitFor({ state: "visible", timeout: 10000 });
      await titleEditable.click();
      await titleEditable.fill(exerciseTitle);
    });

    await test.step(`Ввод вопроса: "${questionText}"`, async () => {
      const questionEditable = page.locator(
        ".question-block__title-input .contenteditable-input__editable",
      );
      await questionEditable.waitFor({ state: "visible", timeout: 10000 });
      await questionEditable.click();
      await questionEditable.fill(questionText);
    });

    await test.step(`Ввод первого ответа: "${answer1Text}" и отметка как правильный`, async () => {
      const firstAnswerEditable = page
        .locator(".answer-block__input .contenteditable-input__editable")
        .first();
      await firstAnswerEditable.waitFor({ state: "visible", timeout: 10000 });
      await firstAnswerEditable.click();
      await firstAnswerEditable.fill(answer1Text);

      const firstCheckbox = page.locator(".answer-block__checkbox").first();
      await firstCheckbox.click();
    });

    await test.step(`Ввод второго ответа: "${answer2Text}"`, async () => {
      const secondAnswerEditable = page
        .locator(".answer-block__input .contenteditable-input__editable")
        .nth(1);
      await secondAnswerEditable.waitFor({ state: "visible", timeout: 10000 });
      await secondAnswerEditable.click();
      await secondAnswerEditable.fill(answer2Text);
    });

    // ===== 7. Сохранение задания =====
    await test.step('Нажатие кнопки "Сохранить"', async () => {
      const saveBtn = page.locator(".constructor-footer_inner button", {
        hasText: "Сохранить",
      });
      await saveBtn.click();
    });

    // ===== 8. Проверка, что задание создалось =====
    await test.step("Проверка, что задание появилось в уроке", async () => {
      await page.waitForTimeout(3000);

      const titleInLesson = page.locator(".exercise-wrapper-title-text div", {
        hasText: exerciseTitle,
      });
      await expect(titleInLesson).toBeVisible({ timeout: 15000 });

      const questionInLesson = page.locator(".exercise-test-question", {
        hasText: questionText,
      });
      await expect(questionInLesson).toBeVisible({ timeout: 15000 });

      const firstAnswerInLesson = page.locator(
        ".exercise-test-answers-item .button_data",
        { hasText: answer1Text },
      );
      await expect(firstAnswerInLesson).toBeVisible({ timeout: 10000 });

      const secondAnswerInLesson = page.locator(
        ".exercise-test-answers-item .button_data",
        { hasText: answer2Text },
      );
      await expect(secondAnswerInLesson).toBeVisible({ timeout: 10000 });
    });
  });
});

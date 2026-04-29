import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-06: Создание нового задания (выбор ответа)", () => {
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

  test("Создание задания типа 'Тест без таймера'", async () => {
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

    // ===== 3. Нажатие кнопки "Добавить упражнение" =====
    console.log('[STEP 8] Нажатие кнопки "Добавить упражнение"...');
    const addExerciseBtn = page.locator(
      ".lesson-viewer-change-add-button_add-exercise-button",
    );
    await addExerciseBtn.waitFor({ state: "visible", timeout: 10000 });
    await addExerciseBtn.click();
    console.log("[INFO] Всплывашка открыта");

    // ===== 4. Выбор "Новый конструктор" =====
    console.log('[STEP 9] Выбор "Новый конструктор"...');
    await page.waitForTimeout(500);
    const newConstructorBtn = page.locator(".choose-constructor-type-button", {
      hasText: "Новый конструктор",
    });
    await newConstructorBtn.click();
    console.log("[INFO] Конструктор упражнений открыт");

    // ===== 5. Выбор типа "Тест без таймера" =====
    console.log('[STEP 10] Поиск и выбор "Тест без таймера"...');

    // Ждём загрузки списка типов заданий
    await page.waitForSelector(".type-form_list", { timeout: 15000 });

    // Находим элемент "Тест без таймера" (используем более точный селектор)
    const testWithoutTimer = page.locator(".exercise-type", {
      hasText: "Тест без таймера",
    });

    // Скроллим непосредственно к элементу
    await testWithoutTimer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // небольшая задержка после скролла

    // Ждём, пока элемент станет видимым и кликабельным
    await testWithoutTimer.waitFor({ state: "visible", timeout: 5000 });
    await testWithoutTimer.click();
    console.log("[INFO] Тип задания 'Тест без таймера' выбран");

    // ===== 6. Заполнение данных задания =====
    console.log("[STEP 11] Заполнение данных задания...");

    // Генерируем уникальные числовые значения
    const timestamp = Date.now();
    const exerciseTitle = `${timestamp}`;
    const questionText = `Вопрос ${timestamp}`;
    const answer1Text = `Ответ ${timestamp} A`;
    const answer2Text = `Ответ ${timestamp} B`;

    console.log(`[INFO] Заголовок: ${exerciseTitle}`);
    console.log(`[INFO] Вопрос: ${questionText}`);
    console.log(`[INFO] Ответ 1: ${answer1Text}`);
    console.log(`[INFO] Ответ 2: ${answer2Text}`);

    // Заголовок задания
    const titleEditable = page.locator(
      ".exercise-visual-constructor-title-text-editor .html-editor-inline",
    );
    await titleEditable.waitFor({ state: "visible", timeout: 10000 });
    await titleEditable.click();
    await titleEditable.fill(exerciseTitle);
    console.log(`[INFO] Заголовок введён: ${exerciseTitle}`);

    // Вопрос
    console.log("[STEP 12] Ввод вопроса...");
    const questionEditable = page.locator(
      ".question-block__title-input .contenteditable-input__editable",
    );
    await questionEditable.waitFor({ state: "visible", timeout: 10000 });
    await questionEditable.click();
    await questionEditable.fill(questionText);
    console.log("[INFO] Вопрос введён");

    // Первый ответ (правильный)
    console.log("[STEP 13] Ввод первого ответа...");
    const firstAnswerEditable = page
      .locator(".answer-block__input .contenteditable-input__editable")
      .first();
    await firstAnswerEditable.waitFor({ state: "visible", timeout: 10000 });
    await firstAnswerEditable.click();
    await firstAnswerEditable.fill(answer1Text);
    console.log("[INFO] Первый ответ введён");

    // Делаем первый ответ правильным (кликаем по чекбоксу)
    const firstCheckbox = page.locator(".answer-block__checkbox").first();
    await firstCheckbox.click();
    console.log("[INFO] Первый ответ отмечен как правильный");

    // Второй ответ
    console.log("[STEP 14] Ввод второго ответа...");
    const secondAnswerEditable = page
      .locator(".answer-block__input .contenteditable-input__editable")
      .nth(1);
    await secondAnswerEditable.waitFor({ state: "visible", timeout: 10000 });
    await secondAnswerEditable.click();
    await secondAnswerEditable.fill(answer2Text);
    console.log("[INFO] Второй ответ введён");

    // ===== 7. Сохранение задания =====
    console.log('[STEP 15] Нажатие кнопки "Сохранить"...');
    const saveBtn = page.locator(".constructor-footer_inner button", {
      hasText: "Сохранить",
    });
    await saveBtn.click();
    console.log("[INFO] Задание сохранено");

    // ===== 8. Проверка, что задание создалось =====
    console.log("[STEP 16] Проверка, что задание появилось в уроке...");
    await page.waitForTimeout(3000);

    // Проверяем заголовок задания (новый селектор)
    const titleInLesson = page.locator(".exercise-wrapper-title-text div", {
      hasText: exerciseTitle,
    });
    await expect(titleInLesson).toBeVisible({ timeout: 15000 });
    console.log(`[SUCCESS] Заголовок "${exerciseTitle}" отображается в уроке`);

    // Проверяем, что текст вопроса отображается
    const questionInLesson = page.locator(".exercise-test-question", {
      hasText: questionText,
    });
    await expect(questionInLesson).toBeVisible({ timeout: 15000 });
    console.log(`[SUCCESS] Вопрос "${questionText}" отображается в уроке`);

    // Проверяем, что оба ответа отображаются
    const firstAnswerInLesson = page.locator(
      ".exercise-test-answers-item .button_data",
      { hasText: answer1Text },
    );
    await expect(firstAnswerInLesson).toBeVisible({ timeout: 10000 });
    console.log(`[SUCCESS] Ответ "${answer1Text}" отображается`);

    const secondAnswerInLesson = page.locator(
      ".exercise-test-answers-item .button_data",
      { hasText: answer2Text },
    );
    await expect(secondAnswerInLesson).toBeVisible({ timeout: 10000 });
    console.log(`[SUCCESS] Ответ "${answer2Text}" отображается`);

    console.log("[OK] Тест FT-06 пройден успешно!");
  });
});

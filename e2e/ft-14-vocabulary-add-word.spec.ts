import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-14: Персональный словарь студента", () => {
  let teacherPage: Page;
  let teacherContext: BrowserContext;
  let studentPage: Page;
  let studentContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    console.log("[INFO] Подготовка окружения...");
  });

  test.afterEach(async () => {
    if (teacherContext) await teacherContext.close();
    if (studentContext) await studentContext.close();
    console.log(
      "[INFO] Тест завершён. Видео автоматически сохранены в папку 'videos/'",
    );
  });

  test("Добавление слова преподавателем и проверка в словаре студента", async ({
    browser,
  }) => {
    const classroomId = process.env.CLASSROOM_ID!;
    const lessonId = process.env.LESSON_ID!;
    const sectionId = process.env.SECTION_ID!;
    const classroomUrl = `https://progressme.ru/classroom/${classroomId}/lesson/${lessonId}/section/${sectionId}`;

    const timestamp = Date.now();
    const newQuestionText = `Новое слово для словаря ${timestamp}`;
    const wordToAdd = `слово_${timestamp}`;
    const translationToAdd = `перевод_${timestamp}`;

    // ============================================================
    // ЧАСТЬ 1: Преподаватель обновляет вопрос и добавляет слово
    // ============================================================
    console.log(
      "========== ЧАСТЬ 1: Преподаватель обновляет вопрос и добавляет слово ==========",
    );

    // Создаём контекст и страницу для преподавателя
    teacherContext = await browser.newContext({
      recordVideo: { dir: "videos/" },
      viewport: { width: 1280, height: 720 },
    });
    teacherPage = await teacherContext.newPage();
    await teacherPage.setDefaultTimeout(60000);

    // Логин преподавателя
    console.log("[TEACHER STEP 1] Переход на лендинг...");
    await teacherPage.goto(process.env.BASE_URL!);
    await teacherPage.waitForLoadState("domcontentloaded");

    console.log('[TEACHER STEP 2] Нажатие кнопки "ВОЙТИ"...');
    await teacherPage.locator('button[test="start_b_login"]').click();
    await teacherPage.waitForURL(/\/login|\/Account\/Login/i, {
      timeout: 15000,
    });

    console.log("[TEACHER STEP 3] Ввод email преподавателя...");
    await teacherPage
      .locator('input[test="login_i_login"]')
      .fill(process.env.TEST_EMAIL!);
    await teacherPage
      .locator('input[test="login_i_password"]')
      .fill(process.env.TEST_PASSWORD!);
    await teacherPage.locator('button[test="login_b_login"]').click();
    await teacherPage.waitForURL(/\/cabinet\/school\/classes/, {
      timeout: 15000,
    });
    console.log("[TEACHER] Успешный вход");

    // ===== Обновление текста вопроса в упражнении test_title через classroom =====
    console.log(
      `[TEACHER STEP 4] Переход в класс для редактирования: ${classroomUrl}...`,
    );
    await teacherPage.goto(classroomUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Ждём загрузки страницы класса
    await teacherPage.waitForSelector(
      ".classroom-layout, .lesson-layout, .exercise-wrapper",
      {
        timeout: 30000,
      },
    );
    console.log("[TEACHER] Страница класса загружена");

    // Дополнительная задержка для полной загрузки
    await teacherPage.waitForTimeout(3000);

    // Поиск задания test_title
    console.log('[TEACHER STEP 5] Поиск задания с заголовком "test_title"...');
    const targetExercise = teacherPage.locator(
      ".exercise-wrapper-title-text div",
      {
        hasText: "test_title",
      },
    );
    await targetExercise.waitFor({ state: "visible", timeout: 10000 });
    console.log('[TEACHER] Задание "test_title" найдено');

    // Находим контейнер задания
    const exerciseContainer = targetExercise.locator(
      'xpath=ancestor::div[@class="exercise-wrapper exercise-common-ui-components"]',
    );

    // Открываем меню (три точки)
    console.log("[TEACHER STEP 6] Нажатие на кнопку меню (три точки)...");
    const moreButton = exerciseContainer.locator(
      ".exercise-common-ui-components-actions-icon.iconedv-More",
    );
    await moreButton.click();
    await teacherPage.waitForTimeout(500);

    // Выбираем пункт "Редактировать" (с тэгом "Новая версия")
    console.log('[TEACHER STEP 7] Выбор "Редактировать" из меню...');
    const editButton = teacherPage.locator(
      ".exercise-common-ui-components-actions-text",
      {
        hasText: "Новая версия",
      },
    );
    await editButton.click();
    console.log("[TEACHER] Конструктор редактирования открыт");

    // Ждём загрузки конструктора
    await teacherPage.waitForSelector(".exercise-visual-constructor", {
      timeout: 15000,
    });

    // Изменение текста вопроса
    console.log(
      `[TEACHER STEP 8] Изменение текста вопроса на: "${newQuestionText}"`,
    );
    const questionEditable = teacherPage.locator(
      ".question-block__title-input .contenteditable-input__editable",
    );
    await questionEditable.waitFor({ state: "visible", timeout: 10000 });
    await questionEditable.click();
    await teacherPage.keyboard.press("Control+A");
    await teacherPage.keyboard.press("Delete");
    await questionEditable.fill(newQuestionText);
    console.log("[TEACHER] Текст вопроса изменён");

    // Сохранение изменений
    console.log('[TEACHER STEP 9] Нажатие кнопки "Сохранить"...');
    const saveBtn = teacherPage.locator(".constructor-footer_inner button", {
      hasText: "Сохранить",
    });
    await saveBtn.click();
    console.log("[TEACHER] Изменения сохранены");
    await teacherPage.waitForTimeout(2000);

    // ===== Выделение нового вопроса и добавление в словарь =====
    console.log("[TEACHER STEP 10] Поиск обновлённого вопроса в упражнении...");
    const updatedQuestion = teacherPage.locator(".exercise-test-question", {
      hasText: newQuestionText,
    });
    await updatedQuestion.waitFor({ state: "visible", timeout: 10000 });
    console.log(`[TEACHER] Найден обновлённый вопрос: "${newQuestionText}"`);

    // Выделение текста вопроса двойным кликом
    console.log("[TEACHER STEP 11] Выделение текста вопроса...");
    await updatedQuestion.click({ clickCount: 2 });
    await teacherPage.waitForTimeout(500);
    // await teacherPage.waitForTimeout(2000);

    // Ожидание появления всплывашки
    console.log(
      "[TEACHER STEP 12] Ожидание появления всплывашки добавления слова...",
    );
    const translateWindow = teacherPage.locator(".translate-window-wrapper", {
      hasText: timestamp.toString(),
    });
    await translateWindow.waitFor({ state: "visible", timeout: 5000 });

    // Кликаем по плейсхолдеру "Свой вариант"
    console.log('[TEACHER STEP 13] Клик по "Свой вариант"...');
    const customVariant = translateWindow.locator(".custom-variant");
    await customVariant.click();
    await teacherPage.waitForTimeout(500);

    // Поле ввода становится видимым
    const addWordInput = translateWindow.locator('input[type="text"]');
    await addWordInput.waitFor({ state: "visible", timeout: 5000 });

    console.log(
      `[TEACHER STEP 14] Ввод слова "${wordToAdd}" и перевода "${translationToAdd}"...`,
    );
    await addWordInput.fill(`${translationToAdd}`);

    // Нажимаем Tab и даём время на обработку
    await teacherPage.keyboard.press("Tab");
    await teacherPage.waitForTimeout(300);

    // Нажатие на кнопку добавления в словарь
    console.log("[TEACHER STEP 15] Нажатие кнопки добавления в словарь...");
    const addButton = translateWindow.locator(
      '.custom-variant img[src*="icon-add-list"]',
    );
    await addButton.waitFor({ state: "visible", timeout: 5000 });
    await addButton.click({ force: true });
    console.log("[TEACHER] Слово добавлено в словарь студента");

    await teacherPage.waitForTimeout(2000);

    // Закрываем сессию преподавателя
    await teacherContext.close();
    console.log("[TEACHER] Сессия преподавателя завершена");

    // ============================================================
    // ЧАСТЬ 2: Студент проверяет словарь
    // ============================================================
    console.log("========== ЧАСТЬ 2: Действия студента ==========");

    // Создаём новый контекст для студента
    studentContext = await browser.newContext({
      recordVideo: { dir: "videos/" },
      viewport: { width: 1280, height: 720 },
    });
    studentPage = await studentContext.newPage();
    await studentPage.setDefaultTimeout(60000);

    // Логин студента
    console.log("[STUDENT STEP 1] Переход на лендинг...");
    await studentPage.goto(process.env.BASE_URL!);
    await studentPage.waitForLoadState("domcontentloaded");

    console.log('[STUDENT STEP 2] Нажатие кнопки "ВОЙТИ"...');
    await studentPage.locator('button[test="start_b_login"]').click();
    await studentPage.waitForURL(/\/login|\/Account\/Login/i, {
      timeout: 15000,
    });

    console.log("[STUDENT STEP 3] Ввод email студента...");
    await studentPage
      .locator('input[test="login_i_login"]')
      .fill(process.env.TEST_STUDENT_EMAIL!);
    await studentPage
      .locator('input[test="login_i_password"]')
      .fill(process.env.TEST_STUDENT_PASSWORD!);
    await studentPage.locator('button[test="login_b_login"]').click();
    await studentPage.waitForURL(/\/cabinet\/student\/lessons/, {
      timeout: 15000,
    });
    console.log("[STUDENT] Успешный вход");

    // Переход в раздел "Мои слова"
    console.log('[STUDENT STEP 4] Переход в раздел "Мои слова"...');
    await studentPage.goto(
      "https://progressme.ru/cabinet/student/words/to-learn",
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      },
    );
    await studentPage.waitForSelector(".wrap-word-list", {
      timeout: 15000,
    });
    console.log("[STUDENT] Страница словаря загружена");

    // Поиск добавленного слова
    console.log(
      `[STUDENT STEP 5] Поиск добавленного слова "${wordToAdd}" в словаре...`,
    );
    const addedWord = studentPage.locator(".word-item .word", {
      hasText: timestamp.toString(),
    });
    await expect(addedWord).toBeVisible({ timeout: 10000 });
    console.log(`[SUCCESS] Слово "${timestamp}" найдено в словаре студента`);

    // Проверка перевода
    console.log(`[STUDENT STEP 6] Проверка перевода слова "${timestamp}"...`);
    const wordContainer = addedWord.locator(
      'xpath=ancestor::div[@class="word-item"]',
    );
    const translation = wordContainer.locator(".translate");
    await expect(translation).toHaveText(translationToAdd, { timeout: 5000 });
    console.log(`[SUCCESS] Перевод "${translationToAdd}" совпадает`);

    console.log("[OK] Тест FT-14 пройден успешно!");
  });
});

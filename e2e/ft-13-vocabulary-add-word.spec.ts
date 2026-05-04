import { test, expect, Page, BrowserContext, chromium } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-13: Персональный словарь студента", () => {
  let teacherPage: Page;
  let teacherContext: BrowserContext;
  let teacherBrowser: any;
  let studentPage: Page;
  let studentContext: BrowserContext;
  let studentBrowser: any;
  let timestamp: number;
  let newQuestionText: string;
  let wordToAdd: string;
  let translationToAdd: string;

  test.beforeEach(async () => {
    timestamp = Date.now();
    newQuestionText = `Новое слово для словаря ${timestamp}`;
    wordToAdd = `слово_${timestamp}`;
    translationToAdd = `перевод_${timestamp}`;
  });

  test.afterEach(async () => {
    if (teacherContext) await teacherContext.close();
    if (teacherBrowser) await teacherBrowser.close();
    if (studentContext) await studentContext.close();
    if (studentBrowser) await studentBrowser.close();
  });

  test("Добавление слова преподавателем и проверка в словаре студента", async () => {
    const classroomId = process.env.CLASSROOM_ID!;
    const lessonId = process.env.LESSON_ID!;
    const sectionId = process.env.SECTION_ID!;
    const classroomUrl = `https://progressme.ru/classroom/${classroomId}/lesson/${lessonId}/section/${sectionId}`;

    // ============================================================
    // ЧАСТЬ 1: Преподаватель обновляет вопрос и добавляет слово
    // ============================================================
    await test.step("ЧАСТЬ 1: Преподаватель обновляет вопрос и добавляет слово", async () => {
      // Запускаем отдельный браузер для преподавателя
      teacherBrowser = await chromium.launch({
        headless: true, // для отладки, в CI можно true
      });
      teacherContext = await teacherBrowser.newContext({
        recordVideo: { dir: "videos/" },
        viewport: { width: 1280, height: 720 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        extraHTTPHeaders: {
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      teacherPage = await teacherContext.newPage();
      await teacherPage.setDefaultTimeout(60000);

      // Логин преподавателя
      await test.step("TEACHER: Логин в аккаунт", async () => {
        await teacherPage.goto(process.env.BASE_URL!);
        await teacherPage.waitForLoadState("domcontentloaded");
        await teacherPage.locator('button[test="start_b_login"]').click();
        await teacherPage.waitForURL(/\/login|\/Account\/Login/i, {
          timeout: 15000,
        });
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
      });

      // Переход в класс и редактирование
      await test.step("TEACHER: Переход в класс и редактирование вопроса", async () => {
        await teacherPage.goto(classroomUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await teacherPage.waitForSelector(
          ".classroom-layout, .lesson-layout, .exercise-wrapper",
          { timeout: 30000 },
        );
        await teacherPage.waitForTimeout(3000);

        const targetExercise = teacherPage.locator(
          ".exercise-wrapper-title-text div",
          { hasText: "test_title" },
        );
        await targetExercise.waitFor({ state: "visible", timeout: 10000 });

        const exerciseContainer = targetExercise.locator(
          'xpath=ancestor::div[@class="exercise-wrapper exercise-common-ui-components"]',
        );

        const moreButton = exerciseContainer.locator(
          ".exercise-common-ui-components-actions-icon.iconedv-More",
        );
        await moreButton.click();
        await teacherPage.waitForTimeout(500);

        const editButton = teacherPage.locator(
          ".exercise-common-ui-components-actions-text",
          { hasText: "Новая версия" },
        );
        await editButton.click();
        await teacherPage.waitForSelector(".exercise-visual-constructor", {
          timeout: 15000,
        });

        const questionEditable = teacherPage.locator(
          ".question-block__title-input .contenteditable-input__editable",
        );
        await questionEditable.waitFor({ state: "visible", timeout: 10000 });
        await questionEditable.click();
        await teacherPage.keyboard.press("Control+A");
        await teacherPage.keyboard.press("Delete");
        await questionEditable.fill(newQuestionText);

        const saveBtn = teacherPage.locator(
          ".constructor-footer_inner button",
          { hasText: "Сохранить" },
        );
        await saveBtn.click();
        await teacherPage.waitForTimeout(2000);
      });

      // Выделение вопроса и добавление в словарь
      await test.step("TEACHER: Добавление слова в словарь студента", async () => {
        const updatedQuestion = teacherPage.locator(".exercise-test-question", {
          hasText: newQuestionText,
        });
        await updatedQuestion.waitFor({ state: "visible", timeout: 10000 });

        await updatedQuestion.click({ clickCount: 2 });
        await teacherPage.waitForTimeout(500);

        const translateWindow = teacherPage.locator(
          ".translate-window-wrapper",
          { hasText: timestamp.toString() },
        );
        await translateWindow.waitFor({ state: "visible", timeout: 5000 });

        const customVariant = translateWindow.locator(".custom-variant");
        await customVariant.click();
        await teacherPage.waitForTimeout(500);

        const addWordInput = translateWindow.locator('input[type="text"]');
        await addWordInput.waitFor({ state: "visible", timeout: 5000 });
        await addWordInput.fill(translationToAdd);

        await teacherPage.keyboard.press("Tab");
        await teacherPage.waitForTimeout(300);

        const addButton = translateWindow.locator(
          '.custom-variant img[src*="icon-add-list"]',
        );
        await addButton.waitFor({ state: "visible", timeout: 5000 });
        await addButton.click({ force: true });

        await teacherPage.waitForTimeout(2000);
      });

      // Закрываем браузер преподавателя
      await teacherContext.close();
      await teacherBrowser.close();
      console.log("[TEACHER] Браузер преподавателя закрыт");
    });

    // ============================================================
    // ЧАСТЬ 2: Студент проверяет словарь
    // ============================================================
    await test.step("ЧАСТЬ 2: Студент проверяет словарь", async () => {
      // Запускаем НОВЫЙ браузер для студента (полностью изолированный)
      studentBrowser = await chromium.launch({
        headless: true,
      });
      studentContext = await studentBrowser.newContext({
        recordVideo: { dir: "videos/" },
        viewport: { width: 1280, height: 720 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        extraHTTPHeaders: {
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      studentPage = await studentContext.newPage();
      await studentPage.setDefaultTimeout(60000);

      // Логин студента
      await test.step("STUDENT: Логин в аккаунт", async () => {
        await studentPage.goto(process.env.BASE_URL! + "/login", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        await studentPage
          .locator('input[test="login_i_login"]')
          .fill(process.env.TEST_STUDENT_EMAIL!);
        await studentPage
          .locator('input[test="login_i_password"]')
          .fill(process.env.TEST_STUDENT_PASSWORD!);
        await studentPage.locator('button[test="login_b_login"]').click();
        await studentPage.waitForURL(/\/cabinet\/student\/lessons/, {
          timeout: 30000,
        });
      });

      // Проверка словаря
      await test.step("STUDENT: Проверка наличия слова в словаре", async () => {
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

        const addedWord = studentPage.locator(".word-item .word", {
          hasText: timestamp.toString(),
        });
        await expect(addedWord).toBeVisible({ timeout: 10000 });

        const wordContainer = addedWord.locator(
          'xpath=ancestor::div[@class="word-item"]',
        );
        const translation = wordContainer.locator(".translate");
        await expect(translation).toHaveText(translationToAdd, {
          timeout: 5000,
        });
      });

      // Закрываем браузер студента
      await studentContext.close();
      await studentBrowser.close();
      console.log("[STUDENT] Браузер студента закрыт");
    });
  });
});

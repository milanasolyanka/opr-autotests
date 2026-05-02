import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-17: Создание класса, привязка ученика и урока", () => {
  let page: Page;
  let context: BrowserContext;
  let studentName: string = "";

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
    console.log("[INFO] Тест завершён. Видео сохранено в папку 'videos/'");
  });

  test("Создание класса, привязка ученика и урока", async () => {
    // ВАЖНО
    //  ПОТОМ УБРАТЬ
    // test.setTimeout(30000000);

    const timestamp = Date.now();
    const className = `Тестовый класс ${timestamp}`;

    // ===== 1. Логин преподавателя =====
    console.log("[STEP 1] Переход на лендинг...");
    await page.goto(process.env.BASE_URL!);
    await page.waitForLoadState("domcontentloaded");

    console.log('[STEP 2] Нажатие кнопки "ВОЙТИ"...');
    await page.locator('button[test="start_b_login"]').click();
    await page.waitForURL(/\/login|\/Account\/Login/i, { timeout: 1000 });

    console.log("[STEP 3] Ввод email преподавателя...");
    await page
      .locator('input[test="login_i_login"]')
      .fill(process.env.TEST_EMAIL!);
    await page
      .locator('input[test="login_i_password"]')
      .fill(process.env.TEST_PASSWORD!);
    await page.locator('button[test="login_b_login"]').click();
    await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    console.log("[INFO] Успешный вход");

    // ===== 2. Создание класса =====
    console.log('[STEP 4] Нажатие кнопки "Создать новый класс"...');
    const createClassBtn = page.locator("button", {
      hasText: /Создать новый класс|Создать класс/,
    });
    await createClassBtn.waitFor({ state: "visible", timeout: 10000 });
    await createClassBtn.click();
    console.log("[INFO] Модалка этап 1 открыта");

    console.log('[STEP 5] Выбор "Индивидуальный класс"...');
    const individualClass = page.locator(".classroom-tab-types", {
      hasText: "Индивидуальный класс",
    });
    await individualClass.waitFor({ state: "visible", timeout: 5000 });
    await individualClass.click();
    console.log("[INFO] Модалка этап 2 открыта");

    console.log(`[STEP 6] Ввод названия класса: "${className}"...`);
    const classNameInput = page.locator(
      'input[placeholder="Введите название"]',
    );
    await classNameInput.waitFor({ state: "visible", timeout: 5000 });
    await classNameInput.fill(className);

    console.log('[STEP 7] Нажатие кнопки "Создать"...');
    const createBtn = page.locator("button", { hasText: "Создать" }).last();
    await createBtn.click();
    console.log("[INFO] Класс создан, ожидание перехода на страницу класса");

    // Ждём изменения URL (страница класса)
    await page.waitForURL(/\/classroom\/\d+/, { timeout: 30000 });
    console.log(`[INFO] URL изменился: ${page.url()}`);

    // Ждём, пока прелоадер исчезнет (display: none)
    console.log("[INFO] Ожидание исчезновения прелоадера...");
    await page.waitForFunction(
      () => {
        const preloader = document.querySelector(".class-preloader_wrapper");
        if (!preloader) return true;
        const style = window.getComputedStyle(preloader);
        return style.display === "none";
      },
      { timeout: 30000 },
    );
    console.log("[INFO] Прелоадер исчез");

    // Дополнительная задержка для стабильности
    await page.waitForTimeout(1000);

    // Ждём появления заголовка "Задайте обучающий материал"
    console.log('[INFO] Ожидание заголовка "Задайте обучающий материал"...');
    const classroomTitle = page.locator(".classroom-plug h1", {
      hasText: "Задайте обучающий материал",
    });
    await classroomTitle.waitFor({ state: "visible", timeout: 30000 });
    console.log(
      "[INFO] Страница класса полностью загружена, заголовок подтверждён",
    );

    // ===== 3. Добавление ученика =====
    console.log('[STEP 8] Нажатие кнопки "Добавить учеников"...');
    const addStudentBtn = page.locator("button", {
      hasText: "Добавить учеников",
    });
    await addStudentBtn.waitFor({ state: "visible", timeout: 20000 });
    await addStudentBtn.click();
    await page.waitForTimeout(500);
    console.log("[INFO] Модалка добавления ученика открыта");

    console.log('[STEP 9] Переход на вкладку "Существующего"...');
    const existingTab = page.locator(".tir-tabs .title", {
      hasText: "Существующего",
    });
    await existingTab.click();
    // await page.waitForTimeout(5000);
    console.log("[INFO] Список существующих учеников загружен");

    // Поиск первого ученика с чекбоксом
    console.log("[STEP 10] Поиск первого ученика для добавления...");
    await page.waitForSelector(".tir-checkbox .icon", { timeout: 30000 });
    const checkbox = page.locator(".tir-checkbox .icon").first();
    const isCheckboxVisible = await checkbox.isVisible().catch(() => false);

    if (!isCheckboxVisible) {
      throw new Error(
        "У преподавателя нет студентов для добавления в класс или студенты не загрузились",
      );
    }

    // Сохраняем имя студента
    const studentNameElement = page.locator(".avatar-li-info__title").first();
    studentName = (await studentNameElement.textContent()) || "";
    console.log(`[INFO] Найден студент: "${studentName}"`);

    // Нажимаем на чекбокс
    await checkbox.click();
    console.log("[INFO] Студент выбран");

    console.log('[STEP 11] Нажатие кнопки "Добавить"...');
    const addBtn = page.locator("button", { hasText: "Добавить" }).last();
    await addBtn.waitFor({ state: "visible", timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(2000);
    console.log("[INFO] Студент добавлен в класс");

    // ===== 4. Прикрепление урока =====
    console.log(
      '[STEP 12] Нажатие кнопки "Выбрать готовый обучающий материал"...',
    );
    const selectMaterialBtn = page.locator(".classroom-plug .button", {
      hasText: "Выбрать готовый обучающий материал",
    });
    await selectMaterialBtn.waitFor({ state: "visible", timeout: 10000 });
    await selectMaterialBtn.click();
    await page.waitForTimeout(1000);
    console.log("[INFO] Модалка материалов открыта");

    console.log('[STEP 13] Переход на вкладку "Каталог"...');
    const catalogTab = page.locator(".materials-tabs-block .title", {
      hasText: "Каталог",
    });
    await catalogTab.click();
    // await page.waitForTimeout(1000);
    console.log("[INFO] Каталог загружен");

    // Поиск и выбор материала Placement Test
    console.log('[STEP 14] Поиск материала "Placement Test"...');
    const placementTestCard = page.locator(".avatar-card", {
      hasText: "Placement Test",
    });
    await placementTestCard.waitFor({ state: "visible", timeout: 15000 });
    await placementTestCard.click();
    // await page.waitForTimeout(500);
    console.log("[INFO] Материал выбран, загружаем детали");

    // Клик по элементу для раскрытия информации
    console.log("[STEP 15] Раскрытие информации о материале...");
    const infoElement = page.locator(".info.w-100.f").first();
    await infoElement.click();
    // await page.waitForTimeout(1000);

    // Клик по элементу с текстом для открытия урока
    console.log("[STEP 16] Клик по элементу для открытия урока...");
    const lessonLink = page.locator(".info.w-100.f p", {
      hasText: "placement Test",
    });
    await lessonLink.waitFor({ state: "visible" });
    await lessonLink.click();
    // await page.waitForTimeout(4000);
    console.log("[INFO] Урок открыт");

    // гажатие кнопки "Закрепить"
    console.log("[STEP 16.5] Нажатие кнопки 'Закрепить'...");
    // const pinButton = page.locator(
    //   ".class-header-middle-another-lesson-popover button span",
    //   { hasText: "Закрепить" },
    // );
    const pinButton = page.getByText("Закрепить", { exact: true });
    await pinButton.waitFor({ state: "visible", timeout: 4000 });
    await pinButton.click();
    await page.waitForTimeout(1000);
    console.log("[INFO] Кнопка 'Закрепить' нажата, урок закреплён");

    // Выход со страницы урока обратно в класс
    console.log("[STEP 17] Возврат в класс...");
    const exitBtn = page.locator(".block-exit-classroom-button");
    await exitBtn.waitFor({ state: "visible", timeout: 10000 });
    await exitBtn.click();
    console.log("[INFO] Нажата кнопка выхода из класса");

    // Дополнительный клик на кнопку подтверждения выхода
    console.log("[STEP 17.5] Подтверждение выхода из класса...");
    const confirmExitBtn = page.locator(".exit-classroom-button").last();
    await confirmExitBtn.waitFor({ state: "visible", timeout: 1000 });
    await confirmExitBtn.click();
    console.log("[INFO] Выход из класса подтверждён");

    await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    console.log("[INFO] Возврат на страницу классов");

    // ===== 5. Проверка =====
    console.log(`[STEP 18] Поиск созданного класса "${className}"...`);

    // Ждём загрузки страницы классов (заголовок "Классы")
    await page.waitForSelector('h1:has-text("Классы")');
    console.log("[INFO] Страница классов загружена");

    // Ищем карточку класса по тексту (используем getByText)
    const classCard = page.getByText(className, { exact: true });
    // await classCard.waitFor({ state: "visible", timeout: 15000 });
    console.log(`[SUCCESS] Класс "${className}" найден`);

    console.log("[STEP 19] Вход в созданный класс...");
    // await page.waitForTimeout(300000);

    // 4. Берём родителя
    // const classRow = classCard.locator(
    //   'xpath=ancestor::div[contains(@class, "drag-card") or contains(@class, "card-li-layout")]',
    // );

    // 5. Определяем тип БЕЗ evaluate
    // const avatarBox = classRow.locator(".avatar-card-img_box");
    // const isDragCard = await avatarBox.isVisible().catch(() => false);

    // console.log(
    //   `[DEBUG] Тип карточки: ${isDragCard ? "drag-card" : "обычная"}`,
    // );

    // const classByText = page.getByText(timestamp.toString(), {
    //   exact: true,
    // });

    // await classByText.waitFor({ state: "visible", timeout: 10000 });
    await classCard.click();

    await expect(page).toHaveURL(/\/classroom\/\d+/);

    console.log("[INFO] Вход через текст карточки");

    // const preloader = page.locator(".class-preloader_wrapper");
    // if (!isDragCard) {
    //   const enterClassBtn = classRow.getByRole("button", {
    //     name: "Войти в класс",
    //   });

    //   if (await enterClassBtn.isVisible()) {
    //     await preloader.waitFor({ state: "hidden" }).catch(() => {});

    //     await enterClassBtn.click();
    //     await expect(page).toHaveURL(/\/classroom\/\d+/);

    //     console.log("[INFO] Вход через кнопку");
    //   } else {
    //     // мы уходим в эту ветку
    //     const classByText = page.getByText(timestamp.toString(), {
    //       exact: true,
    //     });

    //     await classByText.waitFor({ state: "visible", timeout: 10000 });
    //     await classByText.click();

    //     await expect(page).toHaveURL(/\/classroom\/\d+/);

    //     console.log("[INFO] Вход через текст карточки");
    //   }
    // } else {
    //   const avatarBox = classRow.locator(".avatar-card-img_box");

    //   // await preloader.waitFor({ state: "hidden" }).catch(() => {});

    //   await avatarBox.click({ timeout: 10000 });
    //   await expect(page).toHaveURL(/\/classroom\/\d+/);

    //   console.log("[INFO] Вход через avatar");
    // }

    // Проверка наличия прикреплённого урока
    console.log(
      '[STEP 20] Проверка наличия урока "placement test" в классе...',
    );
    const lessonTitle = page.locator(".lesson-section-header-wrap div").first();
    await lessonTitle.waitFor({ state: "visible", timeout: 15000 });
    const lessonText = ((await lessonTitle.textContent()) || "").toLowerCase();

    if (!lessonText.includes("placement test")) {
      console.error(
        `[ERROR] Ожидался "placement test", получено: "${lessonText}"`,
      );
      throw new Error(
        "Урок не прикреплён к классу или отображается неправильно",
      );
    }
    console.log(`[SUCCESS] Урок "placement test" прикреплён и отображается`);

    // Проверка наличия студента в классе
    console.log("[STEP 21] Проверка наличия студента в классе...");

    const avatar = page.locator(".class-info-toggler-icon").first();
    await avatar.click();
    console.log("[INFO] Поповер открыт");

    // Внутри поповера нажимаем на "Ученики класса"
    await page.click("text=Ученики класса");

    // Ищем студента по имени
    const studentInClass = page.locator(".block-info-people-data-name", {
      hasText: studentName,
    });
    const isStudentPresent = await studentInClass
      .isVisible()
      .catch(() => false);
    console.log("[INFO] Список учеников загружен");
    if (!isStudentPresent) {
      console.error(`[ERROR] Студент "${studentName}" не найден в классе`);
      throw new Error(`Студент "${studentName}" не прикреплён к классу`);
    }
    console.log(`[SUCCESS] Студент "${studentName}" присутствует в классе`);

    console.log("[OK] Тест FT-17 пройден успешно!");
  });
});

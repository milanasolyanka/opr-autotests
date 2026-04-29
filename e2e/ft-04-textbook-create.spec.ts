import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-04: Создание нового учебника", () => {
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

  test("Создание учебника с минимальными данными", async () => {
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

    // ===== 2. Навигация к созданию материала =====
    console.log('[STEP 7] Переход в раздел "Материалы" (сайдбар)...');
    await page.locator("#sidebar-materials").click();
    await page.waitForURL(/\/cabinet\/school\/materials\/catalog/, {
      timeout: 15000,
    });
    console.log(`[INFO] Текущий URL: ${page.url()}`);

    console.log('[STEP 8] Переход на вкладку "Личные материалы"...');
    // Кликаем по вкладке "Личные материалы" (вторая вкладка)
    const personalMaterialsTab = page.locator(".tir-tabs .title", {
      hasText: "Личные материалы",
    });
    await personalMaterialsTab.click();
    await page.waitForURL(/\/cabinet\/school\/materials\/personal/, {
      timeout: 15000,
    });
    console.log(`[INFO] Текущий URL: ${page.url()}`);

    // ===== 3. Открытие модалки создания материала =====
    console.log('[STEP 9] Нажатие кнопки "Создать материал"...');
    const createMaterialBtn = page.locator("button", {
      hasText: "Создать материал",
    });
    await createMaterialBtn.waitFor({ state: "visible" });
    await createMaterialBtn.click();
    console.log("[INFO] Модальное окно открыто");

    // Ждём появления модалки
    const modal = page.locator(".tir-modal");
    await modal.waitFor({ state: "visible" });

    // ===== 4. Заполнение полей в модалке =====
    // Генерируем уникальное название с текущим временем
    const timestamp = Date.now();
    const materialName = `Учебник ${timestamp}`;
    console.log(`[STEP 10] Ввод названия материала: "${materialName}"`);

    // Поле "Название" в модалке
    const nameInput = modal.locator('input[placeholder="Введите название"]');
    await nameInput.fill(materialName);

    // Выбор языка (English)
    console.log('[STEP 11] Выбор языка "English"...');
    const languageDropdown = modal.locator(".lang-dropdown .tir-control");
    await languageDropdown.click();

    // Ждём появления выпадающего списка с опциями
    await page.waitForSelector('.dropdown-option, [role="option"]', {
      timeout: 5000,
    });

    // Используем getByText для поиска English (как подсказало расширение)
    const englishOption = page.getByText("English", { exact: true });
    await englishOption.waitFor({ state: "visible", timeout: 5000 });
    await englishOption.click();
    console.log('[INFO] Язык "English" выбран');

    // Опционально: можно заполнить описание (необязательное поле, но для полноты)
    console.log("[STEP 12] Ввод описания (опционально)...");
    const descriptionEditor = modal.locator(".html-editor-inline");
    await descriptionEditor.click();
    await descriptionEditor.fill(
      `Автоматически созданный учебник для теста FT-04 (${new Date().toISOString()})`,
    );

    // ===== 5. Отправка формы =====
    console.log('[STEP 13] Нажатие кнопки "Создать"...');
    const createBtn = modal.locator("button", { hasText: "Создать" });
    await createBtn.click();

    // ===== 6. Ожидание перехода на страницу созданного материала =====
    console.log("[STEP 14] Ожидание загрузки страницы созданного материала...");
    await page.waitForURL(
      /\/cabinet\/school\/materials\/book\/[\w-]+\/content/,
      { timeout: 30000 },
    );
    console.log(`[INFO] Успешный переход на страницу материала: ${page.url()}`);

    // ===== 7. Дополнительная проверка: наличие кнопки редактирования или заголовка =====
    console.log(
      "[STEP 15] Проверка, что страница материала действительно загрузилась...",
    );
    // Проверяем наличие элемента с классом book-card или подобного
    const materialPageIndicator = page
      .locator(
        '.book-card-avatar-card, .avatar-card-name_wrap, [class*="book"]',
      )
      .first();
    await expect(materialPageIndicator).toBeVisible({ timeout: 10000 });
    console.log("[SUCCESS] Страница материала загружена");

    // ===== 8. Возврат на страницу "Личные материалы" и проверка появления материала =====
    console.log(
      '[STEP 16] Возврат в раздел "Личные материалы" для проверки...',
    );
    await test.step("Проверка создания материала", async () => {
      // Переходим на страницу с увеличенным таймаутом
      await page.goto(
        "https://progressme.ru/cabinet/school/materials/personal",
        {
          timeout: 30000,
          waitUntil: "domcontentloaded", // Вместо networkidle
        },
      );

      // Ждём появления контейнера со списком материалов
      await page.waitForSelector(".material_card_list", { timeout: 15000 });

      // Небольшая задержка для рендеринга (достаточно 500 мс)
      await page.waitForTimeout(500);

      console.log(
        `[STEP 17] Поиск созданного материала "${materialName}" в списке...`,
      );

      // Ждём появления материала с дополнительным таймаутом
      const createdMaterial = page.getByText(materialName, { exact: true });
      await expect(createdMaterial).toBeVisible({ timeout: 15000 });

      console.log(
        `[SUCCESS] Материал "${materialName}" отображается в списке личных материалов!`,
      );
    });

    console.log("[OK] Тест FT-04 пройден успешно!");
  });
});

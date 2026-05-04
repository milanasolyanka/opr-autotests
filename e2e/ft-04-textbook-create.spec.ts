import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-04: Создание нового учебника", () => {
  let page: Page;
  let context: BrowserContext;
  let materialName: string;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      storageState: "storageState.json",
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

  test("Создание учебника с минимальными данными", async () => {
    const timestamp = Date.now();
    materialName = `Учебник ${timestamp}`;

    await test.step("Переход на страницу классов", async () => {
      await page.goto(process.env.BASE_URL! + "/cabinet/school/classes", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector('h1:has-text("Классы")', { timeout: 60000 });
    });

    // ===== 2. Навигация к созданию материала =====
    await test.step('Переход в раздел "Материалы" (сайдбар)', async () => {
      await page.locator("#sidebar-materials").click();
      await page.waitForURL(/\/cabinet\/school\/materials\/catalog/, {
        timeout: 60000,
      });
    });

    await test.step('Переход на вкладку "Личные материалы"', async () => {
      const personalMaterialsTab = page.locator(".tir-tabs .title", {
        hasText: "Личные материалы",
      });
      await personalMaterialsTab.click();
      await page.waitForURL(/\/cabinet\/school\/materials\/personal/, {
        timeout: 15000,
      });
    });

    // ===== 3. Открытие модалки создания материала =====
    await test.step('Нажатие кнопки "Создать материал"', async () => {
      const createMaterialBtn = page.locator("button", {
        hasText: "Создать материал",
      });
      await createMaterialBtn.waitFor({ state: "visible" });
      await createMaterialBtn.click();
    });

    await test.step("Ожидание открытия модального окна", async () => {
      const modal = page.locator(".tir-modal");
      await modal.waitFor({ state: "visible" });
    });

    // ===== 4. Заполнение полей в модалке =====
    await test.step(`Ввод названия материала: "${materialName}"`, async () => {
      const modal = page.locator(".tir-modal");
      const nameInput = modal.locator('input[placeholder="Введите название"]');
      await nameInput.fill(materialName);
    });

    await test.step('Выбор языка "English"', async () => {
      const modal = page.locator(".tir-modal");
      const languageDropdown = modal.locator(".lang-dropdown .tir-control");
      await languageDropdown.click();

      await page.waitForSelector('.dropdown-option, [role="option"]', {
        timeout: 5000,
      });
      const englishOption = page.getByText("English", { exact: true });
      await englishOption.waitFor({ state: "visible", timeout: 5000 });
      await englishOption.click();
    });

    await test.step("Ввод описания (опционально)", async () => {
      const modal = page.locator(".tir-modal");
      const descriptionEditor = modal.locator(".html-editor-inline");
      await descriptionEditor.waitFor({ state: "visible", timeout: 10000 });
      await descriptionEditor.click();
      await descriptionEditor.fill(
        `Автоматически созданный учебник для теста FT-04 (${new Date().toISOString()})`,
      );
    });

    // ===== 5. Отправка формы =====
    await test.step('Нажатие кнопки "Создать"', async () => {
      const modal = page.locator(".tir-modal");
      const createBtn = modal.locator("button", { hasText: "Создать" });
      await createBtn.click();
    });

    // ===== 6. Ожидание перехода на страницу созданного материала =====
    await test.step("Ожидание загрузки страницы созданного материала", async () => {
      await page.waitForURL(
        /\/cabinet\/school\/materials\/book\/[\w-]+\/content/,
        {
          timeout: 30000,
        },
      );
    });

    // ===== 7. Проверка загрузки страницы материала =====
    await test.step("Проверка, что страница материала загрузилась", async () => {
      const materialPageIndicator = page
        .locator(
          '.book-card-avatar-card, .avatar-card-name_wrap, [class*="book"]',
        )
        .first();
      await expect(materialPageIndicator).toBeVisible({ timeout: 10000 });
    });

    // ===== 8. Возврат и проверка появления материала в списке =====
    await test.step("Проверка создания материала в списке личных материалов", async () => {
      await page.goto(
        "https://progressme.ru/cabinet/school/materials/personal",
        {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        },
      );

      await page.waitForSelector(".material_card_list", { timeout: 15000 });
      await page.waitForTimeout(500);

      const createdMaterial = page.getByText(materialName, { exact: true });
      await expect(createdMaterial).toBeVisible({ timeout: 15000 });
    });
  });
});

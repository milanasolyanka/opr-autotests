import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-05: Создание нового урока внутри учебника", () => {
  let page: Page;
  let context: BrowserContext;
  let lessonName: string;

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

  test("Создание урока в учебнике", async () => {
    const bookId = process.env.BOOK_ID!;
    const timestamp = Date.now();
    lessonName = `Урок ${timestamp}`;

    // ===== 2. Переход к учебнику =====
    await test.step(`Переход к учебнику с ID: ${bookId}`, async () => {
      await page.goto(
        `${process.env.BASE_URL}/cabinet/school/materials/book/${bookId}/content`,
        {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        },
      );
      await page.waitForSelector(".book-page-content", { timeout: 60000 });
    });

    // ===== 3. Нажатие кнопки "Создать урок" =====
    await test.step('Нажатие кнопки "Создать урок"', async () => {
      const createLessonBtn = page.locator(".unit_list_btns-action-create", {
        hasText: "Создать урок",
      });
      await createLessonBtn.waitFor({ state: "visible", timeout: 60000 });
      await createLessonBtn.click();
    });

    await test.step("Ожидание открытия модального окна", async () => {
      const modal = page.locator(".tir-modal");
      await modal.waitFor({ state: "visible", timeout: 10000 });
    });

    // ===== 4. Заполнение названия урока =====
    await test.step(`Ввод названия урока: "${lessonName}"`, async () => {
      const modal = page.locator(".tir-modal");
      const nameInput = modal.locator('input[placeholder="Введите название"]');
      await nameInput.waitFor({ state: "visible" });
      await nameInput.fill(lessonName);
    });

    // ===== 5. Нажатие кнопки "Создать" в модалке =====
    await test.step('Нажатие кнопки "Создать"', async () => {
      const modal = page.locator(".tir-modal");
      const createBtn = modal.locator("button", { hasText: "Создать" });
      await createBtn.click();
    });

    // ===== 6. Ожидание перехода в редактор урока =====
    await test.step("Ожидание загрузки редактора урока", async () => {
      await page.waitForURL(
        /\/lesson-editor\/book\/\d+\/lesson\/\d+\/section\/\d+/,
        { timeout: 60000 },
      );
      await page.waitForSelector(".lesson-viewer-layout", { timeout: 15000 });
    });

    await test.step("Извлечение ID созданного урока", async () => {
      const urlMatch = page.url().match(/\/lesson\/(\d+)\//);
      const lessonId = urlMatch ? urlMatch[1] : null;
      console.log(`[INFO] ID созданного урока: ${lessonId}`);
    });

    // ===== 7. Возврат к учебнику и проверка появления урока =====
    await test.step("Возврат к учебнику для проверки", async () => {
      await page.goto(
        `${process.env.BASE_URL}/cabinet/school/materials/book/${bookId}/content`,
        {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        },
      );
      await page.waitForSelector(".book-page-content", { timeout: 15000 });
    });

    await test.step(`Поиск созданного урока "${lessonName}" в списке`, async () => {
      const createdLesson = page.locator(".unit_li .info p", {
        hasText: lessonName,
      });
      await expect(createdLesson).toBeVisible({ timeout: 30000 });
    });
  });
});

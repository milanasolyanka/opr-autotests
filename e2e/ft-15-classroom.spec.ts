import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

test.describe("FT-15: Создание класса, привязка ученика и урока", () => {
  let page: Page;
  let context: BrowserContext;
  let studentName: string = "";
  let className: string = "";
  let timestamp: number = 0;

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
    timestamp = Date.now();
    className = `Тестовый класс ${timestamp}`;
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("Создание класса, привязка ученика и урока", async () => {
    // ===== 1. Логин преподавателя =====
    await test.step("Логин преподавателя", async () => {
      await page.goto(process.env.BASE_URL!);
      await page.waitForLoadState("domcontentloaded");

      await page.locator('button[test="start_b_login"]').click();
      await page.waitForURL(/\/login|\/Account\/Login/i, { timeout: 15000 });

      await page
        .locator('input[test="login_i_login"]')
        .fill(process.env.TEST_EMAIL!);
      await page
        .locator('input[test="login_i_password"]')
        .fill(process.env.TEST_PASSWORD!);
      await page.locator('button[test="login_b_login"]').click();
      await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    });

    // ===== 2. Создание класса =====
    await test.step(`Создание класса "${className}"`, async () => {
      const createClassBtn = page.locator("button", {
        hasText: /Создать новый класс|Создать класс/,
      });
      await createClassBtn.waitFor({ state: "visible", timeout: 10000 });
      await createClassBtn.click();

      const individualClass = page.locator(".classroom-tab-types", {
        hasText: "Индивидуальный класс",
      });
      await individualClass.waitFor({ state: "visible", timeout: 5000 });
      await individualClass.click();

      const classNameInput = page.locator(
        'input[placeholder="Введите название"]',
      );
      await classNameInput.waitFor({ state: "visible", timeout: 5000 });
      await classNameInput.fill(className);

      const createBtn = page.locator("button", { hasText: "Создать" }).last();
      await createBtn.click();

      await page.waitForURL(/\/classroom\/\d+/, { timeout: 30000 });

      await page.waitForFunction(
        () => {
          const preloader = document.querySelector(".class-preloader_wrapper");
          if (!preloader) return true;
          const style = window.getComputedStyle(preloader);
          return style.display === "none";
        },
        { timeout: 30000 },
      );

      await page.waitForTimeout(1000);

      const classroomTitle = page.locator(".classroom-plug h1", {
        hasText: "Задайте обучающий материал",
      });
      await classroomTitle.waitFor({ state: "visible", timeout: 30000 });
    });

    // ===== 3. Добавление ученика =====
    await test.step("Добавление ученика в класс", async () => {
      const addStudentBtn = page.locator("button", {
        hasText: "Добавить учеников",
      });
      await addStudentBtn.waitFor({ state: "visible", timeout: 20000 });
      await addStudentBtn.click();
      await page.waitForTimeout(500);

      const existingTab = page.locator(".tir-tabs .title", {
        hasText: "Существующего",
      });
      await existingTab.click();

      await page.waitForSelector(".tir-checkbox .icon", { timeout: 30000 });
      const checkbox = page.locator(".tir-checkbox .icon").first();
      const isCheckboxVisible = await checkbox.isVisible().catch(() => false);

      if (!isCheckboxVisible) {
        throw new Error(
          "У преподавателя нет студентов для добавления в класс или студенты не загрузились",
        );
      }

      const studentNameElement = page.locator(".avatar-li-info__title").first();
      studentName = (await studentNameElement.textContent()) || "";
      await checkbox.click();

      const addBtn = page.locator("button", { hasText: "Добавить" }).last();
      await addBtn.waitFor({ state: "visible", timeout: 5000 });
      await addBtn.click();
      await page.waitForTimeout(2000);
    });

    // ===== 4. Прикрепление урока =====
    await test.step("Прикрепление урока Placement Test", async () => {
      const selectMaterialBtn = page.locator(".classroom-plug .button", {
        hasText: "Выбрать готовый обучающий материал",
      });
      await selectMaterialBtn.waitFor({ state: "visible", timeout: 10000 });
      await selectMaterialBtn.click();
      await page.waitForTimeout(1000);

      const catalogTab = page.locator(".materials-tabs-block .title", {
        hasText: "Каталог",
      });
      await catalogTab.click();

      const placementTestCard = page.locator(".avatar-card", {
        hasText: "Placement Test",
      });
      await placementTestCard.waitFor({ state: "visible", timeout: 15000 });
      await placementTestCard.click();

      const infoElement = page.locator(".info.w-100.f").first();
      await infoElement.click();

      const lessonLink = page.locator(".info.w-100.f p", {
        hasText: "placement Test",
      });
      await lessonLink.waitFor({ state: "visible" });
      await lessonLink.click();

      const pinButton = page.getByText("Закрепить", { exact: true });
      await pinButton.waitFor({ state: "visible", timeout: 4000 });
      await pinButton.click();
      await page.waitForTimeout(1000);

      const exitBtn = page.locator(".block-exit-classroom-button");
      await exitBtn.waitFor({ state: "visible", timeout: 10000 });
      await exitBtn.click();

      const confirmExitBtn = page.locator(".exit-classroom-button").last();
      await confirmExitBtn.waitFor({ state: "visible", timeout: 5000 });
      await confirmExitBtn.click();

      await page.waitForURL(/\/cabinet\/school\/classes/, { timeout: 15000 });
    });

    // ===== 5. Проверка =====
    await test.step("Проверка созданного класса и привязок", async () => {
      await page.waitForSelector('h1:has-text("Классы")');
      const classCard = page.getByText(className, { exact: true });
      await classCard.click();
      await expect(page).toHaveURL(/\/classroom\/\d+/);

      const lessonTitle = page
        .locator(".lesson-section-header-wrap div")
        .first();
      await lessonTitle.waitFor({ state: "visible", timeout: 20000 });
      const lessonText = (
        (await lessonTitle.textContent()) || ""
      ).toLowerCase();

      if (!lessonText.includes("placement test")) {
        throw new Error(
          "Урок не прикреплён к классу или отображается неправильно",
        );
      }

      const avatar = page.locator(".class-info-toggler-icon").first();
      await avatar.click();

      await page.click("text=Ученики класса");

      const studentInClass = page.locator(".block-info-people-data-name", {
        hasText: studentName,
      });
      const isStudentPresent = await studentInClass
        .isVisible()
        .catch(() => false);

      if (!isStudentPresent) {
        throw new Error(`Студент "${studentName}" не прикреплён к классу`);
      }
    });
  });
});

import { test as setup } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

setup("auth setup", async ({ page, context }) => {
  await context.setExtraHTTPHeaders({
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  await page.goto(process.env.BASE_URL! + "/login");

  await page.fill('input[test="login_i_login"]', process.env.TEST_EMAIL!);
  await page.fill('input[test="login_i_password"]', process.env.TEST_PASSWORD!);

  await page.click('button[test="login_b_login"]');

  await page.waitForURL(/cabinet/);

  await page.context().storageState({
    path: "storageState.json",
  });
});

import { expect, test } from "@playwright/test";

test("home page sends a visitor without a session to Sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

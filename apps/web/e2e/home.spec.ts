import { expect, test } from "@playwright/test";

test("home page renders the heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Web App" })).toBeVisible();
});

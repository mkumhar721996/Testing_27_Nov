import { expect, test } from "@playwright/test";

test("organizations without a session lands on Sign in", async ({ page }) => {
  await page.goto("/organizations");
  await expect(page).toHaveURL(/\/signin$/);
});

test("a failed sign-in shows the error and Try again restores the button", async ({ page }) => {
  await page.goto("/signin?error=signin-failed");
  await expect(page.getByRole("alert")).toContainText("Sign-in failed.");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("an ended session shows the notice", async ({ page }) => {
  await page.goto("/signin?reason=session-ended");
  await expect(page.getByRole("status")).toContainText("Your session ended");
});

import { expect, test } from "@playwright/test";

test("sign-in screen shows the tabs and the Auth0 buttons, with no social sign-in", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("tab", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Auth0" })).toBeVisible();
  await page.getByRole("tab", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Sign up with Auth0" })).toBeVisible();
  await expect(page.getByRole("button", { name: /google|facebook|apple|github/i })).toHaveCount(0);
});

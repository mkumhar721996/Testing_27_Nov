import { expect, test } from "@playwright/test";

type Opening = Record<string, unknown>;

test("create an opening and see the close refusal", async ({ page }) => {
  const openings: Opening[] = [
    {
      id: 7,
      reference: "JO-7",
      title: "Office manager",
      department: "Operations",
      location: "Munich",
      employment_type: "Part time",
      description: "",
      status: "open",
      candidate_count: 2,
      in_progress_count: 1,
    },
  ];

  // The page and the API share a path, so only fetch requests are mocked.
  await page.route(
    (url) => url.pathname.startsWith("/job-openings"),
    async (route) => {
      const request = route.request();
      if (request.resourceType() !== "fetch") return route.continue();
      const path = new URL(request.url()).pathname;
      if (request.method() === "POST" && path === "/job-openings") {
        const created = {
          ...request.postDataJSON(),
          id: 8,
          reference: "JO-8",
          status: "open",
          candidate_count: 0,
          in_progress_count: 0,
        };
        openings.unshift(created);
        return route.fulfill({ status: 201, json: created });
      }
      if (request.method() === "POST" && path.endsWith("/close")) {
        return route.fulfill({
          status: 409,
          json: { detail: { code: "candidates_in_progress", in_progress: 1 } },
        });
      }
      return route.fulfill({ json: openings });
    },
  );

  await page.goto("/job-openings");
  await expect(page.getByText("Office manager")).toBeVisible();

  await page.getByRole("button", { name: "Create opening" }).click();
  await page.getByLabel("Job title").fill("Payroll specialist");
  await page.getByLabel("Department").fill("Finance");
  await page.getByLabel("Location").fill("Berlin");
  await page.getByLabel("Employment type").selectOption("Full time");
  await page.getByRole("button", { name: "Save opening" }).click();

  const row = page.getByRole("row", { name: /Payroll specialist/ });
  await expect(row.getByText("Open", { exact: true })).toBeVisible();

  // The list shows 1 candidate in progress, so the page refuses up front, without a request.
  await page.getByRole("button", { name: "Close Office manager" }).click();
  await expect(page.getByRole("alert")).toContainText("stays open");
  await expect(
    page.getByRole("row", { name: /Office manager/ }).getByText("Open", { exact: true }),
  ).toBeVisible();
});

import { expect, test } from "@playwright/test";

async function gotoProjects(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Projects", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/projects$/);
}

test.describe("Runs", () => {
  test("should create a new run", async ({ page }) => {
    const timestamp = Date.now();
    const runName = `E2E Test Run ${timestamp}`;

    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    await page.getByRole("button", { name: "Create run" }).first().click();

    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/create-run$/,
    );

    await page.getByRole("textbox", { name: "Name" }).fill(runName);

    await page
      .getByRole("combobox")
      .filter({ hasText: "Select prompt..." })
      .click();
    await page.getByRole("option").first().click();

    await page
      .getByRole("row")
      .filter({ hasText: "session_001.json" })
      .first()
      .getByRole("checkbox")
      .check();

    await page.getByRole("button", { name: "Start run" }).click();

    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/runs\/[a-f0-9]+$/,
    );
    await expect(page.getByText(runName).first()).toBeVisible();
  });

  test("should display runs list for a project", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    await expect(
      page.getByRole("button", { name: "Create run" }),
    ).toBeVisible();
    await expect(page.getByText("E2E Test Run").first()).toBeVisible();
  });

  test("should navigate to run detail page", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runLink = page
      .getByRole("link")
      .filter({ hasText: "E2E Test Run" })
      .first();
    await runLink.click();

    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/runs\/[a-f0-9]+$/,
    );
    await expect(page.getByText("Annotation type")).toBeVisible();
    await expect(page.getByText("Per utterance")).toBeVisible();
    await expect(page.getByText("Selected prompt")).toBeVisible();
    await expect(page.getByText("Selected model")).toBeVisible();
  });

  test("should show run edit button", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runLink = page
      .getByRole("link")
      .filter({ hasText: "E2E Test Run" })
      .first();
    await runLink.click();

    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  test("should display sessions list", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runLink = page
      .getByRole("link")
      .filter({ hasText: "E2E Test Run" })
      .first();
    await runLink.click();

    await expect(page.getByText("session_001.json").first()).toBeVisible();
  });

  test("should show export menu options", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runLink = page
      .getByRole("link")
      .filter({ hasText: "E2E Test Run" })
      .first();
    await runLink.click();

    await page.getByRole("button", { name: "Export" }).click();
    await expect(
      page.getByRole("menuitem", { name: /As Table.*csv file/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /JSONL.*jsonl file/ }),
    ).toBeVisible();
  });
});

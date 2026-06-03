import { expect, test } from "@playwright/test";

async function gotoProjects(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Projects", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/projects$/);
}

test.describe("Run Sets", () => {
  test("should create a new run set", async ({ page }) => {
    const timestamp = Date.now();
    const runSetName = `E2E Test Run Set ${timestamp}`;

    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runSetsCard = page.getByRole("link").filter({ hasText: "Run Sets" });
    await runSetsCard.click();

    await page.getByRole("button", { name: "Create run set" }).first().click();

    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/create-run-set$/,
    );

    await page.getByRole("textbox", { name: "Run Set Name" }).fill(runSetName);

    await page
      .getByRole("combobox")
      .filter({ hasText: "Select prompt..." })
      .click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Add Prompt" }).click();

    await page
      .getByRole("combobox")
      .filter({ hasText: "Select model..." })
      .click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Add Model" }).click();

    await page
      .getByRole("row")
      .filter({ hasText: "session_001.json" })
      .first()
      .getByRole("checkbox")
      .check();

    await page
      .getByRole("button", { name: "Create Run Set & Launch Runs" })
      .click();

    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/run-sets\/[a-f0-9]+$/,
    );
    await expect(page.getByText(runSetName).first()).toBeVisible();

    await page.getByRole("link", { name: "Run Sets", exact: true }).click();
    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/run-sets$/,
    );

    await expect(
      page
        .locator('[href*="/run-sets/"]')
        .filter({ hasText: runSetName })
        .first(),
    ).toBeVisible();
  });

  test("should display run sets list for a project", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runSetsCard = page.getByRole("link").filter({ hasText: "Run Sets" });
    await runSetsCard.click();

    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/run-sets$/,
    );
    await expect(
      page.getByRole("button", { name: "Create run set" }).first(),
    ).toBeVisible();
  });

  test("should navigate to run set detail page", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runSetsCard = page.getByRole("link").filter({ hasText: "Run Sets" });
    await runSetsCard.click();

    const runSetLink = page
      .locator('[href*="/run-sets/"]')
      .filter({ hasText: "E2E Test Run Set" })
      .first();
    await runSetLink.click();

    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/run-sets\/[a-f0-9]+$/,
    );
    await expect(page.getByText("Created").first()).toBeVisible();
    await expect(page.getByText("Sessions").first()).toBeVisible();
    await expect(page.getByText("Runs").first()).toBeVisible();
  });

  test("should display run set sessions and runs", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runSetsCard = page.getByRole("link").filter({ hasText: "Run Sets" });
    await runSetsCard.click();

    const runSetLink = page
      .locator('[href*="/run-sets/"]')
      .filter({ hasText: "E2E Test Run Set" })
      .first();
    await runSetLink.click();

    await expect(page.getByText("session_001.json")).toBeVisible();
    await expect(
      page.getByText("Talk Moves (sample prompt)").first(),
    ).toBeVisible();
  });

  test("should navigate back using breadcrumbs", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runSetsCard = page.getByRole("link").filter({ hasText: "Run Sets" });
    await runSetsCard.click();

    const runSetLink = page
      .locator('[href*="/run-sets/"]')
      .filter({ hasText: "E2E Test Run Set" })
      .first();
    await runSetLink.click();

    await page.getByRole("link", { name: "Run Sets", exact: true }).click();
    await expect(page).toHaveURL(
      /\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+\/run-sets$/,
    );
  });

  test("should show export menu options", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    const runSetsCard = page.getByRole("link").filter({ hasText: "Run Sets" });
    await runSetsCard.click();

    const runSetLink = page
      .locator('[href*="/run-sets/"]')
      .filter({ hasText: "E2E Test Run Set" })
      .first();
    await runSetLink.click();

    await page.getByRole("button", { name: "Export" }).click();
    await expect(
      page.getByRole("menuitem", { name: /As Table.*csv file/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /JSONL.*jsonl file/ }),
    ).toBeVisible();
  });
});

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const TIMESTAMP = Date.now();
const GUARDRAILS_PROMPT_NAME = `E2E Library Prompt ${TIMESTAMP}`;
const COPY_PROMPT_NAME = `E2E Library Copy ${TIMESTAMP}`;
const LIBRARY_DESCRIPTION = `Library smoke ${TIMESTAMP}: certified prompt for talk-move annotation.`;
const AUTHOR_NAME = "Ada Lovelace";
const AUTHOR_AFFILIATION = "Cornell";
const PAPER_TITLE = "On the Analytical Engine";
const PAPER_URL = "https://example.com/analytical-engine";

async function gotoPrompts(page: Page) {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Prompts", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/prompts$/);
}

async function createPrompt(page: Page, name: string): Promise<string> {
  await gotoPrompts(page);
  await page.getByRole("button", { name: "Create prompt" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create a new prompt" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page.locator("#annotation-type").click();
  await page.getByRole("option", { name: "Per utterance" }).click();
  await page
    .getByRole("button", { name: "Create prompt", exact: true })
    .click();
  await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/prompts\/[a-f0-9]+\/1$/);
  return page.url();
}

async function publishPrompt(page: Page, promptUrl: string, name: string) {
  await page.goto(promptUrl);
  await page.getByRole("button", { name: "Publish to library" }).click();
  const dialog = page.getByRole("dialog", {
    name: `Publish to library - ${name}`,
  });
  await expect(dialog).toBeVisible();
  await dialog.locator("#library-description").fill(LIBRARY_DESCRIPTION);
  await dialog.getByPlaceholder("Name").fill(AUTHOR_NAME);
  await dialog
    .getByPlaceholder("Affiliation (optional)")
    .fill(AUTHOR_AFFILIATION);
  await dialog.getByPlaceholder("Title").fill(PAPER_TITLE);
  await dialog.getByPlaceholder("https://...").fill(PAPER_URL);
  await dialog.getByRole("button", { name: "Publish to library" }).click();
  await expect(page.getByText("Prompt published to library")).toBeVisible();
}

test.describe.serial("Prompt Library guardrails", () => {
  let promptUrl = "";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: ".auth/user.json",
    });
    const page = await context.newPage();
    promptUrl = await createPrompt(page, GUARDRAILS_PROMPT_NAME);
    await context.close();
  });

  test("publishes a prompt to the library", async ({ page }) => {
    await page.goto(promptUrl);

    await page.getByRole("button", { name: "Publish to library" }).click();

    const dialog = page.getByRole("dialog", {
      name: `Publish to library - ${GUARDRAILS_PROMPT_NAME}`,
    });
    await expect(dialog).toBeVisible();

    await dialog.locator("#library-description").fill(LIBRARY_DESCRIPTION);
    await dialog.getByPlaceholder("Name").fill(AUTHOR_NAME);
    await dialog
      .getByPlaceholder("Affiliation (optional)")
      .fill(AUTHOR_AFFILIATION);
    await dialog.getByPlaceholder("Title").fill(PAPER_TITLE);
    await dialog.getByPlaceholder("https://...").fill(PAPER_URL);

    await dialog.getByRole("button", { name: "Publish to library" }).click();

    await expect(page.getByText("Prompt published to library")).toBeVisible();
    await expect(
      page.getByText("Published", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit library entry" }),
    ).toBeVisible();
  });

  test("shows 'will go live' warning when editing a published prompt", async ({
    page,
  }) => {
    await page.goto(promptUrl);

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit prompt" });
    await expect(dialog).toBeVisible();

    await expect(
      dialog.getByText("This prompt is published to the library"),
    ).toBeVisible();
    await expect(
      dialog.getByText("Changes will appear in the library immediately"),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("disables Delete with a tooltip while published", async ({ page }) => {
    await page.goto(promptUrl);

    const deleteButton = page.getByRole("button", {
      name: "Delete",
      exact: true,
    });
    await expect(deleteButton).toBeDisabled();

    // Disabled buttons swallow pointer events, so hover the TooltipTrigger
    // span wrapper and let radix render the tooltip via portal.
    await deleteButton.locator("..").hover();
    await expect(
      page.getByRole("tooltip", {
        name: "Unpublish from the library before deleting.",
      }),
    ).toBeVisible();
  });

  test("lists the published prompt under /prompt-library", async ({ page }) => {
    await page.goto("/prompt-library");
    await expect(page).toHaveURL(/\/prompt-library/);
    await expect(
      page
        .getByRole("link")
        .filter({ hasText: GUARDRAILS_PROMPT_NAME })
        .first(),
    ).toBeVisible();
  });

  test("unpublishes and re-enables Delete", async ({ page }) => {
    await page.goto(promptUrl);

    await page.getByRole("button", { name: "Unpublish" }).click();
    const dialog = page.getByRole("dialog", {
      name: `Unpublish from library - ${GUARDRAILS_PROMPT_NAME}`,
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Unpublish" }).click();

    await expect(page.getByText("Prompt unpublished")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publish to library" }),
    ).toBeVisible();
    await expect(
      page.getByText("Published", { exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete", exact: true }),
    ).toBeEnabled();
  });
});

test.describe.serial("Prompt Library copy flow", () => {
  let sourcePromptUrl = "";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: ".auth/user.json",
    });
    const page = await context.newPage();
    sourcePromptUrl = await createPrompt(page, COPY_PROMPT_NAME);
    await publishPrompt(page, sourcePromptUrl, COPY_PROMPT_NAME);
    await context.close();
  });

  test("copies a published prompt into the active team", async ({ page }) => {
    await page.goto("/prompt-library");
    await page
      .getByRole("link")
      .filter({ hasText: COPY_PROMPT_NAME })
      .first()
      .click();
    await expect(page).toHaveURL(/\/prompt-library\/[a-f0-9]+$/);

    await page.getByRole("button", { name: "Copy to my team" }).click();

    await expect(page.getByText("Prompt copied to your team.")).toBeVisible();
    await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/prompts\/[a-f0-9]+\/1$/);

    // The new prompt lives at a different URL than the source and exposes a
    // "Copied from <source>" backlink pointing at the library entry.
    expect(page.url()).not.toBe(sourcePromptUrl);
    await expect(page.getByText(/Copied from/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: COPY_PROMPT_NAME }).first(),
    ).toBeVisible();
  });
});

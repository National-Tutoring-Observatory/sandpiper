import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: "../.env" });

const TIMESTAMP = Date.now();
const GUARDRAILS_PROMPT_NAME = `E2E Library Prompt ${TIMESTAMP}`;
const COPY_PROMPT_NAME = `E2E Library Copy ${TIMESTAMP}`;
const LIBRARY_DESCRIPTION = `Library smoke ${TIMESTAMP}: certified prompt for talk-move annotation.`;
const AUTHOR_NAME = "Ada Lovelace";
const AUTHOR_AFFILIATION = "Cornell";
const PAPER_TITLE = "On the Analytical Engine";
const PAPER_URL = "https://example.com/analytical-engine";

const ACTIVE_TEAM_NAME = "Research Team Alpha";

// This spec exercises publishing, the published-state guardrails, and the
// copy-to-team flow — not prompt authoring. Driving the UI create + save flow
// would require the LLM alignment check (too flaky for e2e), and the publish
// guard now rejects a prompt whose production version body is blank. So we
// seed a fully-formed, publishable prompt directly, mirroring the shape the
// services produce and the DB connection pattern used by the *.setup.ts files.
async function seedPrompt(name: string): Promise<string> {
  const githubId = parseInt(process.env.SUPER_ADMIN_GITHUB_ID as string);
  const {
    DOCUMENT_DB_CONNECTION_STRING,
    DOCUMENT_DB_USERNAME,
    DOCUMENT_DB_PASSWORD,
  } = process.env;
  const connectionString = `mongodb://${encodeURIComponent(DOCUMENT_DB_USERNAME as string)}:${encodeURIComponent(DOCUMENT_DB_PASSWORD as string)}@${DOCUMENT_DB_CONNECTION_STRING}`;
  await mongoose.connect(connectionString, { connectTimeoutMS: 10000 });
  try {
    const user = await mongoose.connection
      .collection("users")
      .findOne({ githubId });
    if (!user) throw new Error(`No user found with githubId ${githubId}`);

    const team = await mongoose.connection
      .collection("teams")
      .findOne({ name: ACTIVE_TEAM_NAME });
    if (!team) throw new Error(`No team found with name '${ACTIVE_TEAM_NAME}'`);

    const { insertedId: promptId } = await mongoose.connection
      .collection("prompts")
      .insertOne({
        team: team._id,
        name,
        annotationType: "PER_UTTERANCE",
        productionVersion: 1,
        createdBy: user._id,
        createdAt: new Date(),
      });

    await mongoose.connection.collection("promptversions").insertOne({
      name: "production",
      prompt: promptId,
      version: 1,
      userPrompt: "Annotate each utterance with the matching talk move.",
      annotationSchema: [
        { isSystem: true, fieldKey: "_id", fieldType: "string", value: "" },
        {
          isSystem: true,
          fieldKey: "identifiedBy",
          fieldType: "string",
          value: "AI",
        },
        {
          isSystem: true,
          fieldKey: "reasoning",
          fieldType: "string",
          value: "",
        },
      ],
      hasBeenSaved: true,
      createdAt: new Date(),
    });

    return `/teams/${team._id.toString()}/prompts/${promptId.toString()}/1`;
  } finally {
    await mongoose.disconnect();
  }
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

  test.beforeAll(async () => {
    promptUrl = await seedPrompt(GUARDRAILS_PROMPT_NAME);
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
    sourcePromptUrl = await seedPrompt(COPY_PROMPT_NAME);
    const context = await browser.newContext({
      storageState: ".auth/user.json",
    });
    const page = await context.newPage();
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

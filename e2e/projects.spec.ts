import { expect, test } from "@playwright/test";

async function gotoProjects(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Projects", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/projects$/);
}

test.describe("Projects", () => {
  test("should display projects list", async ({ page }) => {
    await gotoProjects(page);

    await expect(
      page.getByRole("link", { name: "Projects", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create project" }),
    ).toBeVisible();
  });

  test("should navigate to project detail page", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/projects\/[a-f0-9]+$/);
    await expect(page.getByText("Files").first()).toBeVisible();
    await expect(page.getByText("Sessions").first()).toBeVisible();
    await expect(page.getByText("Runs").first()).toBeVisible();
    await expect(page.getByText("Run Sets").first()).toBeVisible();
  });

  test("should show project edit and delete buttons", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("should open create project dialog", async ({ page }) => {
    await gotoProjects(page);

    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create a new project" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Name/ })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("should validate project name in create dialog", async ({ page }) => {
    await gotoProjects(page);

    await page.getByRole("button", { name: "Create project" }).click();

    const nameInput = page.getByRole("textbox", { name: /Name/ });
    await nameInput.fill("Test Project");

    await expect(page.getByText("Project name looks good")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("should navigate using breadcrumbs", async ({ page }) => {
    await gotoProjects(page);

    const projectLink = page
      .getByRole("link")
      .filter({ hasText: "Tutoring Transcripts Study 2024" });
    await projectLink.click();

    await page
      .getByRole("link", { name: "Projects", exact: true })
      .first()
      .click();

    await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/projects$/);
  });
});

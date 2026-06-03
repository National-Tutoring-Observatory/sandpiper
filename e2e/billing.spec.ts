import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function navigateToBilling(page: Page) {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Billing", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/teams\/[a-f0-9]+\/billing$/);
}

test.describe("Billing", () => {
  test("should navigate to billing page", async ({ page }) => {
    await navigateToBilling(page);
    await expect(page.getByText("Balance").first()).toBeVisible();
  });

  test("should display billing overview cards", async ({ page }) => {
    await navigateToBilling(page);
    await expect(page.getByText("Balance").first()).toBeVisible();
    await expect(page.getByText("Credits Added")).toBeVisible();
    await expect(page.getByText("Usage").first()).toBeVisible();
    await expect(page.getByText("Plan").first()).toBeVisible();
  });

  test("should show Standard plan with markup rate", async ({ page }) => {
    await navigateToBilling(page);
    await expect(page.getByText("Standard")).toBeVisible();
    await expect(page.getByText("50% markup")).toBeVisible();
  });

  test("should show Add credits button for super admin", async ({ page }) => {
    await navigateToBilling(page);
    await expect(
      page.getByRole("button", { name: "Add credits" }),
    ).toBeVisible();
  });

  test("should open add credits dialog", async ({ page }) => {
    await navigateToBilling(page);
    await page.getByRole("button", { name: "Add credits" }).click();
    await expect(
      page.getByRole("heading", { name: "Add credits" }),
    ).toBeVisible();
    await expect(page.locator("#credit-amount")).toBeVisible();
    await expect(page.locator("#credit-note")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("should add credits successfully", async ({ page }) => {
    await navigateToBilling(page);
    await page.getByRole("button", { name: "Add credits" }).click();
    await page.locator("#credit-amount").fill("50");
    await page.locator("#credit-note").fill("E2E Test Credit");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add credits" })
      .click();
    await expect(page.getByText("Credits added")).toBeVisible();
  });

  test("should display credit history after adding credits", async ({
    page,
  }) => {
    await navigateToBilling(page);
    await expect(page.getByText("Credit history")).toBeVisible();
    await expect(page.getByText("E2E Test Credit").first()).toBeVisible();
  });

  test("should display spend analytics section", async ({ page }) => {
    await navigateToBilling(page);
    await expect(page.getByText("Spend analytics")).toBeVisible();
  });

  test("should display billing settings section", async ({ page }) => {
    await navigateToBilling(page);
    await expect(page.getByText("Billing settings")).toBeVisible();
    await expect(page.getByText("Billing user").first()).toBeVisible();
  });
});

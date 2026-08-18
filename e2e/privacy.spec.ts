import { expect, test } from "@playwright/test";

// The whole point of issue #2468: researchers and IRBs must be able to read
// how data is handled WITHOUT signing in. These run with no session, so they
// would catch either gate (root.tsx terms redirect, or the
// authentication.container redirect to /signup) swallowing the page.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("public privacy policy", () => {
  test("serves the policy to visitors with no account", async ({ page }) => {
    const response = await page.goto("/privacy");

    expect(response?.status()).toBe(200);
    // Not bounced to /signup or /onboarding.
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole("heading", { name: "Terms of Use and Privacy Policy" }),
    ).toBeVisible();
  });

  test("covers the data handling questions an IRB would ask", async ({
    page,
  }) => {
    await page.goto("/privacy");

    await expect(page.getByText("AES-256", { exact: false })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cornell Secure AI Gateway" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /GDPR Compliance/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /CIS-NTO-PARTNERSHIPS-L/ }),
    ).toBeVisible();
  });

  test("is reachable from the logged-out homepage", async ({ page }) => {
    // Renders the entire splash, which is a cold compile against a dev server.
    test.slow();
    await page.goto("/");

    // The splash renders client-side once the auth check resolves.
    const section = page.locator("#privacy");
    await section.scrollIntoViewIfNeeded();
    await expect(
      section.getByRole("heading", { name: "Built for Research Data" }),
    ).toBeVisible();

    await section
      .getByRole("link", { name: /Read the full Terms of Use/ })
      .click();

    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole("heading", { name: "Terms of Use and Privacy Policy" }),
    ).toBeVisible();
  });

  test("offers a way back to the site", async ({ page }) => {
    await page.goto("/privacy");

    await page.getByRole("link", { name: "Back to home" }).click();

    await expect(page).toHaveURL("http://localhost:5173/");
  });
});

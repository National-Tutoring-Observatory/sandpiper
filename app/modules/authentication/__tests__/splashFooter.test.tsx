/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Footer } from "../components/splash/footer";

function renderFooter(sectionHrefPrefix: string) {
  return render(
    <MemoryRouter>
      <Footer sectionHrefPrefix={sectionHrefPrefix} />
    </MemoryRouter>,
  );
}

const hrefOf = (name: string) =>
  screen.getByRole("link", { name }).getAttribute("href");

// This repo does not enable vitest globals, so RTL's automatic cleanup
// between tests never registers. Without this, renders accumulate in the DOM.
afterEach(cleanup);

describe("splash Footer", () => {
  it("links to the public privacy policy page", () => {
    renderFooter("");

    expect(hrefOf("Privacy Policy")).toBe("/privacy");
  });

  it("keeps section links as in-page anchors on the splash", () => {
    renderFooter("");

    expect(hrefOf("Home")).toBe("#hero");
    expect(hrefOf("Features")).toBe("#features");
    expect(hrefOf("How It Works")).toBe("#how-it-works");
    expect(hrefOf("About")).toBe("#about");
  });

  // Regression: the footer is reused on /privacy, where none of the splash
  // sections exist. Bare "#features" anchors were dead links there, so the
  // prefix has to send them home first.
  it("sends section links home first when rendered off the splash", () => {
    renderFooter("/");

    expect(hrefOf("Home")).toBe("/#hero");
    expect(hrefOf("Features")).toBe("/#features");
    expect(hrefOf("How It Works")).toBe("/#how-it-works");
    expect(hrefOf("About")).toBe("/#about");
  });
});

/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Filter } from "../filters";
import FiltersItem from "../filtersItem";

// This repo does not enable vitest globals, so RTL cleanup is manual.
afterEach(cleanup);

const multiSelectFilter: Filter = {
  category: "tags",
  text: "Tags",
  isMultiSelect: true,
  options: [
    { value: "a", text: "Apple" },
    { value: "b", text: "Banana" },
    { value: "c", text: "Cherry" },
  ],
};

// Non-multiSelect filter with >4 options renders the searchable combobox.
const comboboxFilter: Filter = {
  category: "status",
  text: "Status",
  options: [
    { value: "RUNNING", text: "Running" },
    { value: "FAILED", text: "Failed" },
    { value: "COMPLETE", text: "Complete" },
    { value: "QUEUED", text: "Queued" },
    { value: "STOPPED", text: "Stopped" },
  ],
};

describe("FiltersItem — multi-select", () => {
  it("shows a count label for the selected values", () => {
    render(
      <FiltersItem
        filter={multiSelectFilter}
        value={["a", "b"]}
        onFiltersValueChanged={() => {}}
      />,
    );
    expect(screen.getByText("2 selected")).toBeTruthy();
  });

  it("shows '--' and no Clear button when empty", () => {
    render(
      <FiltersItem
        filter={multiSelectFilter}
        value={[]}
        onFiltersValueChanged={() => {}}
      />,
    );
    expect(screen.getByText("--")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /clear/i })).toBeNull();
  });

  it("shows a Clear button that clears the filter when populated", () => {
    const onChange = vi.fn();
    render(
      <FiltersItem
        filter={multiSelectFilter}
        value={["a"]}
        onFiltersValueChanged={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith({ tags: null });
  });

  it("warns and renders nothing when given a non-array value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <FiltersItem
        filter={multiSelectFilter}
        value={"a"}
        onFiltersValueChanged={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("FiltersItem — single-select combobox", () => {
  it("shows the selected option's text", () => {
    render(
      <FiltersItem
        filter={comboboxFilter}
        value={"COMPLETE"}
        onFiltersValueChanged={() => {}}
      />,
    );
    expect(screen.getByText("Complete")).toBeTruthy();
  });

  it("warns and renders nothing when a non-multiSelect filter gets an array", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <FiltersItem
        filter={{
          ...comboboxFilter,
          options: comboboxFilter.options.slice(0, 2),
        }}
        value={["RUNNING"]}
        onFiltersValueChanged={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

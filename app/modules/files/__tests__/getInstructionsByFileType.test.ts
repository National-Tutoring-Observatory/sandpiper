import { describe, expect, it } from "vitest";

import getInstructionsByFileType from "../helpers/getInstructionsByFileType";

describe("getInstructionsByFileType", () => {
  it.each(["CSV", "JSONL"] as const)(
    "lists the canonical column names for %s uploads",
    (fileType) => {
      const { overview } = getInstructionsByFileType({ fileType });

      for (const column of ["session_id", "sequence_id", "role", "content"]) {
        expect(overview).toContain(`<code>${column}</code>`);
      }
      expect(overview).not.toContain("speaker");
    },
  );

  it("returns empty instructions for file types without specific guidance", () => {
    expect(getInstructionsByFileType({ fileType: "VTT" })).toEqual({
      overview: "",
      link: "",
    });
  });
});

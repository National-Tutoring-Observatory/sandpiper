import { describe, expect, it } from "vitest";
import sanitizeName from "../sanitizeName";

describe("sanitizeName", () => {
  it("leaves safe characters untouched", () => {
    expect(sanitizeName("Test Project 1 - final_v2")).toBe(
      "Test Project 1 - final_v2",
    );
  });

  it("returns an empty string unchanged", () => {
    expect(sanitizeName("")).toBe("");
  });

  it.each([
    ["forward slash", "a/b", "a_b"],
    ["backslash", "a\\b", "a_b"],
    ["double quote", 'a"b', "a_b"],
    ["colon", "a:b", "a_b"],
    ["asterisk", "a*b", "a_b"],
    ["question mark", "a?b", "a_b"],
    ["less than", "a<b", "a_b"],
    ["greater than", "a>b", "a_b"],
    ["pipe", "a|b", "a_b"],
    ["carriage return", "a\rb", "a_b"],
    ["newline", "a\nb", "a_b"],
  ])("replaces %s with an underscore", (_label, input, expected) => {
    expect(sanitizeName(input)).toBe(expected);
  });

  it("replaces every reserved character in one pass", () => {
    expect(sanitizeName('a/b\\c"d:e*f?g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
  });

  it("replaces repeated occurrences of the same character", () => {
    expect(sanitizeName("a//b//c")).toBe("a__b__c");
  });
});

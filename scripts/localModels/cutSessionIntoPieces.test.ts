import { describe, expect, it } from "vitest";
import type { Utterance } from "../../app/modules/sessions/sessions.types";
import cutSessionIntoPieces from "./cutSessionIntoPieces";

const make = (roles: string): Utterance[] =>
  roles.split("").map((letter, index) => ({
    _id: `u${index + 1}`,
    role: letter === "T" ? "Tutor" : "Student",
    content: "",
    start_time: "",
    end_time: "",
    timestamp: "",
    session_id: "s1",
    sequence_id: index + 1,
    annotations: [],
  }));

const ids = (pieces: Utterance[][]) =>
  pieces.map((piece) => piece.map((item) => item._id));

describe("cutSessionIntoPieces", () => {
  it("ends each unit at a lead-role turn and groups units into pieces", () => {
    const pieces = cutSessionIntoPieces(make("STTSTSTT"), "Tutor", 2);
    expect(ids(pieces)).toEqual([
      ["u1", "u2", "u3"],
      ["u4", "u5", "u6", "u7"],
      ["u8"],
    ]);
  });

  it("makes one piece per unit when asked for one", () => {
    const pieces = cutSessionIntoPieces(make("STST"), "Tutor", 1);
    expect(ids(pieces)).toEqual([
      ["u1", "u2"],
      ["u3", "u4"],
    ]);
  });

  it("joins trailing student turns to the last unit", () => {
    const pieces = cutSessionIntoPieces(make("STTSS"), "Tutor", 1);
    expect(ids(pieces)).toEqual([
      ["u1", "u2"],
      ["u3", "u4", "u5"],
    ]);
  });

  it("makes one piece when there is no lead-role turn", () => {
    const pieces = cutSessionIntoPieces(make("SSS"), "Tutor", 2);
    expect(ids(pieces)).toEqual([["u1", "u2", "u3"]]);
  });

  it("uses one piece when N is larger than the session", () => {
    const pieces = cutSessionIntoPieces(make("STST"), "Tutor", 10);
    expect(ids(pieces)).toEqual([["u1", "u2", "u3", "u4"]]);
  });

  it("returns no pieces for an empty transcript", () => {
    expect(cutSessionIntoPieces([], "Tutor", 2)).toEqual([]);
  });

  it("compares against the given lead role", () => {
    const pieces = cutSessionIntoPieces(make("STST"), "Student", 1);
    expect(ids(pieces)).toEqual([["u1"], ["u2", "u3", "u4"]]);
  });
});

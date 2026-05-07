import { describe, expect, it, vi } from "vitest";
import getAttributeMappingFromFile from "../getAttributeMappingFromFile";

vi.mock("~/modules/llm/llm", () => ({
  default: class {
    addSystemMessage = vi.fn();
    addUserMessage = vi.fn();
    createChat = vi.fn().mockResolvedValue({ leadRole: "Tutor" });
  },
}));

function makeFile(rows: Record<string, unknown>[]): File {
  const content = JSON.stringify(rows);
  return { text: () => Promise.resolve(content) } as unknown as File;
}

describe("getAttributeMappingFromFile", () => {
  it("maps standard snake_case field names", async () => {
    const file = makeFile([
      { role: "Tutor", content: "Hi", session_id: "s1", sequence_id: 1 },
    ]);

    const mapping = await getAttributeMappingFromFile({
      file,
      team: "t1",
      userId: "u1",
    });

    expect(mapping.role).toBe("role");
    expect(mapping.content).toBe("content");
    expect(mapping.session_id).toBe("session_id");
    expect(mapping.sequence_id).toBe("sequence_id");
  });

  it("maps alternative field names (speaker, text)", async () => {
    const file = makeFile([
      { speaker: "Tutor", text: "Hi", session_id: "s1", sequence_id: 1 },
    ]);

    const mapping = await getAttributeMappingFromFile({
      file,
      team: "t1",
      userId: "u1",
    });

    expect(mapping.role).toBe("speaker");
    expect(mapping.content).toBe("text");
  });

  it("maps sessionId as alternative for session_id", async () => {
    const file = makeFile([
      { role: "Tutor", content: "Hi", sessionId: "s1", sequence_id: 1 },
    ]);

    const mapping = await getAttributeMappingFromFile({
      file,
      team: "t1",
      userId: "u1",
    });

    expect(mapping.session_id).toBe("sessionId");
  });

  it("maps sessionID as alternative for session_id", async () => {
    const file = makeFile([
      { role: "Tutor", content: "Hi", sessionID: "s1", sequence_id: 1 },
    ]);

    const mapping = await getAttributeMappingFromFile({
      file,
      team: "t1",
      userId: "u1",
    });

    expect(mapping.session_id).toBe("sessionID");
  });

  it("maps sequenceId as alternative for sequence_id", async () => {
    const file = makeFile([
      { role: "Tutor", content: "Hi", session_id: "s1", sequenceId: 1 },
    ]);

    const mapping = await getAttributeMappingFromFile({
      file,
      team: "t1",
      userId: "u1",
    });

    expect(mapping.sequence_id).toBe("sequenceId");
  });

  it("maps sequenceID as alternative for sequence_id", async () => {
    const file = makeFile([
      { role: "Tutor", content: "Hi", session_id: "s1", sequenceID: 1 },
    ]);

    const mapping = await getAttributeMappingFromFile({
      file,
      team: "t1",
      userId: "u1",
    });

    expect(mapping.sequence_id).toBe("sequenceID");
  });

  it("sets leadRole from LLM response", async () => {
    const file = makeFile([
      { role: "Tutor", content: "Hi", session_id: "s1", sequence_id: 1 },
    ]);

    const mapping = await getAttributeMappingFromFile({
      file,
      team: "t1",
      userId: "u1",
    });

    expect(mapping.leadRole).toBe("Tutor");
  });
});

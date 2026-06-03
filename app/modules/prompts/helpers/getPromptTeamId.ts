import type { Prompt } from "../prompts.types";

export default function getPromptTeamId(prompt: Prompt): string {
  return typeof prompt.team === "string" ? prompt.team : prompt.team._id;
}

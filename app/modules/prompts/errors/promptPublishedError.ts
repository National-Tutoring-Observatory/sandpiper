export class PromptPublishedError extends Error {
  promptId: string;

  constructor(promptId: string) {
    super("This prompt is published to the library. Unpublish it first.");
    this.name = "PromptPublishedError";
    this.promptId = promptId;
  }
}

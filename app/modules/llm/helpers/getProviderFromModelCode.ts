export default (modelCode: string) => {
  if (modelCode.includes("gemini-")) {
    return "Google";
  }
  if (modelCode.includes("claude-")) {
    return "Anthropic";
  }
  return "OpenAI";
};

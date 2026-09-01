import { useRouteLoaderData } from "react-router";

// LLM_PROVIDER is server-only env (Vite replaces `process.env` with `{}` in the
// client bundle), so the root loader forwards it. Client containers need it to
// keep model pickers and default model codes limited to what the deployment's
// active provider can actually resolve.
export default function useLlmProvider(): string {
  const rootData = useRouteLoaderData("root") as
    | { llmProvider?: string | null }
    | undefined;

  return rootData?.llmProvider ?? "";
}

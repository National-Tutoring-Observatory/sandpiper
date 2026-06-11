import { useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";

type CopyPromptResult =
  | {
      success?: boolean;
      intent?: string;
      data?: { redirectTo?: string };
      errors?: { general?: string };
    }
  | undefined;

export function useCopyPromptResult(
  fetcher: ReturnType<typeof useFetcher>,
): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    const result = fetcher.data as CopyPromptResult;
    if (!result) return;
    if (
      result.success &&
      result.intent === "COPY_PROMPT" &&
      result.data?.redirectTo
    ) {
      toast.success("Prompt copied to your team.");
      navigate(result.data.redirectTo);
    } else if (result.errors) {
      toast.error(result.errors.general || "An error occurred");
    }
  }, [fetcher.state, fetcher.data, navigate]);
}

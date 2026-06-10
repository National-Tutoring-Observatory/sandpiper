import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import { Copy } from "lucide-react";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import type { Prompt, PromptVersion } from "~/modules/prompts/prompts.types";

interface PromptLibraryPromptProps {
  prompt: Prompt;
  promptVersion: PromptVersion;
  breadcrumbs: Breadcrumb[];
  isCopying: boolean;
  onCopyPromptClicked: () => void;
}

export default function PromptLibraryPrompt({
  prompt,
  promptVersion,
  breadcrumbs,
  isCopying,
  onCopyPromptClicked,
}: PromptLibraryPromptProps) {
  const library = prompt.library;

  return (
    <div className="max-w-7xl space-y-4 p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
        <PageHeaderRight>
          <Button size="sm" onClick={onCopyPromptClicked} disabled={isCopying}>
            <Copy />
            {isCopying ? "Copying..." : "Copy to my team"}
          </Button>
        </PageHeaderRight>
      </PageHeader>

      {library?.description ? (
        <p className="text-muted-foreground">{library.description}</p>
      ) : null}

      {library?.authors?.length ? (
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            Authors
          </h2>
          <ul className="text-sm">
            {library.authors.map((a, i) => (
              <li key={`${a.name}-${i}`}>
                {a.name}
                {a.affiliation ? ` — ${a.affiliation}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {library?.paperRefs?.length ? (
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            Papers
          </h2>
          <ul className="text-sm">
            {library.paperRefs.map((p, i) => (
              <li key={`${p.url}-${i}`}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold tracking-wide uppercase">
          Prompt body
        </h2>
        <pre className="bg-muted rounded p-4 text-sm whitespace-pre-wrap">
          {promptVersion.userPrompt}
        </pre>
      </section>
    </div>
  );
}

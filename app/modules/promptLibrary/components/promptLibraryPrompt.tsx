import type { Prompt, PromptVersion } from "~/modules/prompts/prompts.types";

interface PromptLibraryPromptProps {
  prompt: Prompt;
  promptVersion: PromptVersion;
  isCopying: boolean;
  onCopyPromptClicked: () => void;
  onBackClicked: () => void;
}

export default function PromptLibraryPrompt({
  prompt,
  promptVersion,
  isCopying,
  onCopyPromptClicked,
  onBackClicked,
}: PromptLibraryPromptProps) {
  const library = prompt.library;

  return (
    <div className="container mx-auto space-y-4 p-6">
      <button
        type="button"
        className="text-muted-foreground text-sm"
        onClick={onBackClicked}
      >
        &larr; Back to library
      </button>
      <header>
        <h1 className="text-2xl font-bold">{prompt.name}</h1>
        {library?.description ? (
          <p className="text-muted-foreground">{library.description}</p>
        ) : null}
      </header>

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

      <div>
        <button
          type="button"
          className="rounded border px-4 py-2"
          onClick={onCopyPromptClicked}
          disabled={isCopying}
        >
          {isCopying ? "Copying..." : "Copy to my team"}
        </button>
      </div>
    </div>
  );
}

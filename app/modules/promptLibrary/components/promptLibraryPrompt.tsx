import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import { Copy, ExternalLink } from "lucide-react";
import { getAnnotationLabel } from "~/modules/annotations/helpers/annotationTypes";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import getDateString from "~/modules/app/helpers/getDateString";
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
    <div className="max-w-7xl space-y-6 p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
        <PageHeaderRight>
          <Button onClick={onCopyPromptClicked} disabled={isCopying}>
            <Copy />
            {isCopying ? "Copying..." : "Copy to my team"}
          </Button>
        </PageHeaderRight>
      </PageHeader>

      {library?.description ? (
        <p className="text-foreground/80 max-w-prose text-base leading-relaxed">
          {library.description}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="gap-0 py-4">
          <CardHeader className="px-4">
            <CardDescription>Annotation type</CardDescription>
            <CardTitle className="text-base">
              {getAnnotationLabel(prompt.annotationType)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-0 py-4">
          <CardHeader className="px-4">
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-base">
              {library?.publishedAt
                ? getDateString(library.publishedAt as string)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-0 py-4">
          <CardHeader className="px-4">
            <CardDescription>Production version</CardDescription>
            <CardTitle className="text-base">
              v{prompt.productionVersion}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {library?.authors?.length ? (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardDescription>Authors</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <ul className="space-y-1 text-sm">
              {library.authors.map((a, i) => (
                <li key={`${a.name}-${i}`}>
                  <span className="font-medium">{a.name}</span>
                  {a.affiliation ? (
                    <span className="text-muted-foreground">
                      &nbsp;—&nbsp;{a.affiliation}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {library?.paperRefs?.length ? (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardDescription>Papers</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <ul className="space-y-2 text-sm">
              {library.paperRefs.map((p, i) => (
                <li key={`${p.url}-${i}`}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                  >
                    {p.title}
                    <ExternalLink className="size-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardDescription>Prompt body</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <pre className="bg-muted text-foreground rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
            {promptVersion.userPrompt}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

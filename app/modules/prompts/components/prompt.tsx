import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import map from "lodash/map";
import {
  CheckCircle2,
  CirclePlus,
  Globe,
  GlobeLock,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link, Outlet } from "react-router";
import getReferenceId from "~/helpers/getReferenceId";
import { getAnnotationLabel } from "~/modules/annotations/helpers/annotationTypes";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import { promptLibraryUrl } from "~/modules/promptLibrary/helpers/promptLibraryUrls";
import type { Prompt, PromptVersion } from "../prompts.types";
import PromptVersionItem from "./promptVersionItem";

type PromptProps = {
  prompt: Prompt;
  promptVersions: PromptVersion[];
  version: number;
  breadcrumbs: Breadcrumb[];
  canDelete: boolean;
  canPublish: boolean;
  onCreatePromptVersionClicked: () => void;
  onEditPromptButtonClicked: (prompt: Prompt) => void;
  onDeletePromptButtonClicked: (prompt: Prompt) => void;
  onPublishPromptButtonClicked: (prompt: Prompt) => void;
  onUnpublishPromptButtonClicked: (prompt: Prompt) => void;
};

export default function Prompt({
  prompt,
  promptVersions,
  version,
  breadcrumbs,
  canDelete,
  canPublish,
  onCreatePromptVersionClicked,
  onEditPromptButtonClicked,
  onDeletePromptButtonClicked,
  onPublishPromptButtonClicked,
  onUnpublishPromptButtonClicked,
}: PromptProps) {
  const isPublished = Boolean(prompt.library?.isPublished);
  const isDeleteBlocked = isPublished;

  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
          {isPublished ? (
            <Badge
              variant="secondary"
              className="ml-2 gap-1 text-emerald-700 dark:text-emerald-300"
            >
              <CheckCircle2 className="size-3" />
              Published
            </Badge>
          ) : null}
        </PageHeaderLeft>
        <PageHeaderRight>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => onEditPromptButtonClicked(prompt)}
          >
            <Pencil />
            Edit
          </Button>
          {canPublish &&
            (isPublished ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => onPublishPromptButtonClicked(prompt)}
                >
                  <Pencil />
                  Edit library entry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => onUnpublishPromptButtonClicked(prompt)}
                >
                  <GlobeLock />
                  Unpublish
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => onPublishPromptButtonClicked(prompt)}
              >
                <Globe />
                Publish to library
              </Button>
            ))}
          {canDelete &&
            (isDeleteBlocked ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Unpublish from the library before deleting.
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => onDeletePromptButtonClicked(prompt)}
              >
                <Trash2 />
                Delete
              </Button>
            ))}
        </PageHeaderRight>
      </PageHeader>
      <div className="mb-2">
        <p className="text-muted-foreground text-sm">
          Annotation Type: {getAnnotationLabel(prompt.annotationType)}
        </p>
        {prompt.copiedFrom ? (
          <p className="text-muted-foreground text-sm">
            Copied from&nbsp;
            <Link
              to={promptLibraryUrl(prompt.copiedFrom.prompt)}
              className="underline"
            >
              {prompt.copiedFrom.name}
            </Link>
            &nbsp;(v{prompt.copiedFrom.version})
          </p>
        ) : null}
      </div>
      <div className="flex rounded-md border">
        <div className="h-full w-1/4">
          <div className="flex items-center justify-between border-b p-2 text-sm">
            <div>Versions</div>
            <div>
              <Button
                size="icon"
                variant="ghost"
                className="hover:text-sandpiper-accent size-4 cursor-pointer"
                onClick={onCreatePromptVersionClicked}
                asChild
              >
                <CirclePlus />
              </Button>
            </div>
          </div>
          {map(promptVersions, (promptVersion) => {
            const isSelected = version === promptVersion.version;
            const isProduction =
              prompt.productionVersion === promptVersion.version;
            return (
              <PromptVersionItem
                key={promptVersion._id}
                promptId={prompt._id}
                teamId={getReferenceId(prompt.team)}
                name={promptVersion.name}
                version={promptVersion.version}
                createdAt={promptVersion.createdAt}
                isSelected={isSelected}
                isProduction={isProduction}
              />
            );
          })}
        </div>
        <div className="h-full w-3/4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import map from "lodash/map";
import { CirclePlus, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Outlet } from "react-router";
import getReferenceId from "~/helpers/getReferenceId";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import type {
  Codebook as CodebookType,
  CodebookVersion,
} from "../codebooks.types";
import CodebookVersionItem from "./codebookVersionItem";

type CodebookProps = {
  codebook: CodebookType;
  codebookVersions: CodebookVersion[];
  version: number;
  breadcrumbs: Breadcrumb[];
  canDelete: boolean;
  onCreateCodebookVersionClicked: () => void;
  onEditCodebookButtonClicked: (codebook: CodebookType) => void;
  onDeleteCodebookButtonClicked: (codebook: CodebookType) => void;
  onCreatePromptFromCodebookClicked: () => void;
};

export default function Codebook({
  codebook,
  codebookVersions,
  version,
  breadcrumbs,
  canDelete,
  onCreateCodebookVersionClicked,
  onEditCodebookButtonClicked,
  onDeleteCodebookButtonClicked,
  onCreatePromptFromCodebookClicked,
}: CodebookProps) {
  const teamId = getReferenceId(codebook.team);
  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
        <PageHeaderRight>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onCreatePromptFromCodebookClicked}
          >
            <Sparkles />
            Create prompt
          </Button>
          {onEditCodebookButtonClicked && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => onEditCodebookButtonClicked(codebook)}
            >
              <Pencil />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => onDeleteCodebookButtonClicked(codebook)}
            >
              <Trash2 />
              Delete
            </Button>
          )}
        </PageHeaderRight>
      </PageHeader>
      {codebook.description && (
        <div className="mb-2">
          <p className="text-sm font-bold">Intention</p>
          <p className="text-muted-foreground max-w-prose text-sm">
            {codebook.description}
          </p>
        </div>
      )}
      <div className="flex rounded-md border">
        <div className="h-full w-1/4">
          <div className="flex items-center justify-between border-b p-2 text-sm">
            <div>Versions</div>
            <div>
              <Button
                size="icon"
                variant="ghost"
                className="hover:text-sandpiper-accent size-4 cursor-pointer"
                onClick={onCreateCodebookVersionClicked}
                asChild
              >
                <CirclePlus />
              </Button>
            </div>
          </div>
          {map(codebookVersions, (codebookVersion) => {
            const isSelected = version === codebookVersion.version;
            const isProduction =
              codebook.productionVersion === codebookVersion.version;
            return (
              <CodebookVersionItem
                key={codebookVersion._id}
                teamId={teamId}
                codebook={codebookVersion.codebook}
                name={codebookVersion.name}
                version={codebookVersion.version}
                createdAt={codebookVersion.createdAt}
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

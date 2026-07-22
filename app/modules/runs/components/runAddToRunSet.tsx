import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collection } from "@/components/ui/collection";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { Spinner } from "@/components/ui/spinner";
import cloneDeep from "lodash/cloneDeep";
import includes from "lodash/includes";
import map from "lodash/map";
import pull from "lodash/pull";
import { Zap } from "lucide-react";
import { useState } from "react";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import getDateString from "~/modules/app/helpers/getDateString";
import type { RunSet } from "~/modules/runSets/runSets.types";

export default function RunAddToRunSet({
  eligibleRunSets,
  totalEligibleRunSets,
  totalPages,
  breadcrumbs,
  isSubmitting,
  searchValue,
  currentPage,
  isSyncing,
  onAddToRunSetsClicked,
  onCancelClicked,
  onSearchValueChanged,
  onPaginationChanged,
}: {
  eligibleRunSets: RunSet[];
  totalEligibleRunSets: number;
  totalPages: number;
  breadcrumbs: Breadcrumb[];
  isSubmitting: boolean;
  searchValue: string;
  currentPage: number;
  isSyncing: boolean;
  onAddToRunSetsClicked: (runSetIds: string[]) => void;
  onCancelClicked: () => void;
  onSearchValueChanged: (value: string) => void;
  onPaginationChanged: (page: number) => void;
}) {
  const [selectedRunSets, setSelectedRunSets] = useState<string[]>([]);

  const onSelectAllToggled = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedRunSets(map(eligibleRunSets, "_id"));
    } else {
      setSelectedRunSets([]);
    }
  };

  const onSelectRunSetToggled = (runSetId: string, isChecked: boolean) => {
    const cloned = cloneDeep(selectedRunSets);
    if (isChecked) {
      cloned.push(runSetId);
      setSelectedRunSets(cloned);
    } else {
      pull(cloned, runSetId);
      setSelectedRunSets(cloned);
    }
  };

  const getItemAttributes = (runSet: RunSet) => ({
    id: runSet._id,
    title: runSet.name,
    meta: [
      {
        text: `${runSet.runs?.length || 0} run${(runSet.runs?.length || 0) !== 1 ? "s" : ""}`,
      },
      { text: `Created ${getDateString(runSet.createdAt)}` },
    ],
  });

  const renderItem = (runSet: RunSet) => (
    <div className="flex w-full items-center gap-4 p-4">
      <Checkbox
        checked={includes(selectedRunSets, runSet._id)}
        onCheckedChange={(checked) =>
          onSelectRunSetToggled(runSet._id, Boolean(checked))
        }
        onClick={(e) => e.stopPropagation()}
      />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{runSet.name}</div>
        <div className="text-muted-foreground text-body flex gap-4">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {runSet.runs?.length || 0} run
            {(runSet.runs?.length || 0) !== 1 ? "s" : ""}
          </span>
          <span>Created {getDateString(runSet.createdAt)}</span>
        </div>
      </div>
    </div>
  );

  const allSelected =
    eligibleRunSets.length > 0 &&
    selectedRunSets.length === eligibleRunSets.length;

  return (
    <div className="p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <p className="text-muted-foreground mb-6">
        Select existing run sets to add this run to.
      </p>

      {totalEligibleRunSets === 0 && !searchValue ? (
        <div className="text-muted-foreground py-12 text-center">
          <p>No eligible run sets found.</p>
          <p className="text-body mt-2">
            Run sets must have the same sessions and annotation type as this
            run.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-4">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) =>
                onSelectAllToggled(Boolean(checked))
              }
            />
            <span className="text-muted-foreground text-body">
              Select all ({selectedRunSets.length} of {totalEligibleRunSets}{" "}
              selected)
            </span>
          </div>

          <Collection
            items={eligibleRunSets}
            itemsLayout="list"
            hasSearch
            hasPagination
            searchValue={searchValue}
            currentPage={currentPage}
            totalPages={totalPages}
            isSyncing={isSyncing}
            emptyAttributes={{
              title: "No run sets found",
              description: searchValue
                ? "Try a different search term"
                : "No eligible run sets available",
            }}
            getItemAttributes={getItemAttributes}
            getItemActions={() => []}
            renderItem={renderItem}
            onItemClicked={(id) => {
              const isSelected = includes(selectedRunSets, id);
              onSelectRunSetToggled(id, !isSelected);
            }}
            onActionClicked={() => {}}
            onSearchValueChanged={onSearchValueChanged}
            onPaginationChanged={onPaginationChanged}
            onFiltersValueChanged={() => {}}
            onSortValueChanged={() => {}}
            filters={[]}
            filtersValues={{}}
          />
        </>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onCancelClicked}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        {totalEligibleRunSets > 0 && (
          <Button
            onClick={() => onAddToRunSetsClicked(selectedRunSets)}
            disabled={selectedRunSets.length === 0 || isSubmitting}
          >
            {isSubmitting && <Spinner />}
            {isSubmitting
              ? "Adding..."
              : `Add to ${selectedRunSets.length} Run Set${selectedRunSets.length !== 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collection } from "@/components/ui/collection";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import cloneDeep from "lodash/cloneDeep";
import includes from "lodash/includes";
import map from "lodash/map";
import pull from "lodash/pull";
import { useState } from "react";
import {
  data,
  redirect,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "react-router";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import getDateString from "~/modules/app/helpers/getDateString";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectRunSetUrl,
  projectRunSetsUrl,
  projectUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import { RunSetService } from "~/modules/runSets/runSet";
import type { RunSet } from "~/modules/runSets/runSets.types";
import type { Route } from "./+types/runSetMerge.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return redirect("/");
  }

  if (!ProjectAuthorization.canView(user, project)) {
    return redirect("/");
  }

  const runSet = await RunSetService.findOne({
    _id: params.runSetId,
    project: params.projectId,
  });
  if (!runSet) {
    return redirect(projectRunSetsUrl(params.teamId, params.projectId));
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
  });

  const mergeableRunSetsResult = await RunSetService.findMergeableRunSets(
    params.runSetId,
    {
      page: queryParams.currentPage || 1,
      pageSize: 10,
      search: queryParams.searchValue || "",
    },
  );

  return {
    runSet,
    project,
    mergeableRunSets: mergeableRunSetsResult.data,
    totalMergeableRunSets: mergeableRunSetsResult.count,
    totalPages: mergeableRunSetsResult.totalPages,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return data({ errors: { project: "Project not found" } }, { status: 404 });
  }

  if (!ProjectAuthorization.Runs.canManage(user, project)) {
    return data({ errors: { project: "Access denied" } }, { status: 403 });
  }

  const { intent, payload = {} } = await request.json();

  switch (intent) {
    case "MERGE_RUN_SETS": {
      const { sourceRunSetIds } = payload;
      const targetRunSet = await RunSetService.findOne({
        _id: params.runSetId,
        project: params.projectId,
      });
      if (!targetRunSet) {
        return data(
          { errors: { runSet: "Run set not found" } },
          { status: 404 },
        );
      }
      await RunSetService.mergeRunSets(params.runSetId, sourceRunSetIds);
      return redirect(
        projectRunSetUrl(params.teamId, params.projectId, params.runSetId),
      );
    }
    default: {
      return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
    }
  }
}

export default function RunSetMergeRoute({ params }: Route.ComponentProps) {
  const {
    runSet,
    project,
    mergeableRunSets,
    totalMergeableRunSets,
    totalPages,
  } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [selectedRunSets, setSelectedRunSets] = useState<string[]>([]);

  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
  });

  const onSelectAllToggled = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedRunSets(map(mergeableRunSets, "_id"));
    } else {
      setSelectedRunSets([]);
    }
  };

  const onSelectRunSetToggled = (runSetId: string, isChecked: boolean) => {
    const clonedSelectedRunSets = cloneDeep(selectedRunSets);
    if (isChecked) {
      clonedSelectedRunSets.push(runSetId);
      setSelectedRunSets(clonedSelectedRunSets);
    } else {
      pull(clonedSelectedRunSets, runSetId);
      setSelectedRunSets(clonedSelectedRunSets);
    }
  };

  const onMergeClicked = () => {
    submit(
      JSON.stringify({
        intent: "MERGE_RUN_SETS",
        payload: { sourceRunSetIds: selectedRunSets },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const onCancelClicked = () => {
    navigate(projectRunSetUrl(params.teamId, project._id, runSet._id));
  };

  const totalRuns = selectedRunSets.reduce((sum, id) => {
    const rs = mergeableRunSets.find((c) => c._id === id);
    return sum + (rs?.runs?.length || 0);
  }, 0);

  const getItemAttributes = (rs: RunSet) => ({
    id: rs._id,
    title: rs.name,
    meta: [
      { text: `${rs.runs?.length || 0} runs` },
      {
        text: getDateString(rs.createdAt),
      },
    ],
  });

  const renderItem = (rs: RunSet) => (
    <div className="flex w-full items-center gap-4 p-4">
      <Checkbox
        checked={includes(selectedRunSets, rs._id)}
        onCheckedChange={(checked) =>
          onSelectRunSetToggled(rs._id, Boolean(checked))
        }
        onClick={(e) => e.stopPropagation()}
      />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{rs.name}</div>
        <div className="text-muted-foreground flex gap-4 text-sm">
          <span>{rs.runs?.length || 0} runs</span>
          <span>{getDateString(rs.createdAt)}</span>
        </div>
      </div>
    </div>
  );

  const breadcrumbs = [
    { text: "Projects", link: "/" },
    { text: project.name, link: projectUrl(params.teamId, project._id) },
    {
      text: "Run Sets",
      link: projectRunSetsUrl(params.teamId, project._id),
    },
    {
      text: runSet.name,
      link: projectRunSetUrl(params.teamId, project._id, runSet._id),
    },
    { text: "Merge" },
  ];

  const allSelected =
    mergeableRunSets.length > 0 &&
    selectedRunSets.length === mergeableRunSets.length;

  return (
    <div className="p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <div className="mb-8">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Merge Run Sets
        </h1>
        <p className="text-muted-foreground mt-2">
          Select run sets to merge into "{runSet.name}". Only compatible run
          sets are shown.
        </p>
      </div>

      {totalMergeableRunSets === 0 && !searchValue ? (
        <div className="text-muted-foreground py-12 text-center">
          <p>No compatible run sets found.</p>
          <p className="mt-2 text-sm">
            Run sets must have the same sessions and annotation type.
          </p>
          <Button variant="outline" className="mt-4" onClick={onCancelClicked}>
            Go Back
          </Button>
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
            <span className="text-muted-foreground text-sm">
              Select all ({selectedRunSets.length} of {totalMergeableRunSets}{" "}
              selected, {totalRuns} runs)
            </span>
          </div>

          <Collection
            items={mergeableRunSets}
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
                : "No compatible run sets available",
            }}
            getItemAttributes={getItemAttributes}
            getItemActions={() => []}
            renderItem={renderItem}
            onItemClicked={(id) => {
              const isSelected = includes(selectedRunSets, id);
              onSelectRunSetToggled(id, !isSelected);
            }}
            onActionClicked={() => {}}
            onSearchValueChanged={setSearchValue}
            onPaginationChanged={setCurrentPage}
            onFiltersValueChanged={() => {}}
            onSortValueChanged={() => {}}
            filters={[]}
            filtersValues={{}}
          />

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelClicked}>
              Cancel
            </Button>
            <Button
              onClick={onMergeClicked}
              disabled={selectedRunSets.length === 0}
            >
              Merge {selectedRunSets.length} RunSet
              {selectedRunSets.length !== 1 ? "s" : ""} ({totalRuns} runs)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

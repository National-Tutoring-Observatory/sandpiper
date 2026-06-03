import fse from "fs-extra";
import map from "lodash/map";
import {
  redirect,
  useLoaderData,
  useLocation,
  useNavigation,
} from "react-router";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import {
  projectRunSetRunUrl,
  projectRunSetUrl,
  projectRunSetsUrl,
  projectRunUrl,
  projectUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";
import RunSessions from "../components/runSessions";
import type { Route } from "./+types/runSessions.route";

export const meta: Route.MetaFunction = () => [
  { title: "Session - Sandpiper" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const teamIds = map(user.teams, "team");
  if (!teamIds.includes(params.teamId)) {
    return redirect("/");
  }
  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return redirect("/");
  }
  const run = await RunService.findOne({
    _id: params.runId,
    project: params.projectId,
  });
  if (!run) {
    return redirect("/");
  }
  const session = run.sessions.find((s) => s.sessionId === params.sessionId);
  if (!session) {
    return redirect("/");
  }

  const sessionPath = `storage/${params.projectId}/runs/${params.runId}/${params.sessionId}/${session.name}`;

  const storage = getStorageAdapter();
  const runSetId = params.runSetId;
  const runSetPromise = runSetId
    ? RunSetService.findOne({ _id: runSetId, project: params.projectId })
    : Promise.resolve(null);

  const [downloadedPath, runSet] = await Promise.all([
    storage.download({ sourcePath: sessionPath }),
    runSetPromise,
  ]);

  const sessionFile = await fse.readJSON(downloadedPath);

  const sidebarQueryParams = getQueryParamsFromRequest(
    request,
    { searchValue: "", currentPage: 1, sort: "name", filters: {} },
    { paramPrefix: "sidebar" },
  );

  const paginatedSessions = RunService.paginateSessions(run.sessions, {
    searchValue: sidebarQueryParams.searchValue,
    sort: sidebarQueryParams.sort,
    page: sidebarQueryParams.currentPage,
    filters: sidebarQueryParams.filters,
  });

  return {
    project,
    run,
    session,
    sessionFile,
    runSet,
    paginatedSessions,
  };
}

export default function ProjectRunSessionsRoute({
  params,
}: Route.ComponentProps) {
  const { project, run, sessionFile, session, runSet, paginatedSessions } =
    useLoaderData<typeof loader>();

  const parentBreadcrumbs = runSet
    ? [
        {
          text: "Run Sets",
          link: projectRunSetsUrl(params.teamId, project._id),
        },
        {
          text: runSet.name,
          link: projectRunSetUrl(params.teamId, project._id, runSet._id),
        },
      ]
    : [
        {
          text: "Runs",
          link: projectUrl(params.teamId, project._id),
        },
      ];

  const runLink = runSet
    ? projectRunSetRunUrl(params.teamId, project._id, runSet._id, run._id)
    : projectRunUrl(params.teamId, project._id, run._id);

  const breadcrumbs = [
    {
      text: "Projects",
      link: `/`,
    },
    {
      text: project.name,
      link: projectUrl(params.teamId, project._id),
    },
    ...parentBreadcrumbs,
    {
      text: run.name,
      link: runLink,
    },
    {
      text: session.name,
    },
  ];

  const {
    searchValue: sidebarSearchValue,
    setSearchValue: setSidebarSearchValue,
    currentPage: sidebarCurrentPage,
    setCurrentPage: setSidebarCurrentPage,
    isSyncing: sidebarIsSyncing,
  } = useSearchQueryParams(
    { searchValue: "", currentPage: 1, sortValue: "name" },
    { paramPrefix: "sidebar" },
  );

  const location = useLocation();
  const navigation = useNavigation();
  const isLoadingSession =
    navigation.state === "loading" &&
    navigation.location?.pathname.endsWith(`/sessions/${params.sessionId}`) ===
      false;

  return (
    <RunSessions
      run={run}
      session={session}
      sessionFile={sessionFile}
      breadcrumbs={breadcrumbs}
      runLink={runLink}
      currentSessionId={params.sessionId}
      paginatedSessions={paginatedSessions}
      sidebarSearchValue={sidebarSearchValue}
      sidebarCurrentPage={sidebarCurrentPage}
      sidebarIsSyncing={sidebarIsSyncing}
      sidebarSearch={location.search}
      isLoadingSession={isLoadingSession}
      onSidebarSearchValueChanged={setSidebarSearchValue}
      onSidebarPaginationChanged={setSidebarCurrentPage}
    />
  );
}

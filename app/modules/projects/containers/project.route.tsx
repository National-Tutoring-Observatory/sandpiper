import filter from "lodash/filter";
import get from "lodash/get";
import has from "lodash/has";
import startCase from "lodash/startCase";
import throttle from "lodash/throttle";
import { useEffect, useState } from "react";
import {
  redirect,
  useMatches,
  useNavigate,
  useRevalidator,
} from "react-router";
import useHandleSockets from "~/modules/app/hooks/useHandleSockets";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { FileService } from "~/modules/files/file";
import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import { SessionService } from "~/modules/sessions/session";
import ProjectAuthorization from "../authorization";
import Project from "../components/project";
import { useProjectActions } from "../hooks/useProjectActions";
import { ProjectService } from "../project";
import type { Route } from "./+types/project.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findById(params.id);
  if (!project) {
    return redirect("/");
  }

  if (!ProjectAuthorization.canView(user, project)) {
    return redirect("/");
  }

  if (!project.hasSetupProject) {
    return redirect(`/projects/${params.id}/upload-files`);
  }

  const filesCount = await FileService.count({ project: params.id });
  const sessions = await SessionService.find({ match: { project: params.id } });
  const sessionsCount = sessions.length;
  const convertedSessionsCount = filter(sessions, {
    hasConverted: true,
  }).length;
  const runsCount = await RunService.count({
    project: params.id,
    isHuman: { $ne: true },
  });
  const runSetsCount = await RunSetService.count({
    project: params.id,
  });
  return {
    project,
    filesCount,
    sessionsCount,
    convertedSessionsCount,
    runsCount,
    runSetsCount,
  };
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

const debounceRevalidate = throttle((revalidate) => {
  revalidate();
}, 2000);

export default function ProjectRoute({ loaderData }: Route.ComponentProps) {
  const {
    project,
    filesCount,
    sessionsCount,
    convertedSessionsCount,
    runsCount,
    runSetsCount,
  } = loaderData;

  const matches = useMatches();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const { openEditProjectDialog, openDeleteProjectDialog } = useProjectActions({
    onDeleteSuccess: () => navigate("/projects"),
  });

  const [uploadFilesProgress, setUploadFilesProgress] = useState(0);
  const [convertFilesProgress, setConvertFilesProgress] = useState(0);

  useHandleSockets({
    event: "CONVERT_FILES_TO_SESSIONS",
    matches: [
      {
        projectId: project._id,
        task: "CONVERT_FILES_TO_SESSIONS:START",
        status: "FINISHED",
      },
      {
        projectId: project._id,
        task: "CONVERT_FILES_TO_SESSIONS:PROCESS",
        status: "STARTED",
      },
      {
        projectId: project._id,
        task: "CONVERT_FILES_TO_SESSIONS:PROCESS",
        status: "FINISHED",
      },
      {
        projectId: project._id,
        task: "CONVERT_FILES_TO_SESSIONS:FINISH",
        status: "FINISHED",
      },
    ],
    callback: (payload) => {
      if (has(payload, "progress")) {
        setConvertFilesProgress(payload.progress);
      }
      debounceRevalidate(revalidate);
    },
  });

  useHandleSockets({
    event: "INSERT_MTM_DATASET",
    matches: [
      {
        projectId: project._id,
        task: "INSERT_MTM_DATASET:START",
        status: "FINISHED",
      },
      {
        projectId: project._id,
        task: "INSERT_MTM_DATASET:PROCESS",
        status: "STARTED",
      },
      {
        projectId: project._id,
        task: "INSERT_MTM_DATASET:PROCESS",
        status: "FINISHED",
      },
      {
        projectId: project._id,
        task: "INSERT_MTM_DATASET:FINISH",
        status: "FINISHED",
      },
    ],
    callback: (payload) => {
      if (has(payload, "progress")) {
        setConvertFilesProgress(payload.progress);
      }
      debounceRevalidate(revalidate);
    },
  });

  useEffect(() => {
    if (!project.isUploadingFiles && !project.isConvertingFiles) return;

    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.projectId === project._id) {
        switch (data.event) {
          case "UPLOAD_FILES":
            setUploadFilesProgress(data.progress);
            break;
          case "CONVERT_FILES":
            setConvertFilesProgress(data.progress);
            break;
        }
        if (data.status === "STARTED") {
          debounceRevalidate(revalidate);
        }
        if (data.status === "DONE") {
          debounceRevalidate(revalidate);
        }
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, [project.isUploadingFiles, project.isConvertingFiles]);

  const breadcrumbs = [
    { text: "Projects", link: `/teams/${project.team}/projects` },
    { text: project.name, link: `/projects/${project._id}` },
    { text: startCase(get(matches, "2.id", "").toLowerCase()) },
  ];

  return (
    <Project
      project={project}
      filesCount={filesCount}
      sessionsCount={sessionsCount}
      convertedSessionsCount={convertedSessionsCount}
      runsCount={runsCount}
      runSetsCount={runSetsCount}
      tabValue={matches[matches.length - 1].id}
      uploadFilesProgress={uploadFilesProgress}
      convertFilesProgress={convertFilesProgress}
      breadcrumbs={breadcrumbs}
      onEditProjectButtonClicked={openEditProjectDialog}
      onDeleteProjectButtonClicked={openDeleteProjectDialog}
    />
  );
}

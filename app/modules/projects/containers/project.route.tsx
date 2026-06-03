import escapeRegExp from "lodash/escapeRegExp";
import filter from "lodash/filter";
import get from "lodash/get";
import has from "lodash/has";
import startCase from "lodash/startCase";
import throttle from "lodash/throttle";
import { useEffect, useState } from "react";
import {
  data,
  redirect,
  useMatches,
  useNavigate,
  useRevalidator,
} from "react-router";
import getReferenceId from "~/helpers/getReferenceId";
import useHandleSockets from "~/modules/app/hooks/useHandleSockets";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { FileService } from "~/modules/files/file";
import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import { SessionService } from "~/modules/sessions/session";
import ProjectAuthorization from "../authorization";
import Project from "../components/project";
import {
  projectUploadFilesUrl,
  projectUrl,
  projectsUrl,
} from "../helpers/projectUrls";
import { useProjectActions } from "../hooks/useProjectActions";
import { ProjectService } from "../project";
import deleteProject from "../services/deleteProject.server";
import type { Route } from "./+types/project.route";

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

  if (!project.hasSetupProject) {
    return redirect(projectUploadFilesUrl(params.teamId, params.projectId));
  }

  const [filesCount, sessions, runsCount, runSetsCount] = await Promise.all([
    FileService.count({ project: params.projectId }),
    SessionService.find({ match: { project: params.projectId } }),
    RunService.count({ project: params.projectId, isHuman: { $ne: true } }),
    RunSetService.count({ project: params.projectId }),
  ]);

  return {
    project,
    filesCount,
    sessionsCount: sessions.length,
    convertedSessionsCount: filter(sessions, { hasConverted: true }).length,
    runsCount,
    runSetsCount,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const { intent, payload = {} } = await request.json();
  const { name } = payload;

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return data({ errors: { general: "Project not found" } }, { status: 404 });
  }

  switch (intent) {
    case "UPDATE_PROJECT": {
      if (typeof name !== "string" || !name.trim()) {
        return data(
          { errors: { general: "Project name is required" } },
          { status: 400 },
        );
      }

      if (!ProjectAuthorization.canUpdate(user, project)) {
        return data(
          {
            errors: {
              general: "You do not have permission to update this project",
            },
          },
          { status: 403 },
        );
      }

      const existingProject = await ProjectService.findOne({
        name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, "i") },
        team: project.team,
        _id: { $ne: params.projectId },
      });
      if (existingProject) {
        return data(
          { errors: { general: "A project with this name already exists" } },
          { status: 409 },
        );
      }

      const updated = await ProjectService.updateById(params.projectId, {
        name: name.trim(),
      });
      return data({ success: true, intent: "UPDATE_PROJECT", data: updated });
    }

    case "DELETE_PROJECT": {
      if (!ProjectAuthorization.canDelete(user, project)) {
        return data(
          {
            errors: {
              general: "You do not have permission to delete this project",
            },
          },
          { status: 403 },
        );
      }

      await deleteProject({ projectId: params.projectId });
      return data({ success: true, intent: "DELETE_PROJECT" });
    }

    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
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
  const teamId = getReferenceId(project.team);
  const { openEditProjectDialog, openDeleteProjectDialog } = useProjectActions({
    onDeleteSuccess: () => navigate(projectsUrl(teamId)),
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
    { text: "Projects", link: projectsUrl(teamId) },
    { text: project.name, link: projectUrl(teamId, project._id) },
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

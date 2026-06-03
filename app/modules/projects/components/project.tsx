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
import { Progress } from "@/components/ui/progress";
import clsx from "clsx";
import { Pencil, Trash2 } from "lucide-react";
import { useContext } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import getReferenceId from "~/helpers/getReferenceId";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import ProjectAuthorization from "~/modules/projects/authorization";
import type { User } from "~/modules/users/users.types";
import {
  projectFilesUrl,
  projectRunSetsUrl,
  projectSessionsUrl,
  projectUrl,
} from "../helpers/projectUrls";
import type { Project } from "../projects.types";

interface ProjectProps {
  project: Project;
  filesCount: number;
  sessionsCount: number;
  convertedSessionsCount: number;
  runsCount: number;
  runSetsCount: number;
  tabValue: string;
  uploadFilesProgress: number;
  convertFilesProgress: number;
  breadcrumbs: Breadcrumb[];
  onEditProjectButtonClicked: (project: Project) => void;
  onDeleteProjectButtonClicked: (project: Project) => void;
}

export default function Project({
  project,
  filesCount,
  sessionsCount,
  convertedSessionsCount,
  runsCount,
  runSetsCount,
  tabValue,
  uploadFilesProgress,
  convertFilesProgress,
  breadcrumbs,
  onEditProjectButtonClicked,
  onDeleteProjectButtonClicked,
}: ProjectProps) {
  const navigate = useNavigate();
  const user = useContext(AuthenticationContext) as User | null;
  const canUpdate = ProjectAuthorization.canUpdate(user, project);
  const canDelete = ProjectAuthorization.canDelete(user, project);
  const teamId = getReferenceId(project.team);

  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
        <PageHeaderRight>
          {(canUpdate || canDelete) && (
            <div className="flex gap-1">
              {canUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => onEditProjectButtonClicked(project)}
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
                  onClick={() => onDeleteProjectButtonClicked(project)}
                >
                  <Trash2 />
                  Delete
                </Button>
              )}
            </div>
          )}
        </PageHeaderRight>
      </PageHeader>
      <div className="grid grid-cols-4 gap-8">
        <Link
          to={projectFilesUrl(teamId, project._id)}
          replace
          className="focus-visible:ring-ring h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <Card
            className={clsx("h-full transition-all", {
              "border-accent-foreground": tabValue === "FILES",
            })}
          >
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>
                Files are your original data files
              </CardDescription>
            </CardHeader>
            <CardContent className="h-8">
              {!project.isUploadingFiles && !project.isConvertingFiles && (
                <div>{`${filesCount} files`}</div>
              )}
              {project.isUploadingFiles && (
                <div>
                  <Progress value={uploadFilesProgress} />
                </div>
              )}
              {!project.isUploadingFiles && project.isConvertingFiles && (
                <div className="text-muted-foreground text-xs">Processing…</div>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link
          to={projectSessionsUrl(teamId, project._id)}
          replace
          className="focus-visible:ring-ring h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <Card
            className={clsx("h-full transition-all", {
              "border-accent-foreground": tabValue === "SESSIONS",
            })}
          >
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>
                Sessions are your files converted to our standard format
              </CardDescription>
            </CardHeader>
            <CardContent className="h-8">
              {!project.isConvertingFiles && (
                <div>
                  {`${sessionsCount} sessions`}
                  <div className="text-xs opacity-40">
                    {convertedSessionsCount} converted
                  </div>
                </div>
              )}
              {project.isConvertingFiles && (
                <div className="relative">
                  <div className="absolute top-3 right-0 text-xs opacity-40">
                    Converting
                  </div>
                  <Progress value={convertFilesProgress} />
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link
          to={projectUrl(teamId, project._id)}
          replace
          className="focus-visible:ring-ring h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <Card
            className={clsx("h-full transition-all", {
              "border-accent-foreground": tabValue === "RUNS",
            })}
          >
            <CardHeader>
              <CardTitle>Runs</CardTitle>
              <CardDescription>
                Annotate sessions using a Prompt and AI model.&nbsp;
                <button
                  className="text-primary underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/teams/${project.team}/prompts`);
                  }}
                >
                  Need a prompt?
                </button>
              </CardDescription>
            </CardHeader>
            <CardContent className="h-8">
              <p>{runsCount} runs</p>
            </CardContent>
          </Card>
        </Link>
        <Link
          to={projectRunSetsUrl(teamId, project._id)}
          replace
          className="focus-visible:ring-ring h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <Card
            className={clsx("h-full transition-all", {
              "border-accent-foreground": tabValue === "RUN_SETS",
            })}
          >
            <CardHeader>
              <CardTitle>Run Sets</CardTitle>
              <CardDescription>
                Run sets are a grouping of runs to help you compare different
                run settings across the same dataset
              </CardDescription>
            </CardHeader>
            <CardContent className="h-8">
              <p>{runSetsCount} run sets</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}

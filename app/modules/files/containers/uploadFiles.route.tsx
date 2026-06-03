import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import { useEffect } from "react";
import { data, Link, redirect, useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import insertMtmDataset from "~/modules/datasets/services/insertMtmDataset.server";
import { FileService } from "~/modules/files/file";
import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectFilesUrl,
  projectsUrl,
  projectUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import type { Route } from "./+types/uploadFiles.route";
import UploadFilesContainer from "./uploadFiles.container";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) return redirect("/");

  if (!ProjectAuthorization.canUpdate(user, project)) {
    return redirect("/");
  }

  if (project.isUploadingFiles || project.isConvertingFiles) {
    return redirect(
      project.hasSetupProject
        ? projectFilesUrl(params.teamId, params.projectId)
        : "/",
    );
  }

  return { project };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return data({ errors: { general: "Project not found" } }, { status: 404 });
  }

  if (!ProjectAuthorization.canUpdate(user, project)) {
    return data(
      {
        errors: {
          general:
            "You do not have permission to upload files to this project.",
        },
      },
      { status: 403 },
    );
  }

  if (project.isUploadingFiles || project.isConvertingFiles) {
    return data(
      { errors: { general: "An upload is already in progress." } },
      { status: 409 },
    );
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await request.json();

    if (payload.intent === "INSERT_MTM_DATASET") {
      if (project.hasMtmDataset) {
        return data(
          { errors: { general: "MTM dataset has already been added." } },
          { status: 409 },
        );
      }

      try {
        await ProjectService.updateById(params.projectId, {
          hasSetupProject: true,
        });
        await insertMtmDataset({ projectId: params.projectId });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return data(
          {
            errors: {
              general: `MTM dataset insertion failed: ${errorMessage}`,
            },
          },
          { status: 500 },
        );
      }

      trackServerEvent({ name: "mtm_dataset_inserted", userId: user._id });

      return data({ success: true, intent: "INSERT_MTM_DATASET" });
    }

    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  const formData = await request.formData();
  const uploadedFiles = formData.getAll("files") as File[];

  if (uploadedFiles.length === 0) {
    return data(
      { errors: { files: "Please select at least one file." } },
      { status: 400 },
    );
  }

  try {
    await FileService.processUploadedFiles({
      projectId: params.projectId,
      files: uploadedFiles,
      team: project.team as string,
      userId: user._id,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return data(
      { errors: { files: `File processing failed: ${errorMessage}` } },
      { status: 400 },
    );
  }

  if (!project.hasSetupProject) {
    await ProjectService.updateById(params.projectId, {
      hasSetupProject: true,
    });
  }

  trackServerEvent({ name: "sessions_uploaded", userId: user._id });

  return data({ success: true, intent: "UPLOAD_FILES" });
}

export default function UploadFilesPageRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { project } = loaderData;
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data) return;
    if (fetcher.data.success) {
      if (fetcher.data.intent === "UPLOAD_FILES") {
        toast.success("Files uploaded successfully");
        navigate(projectFilesUrl(params.teamId, project._id));
      } else if (fetcher.data.intent === "INSERT_MTM_DATASET") {
        toast.success("MTM dataset is being added to your project");
        navigate(projectUrl(params.teamId, project._id));
      }
    } else if (fetcher.data.errors) {
      toast.error(
        fetcher.data.errors.general ||
          fetcher.data.errors.files ||
          "Upload failed",
      );
    }
  }, [fetcher.state, fetcher.data, navigate, project._id, params.teamId]);

  const backLink = project.hasSetupProject
    ? projectFilesUrl(params.teamId, project._id)
    : "/";

  const breadcrumbs = [
    { text: "Projects", link: projectsUrl(params.teamId) },
    { text: project.name, link: backLink },
    { text: "Upload Files" },
  ];

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
            asChild
          >
            <Link to={backLink}>Cancel</Link>
          </Button>
        </PageHeaderRight>
      </PageHeader>
      <UploadFilesContainer projectId={project._id} uploadFetcher={fetcher} />
    </div>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { redirect } from "react-router";
import { toast } from "sonner";
import getReferenceId from "~/helpers/getReferenceId";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog from "~/modules/dialogs/addDialog";
import CodebookAuthorization from "../authorization";
import { CodebookService } from "../codebook";
import type { CodebookCategory } from "../codebooks.types";
import { CodebookVersionService } from "../codebookVersion";
import CodebookEditor from "../components/codebookEditor";
import SaveCodebookVersionDialog from "../components/saveCodebookVersionDialog";
import type { Route } from "./+types/codebookEditor.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const codebook = await CodebookService.findOne({
    _id: params.codebookId,
    team: params.teamId,
  });

  if (!codebook) {
    return redirect("/");
  }

  if (!CodebookAuthorization.canView(user, codebook)) {
    return redirect("/");
  }

  const codebookVersion = await CodebookVersionService.findOne({
    version: Number(params.version),
    codebook: params.codebookId,
  });

  if (!codebookVersion) {
    return redirect("/");
  }

  return {};
}

export async function action({ request, params }: Route.ActionArgs) {
  const { intent, entityId, payload = {} } = await request.json();

  const { name, categories } = payload;

  const user = await requireAuth({ request });

  const codebookVersion = await CodebookVersionService.findById(entityId);

  if (!codebookVersion) {
    throw new Error("Codebook version not found");
  }

  const codebookId = getReferenceId(codebookVersion.codebook);
  const codebook = await CodebookService.findOne({
    _id: codebookId,
    team: params.teamId,
  });

  if (!codebook) {
    throw new Error("Codebook not found");
  }

  if (!CodebookAuthorization.canUpdate(user, codebook)) {
    throw new Error("Access denied");
  }

  switch (intent) {
    case "UPDATE_CODEBOOK_VERSION":
      await CodebookVersionService.updateById(entityId, {
        name,
        categories,
        hasBeenSaved: true,
        updatedAt: new Date().toISOString(),
      });
      return {};
    case "MAKE_CODEBOOK_VERSION_PRODUCTION":
      await CodebookService.updateById(codebookId, {
        productionVersion: Number(params.version),
      });
      return {};
    default:
      return {};
  }
}

export default function CodebookEditorRoute({ params }: Route.ComponentProps) {
  const { teamId, codebookId, version } = params;
  const queryClient = useQueryClient();

  const teamQuery = { teamId };
  const codebookVersionsApi = `/api/codebooks/${codebookId}/versions`;
  const codebook = useCache({
    api: `/api/codebooks/${codebookId}`,
    query: teamQuery,
  });
  const codebookVersion = useCache({
    api: `${codebookVersionsApi}/${version}`,
    query: teamQuery,
  });

  if (!codebook.data || !codebookVersion.data) return null;

  const onSaveCodebookVersion = ({
    name,
    categories,
  }: {
    name: string;
    categories: CodebookCategory[];
  }) => {
    addDialog(
      <SaveCodebookVersionDialog
        onSaveClicked={() => submitSaveCodebookVersion({ name, categories })}
      />,
    );
  };

  const submitSaveCodebookVersion = (data: {
    name: string;
    categories: CodebookCategory[];
  }) => {
    codebookVersion.mutate(
      { method: "PUT", query: teamQuery, data },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: [codebookVersionsApi] }),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const submitMakeCodebookVersionProduction = () => {
    codebook.mutate(
      {
        api: `${codebookVersionsApi}/${version}/production`,
        method: "POST",
        query: teamQuery,
      },
      { onError: (error) => toast.error(error.message) },
    );
  };

  return (
    <CodebookEditor
      key={codebookVersion.data._id}
      codebookVersion={codebookVersion.data}
      isLoading={codebookVersion.isFetching || codebookVersion.isMutating}
      onSaveCodebookVersion={onSaveCodebookVersion}
      isProduction={
        codebook.data.productionVersion === codebookVersion.data.version
      }
      onMakeCodebookVersionProduction={submitMakeCodebookVersionProduction}
    />
  );
}

import {
  redirect,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import getReferenceId from "~/helpers/getReferenceId";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
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

  return {
    codebook: { data: codebook },
    codebookVersion: { data: codebookVersion },
  };
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

export default function CodebookEditorRoute() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const { codebook, codebookVersion } = data;

  const onSaveCodebookVersion = ({
    name,
    categories,
  }: {
    name: string;
    categories: CodebookCategory[];
  }) => {
    addDialog(
      <SaveCodebookVersionDialog
        onSaveClicked={() => {
          submit(
            JSON.stringify({
              intent: "UPDATE_CODEBOOK_VERSION",
              entityId: codebookVersion.data._id,
              payload: { name, categories },
            }),
            { method: "PUT", encType: "application/json" },
          );
        }}
      />,
    );
  };

  const onMakeCodebookVersionProduction = () => {
    submit(
      JSON.stringify({
        intent: "MAKE_CODEBOOK_VERSION_PRODUCTION",
        entityId: codebookVersion.data._id,
        payload: {},
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  return (
    <CodebookEditor
      key={codebookVersion.data._id}
      codebookVersion={codebookVersion.data}
      isLoading={navigation.state === "loading"}
      onSaveCodebookVersion={onSaveCodebookVersion}
      isProduction={
        codebook.data.productionVersion === codebookVersion.data.version
      }
      onMakeCodebookVersionProduction={onMakeCodebookVersionProduction}
    />
  );
}

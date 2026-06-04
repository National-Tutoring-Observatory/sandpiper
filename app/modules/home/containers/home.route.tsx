import { useEffect } from "react";
import { useFetcher, useLoaderData, useRouteLoaderData } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { readActiveTeamFromRequest } from "~/modules/teams/helpers/activeTeamCookie";
import useCreateTeam from "~/modules/teams/hooks/useCreateTeam";
import { TeamService } from "~/modules/teams/team";
import Home from "../components/home";
import type { Route } from "./+types/home.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const userTeamIds = user.teams.map((t) => t.team);
  if (userTeamIds.length === 0) return { activeTeamId: null };

  const cookieTeamId = readActiveTeamFromRequest(request);
  if (cookieTeamId && userTeamIds.includes(cookieTeamId)) {
    return { activeTeamId: cookieTeamId };
  }

  const personal = await TeamService.findOne({
    _id: { $in: userTeamIds },
    isPersonal: true,
  });
  const activeTeamId = personal?._id ?? userTeamIds[0];

  return { activeTeamId };
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function HomeRoute() {
  const { activeTeamId } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData("root") as
    | { initialCredits: number }
    | undefined;
  const fetcher = useFetcher();
  const isDownloading = fetcher.state !== "idle";
  const onCreateTeamClicked = useCreateTeam();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data || !("downloadUrl" in fetcher.data)) return;
    const url = (fetcher.data as { downloadUrl: string }).downloadUrl;
    window.open(url, "_blank");
  }, [fetcher.state, fetcher.data]);

  const onDownloadClicked = () => {
    fetcher.submit(
      JSON.stringify({ intent: "REQUEST_MTM_DOWNLOAD", agreed: true }),
      {
        method: "POST",
        action: "/api/downloadMtmDataset",
        encType: "application/json",
      },
    );
  };

  return (
    <Home
      onDownloadClicked={onDownloadClicked}
      isDownloading={isDownloading}
      initialCredits={rootData?.initialCredits ?? 20}
      activeTeamId={activeTeamId}
      onCreateTeamClicked={onCreateTeamClicked}
    />
  );
}

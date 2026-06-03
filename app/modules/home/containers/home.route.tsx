import { useEffect } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import useActiveTeam from "~/modules/app/hooks/useActiveTeam";
import Home from "../components/home";

export function loader() {
  return {};
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function HomeRoute() {
  const rootData = useRouteLoaderData("root") as
    | { initialCredits: number }
    | undefined;
  const fetcher = useFetcher();
  const isDownloading = fetcher.state !== "idle";
  const { activeTeamId } = useActiveTeam();

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
    />
  );
}

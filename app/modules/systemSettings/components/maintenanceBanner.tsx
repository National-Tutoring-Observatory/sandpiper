import { Construction } from "lucide-react";
import { useRouteLoaderData } from "react-router";

export default function MaintenanceBanner() {
  const rootData = useRouteLoaderData("root") as
    | { maintenanceMode: boolean }
    | undefined;

  if (!rootData?.maintenanceMode) return null;

  return (
    <div className="bg-chart-4 text-body flex items-center justify-center gap-2 px-4 py-2 text-center font-medium text-white">
      <Construction className="size-4" />
      Maintenance mode is active — only super admins can access the app
    </div>
  );
}

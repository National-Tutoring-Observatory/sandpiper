import { cn } from "@/lib/utils";
import type { Team } from "~/modules/teams/teams.types";
import getTeamTileProps from "../helpers/getTeamTileProps";

export default function TeamTile({
  team,
  size = 28,
  className,
}: {
  team: Pick<Team, "_id" | "name" | "isPersonal">;
  size?: number;
  className?: string;
}) {
  const { initials, background } = getTeamTileProps(team);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-md font-bold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials}
    </span>
  );
}

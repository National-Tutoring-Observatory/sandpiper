import type { Team } from "~/modules/teams/teams.types";

const PALETTE = [
  "var(--sp-primary)",
  "var(--sp-bronze)",
  "var(--sp-primary-hover)",
];

const PERSONAL_BACKGROUND = "#5a6b6f";

function getInitials(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";

  const first = tokens[0];
  if (/^[A-Z]{1,3}$/.test(first)) return first;

  if (tokens.length === 1) return first.charAt(0).toUpperCase();
  return (tokens[0].charAt(0) + tokens[1].charAt(0)).toUpperCase();
}

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export default function getTeamTileProps(
  team: Pick<Team, "_id" | "name" | "isPersonal">,
): {
  initials: string;
  background: string;
} {
  const initials = getInitials(team.name);
  const background = team.isPersonal
    ? PERSONAL_BACKGROUND
    : PALETTE[hashId(team._id) % PALETTE.length];

  return { initials, background };
}

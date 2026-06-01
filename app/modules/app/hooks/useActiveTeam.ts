import get from "lodash/get";
import { useContext, useEffect, useMemo } from "react";
import { useFetcher, useMatch, useNavigate } from "react-router";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import type { Team } from "~/modules/teams/teams.types";
import type { User } from "~/modules/users/users.types";

const STORAGE_KEY = "sandpiper.activeTeamId";

function readStoredTeamId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTeamId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export default function useActiveTeam(): {
  activeTeamId: string | null;
  activeTeam: Team | null;
  availableTeams: Team[];
  switchActiveTeam: (id: string) => void;
} {
  const user = useContext(AuthenticationContext) as User | null;
  const teamMatch = useMatch("/teams/:teamId/*");
  const teamIdFromUrl = teamMatch?.params.teamId ?? null;

  const teamsFetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    const path = teamIdFromUrl
      ? `/api/availableTeams?include=${encodeURIComponent(teamIdFromUrl)}`
      : "/api/availableTeams";
    teamsFetcher.load(path);
    // reload when the URL team changes so super admins viewing a
    // non-member team still see its metadata
  }, [teamIdFromUrl]);

  useEffect(() => {
    if (teamIdFromUrl) writeStoredTeamId(teamIdFromUrl);
  }, [teamIdFromUrl]);

  const availableTeams: Team[] = get(teamsFetcher, "data.teams.data", []);

  const activeTeamId = useMemo(() => {
    if (teamIdFromUrl) return teamIdFromUrl;
    const stored = readStoredTeamId();
    if (stored && user?.teams.some((t) => t.team === stored)) return stored;
    return user?.teams[0]?.team ?? null;
  }, [teamIdFromUrl, user]);

  const activeTeam = useMemo(() => {
    if (!activeTeamId) return null;
    return availableTeams.find((t) => t._id === activeTeamId) ?? null;
  }, [activeTeamId, availableTeams]);

  const switchActiveTeam = (id: string) => {
    writeStoredTeamId(id);
    navigate(`/teams/${id}/projects`);
  };

  return { activeTeamId, activeTeam, availableTeams, switchActiveTeam };
}

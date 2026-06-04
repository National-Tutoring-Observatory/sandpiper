import get from "lodash/get";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { useFetcher, useMatch, useNavigate } from "react-router";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import { projectsUrl } from "~/modules/projects/helpers/projectUrls";
import {
  readActiveTeamFromBrowser,
  writeActiveTeamToBrowser,
} from "~/modules/teams/helpers/activeTeamCookie";
import type { Team } from "~/modules/teams/teams.types";
import type { User } from "~/modules/users/users.types";

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
    if (teamIdFromUrl) writeActiveTeamToBrowser(teamIdFromUrl);
  }, [teamIdFromUrl]);

  const availableTeams: Team[] = get(teamsFetcher, "data.teams.data", []);

  const activeTeamId = useMemo(() => {
    if (teamIdFromUrl) return teamIdFromUrl;
    const stored = readActiveTeamFromBrowser();
    if (stored && user?.teams.some((t) => t.team === stored)) return stored;
    const personal = availableTeams.find((t) => t.isPersonal);
    if (personal) return personal._id;
    return user?.teams[0]?.team ?? null;
  }, [teamIdFromUrl, user, availableTeams]);

  const activeTeam = useMemo(() => {
    if (!activeTeamId) return null;
    return availableTeams.find((t) => t._id === activeTeamId) ?? null;
  }, [activeTeamId, availableTeams]);

  const switchActiveTeam = useCallback(
    (id: string) => {
      writeActiveTeamToBrowser(id);
      navigate(projectsUrl(id));
    },
    [navigate],
  );

  return { activeTeamId, activeTeam, availableTeams, switchActiveTeam };
}

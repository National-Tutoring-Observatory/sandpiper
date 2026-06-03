import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import { Pencil } from "lucide-react";
import { useContext } from "react";
import { Outlet } from "react-router";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import type { User } from "~/modules/users/users.types";
import TeamAuthorization from "../authorization";
import type { Team } from "../teams.types";

interface TeamProps {
  team: Team;
  onEditTeamButtonClicked: (team: Team) => void;
}

export default function Team({ team, onEditTeamButtonClicked }: TeamProps) {
  const user = useContext(AuthenticationContext) as User | null;
  const canUpdate = TeamAuthorization.canUpdate(user, team._id);

  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={[{ text: team.name }]} />
        </PageHeaderLeft>
        <PageHeaderRight>
          {canUpdate && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => onEditTeamButtonClicked(team)}
            >
              <Pencil />
              Edit
            </Button>
          )}
        </PageHeaderRight>
      </PageHeader>

      <Outlet context={{ team }} />
    </div>
  );
}

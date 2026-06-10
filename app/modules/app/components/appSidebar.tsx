import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  ChartNoAxesGantt,
  CircleDollarSign,
  ClipboardList,
  Construction,
  Database,
  Flag as FlagIcon,
  Folder,
  Link2,
  Notebook,
  Shield,
  Users,
  UsersRound,
} from "lucide-react";
import { useContext, useEffect } from "react";
import {
  Link,
  NavLink,
  useFetcher,
  useLocation,
  useNavigate,
} from "react-router";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";
import SidebarAccountMenu from "~/modules/app/components/sidebarAccountMenu";
import SideBarHelpDropdown from "~/modules/app/components/sidebarHelpDropdown";
import getNavMode from "~/modules/app/helpers/getNavMode";
import useActiveTeam from "~/modules/app/hooks/useActiveTeam";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import { adminBillingUrl } from "~/modules/billing/helpers/billingUrls";
import FeatureFlag from "~/modules/featureFlags/components/flag";
import { featureFlagsUrl } from "~/modules/featureFlags/helpers/featureFlagUrls";
import { migrationsUrl } from "~/modules/migrations/helpers/migrationUrls";
import { projectsUrl } from "~/modules/projects/helpers/projectUrls";
import { queuesUrl } from "~/modules/queues/helpers/queueUrls";
import { maintenanceUrl } from "~/modules/systemSettings/helpers/maintenanceUrls";
import { adminTeamsUrl } from "~/modules/teams/helpers/teamUrls";
import useCreateTeam from "~/modules/teams/hooks/useCreateTeam";
import { adminUsersUrl } from "~/modules/users/helpers/userUrls";
import type { User } from "~/modules/users/users.types";

type NavEntry = {
  to: string;
  icon: typeof Folder;
  label: string;
};

function NavGroup({ label, entries }: { label: string; entries: NavEntry[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {entries.map((entry) => (
            <SidebarMenuItem key={entry.to}>
              <SidebarMenuButton asChild>
                <NavLink to={entry.to} end={false}>
                  {({ isActive }) => (
                    <>
                      <entry.icon />
                      <span className={isActive ? "underline" : ""}>
                        {entry.label}
                      </span>
                    </>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default function AppSidebar() {
  const user = useContext(AuthenticationContext) as User;
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTeamId, activeTeam, availableTeams, switchActiveTeam } =
    useActiveTeam();
  const logoutFetcher = useFetcher();
  const onCreateTeamClicked = useCreateTeam(switchActiveTeam);
  const mode = getNavMode(location.pathname);

  useEffect(() => {
    if (logoutFetcher.state === "loading") {
      window.location.pathname = "/";
    }
  }, [logoutFetcher.state]);

  const onLogoutClicked = () => {
    logoutFetcher.submit(
      {},
      {
        action: `/api/authentication`,
        method: "delete",
        encType: "application/json",
      },
    );
  };

  const teamRole = activeTeamId
    ? user.teams.find((t) => t.team === activeTeamId)?.role
    : undefined;
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isTeamAdmin = teamRole === "ADMIN";
  const showTeamGroup = isSuperAdmin || isTeamAdmin;
  const roleLabel = isSuperAdmin
    ? "Super admin"
    : isTeamAdmin
      ? "Team admin"
      : "Member";

  const workspaceEntries: NavEntry[] = activeTeamId
    ? [
        {
          to: projectsUrl(activeTeamId),
          icon: Folder,
          label: "Projects",
        },
        {
          to: `/teams/${activeTeamId}/prompts`,
          icon: ClipboardList,
          label: "Prompts",
        },
      ]
    : [];
  const teamEntries: NavEntry[] = activeTeamId
    ? [
        { to: `/teams/${activeTeamId}/users`, icon: Users, label: "Members" },
        {
          to: `/teams/${activeTeamId}/invite-links`,
          icon: Link2,
          label: "Invite links",
        },
        {
          to: `/teams/${activeTeamId}/billing`,
          icon: CircleDollarSign,
          label: "Billing",
        },
      ]
    : [];
  const organizationEntries: NavEntry[] = [
    { to: adminTeamsUrl(), icon: Building2, label: "Teams" },
    { to: adminUsersUrl(), icon: UsersRound, label: "Users" },
    { to: adminBillingUrl(), icon: CircleDollarSign, label: "Billing" },
  ];
  const infrastructureEntries: NavEntry[] = [
    { to: featureFlagsUrl(), icon: FlagIcon, label: "Feature flags" },
    {
      to: queuesUrl("tasks", "active"),
      icon: ChartNoAxesGantt,
      label: "Queues",
    },
    { to: migrationsUrl(), icon: Database, label: "Migrations" },
    { to: maintenanceUrl(), icon: Construction, label: "Maintenance" },
  ];

  const exitAdmin = () => {
    if (activeTeamId) navigate(projectsUrl(activeTeamId));
    else navigate("/");
  };

  return (
    <Sidebar
      variant="inset"
      role="navigation"
      aria-label="Application navigation"
    >
      <SidebarHeader className={cn("p-4", mode === "admin" && "p-2")}>
        {mode === "admin" ? (
          <div
            role="region"
            aria-label="Platform Admin mode"
            className="border-destructive/25 bg-destructive/[0.07] flex flex-col gap-1.5 rounded-xl border p-2"
          >
            <button
              type="button"
              onClick={exitAdmin}
              className="text-destructive hover:bg-destructive/10 flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs font-medium"
            >
              <ArrowLeft className="size-3.5" />
              <span className="truncate">
                Back to {activeTeam?.name ?? "team"}
              </span>
            </button>
            <div className="text-destructive flex items-center gap-2 px-1.5 py-0.5">
              <Shield className="size-4" />
              <b className="text-sm font-bold">Platform Admin</b>
            </div>
          </div>
        ) : (
          <Link to={activeTeamId ? projectsUrl(activeTeamId) : "/"}>
            <img
              src={sandpiperLogo}
              alt="Sandpiper"
              className="mx-auto w-full max-w-28"
            />
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent>
        {mode === "team" ? (
          <>
            {activeTeamId && (
              <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {workspaceEntries.map((entry) => (
                      <SidebarMenuItem key={entry.to}>
                        <SidebarMenuButton asChild>
                          <NavLink to={entry.to} end={false}>
                            {({ isActive }) => (
                              <>
                                <entry.icon />
                                <span className={isActive ? "underline" : ""}>
                                  {entry.label}
                                </span>
                              </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    <FeatureFlag flag="HAS_CODEBOOKS">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <NavLink to={`/teams/${activeTeamId}/codebooks`}>
                            {({ isActive }) => (
                              <>
                                <Notebook />
                                <span className={isActive ? "underline" : ""}>
                                  Codebooks
                                </span>
                              </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </FeatureFlag>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            {activeTeamId && showTeamGroup && (
              <NavGroup label="Team" entries={teamEntries} />
            )}
          </>
        ) : (
          <>
            <NavGroup label="Organization" entries={organizationEntries} />
            <NavGroup label="Infrastructure" entries={infrastructureEntries} />
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-0 pb-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SideBarHelpDropdown />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarAccountMenu
                  user={user}
                  activeTeam={activeTeam}
                  availableTeams={availableTeams}
                  mode={mode}
                  roleLabel={roleLabel}
                  onSwitchTeam={switchActiveTeam}
                  onCreateTeam={onCreateTeamClicked}
                  onEnterAdmin={() => navigate(adminTeamsUrl())}
                  onLogout={onLogoutClicked}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}

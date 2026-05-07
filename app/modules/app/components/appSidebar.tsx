import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  ChartNoAxesGantt,
  ChevronsUpDown,
  CircleDollarSign,
  ClipboardList,
  Construction,
  Database,
  Flag as FlagIcon,
  Folder,
  LogOut,
  Network,
  Notebook,
  Users,
} from "lucide-react";
import { useContext, useEffect } from "react";
import { Link, NavLink, useFetcher } from "react-router";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";
import SideBarHelpDropdown from "~/modules/app/components/sidebarHelpDropdown";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import Role from "~/modules/authentication/components/role";
import FeatureFlag from "~/modules/featureFlags/components/flag";
import type { User } from "~/modules/users/users.types";

export default function AppSidebar() {
  const user = useContext(AuthenticationContext) as User;
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "loading") {
      window.location.pathname = "/";
    }
  }, [fetcher.state]);

  const onLogoutClicked = () => {
    fetcher.submit(
      {},
      {
        action: `/api/authentication`,
        method: "delete",
        encType: "application/json",
      },
    );
  };

  return (
    <Sidebar
      variant="inset"
      role="navigation"
      aria-label="Application navigation"
    >
      <SidebarHeader className="p-4">
        <Link to={"/"}>
          <img
            src={sandpiperLogo}
            alt="Sandpiper"
            className="mx-auto w-full max-w-28"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={"/projects"}>
                    {({ isActive }) => (
                      <>
                        <Folder />
                        <span className={isActive ? "underline" : ""}>
                          Projects
                        </span>
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={"/prompts"}>
                    {({ isActive }) => (
                      <>
                        <ClipboardList />
                        <span className={isActive ? "underline" : ""}>
                          Prompts
                        </span>
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <FeatureFlag flag="HAS_CODEBOOKS">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={"/codebooks"}>
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
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={"/teams"}>
                    {({ isActive }) => (
                      <>
                        <Network />
                        <span className={isActive ? "underline" : ""}>
                          Teams
                        </span>
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Role roles={["SUPER_ADMIN"]}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={"/featureFlags"}>
                      {({ isActive }) => (
                        <>
                          <FlagIcon />
                          <span className={isActive ? "underline" : ""}>
                            Feature flags
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Role>
              <Role roles={["SUPER_ADMIN"]}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={"/queues/tasks/active"}>
                      {({ isActive }) => (
                        <>
                          <ChartNoAxesGantt />
                          <span className={isActive ? "underline" : ""}>
                            Queues
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Role>
              <Role roles={["SUPER_ADMIN"]}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={"/migrations"}>
                      {({ isActive }) => (
                        <>
                          <Database />
                          <span className={isActive ? "underline" : ""}>
                            Migrations
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Role>
              <Role roles={["SUPER_ADMIN"]}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={"/admin/users"}>
                      {({ isActive }) => (
                        <>
                          <Users />
                          <span className={isActive ? "underline" : ""}>
                            Users
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Role>
              <Role roles={["SUPER_ADMIN"]}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={"/admin/billing"}>
                      {({ isActive }) => (
                        <>
                          <CircleDollarSign />
                          <span className={isActive ? "underline" : ""}>
                            Billing
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Role>
              <Role roles={["SUPER_ADMIN"]}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={"/admin/maintenance"}>
                      {({ isActive }) => (
                        <>
                          <Construction />
                          <span className={isActive ? "underline" : ""}>
                            Maintenance
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Role>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      aria-label={`User menu for ${user.name || user.username}`}
                    >
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          {user.name || user.username}
                        </span>
                        <span className="truncate text-xs">
                          {user.orcidId || user.githubId}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                    side={"right"}
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuItem onClick={onLogoutClicked}>
                      <LogOut />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}

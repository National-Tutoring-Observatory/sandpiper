import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, LogOut, Shield } from "lucide-react";
import type { NavMode } from "~/modules/app/helpers/getNavMode";
import type { Team } from "~/modules/teams/teams.types";
import type { User } from "~/modules/users/users.types";
import TeamTile from "./teamTile";

function UserInitials({ user, size = 28 }: { user: User; size?: number }) {
  const source = user.name || user.username || user.email || "?";
  const tokens = source.trim().split(/\s+/).filter(Boolean);
  const initials =
    tokens.length >= 2
      ? (tokens[0].charAt(0) + tokens[1].charAt(0)).toUpperCase()
      : source.slice(0, 2).toUpperCase();

  return (
    <span
      aria-hidden
      className="bg-sp-primary inline-flex flex-none items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: "var(--sp-primary)",
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials}
    </span>
  );
}

export default function SidebarAccountMenu({
  user,
  activeTeam,
  availableTeams,
  mode,
  roleLabel,
  onSwitchTeam,
  onEnterAdmin,
  onLogout,
}: {
  user: User;
  activeTeam: Team | null;
  availableTeams: Team[];
  mode: NavMode;
  roleLabel: string;
  onSwitchTeam: (id: string) => void;
  onEnterAdmin: () => void;
  onLogout: () => void;
}) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const displayName = user.name || user.username;

  const triggerTitle =
    mode === "admin" ? "Platform Admin" : (activeTeam?.name ?? "Select a team");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          aria-label={`Account menu for ${displayName}, current team ${triggerTitle}`}
          className={cn(
            "border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent h-auto gap-3 rounded-xl border p-2 text-left",
            "data-[state=open]:ring-primary/15 data-[state=open]:border-primary data-[state=open]:ring-3",
          )}
        >
          {mode === "admin" || !activeTeam ? (
            <UserInitials user={user} />
          ) : (
            <TeamTile team={activeTeam} size={28} />
          )}
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">
              {triggerTitle}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {displayName}&nbsp;·&nbsp;{roleLabel}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground ml-auto size-4 shrink-0" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-(--radix-dropdown-menu-trigger-width) rounded-xl p-1"
        side="top"
        align="start"
        sideOffset={6}
      >
        <DropdownMenuLabel className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Switch team
        </DropdownMenuLabel>
        {availableTeams.map((team) => {
          const isSelected = mode === "team" && team._id === activeTeam?._id;
          return (
            <DropdownMenuItem
              key={team._id}
              onSelect={() => onSwitchTeam(team._id)}
              className={cn("gap-2 rounded-md", isSelected && "bg-primary/10")}
              aria-label={`Switch to ${team.name}${team.isPersonal ? " (Personal)" : ""}`}
            >
              <TeamTile team={team} size={22} />
              <span className="flex-1 truncate text-sm">{team.name}</span>
              {team.isPersonal && (
                <span className="text-muted-foreground border-border rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide">
                  Personal
                </span>
              )}
              {isSelected && <Check className="text-primary size-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onEnterAdmin}
              className={cn(
                "text-destructive focus:text-destructive gap-2 rounded-md font-semibold",
                mode === "admin" && "bg-destructive/10",
              )}
            >
              <Shield className="size-4 shrink-0" />
              <span className="flex-1 truncate">Platform Admin</span>
              {mode === "admin" && <Check className="size-4 shrink-0" />}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="gap-2 rounded-md">
          <LogOut className="text-muted-foreground size-4 shrink-0" />
          <span className="flex-1">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

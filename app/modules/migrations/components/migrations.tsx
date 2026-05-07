import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { PlayIcon } from "lucide-react";
import React from "react";
import { useRevalidator } from "react-router";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import getDateString from "~/modules/app/helpers/getDateString";
import useHandleSockets from "~/modules/app/hooks/useHandleSockets";

type MigrationWithStatus = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed";
  lastRun?: {
    startedAt: Date;
    completedAt?: Date;
    triggeredBy: string;
    result?: {
      success: boolean;
      message: string;
      stats?: Record<string, number>;
    };
    error?: string;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  running: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export default function Migrations({
  migrations,
  breadcrumbs,
  onRunMigration,
}: {
  migrations: MigrationWithStatus[];
  breadcrumbs: Breadcrumb[];
  onRunMigration: (migrationId: string) => void;
}) {
  const revalidator = useRevalidator();

  useHandleSockets({
    event: "migration:update",
    matches: [{}],
    callback: () => {
      revalidator.revalidate();
    },
  });

  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs}></Breadcrumbs>
        </PageHeaderLeft>
      </PageHeader>
      <div className="rounded-lg border">
        <ItemGroup>
          {migrations.map((migration, index) => (
            <React.Fragment key={migration.id}>
              <Item>
                <ItemContent className="gap-2">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex-1">
                      <ItemTitle>{migration.name}</ItemTitle>
                      <ItemDescription>{migration.description}</ItemDescription>
                      {migration.lastRun && (
                        <div className="text-muted-foreground mt-1 space-y-1 text-xs">
                          <div>
                            Last run:{" "}
                            {getDateString(migration.lastRun.startedAt)}
                          </div>
                          {migration.lastRun.result && (
                            <div
                              className={
                                migration.lastRun.result.success
                                  ? "text-chart-3"
                                  : "text-destructive"
                              }
                            >
                              {migration.lastRun.result.message}
                              {migration.lastRun.result.stats && (
                                <span className="ml-2">
                                  (
                                  {Object.entries(
                                    migration.lastRun.result.stats,
                                  )
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(", ")}
                                  )
                                </span>
                              )}
                            </div>
                          )}
                          {migration.lastRun.error && (
                            <div className="text-destructive">
                              Error: {migration.lastRun.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[migration.status]}
                    >
                      {migration.status}
                    </Badge>
                  </div>
                </ItemContent>
                <ItemActions className="gap-2">
                  {migration.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => onRunMigration(migration.id)}
                    >
                      <PlayIcon className="mr-1 size-4" />
                      Run
                    </Button>
                  )}
                  {migration.status === "running" && (
                    <Button size="sm" disabled>
                      Running...
                    </Button>
                  )}
                </ItemActions>
              </Item>
              {index !== migrations.length - 1 && <ItemSeparator />}
            </React.Fragment>
          ))}
          {migrations.length === 0 && (
            <div className="text-muted-foreground p-8 text-center">
              No migrations found. Create a migration file in app/migrations/
            </div>
          )}
        </ItemGroup>
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import getDateString from "~/modules/app/helpers/getDateString";

interface MaintenanceProps {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt?: string;
  isSubmitting: boolean;
  breadcrumbs: Breadcrumb[];
  onMaintenanceModeChanged: (value: boolean) => void;
  onMaintenanceMessageChanged: (value: string) => void;
  onSaveClicked: () => void;
}

export default function Maintenance({
  maintenanceMode,
  maintenanceMessage,
  updatedAt,
  isSubmitting,
  breadcrumbs,
  onMaintenanceModeChanged,
  onMaintenanceMessageChanged,
  onSaveClicked,
}: MaintenanceProps) {
  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Maintenance Mode</CardTitle>
            <Badge
              variant="outline"
              className={
                maintenanceMode
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-chart-3/10 text-chart-3 border-chart-3/20"
              }
            >
              {maintenanceMode ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription>
            When enabled, only super admins can access the application. All
            other users will see a maintenance page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch
              id="maintenance-mode"
              checked={maintenanceMode}
              onCheckedChange={onMaintenanceModeChanged}
            />
            <Label htmlFor="maintenance-mode">
              {maintenanceMode ? "Enabled" : "Disabled"}
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-message">Message for users</Label>
            <Textarea
              id="maintenance-message"
              placeholder="e.g. We're upgrading the system and expect to be back by 3:00 PM UTC."
              value={maintenanceMessage}
              onChange={(e) => onMaintenanceMessageChanged(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Button onClick={onSaveClicked} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
            {updatedAt && (
              <span className="text-muted-foreground text-xs">
                Last updated: {getDateString(updatedAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

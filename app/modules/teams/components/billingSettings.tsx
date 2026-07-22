import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Settings, User } from "lucide-react";
import { useContext } from "react";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import BillingAuthorization from "~/modules/billing/authorization";
import type { User as UserType } from "~/modules/users/users.types";

interface BillingUserInfo {
  _id: string;
  username: string;
}

interface BillingSettingsProps {
  teamId: string;
  billingUserInfo: BillingUserInfo | null;
  isSubmitting: boolean;
  onSetBillingUserClicked: () => void;
}

export default function BillingSettings({
  teamId,
  billingUserInfo,
  isSubmitting,
  onSetBillingUserClicked,
}: BillingSettingsProps) {
  const user = useContext(AuthenticationContext) as UserType | null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading">
          <Settings className="mr-1 inline h-4 w-4" />
          Billing settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-muted-foreground text-caption">
            Billing user
          </Label>
          <div className="mt-1 flex items-center gap-2">
            <User className="text-muted-foreground h-4 w-4" />
            <span className="text-body">
              {billingUserInfo?.username ?? "Not assigned"}
            </span>
            {BillingAuthorization.canSetBillingUser(user, teamId) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSetBillingUserClicked}
                disabled={isSubmitting}
              >
                Change
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

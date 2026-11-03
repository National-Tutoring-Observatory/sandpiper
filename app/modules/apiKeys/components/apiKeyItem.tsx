import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import getDateString from "~/modules/app/helpers/getDateString";
import type { ApiKey, ApiKeyStatus } from "../apiKeys.types";
import getApiKeyStatus from "../helpers/getApiKeyStatus";

const STATUS_CLASSES: Record<ApiKeyStatus, string> = {
  Active:
    "border-sandpiper-success bg-sandpiper-success/10 text-sandpiper-success",
  Expired:
    "border-orange-600 bg-orange-600/10 text-orange-600 dark:border-orange-400 dark:text-orange-400",
  Revoked:
    "border-sandpiper-destructive bg-sandpiper-destructive/10 text-sandpiper-destructive",
};

interface Props {
  apiKey: ApiKey;
  onRenameClicked: (apiKey: ApiKey) => void;
  onRegenerateClicked: (apiKey: ApiKey) => void;
  onRevokeClicked: (apiKey: ApiKey) => void;
}

export default function ApiKeyItem({
  apiKey,
  onRenameClicked,
  onRegenerateClicked,
  onRevokeClicked,
}: Props) {
  const status = getApiKeyStatus(apiKey);

  return (
    <div className="text-body grid w-full grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,4fr)_auto_2rem] md:gap-4">
      <div className="truncate font-medium">{apiKey.name}</div>
      <div className="text-muted-foreground flex flex-col gap-y-2">
        <div className="font-mono">{apiKey.tokenPrefix}••••••••</div>
        <div className="text-muted-foreground flex flex-wrap gap-1">
          <Badge variant={"outline"}>
            Created at: {getDateString(apiKey.createdAt)}
          </Badge>
          <Badge variant={"outline"}>
            Last used at: {getDateString(apiKey.lastUsedAt, "Never used")}
          </Badge>
          {apiKey.usageCount > 0 && (
            <Badge variant={"outline"}>Usage count: {apiKey.usageCount}</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end">
        <Badge variant="outline" className={STATUS_CLASSES[status]}>
          {status}
        </Badge>
      </div>
      <div className="flex items-center justify-end">
        {status !== "Revoked" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="data-[state=open]:bg-muted text-muted-foreground size-8"
              >
                <EllipsisVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-fit">
              <DropdownMenuItem onClick={() => onRenameClicked(apiKey)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRegenerateClicked(apiKey)}>
                Regenerate key
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRevokeClicked(apiKey)}
              >
                Revoke
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

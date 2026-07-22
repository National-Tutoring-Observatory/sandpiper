import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collection } from "@/components/ui/collection";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import { CopyIcon, TrashIcon } from "lucide-react";
import getDateString from "~/modules/app/helpers/getDateString";
import type { User } from "~/modules/users/users.types";
import getTeamInviteLinkSignupsItemAttributes from "../helpers/getTeamInviteLinkSignupsItemAttributes";
import getTeamInviteStatus from "../helpers/getTeamInviteStatus";
import type { TeamInvite } from "../teamInvites.types";

interface Props {
  invite: TeamInvite;
  signups: User[];
  creatorLabel: string;
  onCopyClicked: () => void;
  onRevokeClicked: () => void;
}

export default function TeamInviteLink({
  invite,
  signups,
  creatorLabel,
  onCopyClicked,
  onRevokeClicked,
}: Props) {
  const status = getTeamInviteStatus(invite);
  const isActive = status === "active";

  return (
    <div>
      <PageHeader>
        <PageHeaderLeft>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-heading font-medium">{invite.name}</h2>
              <Badge variant={isActive ? "default" : "destructive"}>
                {status}
              </Badge>
            </div>
            <div className="text-muted-foreground text-caption">
              {invite.usedCount} of {invite.maxUses} used · Created by{" "}
              {creatorLabel} · {getDateString(invite.createdAt)}
            </div>
          </div>
        </PageHeaderLeft>
        {isActive && (
          <PageHeaderRight>
            <Button variant="outline" onClick={onCopyClicked}>
              <CopyIcon />
              Copy link
            </Button>
            <Button variant="destructive" onClick={onRevokeClicked}>
              <TrashIcon />
              Revoke
            </Button>
          </PageHeaderRight>
        )}
      </PageHeader>
      <h3 className="text-body mt-4 mb-2 font-medium">
        Signups ({signups.length})
      </h3>
      <Collection
        items={signups}
        itemsLayout="list"
        filters={[]}
        filtersValues={{}}
        currentPage={1}
        totalPages={1}
        emptyAttributes={{
          title: "No signups yet",
          description: "Nobody has joined via this invite link yet.",
        }}
        getItemAttributes={(item) =>
          getTeamInviteLinkSignupsItemAttributes(item, invite._id)
        }
        getItemActions={() => []}
        onActionClicked={() => {}}
        onPaginationChanged={() => {}}
        onSortValueChanged={() => {}}
      />
    </div>
  );
}

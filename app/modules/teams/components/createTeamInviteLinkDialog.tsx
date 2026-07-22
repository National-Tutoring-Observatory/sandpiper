import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyCheckIcon, CopyIcon, Loader2Icon } from "lucide-react";
import slugify from "slugify";
import INVITE_LINK_TTL_DAYS from "../helpers/inviteLink";

export const NAME_MAX = 100;
export const USES_MIN = 1;
export const USES_MAX = 500;

function slugifyName(name: string): string {
  return slugify(name, { lower: true, strict: true, trim: true }) || "invite";
}

interface Props {
  name: string;
  maxUses: number;
  inviteLink: string;
  hasCopied: boolean;
  isCreating: boolean;
  onNameChanged: (name: string) => void;
  onMaxUsesChanged: (uses: number) => void;
  onCreateClicked: () => void;
  onCopyClicked: () => void;
}

export default function CreateTeamInviteLinkDialog({
  name,
  maxUses,
  inviteLink,
  hasCopied,
  isCreating,
  onNameChanged,
  onMaxUsesChanged,
  onCreateClicked,
  onCopyClicked,
}: Props) {
  const trimmedName = name.trim();
  const nameError =
    name.length > 0 && trimmedName.length === 0 ? "Name is required" : null;
  const maxUsesError =
    !Number.isInteger(maxUses) || maxUses < USES_MIN || maxUses > USES_MAX
      ? `Must be between ${USES_MIN} and ${USES_MAX}`
      : null;
  const slugPreview = slugifyName(name);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "yourdomain.com";
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create a team invite link</DialogTitle>
        <DialogDescription>
          {!isCreating && !inviteLink && (
            <span>
              Create a shareable link for adding multiple users into this team.
              Anyone with the link can join the team up to the limit you set.
            </span>
          )}
        </DialogDescription>
      </DialogHeader>
      <div>
        {!isCreating && !inviteLink && (
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-caption mb-1">Name</Label>
              <p className="text-muted-foreground text-caption mb-2">
                This name is used to generate an easier to remember shareable
                URL. It can also be used to help find out which users were added
                during an event. A random code is appended to keep each link
                unique.
              </p>
              <Input
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => onNameChanged(e.target.value)}
                placeholder="Give your invite a name"
                autoComplete="off"
                autoFocus
              />
              <div className="text-muted-foreground text-caption mt-1 text-right">
                {name.length} / {NAME_MAX}
              </div>
              <Label className="text-caption mt-2 mb-1">
                Invite link preview
              </Label>
              <div className="bg-muted text-caption rounded px-2 py-1 font-mono break-all">
                {origin}/join/{slugPreview}-
                <span className="text-muted-foreground">xxxxxxxx</span>
              </div>
              {nameError && (
                <p className="text-destructive text-caption mt-1">
                  {nameError}
                </p>
              )}
            </div>
            <div>
              <Label className="text-caption mb-1">Maximum uses</Label>
              <Input
                type="number"
                min={USES_MIN}
                max={USES_MAX}
                value={maxUses}
                onChange={(e) => onMaxUsesChanged(Number(e.target.value))}
              />
              {maxUsesError && (
                <p className="text-destructive text-caption mt-1">
                  {maxUsesError}
                </p>
              )}
            </div>
          </div>
        )}
        {isCreating && !inviteLink && (
          <Skeleton className="h-5 w-full rounded-full" />
        )}
        {inviteLink && (
          <div className="relative">
            <div className="bg-muted text-body rounded-2xl p-2 pr-10 break-all">
              {inviteLink}
            </div>
            <Button
              variant="ghost"
              aria-label={hasCopied ? "Link copied" : "Copy link"}
              className="absolute top-0 right-1 z-10 cursor-pointer"
              disabled={hasCopied}
              onClick={onCopyClicked}
            >
              {hasCopied ? <CopyCheckIcon /> : <CopyIcon />}
            </Button>
            <div className="text-muted-foreground text-caption mt-4">
              {`This invite link will expire in ${INVITE_LINK_TTL_DAYS} days.`}
            </div>
          </div>
        )}
      </div>
      <DialogFooter className="justify-end">
        {!inviteLink && (
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isCreating}>
              Cancel
            </Button>
          </DialogClose>
        )}
        {!inviteLink && (
          <Button
            type="button"
            disabled={
              isCreating ||
              name.trim().length === 0 ||
              name.length > NAME_MAX ||
              maxUses < USES_MIN ||
              maxUses > USES_MAX
            }
            onClick={onCreateClicked}
          >
            {isCreating && <Loader2Icon className="animate-spin" />}
            Generate invite link
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

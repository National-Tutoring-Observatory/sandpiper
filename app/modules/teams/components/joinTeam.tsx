import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import ntoLogoHorizontal from "~/assets/nto-logo-horizontal.webp";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";

const STATUS_MESSAGES: Record<string, { title: string; description: string }> =
  {
    expired: {
      title: "This invite link has expired",
      description: "Ask your NTO contact for a new link.",
    },
    full: {
      title: "This invite link has reached its capacity",
      description: "Ask your NTO contact for a new link.",
    },
    revoked: {
      title: "This invite link is no longer active",
      description: "Ask your NTO contact for a new link.",
    },
    not_found: {
      title: "We couldn't find this invite",
      description: "Check the link, or ask your NTO contact for a new one.",
    },
  };

export default function JoinTeam({
  teamName,
  status,
  isSubmitting,
  onJoinTeamClicked,
  onGoHomeClicked,
}: {
  teamName: string | null;
  status: string;
  isSubmitting: boolean;
  onJoinTeamClicked: () => void;
  onGoHomeClicked: () => void;
}) {
  const problem = STATUS_MESSAGES[status] ?? null;
  const team = teamName ?? "this team";

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-3 pt-2">
          <img
            src={ntoLogoHorizontal}
            alt="National Tutoring Observatory"
            className="h-20 object-contain"
          />
          <img
            src={sandpiperLogo}
            alt="Sandpiper"
            className="h-20 object-contain"
          />
        </div>
        <CardHeader>
          <CardTitle className="mb-2">
            <h1 className="text-display font-bold">
              {status === "already_member"
                ? `You're already in ${team}`
                : `Join ${team}`}
            </h1>
          </CardTitle>
          <CardDescription>
            {status === "active" && (
              <p className="text-body mb-3">
                You've been invited to join {team} on the National Tutoring
                Observatory annotation tool.
              </p>
            )}
            {status === "already_member" && (
              <p className="text-body mb-3">
                Nothing to do here — your account already has access.
              </p>
            )}
            {problem && (
              <Alert variant="destructive" className="mt-2 text-left">
                <AlertCircle />
                <AlertTitle>{problem.title}</AlertTitle>
                <AlertDescription>{problem.description}</AlertDescription>
              </Alert>
            )}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-3">
          {status === "active" ? (
            <Button
              className="w-full cursor-pointer"
              onClick={onJoinTeamClicked}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Joining..." : `Join ${team}`}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={onGoHomeClicked}
            >
              Go to your dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

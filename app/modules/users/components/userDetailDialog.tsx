import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import getDateString from "~/modules/app/helpers/getDateString";
import type { User } from "../users.types";

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="text-body grid grid-cols-[140px_1fr] gap-2">
    <span className="text-muted-foreground">{label}</span>
    <span>{value ?? "—"}</span>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="grid gap-2">
    <h3 className="text-heading font-semibold">{title}</h3>
    {children}
  </div>
);

const UserDetailDialog = ({
  user,
  teamsByIds,
}: {
  user: User;
  teamsByIds: Record<string, string>;
}) => {
  return (
    <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
      <DialogHeader>
        <DialogTitle>User Details</DialogTitle>
        <DialogDescription>{user.username}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 overflow-y-auto py-2">
        <Section title="Basic Info">
          <Field label="Username" value={user.username} />
          <Field label="Name" value={user.name || "—"} />
          <Field label="Email" value={user.email} />
          <Field label="Role" value={user.role || "USER"} />
        </Section>

        {(user.orcidId || user.githubId) && (
          <Section title="Authentication">
            {user.orcidId && <Field label="ORCID ID" value={user.orcidId} />}
            {user.githubId ? (
              <Field label="GitHub ID" value={String(user.githubId)} />
            ) : null}
          </Section>
        )}

        <Section title="Registration">
          <Field label="Registered" value={user.isRegistered ? "Yes" : "No"} />
          <Field
            label="Invited at"
            value={getDateString(user.invitedAt, "—")}
          />
          <Field
            label="Registered at"
            value={getDateString(user.registeredAt, "—")}
          />
        </Section>

        <Section title="Questionnaire">
          <Field label="Institution" value={user.institution || "—"} />
          <Field label="Role" value={user.userRole || "—"} />
          <Field
            label="Use cases"
            value={
              user.useCases && user.useCases.length > 0
                ? user.useCases.join(", ")
                : "—"
            }
          />
          <Field
            label="Scholarship interest"
            value={
              user.scholarshipInterest === undefined
                ? "—"
                : user.scholarshipInterest
                  ? "Yes"
                  : "No"
            }
          />
          <Field
            label="Terms accepted"
            value={getDateString(user.termsAcceptedAt, "—")}
          />
          <Field
            label="Onboarding complete"
            value={
              user.onboardingComplete === undefined
                ? "—"
                : user.onboardingComplete
                  ? "Yes"
                  : "No"
            }
          />
        </Section>

        <Section title="Teams">
          {user.teams && user.teams.length > 0 ? (
            user.teams.map((t) => (
              <Field
                key={t.team}
                label={t.role}
                value={teamsByIds[t.team] ?? t.team}
              />
            ))
          ) : (
            <span className="text-muted-foreground text-body">No teams</span>
          )}
        </Section>
      </div>
    </DialogContent>
  );
};

export default UserDetailDialog;

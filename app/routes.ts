import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  layout("modules/dashboard/containers/dashboard.route.tsx", [
    index("modules/home/containers/home.route.tsx"),
    route("projects", "modules/projects/containers/projects.route.tsx"),
  ]),
  ...prefix("projects", [
    route(
      ":id",
      "modules/projects/containers/project.route.tsx",
      { id: "project" },
      [
        index("modules/runs/containers/runs.route.tsx", {
          id: "RUNS",
        }),
        route("files", "modules/sessions/containers/files.route.tsx", {
          id: "FILES",
        }),
        route("sessions", "modules/sessions/containers/sessions.route.tsx", {
          id: "SESSIONS",
        }),
        route("run-sets", "modules/runSets/containers/runSetsList.route.tsx", {
          id: "RUN_SETS",
        }),
      ],
    ),
    route(
      ":projectId/upload-files",
      "modules/files/containers/uploadFiles.route.tsx",
    ),
    route(
      ":projectId/create-run",
      "modules/runs/containers/createRun.route.tsx",
    ),
    route(
      ":projectId/create-run-set",
      "modules/runSets/containers/runSetCreate.route.tsx",
    ),
    route(":projectId/runs/:runId", "modules/runs/containers/run.route.tsx"),
    route(
      ":projectId/runs/:runId/add-to-run-set",
      "modules/runs/containers/runAddToRunSet.route.tsx",
    ),
    route(
      ":projectId/runs/:runId/sessions/:sessionId",
      "modules/runs/containers/runSessions.route.tsx",
    ),
    route(
      ":projectId/run-sets/:runSetId/runs/:runId",
      "modules/runs/containers/run.route.tsx",
      { id: "runSetRun" },
    ),
    route(
      ":projectId/run-sets/:runSetId/runs/:runId/sessions/:sessionId",
      "modules/runs/containers/runSessions.route.tsx",
      { id: "runSetRunSession" },
    ),
    route(
      ":projectId/run-sets/:runSetId",
      "modules/runSets/containers/runSetDetail.route.tsx",
      [
        index("modules/runSets/containers/runSetOverview.route.tsx"),
        route(
          "evaluations",
          "modules/runSets/containers/runSetEvaluations.route.tsx",
        ),
      ],
    ),
    route(
      ":projectId/run-sets/:runSetId/add-runs",
      "modules/runSets/containers/runSetAddRuns.route.tsx",
    ),
    route(
      ":projectId/run-sets/:runSetId/create-runs",
      "modules/runSets/containers/runSetCreateRuns.route.tsx",
    ),
    route(
      ":projectId/run-sets/:runSetId/merge",
      "modules/runSets/containers/runSetMerge.route.tsx",
    ),
    route(
      ":projectId/run-sets/:runSetId/create-evaluation",
      "modules/evaluations/containers/evaluationCreate.route.tsx",
    ),
    route(
      ":projectId/run-sets/:runSetId/evaluations/:evaluationId",
      "modules/evaluations/containers/evaluation.route.tsx",
    ),
  ]),
  ...prefix("prompts", [
    index("modules/prompts/containers/prompts.route.tsx"),
    route(":id", "modules/prompts/containers/prompt.route.tsx", [
      route(":version", "modules/prompts/containers/promptEditor.route.tsx", {
        id: "VERSION",
      }),
    ]),
  ]),
  ...prefix("codebooks", [
    index("modules/codebooks/containers/codebooks.route.tsx"),
    route(":id", "modules/codebooks/containers/codebook.route.tsx", [
      route(
        ":version",
        "modules/codebooks/containers/codebookEditor.route.tsx",
        {
          id: "CODEBOOK_VERSION",
        },
      ),
    ]),
  ]),
  ...prefix("teams", [
    index("modules/teams/containers/teams.route.tsx"),
    route(":id", "modules/teams/containers/team.route.tsx", { id: "team" }, [
      route("projects", "modules/teams/containers/teamProjects.route.tsx", {
        id: "teamProjects",
      }),
      route("prompts", "modules/teams/containers/teamPrompts.route.tsx", {
        id: "teamPrompts",
      }),
      route("users", "modules/teams/containers/teamUsers.route.tsx", {
        id: "teamUsers",
      }),
      route(
        "invite-links",
        "modules/teams/containers/teamInviteLinks.route.tsx",
        {
          id: "teamInviteLinks",
        },
      ),
      route(
        "invite-links/:inviteLinkId",
        "modules/teams/containers/teamInviteLink.route.tsx",
        { id: "teamInviteLink" },
      ),
      route("billing", "modules/teams/containers/teamBilling.route.tsx", {
        id: "teamBilling",
      }),
    ]),
  ]),
  ...prefix("invite", [
    route(":id", "modules/teams/containers/invite.route.tsx", { id: "invite" }),
  ]),
  ...prefix("join", [
    route(":slug", "modules/teams/containers/join.route.tsx", { id: "join" }),
  ]),
  route("signup", "modules/authentication/containers/signup.route.tsx"),
  route("onboarding", "modules/authentication/containers/onboarding.route.tsx"),
  ...prefix("featureFlags", [
    route("/", "modules/featureFlags/containers/featureFlags.route.tsx", [
      route(":id", "modules/featureFlags/containers/featureFlag.route.tsx"),
    ]),
  ]),
  route("migrations", "modules/migrations/containers/migrations.route.tsx"),
  route("api", "modules/app/containers/api.route.tsx"),
  route(
    "api/annotations/:runId/:sessionId/:utteranceId/:annotationIndex",
    "modules/annotations/containers/annotations.route.tsx",
  ),
  route(
    "api/humanAnnotations/:runSetId",
    "modules/humanAnnotations/containers/humanAnnotations.route.tsx",
  ),
  route(
    "api/downloadAnnotationTemplate/:runSetId",
    "modules/humanAnnotations/containers/downloadAnnotationTemplate.route.tsx",
  ),
  route(
    "api/authentication",
    "modules/authentication/containers/authentication.route.tsx",
  ),
  route(
    "api/availableFeatureFlagUsers",
    "modules/users/containers/availableFeatureFlagUsers.route.tsx",
  ),
  route(
    "api/availableTeamUsers",
    "modules/users/containers/availableTeamUsers.route.tsx",
  ),
  route("api/teamMembers", "modules/users/containers/teamMembers.route.tsx"),
  route(
    "api/availableTeams",
    "modules/teams/containers/availableTeams.route.tsx",
    { id: "availableTeams" },
  ),
  route(
    "api/downloads/:projectId/:runId",
    "modules/runs/containers/downloadRun.route.tsx",
  ),
  route(
    "api/downloads/:projectId/run-sets/:runSetId",
    "modules/runSets/containers/downloadRunSet.route.tsx",
  ),
  route(
    "api/estimateCost",
    "modules/billing/containers/estimateCost.route.tsx",
  ),
  route(
    "api/webhooks/stripe",
    "modules/billing/containers/stripeWebhook.route.tsx",
  ),
  route(
    "api/exportActiveUsers",
    "modules/billing/containers/exportActiveUsers.route.tsx",
  ),
  route(
    "api/exportSpendOverview",
    "modules/billing/containers/exportSpendOverview.route.tsx",
  ),
  route(
    "api/downloadMtmDataset",
    "modules/datasets/containers/downloadMtmDataset.route.tsx",
  ),
  route("api/events", "modules/events/containers/events.route.tsx"),
  route("api/projects", "modules/projects/containers/projects.route.tsx", {
    id: "projects",
  }),
  route(
    "api/promptVersionAlignment",
    "modules/prompts/containers/promptVersionAlignment.route.tsx",
  ),
  route(
    "api/promptVersionsList",
    "modules/prompts/containers/promptVersionsList.route.tsx",
  ),
  route("api/prompts", "modules/prompts/containers/prompts.route.tsx", {
    id: "prompts",
  }),
  route("api/promptsList", "modules/prompts/containers/promptsList.route.tsx"),
  route("api/runsList", "modules/runs/containers/runsList.route.tsx"),
  route(
    "api/sessionsList",
    "modules/sessions/containers/sessionsList.route.tsx",
  ),
  route("api/storage", "modules/storage/containers/storage.route.tsx"),
  route(
    "api/supportArticles",
    "modules/support/containers/supportArticles.route.tsx",
  ),
  route("api/teams", "modules/teams/containers/teams.route.tsx", {
    id: "teams",
  }),
  route(
    "api/teams/generateInviteToTeam",
    "modules/teams/containers/generateInviteToTeam.route.tsx",
  ),
  route(
    "auth/callback/:provider",
    "modules/authentication/containers/authCallback.route.tsx",
  ),
  ...prefix("queues", [
    layout("modules/queues/containers/queuesLayout.route.tsx", [
      route(":type", "modules/queues/containers/queue.route.tsx", [
        route(":state", "modules/queues/containers/queueJobs.route.tsx"),
      ]),
    ]),
  ]),
  ...prefix("admin", [
    route("users", "modules/users/containers/adminUsers.route.tsx"),
    ...prefix("billing", [
      layout("modules/billing/containers/billingLayout.route.tsx", [
        index("modules/billing/containers/spendOverview.route.tsx"),
        route(
          "active-users",
          "modules/billing/containers/activeUsers.route.tsx",
        ),
      ]),
    ]),
    route(
      "maintenance",
      "modules/systemSettings/containers/maintenance.route.tsx",
    ),
  ]),
] satisfies RouteConfig;

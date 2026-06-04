# Sandpiper - Agent Instructions

## Overview

Sandpiper - the National Tutoring Observatory's (NTO) React-based web application for analyzing one-on-one tutoring data. The app enables researchers to normalize, de-identify, and automatically annotate tutoring transcripts using large language models (LLMs).

**Stack**: TypeScript, React 19, React Router v7 (SSR), Vite 6, Tailwind CSS 4, shadcn/ui, Mongoose, BullMQ, Yarn

## Code Change Philosophy

- Prefer the smallest, simplest change that solves the problem. Avoid threading new parameters broadly, adding new abstractions, or refactoring adjacent code unless asked.
- Before making edits to fix a 'bug', verify the bug exists by reading the code path end-to-end. The page/state may already be correct.
- When a task seems to require many file changes, pause and confirm scope before proceeding.

## Essential Commands

```bash
# Dev
yarn app:dev              # App on :5173
yarn local:redis          # Redis (required for workers + Socket.IO)
yarn workers:dev          # BullMQ workers (separate terminal)

# Validate
yarn typecheck            # Required before commit
yarn lint
yarn format
yarn test                 # Source of truth — see guardrails below
yarn app:build            # Required before commit

# Migrations
yarn migration:generate <Name>
# - Only implement up() — no rollbacks
# - Verbose console.log for debugging
# - Return { success: failed === 0, message: string, stats: { migrated, failed } }
```

**Testing guardrails:**

- Treat `yarn test` as the source of truth for test failures. The repo handles worker-split DB setup; don't invent a different parallel repro model.
- Don't run multiple ad-hoc `vitest` commands in parallel against the same local test DB — causes false transaction/data-consistency failures.
- In shared test DB helpers, clear collection contents instead of `dropDatabase()` (latter races across workers).
- When the source of truth moves (e.g., current balance now in `TeamBillingBalance`), update fixtures to seed the new authority, not preserve stale expectations.

### Git Commits

- Branch name starts with a number (e.g., `1404-...`)? Include `Fixes #NUMBER` in the commit message.
- Pre-commit (husky + lint-staged): prettier + eslint on staged files. Skip with `HUSKY=0 git commit ...`.

### Pre-commit Checklist

1. `yarn typecheck` passes
2. `yarn test` passes
3. `yarn app:build` succeeds

## Architecture

### Monorepo

```
sandpiper/
├── app/                    # Main app
│   ├── modules/           # Feature modules
│   ├── uikit/             # shadcn/ui components
│   ├── lib/               # Schemas, utilities
│   ├── storageAdapters/   # Local, S3
│   ├── documentsAdapters/ # Local, DocumentDB
│   ├── migrations/        # Data migrations
│   └── adapters.js        # Auto-generates storage imports
├── workers/                # BullMQ workers
├── localMode/              # Local dev utilities
├── test/                   # Test helpers
└── server.ts
```

### Module Structure

```
module/
├── containers/         # Route handlers (loaders + actions)
├── components/         # React components (dumb, props-only)
├── services/          # Business logic (*.server.ts)
├── helpers/           # Pure utility functions
├── authorization.ts   # Permission checks
├── module.ts          # Service facade
├── module.types.ts
└── __tests__/
```

**Core modules**: `projects`, `runs`, `sessions`, `runSets`, `prompts`, `annotations`, `teams`, `users`, `authentication`, `authorization`, `storage`, `queues`, `sockets`.

### Data Schemas & Validation

JSON Schemas live in `app/lib/schemas/json/`; validation utils in `app/lib/validation/`; docs in `documentation/schemas/`. Validate function outputs **in tests** with `validateTranscriptData()` — no runtime validation overhead. See `documentation/schemas/transcript.md` for the transcript format.

### Service Pattern

Services are facades over CRUD + business operations. Routes always call the service, never the model directly.

```typescript
export class ProjectService {
  static async find(options?: FindOptions): Promise<Project[]>;
  static async findById(id: string): Promise<Project | null>;
  static async create(data: CreateProjectInput): Promise<Project>;
  static async updateById(
    id: string,
    updates: Partial<Project>,
  ): Promise<Project | null>;
  static async deleteById(id: string): Promise<boolean>;
  static async paginate(options): Promise<{ data; count; totalPages }>;
}
```

`FindOptions`: `match`, `sort`, `skip`, `limit`, `populate`.

- **Inline in `module.ts`**: basic CRUD (~5–10 lines each).
- **Split to `services/*.server.ts`**: multi-step logic, validation chains, anything ~20+ lines, anything needing isolated tests.
- **Use `helpers/*.ts`**: pure functions, no DB calls, shared between services.

### React Router Pattern

Loaders fetch; actions mutate. Intent-based routing in actions only — **never in loaders**. Loaders return a single consistent shape; if a user interaction needs read-only data, fetch via `fetcher.submit` against the action, not query params on the loader.

```typescript
export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getUser(request);
  if (!user) return redirect("/");

  const project = await ProjectService.findById(params.projectId);
  if (!ProjectAuthorization.canView(user, project))
    throw new Error("Access denied");

  return { project };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getUser(request);
  if (!user) throw new Error("Authentication required");

  const payload = await request.json();
  if (payload.intent === "UPDATE_PROJECT") {
    const project = await ProjectService.updateById(
      params.projectId,
      payload.data,
    );
    return data({ success: true, project });
  }
  return data({ errors: { general: "Invalid intent" } }, { status: 400 });
}
```

### Container/Component Pattern

Route files (`containers/*.route.tsx`) are containers — they own all wiring (loader/action, `useFetcher`, `useNavigate`, `useLoaderData`, `useSearchQueryParams`, effects, callbacks). Components in `components/*.tsx` are dumb — props only, with local UI state allowed.

Components must NOT use router hooks or `useSearchQueryParams`. The route passes `searchValue`, `currentPage`, `isSyncing`, and setters as props.

### `useFetcher` vs `useSubmit`

Use `useFetcher` when an action needs client-side feedback (toasts, loading) before navigating. `useSubmit` triggers full navigation and the toast gets lost.

```typescript
const fetcher = useFetcher();
const navigate = useNavigate();

useEffect(() => {
  if (fetcher.state !== "idle") return;
  if (!fetcher.data || !("success" in fetcher.data)) return;
  toast.success("Done!");
  navigate(fetcher.data.data.redirectTo);
}, [fetcher.state, fetcher.data, navigate]);

const submitAction = () => {
  fetcher.submit(JSON.stringify({ intent: "DO_THING", payload: {} }), {
    method: "POST",
    encType: "application/json",
  });
};
```

Have the action return `data({ success: true, intent: "...", data: { redirectTo: "..." } })` instead of `redirect()`.

### Search, Pagination & Querying

**Required imports for any list with search/pagination:**

```typescript
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import { Collection } from "@/components/ui/collection";
```

**Checklist:**

- [ ] Loader: `getQueryParamsFromRequest()` → `buildQueryFromParams()` → `Service.paginate()`
- [ ] `Service.paginate()` must exist and return `{ data, count, totalPages }`
- [ ] Route file (container) calls `useSearchQueryParams()` and passes values/setters as props
- [ ] Component renders `<Collection hasSearch hasPagination />`
- [ ] Multiple lists on one page → namespace each with `{ paramPrefix: "name" }` on both loader and hook (must match)
- [ ] Default sort uses `-` prefix for descending (e.g., `"-createdAt"`)
- [ ] Helpers (`getItemAttributes`, `getItemActions`) live in `helpers/`, not inline

**`buildQueryFromParams` shape:**

```typescript
const query = buildQueryFromParams({
  match: { team: user.teamId }, // base filter
  queryParams,
  searchableFields: ["name", "description"], // fields full-text-searched
  sortableFields: ["name", "createdAt"], // whitelist of sort keys
  filterableFields: ["status"], // whitelist of filters
});
```

**Don't**: build custom search/pagination UI, write manual regex queries, skip `buildQueryFromParams`.

Canonical example: any of the existing list routes (e.g., projects, runs, teams). Mirror their shape.

### Authorization Pattern

Every module has `authorization.ts` with `canCreate(user, ...)`, `canView(user, resource)`, `canUpdate(...)`, `canDelete(...)`.

- **Loaders**: `redirect()` on auth failures.
- **Actions**: `redirect()` on auth/authz; `data({ errors }, { status })` for business errors.

**CRITICAL: Actions are not protected by the loader.** Loaders and actions are independent HTTP endpoints — a user can POST directly. Every action must independently verify auth (and authorization for team/user-scoped resources):

```typescript
export async function action({ request, params }: Route.ActionArgs) {
  const user = (await getSessionUser({ request })) as User;
  if (!user) return redirect("/");

  const project = await ProjectService.findById(params.projectId);
  if (!project || !ProjectAuthorization.canView(user, project))
    return redirect("/");
  // ...
}
```

### Resource Scoping (IDOR Prevention)

**CRITICAL: Always scope nested resource fetches to their parent URL param.** When a URL has `:projectId` and `:runSetId`, fetching the child by ID alone lets any authenticated user substitute child IDs to read/modify resources from other projects.

**Rule**: never `findById(params.childId)` when the URL has `params.parentId`. Always `findOne({ _id: params.childId, parentField: params.parentId })`.

```typescript
// ❌ runSet could belong to any project
const runSet = await RunSetService.findById(params.runSetId);

// ✅ scoped — cross-project access returns null
const runSet = await RunSetService.findOne({
  _id: params.runSetId,
  project: params.projectId,
});
```

Applies in **both loaders and actions**, and to **any resource fetched for display** (breadcrumbs, labels, related data) — leaking a name still leaks information.

**Validate enum inputs from client payloads.** Reject invalid roles/statuses/types explicitly — don't silently default to a safe value (masks bugs, gives unexpected permissions).

```typescript
import { isTeamRole } from "../teams.types";
if (!isTeamRole(role)) {
  return data({ errors: { role: "Invalid role" } }, { status: 400 });
}
teams: [{ team: teamId, role }];
```

### Human Runs (`isHuman: true`)

Human runs have `isHuman: true` and `annotator: { name }` instead of prompt/model.

**Filtering:**

- **Exclude by default** for general display (project runs page, dashboard counts, prompt usage). Add `isHuman: { $ne: true }` to the match.
- **Include** when fetching runs of a run set (`{ _id: { $in: runSet.runs } }`), in evaluations, and in the eligible-runs picker.

**Display**: no prompt/model info for human runs; show `run.annotator?.name` instead. Annotation type still applies.

### Background Jobs (BullMQ + Redis)

Use `createTaskJob()` to enqueue work. Common job types: `ANNOTATE_RUN:START/PROCESS/FINISH`, `CONVERT_FILES_TO_SESSIONS:START/PROCESS/FINISH`, `DELETE_PROJECT:DATA/FINISH`, `RUN_MIGRATION`. Handlers live in `workers/runners/tasks.ts` or `workers/runners/general.ts`.

```typescript
import { createTaskJob } from "~/modules/queues/helpers/createTaskJob";

await createTaskJob({
  name: "ANNOTATE_RUN:START",
  data: { runId, userId },
  children: sessions.map((s) => ({
    name: "ANNOTATE_RUN:PROCESS",
    data: { runId, sessionId: s._id },
  })),
});
```

### Real-Time Updates (Socket.IO)

```typescript
useHandleSockets({
  event: "ANNOTATE_RUN",
  matches: [{ task: "ANNOTATE_RUN:START", status: "FINISHED" }],
  callback: () => revalidator.revalidate(),
});
```

### Storage Adapters

Pluggable via `STORAGE_ADAPTER` env var (local, S3). Always use `getStorageAdapter()`; never reach for an adapter directly.

```typescript
const adapter = getStorageAdapter();
await adapter.upload({ file, uploadPath });
await adapter.download(path);
await adapter.remove(path);
const url = await adapter.request(path); // Presigned URL
```

`app/adapters.js` auto-generates `app/modules/storage/storage.ts` before `yarn app:build` / `yarn app:dev`. **Do not edit `storage.ts` manually.** To add an adapter: create dir under `app/storageAdapters/`, implement the four methods, call `registerStorageAdapter()`, run build.

### Database (MongoDB + Mongoose)

Connection in `app/lib/database.ts`. Schemas in `app/lib/schemas/`: `project`, `run`, `session`, `runSet`, `prompt`, `user`, `team`, `file`, `audit`. Always go through service classes.

**DocumentDB Compatibility**: production uses AWS DocumentDB, which does NOT support these aggregation stages — `$facet`, `$bucket`, `$bucketAuto`, `$sortByCount`, `$unionWith`, `$merge`, `$graphLookup`, `$setWindowFields`. Replace `$facet` with separate `Promise.all()` queries.

```typescript
// ✅ Split into separate queries instead of $facet
const [result1, result2] = await Promise.all([
  Model.aggregate([{ $match: {...} }, { $group: {...} }]),
  Model.aggregate([{ $match: {...} }, { $sort: {...} }, { $limit: 1 }]),
]);
```

## Path Aliases

```typescript
import { Button } from "@/components/ui/button"; // @/* → ./app/uikit/*
import { foo } from "~/modules/projects/foo"; // ~/* → ./app/*
```

### `PROJECT_ROOT` for file paths

Never use `path.resolve(relativePath)` or `process.cwd()` — app and workers run from different cwds, Docker is different again. Use `PROJECT_ROOT` from `~/helpers/projectRoot.ts`:

```typescript
import { PROJECT_ROOT } from "~/helpers/projectRoot";
const csvPath = path.join(PROJECT_ROOT, "datasets/mtm/v1.csv");
```

Resolves via `PROJECT_ROOT` env var, then walks up from cwd to find `yarn.lock`.

## Code Conventions

### Naming

- **Files**: camelCase (`userProfile.tsx`, `dataLoader.ts`)
- **Directories**: lowercase
- **Components**: file camelCase, export PascalCase (`jobDialog.tsx` → `export const JobDialog`)

### Date Formatting

**Always** use `getDateString` from `~/modules/app/helpers/getDateString`. Never `dayjs().format()` or `new Date().toLocaleDateString()` directly.

```typescript
import getDateString from "~/modules/app/helpers/getDateString";

getDateString(item.createdAt); // "Mon, Jan 27, 2025 - 3:45 PM"; fallback "--"
getDateString(item.processedOn, "Not processed yet"); // custom fallback
```

Accepts `string | Date | undefined | null`. Format: `"ddd, MMM D, YYYY - h:mm A"`.

### TypeScript Props

- Don't mark props as optional (`?`) when they're always passed — it obscures the contract.
- Don't use non-null assertions (`!`) to work around optional types — fix the type.

### Comments

Only when the WHY is non-obvious (a hidden constraint, a workaround, a bug ref). Don't comment what the code already says.

### Error Handling in Routes

Loaders: `redirect()` on auth failures. Actions: throw / return `data({ errors: {...} }, { status: 400 })`.

Client side:

```typescript
useEffect(() => {
  if (fetcher.data?.errors) {
    toast.error(fetcher.data.errors.general || "An error occurred");
  }
}, [fetcher.data]);
```

### Dialog and Action Naming

Two-part naming: `openXxxDialog` opens the dialog and wires it to `submitXxx`; `submitXxx` is the actual server submitter.

```typescript
const openEditProjectDialog = (project: Project) => {
  addDialog(<EditProjectDialog project={project} onEditProjectClicked={submitEditProject} />);
};

const submitEditProject = (project: Project) => {
  submit(JSON.stringify({ intent: "UPDATE_PROJECT", project }), {
    method: "PUT",
    encType: "application/json",
  });
};
```

Avoid same-looking names like `onEditProjectButtonClicked` + `onEditProjectClicked` — easy to wire wrong.

## UI Components

- **Radix UI** primitives, **shadcn/ui** in `app/uikit/components/ui/`, **Tailwind 4**, **Lucide React** icons, **next-themes**, **Sonner** for toasts, **Motion** for animations.
- Use `cn()` from `@/lib/utils` for className merging.
- Use theme-aware CSS vars (`bg-background`, `text-foreground`, `border-border`).

### Feature Flag Component

`<Flag flag="...">` requires **exactly one child**. Wrap multiple children in a fragment:

```typescript
<Flag flag="FEATURE_NAME">
  <>
    <DropdownMenuItem>Action 1</DropdownMenuItem>
    <DropdownMenuItem>Action 2</DropdownMenuItem>
  </>
</Flag>
```

## Testing

Standard vitest patterns; see the testing guardrails above. Test files in `__tests__/` next to the module. Use authorization tests as the canonical shape.

## Security

- Always check auth before features that require login; verify with the module's `Authorization` object.
- Tutoring transcripts are confidential — handle with care; never log them.
- Validate all client inputs at the action boundary; sanitize outputs.
- Never commit secrets — use `.env`.

## Adding Things

- **New module**: create `app/modules/newFeature/` with `module.ts`, `module.types.ts`, `authorization.ts`, `containers/`, `components/`, `__tests__/`. Register route in `app/routes.ts`.
- **Background job**: add handler in `workers/runners/tasks.ts` or `general.ts`. Enqueue via `createTaskJob()`. Emit a Socket.IO event and listen client-side with `useHandleSockets`.
- **Storage adapter**: create `app/storageAdapters/newAdapter/`, implement `download/upload/remove/request`, call `registerStorageAdapter()`, run `yarn app:build`.

**Bash context note**: commands run in the workspace root by default — don't pass `cwd`.

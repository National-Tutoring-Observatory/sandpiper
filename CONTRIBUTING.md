# Contributing to Sandpiper

Welcome! This guide explains how to set up and run the Sandpiper project for local development and testing. Follow these steps to get started and contribute effectively.

---

## 1. Running Locally (Development Mode)

You can run the app entirely on your machine using in-memory/local adapters. This is the fastest way to develop and test changes.

### Prerequisites

- **Node.js 20.x**
- **Yarn 1.22+** (preferred) or npm
- **Redis** (optional, see below)

### Environment Setup

1. Copy `.env.example` to `.env` and edit as needed.
2. For local development, set these in your `.env`:
   ```env
   STORAGE_ADAPTER=LOCAL
   DOCUMENTS_ADAPTER=LOCAL
   REDIS_LOCAL=true # (or set REDIS_URL if using external Redis)
   ```

### Start All Processes Manually

Open separate terminals and run:

- `yarn local:redis` # Starts local Redis (in-memory)
- `yarn app:dev` # Starts the Vite dev server
- `yarn workers:dev` # Starts background workers

Or, use the helper script:

- `node bin/start-dev.js` # Starts all the above in one terminal

---

## 2. Running with DocumentDB and Services (Docker Compose)

To use MongoDB/DocumentDB and run all services (Redis, Mongo, etc.) via Docker:

1. Remove or comment out `REDIS_LOCAL` in your `.env`.
2. Set `REDIS_URL` to point to the Docker Redis instance (see `.env.example`).
3. Start all services:
   ```sh
   docker-compose -f docker-compose.yml up
   ```

This will launch Redis, MongoDB, and any other required services. You can then run the app locally or in containers.

### Example .env for Docker Compose (DocumentDB & Redis)

Add these lines to your `.env` if you want to use the DocumentDB adapter with the local MongoDB and Redis services started by Docker Compose:

```env
# Use DocumentDB adapter with local MongoDB
DOCUMENTS_ADAPTER='DOCUMENT_DB'
DOCUMENT_DB_CONNECTION_STRING='localhost:27017/sandpiper?authSource=admin'
DOCUMENT_DB_USERNAME='sandpiper'
DOCUMENT_DB_PASSWORD='sandpiper123'
DOCUMENT_DB_LOCAL='true'

AWS_S3_ENDPOINT='http://localhost:4566' # For LocalStack testing
AWS_S3_REGION='us-east-1'
AWS_S3_BUCKET='nto-sandpiper-local'
AWS_S3_FORCE_PATH_STYLE='true' # Required for LocalStack
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=us-east-1

# Redis for background jobs
REDIS_URL='redis://localhost:6379'
```

### Example .env for Google Cloud (GCS + Vertex AI)

If you're testing against real Google Cloud resources instead of local/LocalStack adapters, use these instead of the AWS/S3 block above:

```env
STORAGE_ADAPTER='GCS'
GCS_BUCKET='<your-bucket-name>'

LLM_PROVIDER='VERTEX_AI'
VERTEX_AI_PROJECT='<your-gcp-project-id>'
VERTEX_AI_LOCATION='us-central1'

# Authenticates both the GCS and Vertex AI clients via Application Default
# Credentials — no explicit key/secret pair like the AWS adapter uses.
GOOGLE_APPLICATION_CREDENTIALS='/path/to/service-account-key.json'
```

Minimal manual setup (bucket + service account + IAM), assuming `gcloud` is authenticated against your project:

```bash
gcloud services enable storage.googleapis.com aiplatform.googleapis.com --project=<project-id>

gcloud storage buckets create gs://<bucket-name> \
  --project=<project-id> --location=<region> --uniform-bucket-level-access

gcloud iam service-accounts create sandpiper-local-test \
  --project=<project-id> --display-name="Sandpiper local testing"

gcloud storage buckets add-iam-policy-binding gs://<bucket-name> \
  --member="serviceAccount:sandpiper-local-test@<project-id>.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding <project-id> \
  --member="serviceAccount:sandpiper-local-test@<project-id>.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user" --condition=None

gcloud iam service-accounts keys create ~/sandpiper-gcp-key.json \
  --iam-account=sandpiper-local-test@<project-id>.iam.gserviceaccount.com
```

The two `add-iam-policy-binding` commands need an IAM-admin-level role on the project (e.g. `roles/resourcemanager.projectIamAdmin`) — the default `Editor` role can create resources but can't modify IAM policy, and will fail with a permission error on just those two commands.

### Known gaps and fixes for local + Vertex AI

Issues hit (and fixed, where noted) while first running this GCP setup locally:

**Local/GCS-only — not yet fixed:**

- The MTM sample dataset (`storage/datasets/mtm/latest.json`) has never been released to GCS. `scripts/datasets/releaseMtmDataset.ts`/`prepareMtmDataset.ts` are still AWS-S3-only (`staging.nto`/`prod.nto` buckets), so the "Insert MTM dataset" action fails with a GCS download error against an empty bucket even when `GCS_BUCKET`/credentials are correctly configured. Migrating those scripts to GCS was scoped out — needs its own decision on whether GCS gets a staging/prod split like S3 has.
- Signed URLs will likely fail on Cloud Run. The adapter's `request()` calls `getSignedUrl`, which needs either a private key (works locally, where `GOOGLE_APPLICATION_CREDENTIALS` points at a downloaded key file) or the IAM SignBlob API. Cloud Run's runtime credentials carry no private key, so the service account needs `roles/iam.serviceAccountTokenCreator` on itself for signing to work there. Untested — download links work locally and would break in the deployed environment.
- An upload that fails after the action returns is invisible to the user. `processUploadedFiles` kicks off `uploadFiles(...).then(createSessionsFromFiles)` without awaiting it and returns `{ success: true }` immediately, so the UI shows a success toast; the `.catch()` only writes `console.error("File upload/conversion failed:", …)` to the app server's stdout and resets the project flags. The GCS ACL bug below presented as "0 sessions, no error message" purely because of this. A failure there should mark the project errored and surface a message.

**Vertex AI — not yet fixed:**

- Claude models are unreachable on the Vertex path, so the GCP deploy is Gemini-only. `providers/vertexAI.ts` talks to Vertex through `@google/genai`'s `generateContent`, which resolves every code under `publishers/google/models/<code>`. Claude on Vertex lives under `publishers/anthropic` and speaks the Anthropic Messages API (`rawPredict`/`streamRawPredict`), not Gemini's — so it needs its own registered provider built on `@anthropic-ai/vertex-sdk` (`new AnthropicVertex({ projectId, region })`, same ADC credentials the GCS adapter already uses), plus a new config block with Vertex-partner pricing and Vertex-style codes (bare `claude-opus-4-8`, dated snapshots with an `@` separator — **not** the `anthropic.`-prefixed gateway codes). The models also have to be enabled for the project in Vertex AI Model Garden per region; the 404 that surfaced this ("_or your project does not have access to it_") can mean either wrong code or missing access. Scoped out for now — the live cost is that prompt-alignment checks and codebook prompt generation run on `gemini-2.5-flash-lite` on the GCP deploy, and researchers there can't compare Claude against Gemini in run sets at all.

**Vertex AI — fixed in code:**

- `LLM.checkBalance()` ([app/modules/llm/llm.ts:138-141](app/modules/llm/llm.ts#L138-L141)) used to block every LLM call — including file-upload attribute mapping — behind the team's Sandpiper credit balance (`TeamBillingBalance`), regardless of provider. Since Vertex AI spend bills directly to the GCP project (see the cost-attribution labels in `providers/vertexAI.ts`) rather than through Sandpiper's Stripe-funded ledger, `checkBalance()` now skips the check on that provider — via `isLedgerBillingEnabled()`, which is the single policy point for this (see "Billing gating" below). Cost recording (`writeCostRecord`) is unaffected — usage still gets logged for analytics.
- `getDefaultModelCode()` ([app/modules/llm/modelRegistry.ts:60-79](app/modules/llm/modelRegistry.ts#L60-L79)) always returned the AI-gateway default (`nto.google.gemini-3-flash-preview`), an AI-gateway/LiteLLM-style code that Vertex's raw `generateContent` call doesn't recognize. It now returns a model from the `"Vertex AI"` block in `app/config/ai_gateway.json` (e.g. `gemini-2.5-flash-lite`) when `LLM_PROVIDER=VERTEX_AI`.

**Model codes must match the active provider — three related fixes:**

Every model code in `app/config/ai_gateway.json` belongs to exactly one provider. The `"Vertex AI"` block holds bare codes (`gemini-2.5-flash`) that only the direct Vertex provider resolves; the `"Google"`/`"OpenAI"`/`"Anthropic"` blocks hold gateway codes (`nto.google.…`, `anthropic.claude-…`) that only the AI Gateway resolves. Handing Vertex a gateway code fails as a 404 from `publishers/google/models/<code>` — and not at selection time, but mid-annotation. `canServeModelsFrom()` in [modelRegistry.ts](app/modules/llm/modelRegistry.ts#L33-L40) is now the single place that decides which config blocks the active `LLM_PROVIDER` can serve:

- **System-initiated LLM calls hardcoded gateway codes.** The prompt/annotation-schema alignment check, its "apply suggestion" follow-up, and codebook prompt generation each named a Claude model directly (`anthropic.claude-4.6-sonnet`, `anthropic.claude-4.6-opus`) — so on the GCP deploy, saving a prompt version failed with `Alignment check failed` and a Vertex 404. All three now wrap the code in `resolveModelCodeForProvider()`, which keeps the preferred model on the gateway and swaps in a Vertex model under `LLM_PROVIDER=VERTEX_AI`. **Consequence to be aware of:** on Vertex, those checks run on the first model in the `"Vertex AI"` block (`gemini-2.5-flash-lite`), not on Claude. Reorder that block to change which model they use.
- **The model dropdown offered every provider's models regardless of deployment.** `getAvailableProviders()` returned all four config blocks, so a user on the GCP deploy could pick a Claude or GPT model for a run and hit the same 404 during annotation. It now filters to the active provider — which is what [documentation/llmProviders.md](documentation/llmProviders.md) already promised users.
- **Client-side code can't read `LLM_PROVIDER` at all.** Vite replaces `process.env` with `{}` in the client bundle, so any provider check inside a React component silently read as unset — meaning the run creator pre-selected the gateway default even on Vertex. The root loader now forwards the value and client containers read it through [useLlmProvider()](app/modules/llm/hooks/useLlmProvider.ts); `getAvailableProviders()`/`getDefaultModelCode()` take it as an optional argument, defaulting to the env var for server callers (workers, services, Lambda functions). Anything provider-aware that renders in the browser must take this route.

**GCS uploads failed under uniform bucket-level access — fixed in code:**

Every file upload on the GCS path failed, and because of the silent-failure gap above it looked like "I uploaded a file but the project shows 0 sessions" with no error anywhere in the UI. The adapter's `upload()` passed `private: true` ([app/storageAdapters/gcs/index.ts:54-60](app/storageAdapters/gcs/index.ts#L54-L60)), which sends a legacy per-object ACL. Buckets created the documented way — `gcloud storage buckets create --uniform-bucket-level-access`, as above — reject any ACL request outright:

```
Cannot insert legacy ACL for an object when uniform bucket-level access is enabled.
```

The option is removed. Under UBLA, access is IAM-only and objects are already non-public, so nothing is loosened by dropping it. Note that `storage.objects.create` being granted is _not_ enough to rule this out — the permission check passes and the write still 400s. Worth knowing for the next GCS puzzle: `bucket.exists()` also fails with the documented `roles/storage.objectAdmin` grant, because that role doesn't include `storage.buckets.get`. That failure is harmless (the adapter never calls it) but it makes a bucket look missing when it isn't.

**Billing gating — `isLedgerBillingEnabled()` — fixed in code:**

On a fresh GCP database, creating a run failed with `No billing plan found for team <id>` from [estimateCost.server.ts:77](app/modules/billing/services/estimateCost.server.ts#L77), rendered as an unhandled "Oops!" page. Root cause: the default billing plan is created by a **migration**, not by app code, and `setupTeamBilling()` skips plan and balance setup when no default plan exists — so every team created before those migrations run has no plan. To repair an existing environment, run these from `/migrations` (system admin) in order:

1. `20260325153256-seed-default-billing-plan`
2. `20260326120000-assign-default-plan-to-existing-teams`
3. `20260327135814-backfill-billing-plan-effective-from` — **required.** Step 2 inserts `{team, plan, createdAt}` with no `effectiveFrom`, and `getEffectivePlan()` filters on `effectiveFrom: { $lte: now }`, which does not match documents missing the field. Running only 1 and 2 leaves the identical error.

Separately, billing shouldn't gate the Vertex path at all, since that spend never touches the team ledger. [isLedgerBillingEnabled()](app/modules/billing/helpers/isLedgerBillingEnabled.ts) is now the one place that decides, and it governs five things: `LLM.checkBalance()`, the missing-plan throw in `estimateCost` (a plan-less team gets an unmarked-up estimate instead of an exception), the three server-side `402 Insufficient credits` gates in `createRun.route.tsx` / `runSetCreate.route.tsx` / `runSetCreateRuns.route.tsx`, and the three client-side `exceedsBalance` checks that disable the Start button. **Both halves are needed** — fixing only the server gates leaves the button disabled in the browser. Client callers pass the provider in from the root loader via `useLlmProvider()`; omitting the argument fails closed and keeps billing enforced, which is the right default for a value the client can't read.

`setupTeamBilling()` now logs an **error** naming the three migrations instead of a `console.warn` nobody reads ([teamBilling.ts:88-97](app/modules/billing/teamBilling.ts#L88-L97)) — a team created without a plan looks fine until something unrelated fails much later.

One testing trap this exposed: `.env.test` and `.env.ci` didn't pin `LLM_PROVIDER`, so tests inherited it from the developer's own `.env`. With `VERTEX_AI` set locally, the three `402` route tests silently stopped asserting anything real. Both files now pin `LLM_PROVIDER='AI_GATEWAY'`; anything reading provider config at runtime needs the same treatment in tests.

## 3. Running Fully in Containers (Production-like)

To run the entire stack (app, workers, Redis, MongoDB) in Docker containers:

```sh
docker-compose -f docker-compose.yml -f docker-compose.app.yml up --build
```

- This builds and runs all services and the app in containers.
- Useful for validating Docker builds after making changes.
- The app will be available at the port specified in your `.env` (default: 5173).

---

## 4. Additional Notes

- **Adapters**: The app uses a plugin-based adapter system for storage and database. See `app/storageAdapters/` and `app/documentsAdapters/`.
- **Build Validation**: Running the full Docker Compose build is the best way to ensure your changes work in production.
- **Troubleshooting**: See `.github/copilot-instructions.md` for more details on common issues and solutions.

---

Happy contributing!

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

- `yarn redis` # Starts local Redis (in-memory)
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

**Vertex AI — fixed in code:**

- `LLM.checkBalance()` ([app/modules/llm/llm.ts:137-144](app/modules/llm/llm.ts#L137-L144)) used to block every LLM call — including file-upload attribute mapping — behind the team's Sandpiper credit balance (`TeamBillingBalance`), regardless of provider. Since Vertex AI spend bills directly to the GCP project (see the cost-attribution labels in `providers/vertexAI.ts`) rather than through Sandpiper's Stripe-funded ledger, `checkBalance()` now skips the check when `LLM_PROVIDER=VERTEX_AI`. Cost recording (`writeCostRecord`) is unaffected — usage still gets logged for analytics.
- `getDefaultModelCode()` ([app/modules/llm/modelRegistry.ts:19-32](app/modules/llm/modelRegistry.ts#L19-L32)) always returned the AI-gateway default (`nto.google.gemini-3-flash-preview`), an AI-gateway/LiteLLM-style code that Vertex's raw `generateContent` call doesn't recognize. It now returns a model from the `"Vertex AI"` block in `app/config/ai_gateway.json` (e.g. `gemini-2.5-flash-lite`) when `LLM_PROVIDER=VERTEX_AI`.

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

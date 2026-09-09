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

## Licensing of contributions

Ownership and licensing in this repository follow contribution (see the
License section of README.md):

- Contributions by FreshCognate employees are owned by FreshCognate and
  licensed under the Apache License 2.0.
- Contributions by Cornell University employees are owned by Cornell
  University and licensed under the MIT License.
- External contributions are accepted under the Apache License 2.0 (per
  Section 5 of the license), unless agreed otherwise in writing.

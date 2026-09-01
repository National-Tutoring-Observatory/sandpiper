# Sandpiper — experimental GCP environment

Provisions a parallel, experimental deployment on GCP: Cloud Run (web +
worker), Memorystore Redis, a GCS bucket, Artifact Registry, and a MongoDB
Atlas Flex cluster. Internal research use, not a public product — Atlas
uses its public endpoint restricted to an IP allowlist (Cloud Run's static
Cloud NAT IP, not `0.0.0.0/0`) plus SCRAM username/password, rather than
VPC peering. Does not touch the existing AWS production setup.

**Status: not yet applied.** A separate, simpler manual pilot (a GCS bucket +
Vertex AI, on top of the existing local Docker Mongo — no Atlas, no Cloud
Run, no VPC) was set up by hand first to validate GCP access before
committing to this full IaC build-out; see the "Google Cloud (GCS + Vertex
AI)" section in `../CONTRIBUTING.md` for those steps. This directory is for
when/if a full compute+database environment on GCP is actually provisioned.

## Prerequisites

- `terraform >= 1.9`, authenticated `gcloud` (`gcloud auth application-default login`)
- A MongoDB Atlas organization + an Org Owner-generated API key pair
- The target GCP project ID and a GitHub `owner/repo` string for the deploy workflow

## First apply (bootstrap)

Cloud Run needs an image before it exists, and a couple of env vars need
the _service's own URL_, which isn't known until after the first apply.
Both are broken with placeholders on the first pass:

1. Create `terraform.tfvars` (gitignored) with at minimum:
   ```hcl
   project_id         = "<gcp-project-id>"
   atlas_org_id       = "<atlas-org-id>"
   atlas_public_key   = "<atlas-api-public-key>"
   atlas_private_key  = "<atlas-api-private-key>"
   github_repository  = "<owner>/<repo>"
   ```
2. `terraform init && terraform plan` — review, then `terraform apply`.
   - `web_image`/`worker_image` default to a public placeholder image so
     Cloud Run has something to run; CI overwrites them on real deploys
     (Terraform ignores drift on that field — see `cloud_run.tf`).
   - `auth_callback_url`/`web_origin` default to `null`; without them the
     OAuth callback and bucket CORS are unset/wide-open respectively.
   - Atlas's IP allowlist entry depends on the Cloud NAT static IP, which
     exists before the cluster is created, so this should settle in one apply.
3. Note the `web_url` output, then set `auth_callback_url = "<web_url>/auth/callback"`
   and `web_origin = "<web_url>"` in `terraform.tfvars` and re-apply.
4. Populate the manually-managed secrets (see `outputs.manual_secrets_to_populate`):
   ```bash
   echo -n "<value>" | gcloud secrets versions add <secret-name> --data-file=- --project=<project_id>
   ```
5. Deploy real images via the `gcp-deploy.yml` GitHub Actions workflow (or
   `gcloud run deploy` manually) — this replaces the placeholder images.

## State

Local backend (`terraform.tfstate`, gitignored) — fine for one operator on
an experimental environment. Migrate to a GCS backend before this becomes
long-lived or multi-person.

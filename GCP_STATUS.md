# Sandpiper on Google Cloud — where things stand

Sandpiper runs end to end on a developer machine against real Google Cloud
services: files in Cloud Storage, annotation through Vertex AI. Making it
available to the team needs the infrastructure provisioned and a short list of
environment gaps closed. This runs alongside the existing AWS deployment and
replaces nothing.

## What had to change

Three things blocked it, all because the app had only ever run against AWS and
Cornell's AI Gateway. Each failed in a way the UI couldn't explain.

**Model naming.** Model identifiers belong to whoever serves them, and the app
sent gateway-style names (`anthropic.claude-…`) to Vertex, which rejected them as
unknown models — saving a prompt version failed with "Alignment check failed".
One rule now decides which models the active provider can actually serve:
internal LLM features pick a valid model automatically, and the model dropdown
only offers models the deployment can run.

**File uploads.** The storage adapter asked Cloud Storage to set per-file
permissions, which buckets using uniform access reject outright — so every upload
failed. Upload errors only reach the server log, so the app reported success and
showed an empty project.

**Billing.** Sandpiper gates runs on prepaid credits. On Vertex, usage bills
directly to the GCP project, so there is nothing to gate — and a fresh database
has no billing plan at all, which blocked runs outright. Credit checks are now
skipped on Vertex, decided in one place that covers both the server and the
buttons in the UI.

Verified live: transcript uploaded → run created → annotation completed on
Vertex.

**One limitation: the Vertex path is Gemini-only.** Claude models on Vertex use a
different API that the app doesn't speak yet, so on GCP the internal prompt
checks — and any model comparisons researchers run — use Gemini.

## What's left

**Infrastructure — the large piece.** `terraform/` describes the full environment
(Cloud Run for web and workers, Memorystore Redis, a storage bucket, Artifact
Registry, a MongoDB Atlas cluster) but has never been applied. The first apply is
a deliberate two-pass bootstrap: services need a container image and their own
public URL before some settings can be filled in. Secrets are then populated by
hand and the deploy workflow pointed at real images. Terraform state currently
lives on one laptop and should move to shared storage before more than one person
operates the environment.

**Per-environment setup, easy to miss.**

- The default billing plan is created by a database migration, not by the app.
  Until it runs, new teams have no plan and the billing pages stay empty.
- Download links are signed locally using a downloaded key file. On Cloud Run
  there is no key file, so the service account needs permission to sign on its
  own behalf. Untested — this will surface as broken download links.
- The MTM sample dataset has only ever been published to S3, so "Insert MTM
  dataset" will fail on GCP.

**Before real users arrive.** Failures that happen after a request returns are
invisible to the user — this is why a failed upload looked like an empty project
rather than an error, and the same pattern covers file conversion and annotation.
Separately, decide whether Gemini-only is acceptable for research use or add
Claude on Vertex as its own provider.

**Also outstanding:** these changes aren't committed yet, and the GCP deploy
workflow has never run against a real environment.

For the technical detail — exact errors, file references, and the gaps left
open — see the "Known gaps and fixes for local + Vertex AI" section in
[CONTRIBUTING.md](CONTRIBUTING.md), and [terraform/README.md](terraform/README.md)
for the infrastructure bootstrap.

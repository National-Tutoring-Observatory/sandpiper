resource "google_service_account" "web" {
  account_id   = "sandpiper-web"
  display_name = "Sandpiper web (Cloud Run runtime)"
  depends_on   = [google_project_service.required]
}

resource "google_service_account" "worker" {
  account_id   = "sandpiper-worker"
  display_name = "Sandpiper worker (Cloud Run runtime)"
  depends_on   = [google_project_service.required]
}

resource "google_service_account" "gh_deployer" {
  account_id   = "sandpiper-gh-deployer"
  display_name = "Sandpiper GitHub Actions deployer"
  depends_on   = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "web_storage" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.web.email}"
}

resource "google_storage_bucket_iam_member" "worker_storage" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.worker.email}"
}

# --- Deploy-time service account (GitHub Actions) ---

resource "google_project_iam_member" "gh_deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.gh_deployer.email}"
}

resource "google_project_iam_member" "gh_deployer_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.gh_deployer.email}"
}

# Lets the deployer act as the runtime SAs when deploying Cloud Run
# revisions, scoped to only those two service accounts (not project-wide).
resource "google_service_account_iam_member" "gh_deployer_actas_web" {
  service_account_id = google_service_account.web.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.gh_deployer.email}"
}

resource "google_service_account_iam_member" "gh_deployer_actas_worker" {
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.gh_deployer.email}"
}

# --- Workload Identity Federation (GitHub OIDC, no static GCP keys) ---

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "sandpiper-github-pool"
  display_name              = "Sandpiper GitHub Actions"
  depends_on                = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  # Restricts token exchange to this specific repo only.
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "gh_deployer_wif" {
  service_account_id = google_service_account.gh_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

output "web_url" {
  value       = google_cloud_run_v2_service.web.uri
  description = "Public URL of the web Cloud Run service. After first apply, set var.auth_callback_url and var.web_origin from this and re-apply."
}

output "worker_url" {
  value       = google_cloud_run_v2_service.worker.uri
  description = "Internal URL of the worker Cloud Run service (health check only, not a public entrypoint)."
}

output "artifact_registry_repo" {
  value       = google_artifact_registry_repository.sandpiper.name
  description = "Artifact Registry repo CI should push web/worker images to."
}

output "redis_host" {
  value       = google_redis_instance.cache.host
  description = "Memorystore Redis private IP (reachable only from the VPC)."
}

output "gcs_bucket" {
  value       = google_storage_bucket.uploads.name
  description = "GCS bucket used by the GCS storage adapter."
}

output "gh_deployer_service_account" {
  value       = google_service_account.gh_deployer.email
  description = "Service account GitHub Actions impersonates via Workload Identity Federation."
}

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Full WIF provider resource name for the GitHub Actions `google-github-actions/auth` step."
}

output "manual_secrets_to_populate" {
  value       = [for s in google_secret_manager_secret.manual : s.secret_id]
  description = "Secret Manager entries that need a value added manually (gcloud secrets versions add <name> --data-file=-) — Terraform only creates the containers for these."
}

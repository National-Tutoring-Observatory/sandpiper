resource "google_artifact_registry_repository" "sandpiper" {
  location      = var.region
  repository_id = "sandpiper"
  format        = "DOCKER"
  description   = "Sandpiper web + worker container images (experimental GCP environment)"

  depends_on = [google_project_service.required]
}

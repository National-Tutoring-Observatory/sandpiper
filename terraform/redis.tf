resource "google_redis_instance" "cache" {
  name           = "sandpiper-${var.environment}"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  authorized_network      = google_compute_network.vpc.id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  redis_version           = "REDIS_7_2"
  transit_encryption_mode = "DISABLED"

  depends_on = [
    google_service_networking_connection.private_service_connection,
    google_project_service.required,
  ]
}

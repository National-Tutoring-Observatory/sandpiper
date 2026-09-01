variable "web_origin" {
  description = "Web service's public origin, for the bucket CORS policy. Unknown until the web service's URL is known — leave null on first apply (CORS defaults to allow-all), then set it and re-apply to tighten it."
  type        = string
  default     = null
}

resource "google_storage_bucket" "uploads" {
  name                        = "${var.project_id}-sandpiper-storage"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  cors {
    origin          = var.web_origin == null ? ["*"] : [var.web_origin]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.required]
}

variable "auth_callback_url" {
  description = "OAuth callback URL. Unknown until the web service's URL is known — leave null on first apply, then set it (e.g. https://<web-uri>/auth/callback) and re-apply."
  type        = string
  default     = null
}

locals {
  common_secret_env = {
    SESSION_SECRET                = google_secret_manager_secret.manual["session-secret"].secret_id
    GITHUB_CLIENT_SECRET          = google_secret_manager_secret.manual["github-client-secret"].secret_id
    ORCID_CLIENT_SECRET           = google_secret_manager_secret.manual["orcid-client-secret"].secret_id
    STRIPE_SECRET_KEY             = google_secret_manager_secret.manual["stripe-secret-key"].secret_id
    STRIPE_WEBHOOK_SECRET         = google_secret_manager_secret.manual["stripe-webhook-secret"].secret_id
    BULLMQ_PRO_TOKEN              = google_secret_manager_secret.manual["bullmq-pro-token"].secret_id
    OPEN_AI_KEY                   = google_secret_manager_secret.manual["open-ai-key"].secret_id
    AI_GATEWAY_KEY                = google_secret_manager_secret.manual["ai-gateway-key"].secret_id
    SLACK_WEBHOOK_URL             = google_secret_manager_secret.manual["slack-webhook-url"].secret_id
    GOOGLE_ANALYTICS_API_SECRET   = google_secret_manager_secret.manual["ga-api-secret"].secret_id
    DOCUMENT_DB_CONNECTION_STRING = google_secret_manager_secret.mongodb_connection_string.secret_id
    DOCUMENT_DB_USERNAME          = google_secret_manager_secret.mongodb_username.secret_id
    DOCUMENT_DB_PASSWORD          = google_secret_manager_secret.mongodb_password.secret_id
  }

  common_plain_env = {
    STORAGE_ADAPTER = "GCS"
    # Mirrors storage.tf's bucket name literally (not a resource reference)
    # to avoid a dependency cycle: the bucket's CORS policy references the
    # web service's URL, so the web service can't also depend on the bucket.
    GCS_BUCKET        = "${var.project_id}-sandpiper-storage"
    DOCUMENTS_ADAPTER = "LOCAL"
    LLM_PROVIDER      = "AI_GATEWAY"
    DEPLOY_ENV        = var.environment
    REDIS_URL         = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
  }

  web_plain_env = merge(local.common_plain_env, var.auth_callback_url == null ? {} : {
    AUTH_CALLBACK_URL = var.auth_callback_url
  })
}

resource "google_cloud_run_v2_service" "web" {
  name     = "sandpiper-web"
  location = var.region

  template {
    service_account = google_service_account.web.email

    vpc_access {
      egress = "ALL_TRAFFIC"
      network_interfaces {
        network    = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.subnet.id
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = var.web_image
      ports {
        container_port = 5173
      }

      dynamic "env" {
        for_each = local.web_plain_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.common_secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "sandpiper-worker"
  location = var.region

  template {
    service_account = google_service_account.worker.email

    vpc_access {
      egress = "ALL_TRAFFIC"
      network_interfaces {
        network    = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.subnet.id
      }
    }

    scaling {
      # Always-on: BullMQ workers are long-running consumers, not
      # request-driven — min=1 plus cpu_idle=false below keeps them polling
      # between requests instead of being throttled/scaled to zero.
      min_instance_count = 1
      max_instance_count = 1
    }

    containers {
      image = var.worker_image
      ports {
        container_port = 4000
      }

      resources {
        cpu_idle = false
      }

      dynamic "env" {
        for_each = local.common_plain_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.common_secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_project_service.required]
}

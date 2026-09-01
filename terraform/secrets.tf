# Secret *containers* are managed here. Values for everything except
# mongodb-connection-string (populated below from the Atlas cluster output)
# are intentionally NOT set via Terraform — that would put plaintext
# secrets in tfstate. Populate them after apply with:
#   gcloud secrets versions add <name> --data-file=- --project=<project_id>
locals {
  manual_secrets = [
    "session-secret",
    "github-client-secret",
    "orcid-client-secret",
    "stripe-secret-key",
    "stripe-webhook-secret",
    "bullmq-pro-token",
    "open-ai-key",
    "ai-gateway-key",
    "slack-webhook-url",
    "ga-api-secret",
  ]
}

resource "google_secret_manager_secret" "manual" {
  for_each  = toset(local.manual_secrets)
  secret_id = each.value

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret" "mongodb_connection_string" {
  secret_id = "mongodb-connection-string"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "mongodb_connection_string" {
  secret = google_secret_manager_secret.mongodb_connection_string.id
  # DOCUMENT_DB_CONNECTION_STRING is host[/db][?params] only — app/lib/database.ts
  # prepends the mongodb+srv:// scheme and user:pass@ itself. See atlas.tf.
  secret_data = local.atlas_connection_string
}

# Both runtime services get read access to every secret. Usage isn't
# perfectly symmetric (e.g. GitHub OAuth is web-only), but splitting access
# precisely per-secret risks under-provisioning and breaking the app in a
# confusing way — tighten later once actual usage is audited.
resource "google_secret_manager_secret_iam_member" "manual_web" {
  for_each  = google_secret_manager_secret.manual
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.web.email}"
}

resource "google_secret_manager_secret_iam_member" "manual_worker" {
  for_each  = google_secret_manager_secret.manual
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_secret_manager_secret" "mongodb_username" {
  secret_id = "mongodb-username"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "mongodb_username" {
  secret      = google_secret_manager_secret.mongodb_username.id
  secret_data = mongodbatlas_database_user.app.username
}

resource "google_secret_manager_secret" "mongodb_password" {
  secret_id = "mongodb-password"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "mongodb_password" {
  secret      = google_secret_manager_secret.mongodb_password.id
  secret_data = random_password.mongodb_app_user.result
}

resource "google_secret_manager_secret_iam_member" "mongodb_web" {
  for_each = toset([
    google_secret_manager_secret.mongodb_connection_string.id,
    google_secret_manager_secret.mongodb_username.id,
    google_secret_manager_secret.mongodb_password.id,
  ])
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.web.email}"
}

resource "google_secret_manager_secret_iam_member" "mongodb_worker" {
  for_each = toset([
    google_secret_manager_secret.mongodb_connection_string.id,
    google_secret_manager_secret.mongodb_username.id,
    google_secret_manager_secret.mongodb_password.id,
  ])
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

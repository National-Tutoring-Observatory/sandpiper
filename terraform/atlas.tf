resource "mongodbatlas_project" "this" {
  name   = "sandpiper-${var.environment}"
  org_id = var.atlas_org_id
}

resource "random_password" "mongodb_app_user" {
  length  = 32
  special = false # avoid characters that need extra URI-encoding edge cases
}

resource "mongodbatlas_database_user" "app" {
  project_id         = mongodbatlas_project.this.id
  username           = "sandpiper-app"
  password           = random_password.mongodb_app_user.result
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "sandpiper"
  }
}

# Flex tier — Atlas's low-cost pay-as-you-go tier (the modern replacement
# for M2/M5 shared tiers). Reachable only via the public endpoint + IP
# allowlist in network.tf (internal research use, not VPC-peered) —
# dedicated tiers like M10 aren't needed since we're not peering.
resource "mongodbatlas_advanced_cluster" "this" {
  project_id   = mongodbatlas_project.this.id
  name         = "sandpiper-${var.environment}"
  cluster_type = "REPLICASET"

  replication_specs = [
    {
      region_configs = [
        {
          provider_name         = "FLEX"
          backing_provider_name = "GCP"
          region_name           = var.atlas_region_name
          priority              = 7
        }
      ]
    }
  ]
}

locals {
  # standard_srv includes the mongodb+srv:// scheme and default query
  # params, but app/lib/database.ts builds the scheme itself — strip it
  # down to host[/db][?params], matching the shape of the existing
  # DOCUMENT_DB_CONNECTION_STRING examples in .env.docker/.env.ci.
  atlas_srv_host = split(
    "/",
    replace(
      mongodbatlas_advanced_cluster.this.connection_strings.standard_srv,
      "mongodb+srv://",
      "",
    ),
  )[0]
  atlas_connection_string = "${local.atlas_srv_host}/sandpiper?retryWrites=true&w=majority"
}

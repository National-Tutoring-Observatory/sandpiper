resource "google_compute_network" "vpc" {
  name                    = "sandpiper-${var.environment}"
  auto_create_subnetworks = false

  depends_on = [google_project_service.required]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "sandpiper-${var.environment}-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Cloud Router + NAT: Cloud Run uses Direct VPC egress (see cloud_run.tf),
# routing ALL outbound traffic through this VPC. NAT gives that egress a
# static IP for anything that still needs the public internet (GitHub/ORCID
# OAuth, LLM providers, Stripe, Slack webhook).
resource "google_compute_router" "router" {
  name    = "sandpiper-${var.environment}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_address" "nat_ip" {
  name   = "sandpiper-${var.environment}-nat-ip"
  region = var.region
}

resource "google_compute_router_nat" "nat" {
  name                               = "sandpiper-${var.environment}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "MANUAL_ONLY"
  nat_ips                            = [google_compute_address.nat_ip.self_link]
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.subnet.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}

# Private Services Access — required for Memorystore (redis.tf), which has
# no public-endpoint option in GCP at all. Unrelated to Atlas below.
resource "google_compute_global_address" "private_service_range" {
  name          = "sandpiper-${var.environment}-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_service_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

# --- MongoDB Atlas network access ---
# Internal research use, not a public product — public endpoint + IP
# allowlist (not VPC peering) is enough here: Atlas is reachable only from
# Cloud Run's static NAT IP above, still gated by SCRAM username/password.
# No 0.0.0.0/0 anywhere in this config.
resource "mongodbatlas_project_ip_access_list" "nat" {
  project_id = mongodbatlas_project.this.id
  cidr_block = "${google_compute_address.nat_ip.address}/32"
  comment    = "Cloud Run's Cloud NAT static IP"
}

variable "project_id" {
  description = "GCP project ID to deploy Sandpiper's experimental environment into."
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run, Memorystore, and the Atlas cluster."
  type        = string
  default     = "us-central1"
}

variable "atlas_region_name" {
  description = "Atlas's region name for `region` (Atlas uses its own enum, not GCP's hyphenated ids — CENTRAL_US corresponds to us-central1)."
  type        = string
  default     = "CENTRAL_US"
}

variable "environment" {
  description = "Environment name, used as a resource name prefix/label."
  type        = string
  default     = "experimental"
}

variable "atlas_org_id" {
  description = "MongoDB Atlas organization ID to create the project/cluster in."
  type        = string
}

variable "atlas_public_key" {
  description = "MongoDB Atlas API public key (Org Owner-generated)."
  type        = string
  sensitive   = true
}

variable "atlas_private_key" {
  description = "MongoDB Atlas API private key (Org Owner-generated)."
  type        = string
  sensitive   = true
}

variable "github_repository" {
  description = "GitHub \"owner/repo\" allowed to assume the deploy service account via Workload Identity Federation, e.g. \"National-Tutoring-Observatory/sandpiper\"."
  type        = string
}

variable "web_image" {
  description = "Fully-qualified Artifact Registry image URI for the web Cloud Run service. Left at a placeholder on first apply; CI overwrites it on each deploy (Terraform ignores drift on this field)."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "worker_image" {
  description = "Fully-qualified Artifact Registry image URI for the worker Cloud Run service. Left at a placeholder on first apply; CI overwrites it on each deploy (Terraform ignores drift on this field)."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

# Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "personal-finance"
  description   = "Docker repository for personal finance bot"
  format        = "DOCKER"

  depends_on = [google_project_service.required_apis]
}

# Service Account for Cloud Run services
resource "google_service_account" "cloud_run_sa" {
  account_id   = "personal-finance-bot"
  display_name = "Personal Finance Bot Service Account"
  description  = "Service account for Cloud Run services"
}

# Grant Secret Manager access to service account
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# GCS Bucket for persistent storage (offset, queue)
resource "google_storage_bucket" "bot_storage" {
  name          = "${var.project_id}-bot-storage"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30
      matches_prefix = ["message-queue"]
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.required_apis]
}

# Grant Storage access to service account
resource "google_storage_bucket_iam_member" "bot_storage_admin" {
  bucket = google_storage_bucket.bot_storage.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Whisper Service - Cloud Run
resource "google_cloud_run_v2_service" "whisper_service" {
  name     = "whisper-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # Public with IAM authentication

  template {
    service_account = google_service_account.cloud_run_sa.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/whisper:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }

  depends_on = [
    google_project_service.required_apis,
    google_artifact_registry_repository.docker_repo
  ]
}

# Allow bot service to invoke whisper service
resource "google_cloud_run_v2_service_iam_member" "whisper_invoker" {
  location = google_cloud_run_v2_service.whisper_service.location
  name     = google_cloud_run_v2_service.whisper_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Finance Bot Service - Cloud Run
resource "google_cloud_run_v2_service" "finance_bot" {
  name     = "finance-bot"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # Public access for Telegram webhook

  template {
    service_account = google_service_account.cloud_run_sa.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/finance-bot:latest"

      env {
        name = "TELEGRAM_BOT_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.telegram_bot_token.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "WEBHOOK_SECRET_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.webhook_secret_token.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "CLAUDE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.claude_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_SERVICE_ACCOUNT"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_service_account.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SYSTEM_PROMPT"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.system_prompt.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "VISION_PROMPT"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.vision_prompt.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SHORTCUTS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.shortcuts_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "GOOGLE_SHEET_ID"
        value = var.google_sheet_id
      }

      env {
        name  = "DEFAULT_ACCOUNT"
        value = var.default_account
      }

      env {
        name  = "WHISPER_API_URL"
        value = google_cloud_run_v2_service.whisper_service.uri
      }

      env {
        name  = "POLLING_INTERVAL"
        value = "300000"
      }

      env {
        name  = "QUEUE_PROCESS_INTERVAL"
        value = "3600000"
      }

      env {
        name  = "QUEUE_MAX_RETRIES"
        value = "5"
      }

      env {
        name  = "STORAGE_BUCKET_NAME"
        value = google_storage_bucket.bot_storage.name
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      ports {
        container_port = 3000
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }

  depends_on = [
    google_project_service.required_apis,
    google_artifact_registry_repository.docker_repo,
    google_cloud_run_v2_service.whisper_service,
    google_secret_manager_secret_version.telegram_bot_token,
    google_secret_manager_secret_version.webhook_secret_token,
    google_secret_manager_secret_version.shortcuts_api_key,
    google_secret_manager_secret_version.claude_api_key,
    google_secret_manager_secret_version.google_service_account,
    google_secret_manager_secret_version.system_prompt,
    google_secret_manager_secret_version.vision_prompt,
    google_storage_bucket.bot_storage,
  ]
}

# Allow unauthenticated access to bot (for Telegram webhook with secret token validation)
resource "google_cloud_run_v2_service_iam_member" "bot_invoker" {
  location = google_cloud_run_v2_service.finance_bot.location
  name     = google_cloud_run_v2_service.finance_bot.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

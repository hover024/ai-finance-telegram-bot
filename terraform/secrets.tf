# Generate random webhook secret token
resource "random_password" "webhook_secret" {
  length  = 32
  special = true
}

# Secret Manager secrets
resource "google_secret_manager_secret" "telegram_bot_token" {
  secret_id = "telegram-bot-token"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "telegram_bot_token" {
  secret      = google_secret_manager_secret.telegram_bot_token.id
  secret_data = var.telegram_bot_token
}

resource "google_secret_manager_secret" "webhook_secret_token" {
  secret_id = "webhook-secret-token"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "webhook_secret_token" {
  secret      = google_secret_manager_secret.webhook_secret_token.id
  secret_data = random_password.webhook_secret.result
}

resource "google_secret_manager_secret" "claude_api_key" {
  secret_id = "claude-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "claude_api_key" {
  secret      = google_secret_manager_secret.claude_api_key.id
  secret_data = var.claude_api_key
}

resource "google_secret_manager_secret" "google_service_account" {
  secret_id = "google-service-account-json"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "google_service_account" {
  secret      = google_secret_manager_secret.google_service_account.id
  secret_data = var.google_service_account_json
}

resource "google_secret_manager_secret" "system_prompt" {
  secret_id = "system-prompt"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "system_prompt" {
  secret      = google_secret_manager_secret.system_prompt.id
  secret_data = var.system_prompt
}

resource "google_secret_manager_secret" "vision_prompt" {
  secret_id = "vision-prompt"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "vision_prompt" {
  secret      = google_secret_manager_secret.vision_prompt.id
  secret_data = var.vision_prompt
}

output "finance_bot_url" {
  description = "URL of the finance bot Cloud Run service"
  value       = google_cloud_run_v2_service.finance_bot.uri
}

output "whisper_service_url" {
  description = "Internal URL of the whisper service"
  value       = google_cloud_run_v2_service.whisper_service.uri
}

output "webhook_url" {
  description = "Webhook URL for Telegram"
  value       = "${google_cloud_run_v2_service.finance_bot.uri}/webhook"
}

output "webhook_secret_token" {
  description = "Secret token for webhook validation (use with setup-webhook script)"
  value       = random_password.webhook_secret.result
  sensitive   = true
}

output "artifact_registry_repo" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "setup_webhook_command" {
  description = "Command to setup Telegram webhook"
  value       = "Run: terraform output -raw webhook_secret_token | WEBHOOK_SECRET_TOKEN=$(cat) WEBHOOK_URL=$(terraform output -raw webhook_url) TELEGRAM_BOT_TOKEN=<your-token> ./scripts/setup-webhook-with-secret.sh"
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run services"
  type        = string
  default     = "europe-west1"
}

variable "telegram_bot_token" {
  description = "Telegram Bot API token"
  type        = string
  sensitive   = true
}

variable "claude_api_key" {
  description = "Claude API key"
  type        = string
  sensitive   = true
}

variable "google_sheet_id" {
  description = "Google Sheets spreadsheet ID"
  type        = string
}

variable "google_service_account_json" {
  description = "Google Service Account JSON for Sheets API"
  type        = string
  sensitive   = true
}

variable "system_prompt" {
  description = "System prompt for Claude"
  type        = string
  sensitive   = true
}

variable "vision_prompt" {
  description = "Vision prompt for Claude"
  type        = string
  sensitive   = true
}

variable "default_account" {
  description = "Default account name"
  type        = string
  default     = "Santander PLN"
}

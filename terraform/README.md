# Terraform Configuration for Google Cloud Run Deployment

This Terraform configuration deploys the Personal Finance Bot to Google Cloud Run with:
- 🔒 Secret Manager for sensitive data
- 🛡️ Webhook secret token validation
- 🐳 Artifact Registry for Docker images
- ⚡ Auto-scaling Cloud Run services
- 🔗 Internal networking between services

## Prerequisites

1. **Google Cloud account** with $300 free credits
2. **Terraform** installed (`brew install terraform`)
3. **gcloud CLI** installed and authenticated
4. **Docker** for building images

## Setup

### 1. Configure GCP Project

```bash
# Login to GCP
gcloud auth login
gcloud auth application-default login

# Create or select project
gcloud projects create my-finance-bot --name="Personal Finance Bot"
gcloud config set project my-finance-bot

# Enable billing (required for Cloud Run)
gcloud billing accounts list
gcloud billing projects link my-finance-bot --billing-account=BILLING_ACCOUNT_ID
```

### 2. Prepare Terraform Variables

```bash
cd terraform

# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars
```

**Required variables:**

- `project_id`: Your GCP project ID
- `region`: GCP region (default: `europe-west1`)
- `telegram_bot_token`: From @BotFather
- `claude_api_key`: From Claude API
- `google_sheet_id`: From spreadsheet URL
- `google_service_account_json`: JSON credentials (single line)
- `system_prompt`: Content of `prompts/system.txt`
- `vision_prompt`: Content of `prompts/vision.txt`

**Helper commands to prepare values:**

```bash
# Convert service-account.json to single line
cat ../service-account.json | jq -c

# Read prompts
cat ../prompts/system.txt
cat ../prompts/vision.txt
```

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Review Plan

```bash
terraform plan
```

This will show:
- ✅ APIs to enable
- ✅ Secrets to create
- ✅ Cloud Run services to deploy
- ✅ IAM permissions to grant

### 5. Build and Push Docker Images

```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Get repository URL (after terraform plan)
REPO_URL=$(terraform output -raw artifact_registry_repo 2>/dev/null || echo "europe-west1-docker.pkg.dev/YOUR_PROJECT/personal-finance")

# Build and push finance-bot
cd ../services/bot
docker build -t $REPO_URL/finance-bot:latest .
docker push $REPO_URL/finance-bot:latest

# Build and push whisper-service
cd ../whisper
docker build -t $REPO_URL/whisper:latest .
docker push $REPO_URL/whisper:latest

cd ../../terraform
```

### 6. Apply Terraform

```bash
terraform apply
```

Type `yes` to confirm.

This will create:
1. Artifact Registry repository
2. Secret Manager secrets
3. Service account for Cloud Run
4. Whisper service (internal only)
5. Finance bot service (public with webhook)
6. IAM bindings

### 7. Setup Telegram Webhook

```bash
# Get webhook URL and secret token
export WEBHOOK_URL=$(terraform output -raw webhook_url)
export WEBHOOK_SECRET_TOKEN=$(terraform output -raw webhook_secret_token)
export TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# Run setup script
../scripts/setup-webhook-with-secret.sh
```

## Outputs

After `terraform apply`, you'll get:

- `finance_bot_url`: Public URL of bot service
- `whisper_service_url`: Internal URL of whisper service
- `webhook_url`: Full webhook URL for Telegram
- `webhook_secret_token`: Secret token (use with setup script)
- `artifact_registry_repo`: Docker repository URL

## Updates and Redeployment

To update the application:

```bash
# 1. Build and push new images
cd ../services/bot
docker build -t $REPO_URL/finance-bot:latest .
docker push $REPO_URL/finance-bot:latest

# 2. Force new revision in Cloud Run
cd ../../terraform
gcloud run services update finance-bot --region europe-west1 --image=$REPO_URL/finance-bot:latest
```

Or use GitHub Actions for automated deployment (see `../.github/workflows/deploy.yml`).

## Cost Estimation

With $300 free credits and free tier:

**Free tier includes:**
- 2 million requests/month
- 360,000 GB-seconds memory
- 180,000 vCPU-seconds

**Estimated cost (personal use):**
- Finance bot: ~$1-2/month
- Whisper service: ~$1-2/month
- Total: **~$2-4/month** (well within free credits)

## Security Features

✅ **Webhook Secret Token**: Validates all incoming webhook requests
✅ **Secret Manager**: Encrypted storage for sensitive data
✅ **IAM**: Least-privilege service accounts
✅ **Internal Networking**: Whisper service not publicly accessible
✅ **HTTPS**: Automatic TLS certificates

## Troubleshooting

### View logs

```bash
# Finance bot logs
gcloud run services logs read finance-bot --region europe-west1 --limit 50

# Whisper service logs
gcloud run services logs read whisper-service --region europe-west1 --limit 50
```

### Check service status

```bash
gcloud run services list --region europe-west1
```

### Update secrets

```bash
# Example: update Claude API key
echo -n "new-api-key" | gcloud secrets versions add claude-api-key --data-file=-

# Restart service to pick up new secret
gcloud run services update finance-bot --region europe-west1
```

### Delete everything

```bash
terraform destroy
```

## GitHub Actions (Optional)

For automated deployment on push to main, create `.github/workflows/deploy.yml` with GCP service account key in GitHub Secrets.

See example workflow in repository.

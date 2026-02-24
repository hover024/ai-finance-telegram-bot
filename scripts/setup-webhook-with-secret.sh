#!/bin/bash

# Setup Telegram webhook with secret token
# Usage: ./scripts/setup-webhook-with-secret.sh

set -e

# Check required environment variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_BOT_TOKEN not set"
  exit 1
fi

if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Error: WEBHOOK_URL not set"
  exit 1
fi

if [ -z "$WEBHOOK_SECRET_TOKEN" ]; then
  echo "❌ Error: WEBHOOK_SECRET_TOKEN not set"
  exit 1
fi

echo "🔧 Setting up Telegram webhook with secret token..."
echo "   URL: $WEBHOOK_URL"
echo "   Token length: ${#WEBHOOK_SECRET_TOKEN} characters"

# Set webhook with secret token
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}/webhook\",
    \"secret_token\": \"${WEBHOOK_SECRET_TOKEN}\",
    \"allowed_updates\": [],
    \"drop_pending_updates\": false
  }")

# Check response
if echo "$RESPONSE" | jq -e '.ok' > /dev/null; then
  echo "✅ Webhook configured successfully!"
  echo ""
  echo "Webhook info:"
  echo "$RESPONSE" | jq .
else
  echo "❌ Failed to set webhook:"
  echo "$RESPONSE" | jq .
  exit 1
fi

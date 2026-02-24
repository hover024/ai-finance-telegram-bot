# iOS Shortcuts API

This document describes the iOS Shortcuts API for the Personal Finance Bot.

## Overview

The Shortcuts API allows you to send transactions directly from iOS Shortcuts without going through Telegram. It supports three input types:

1. **Text** - Plain text transaction description
2. **Voice** - Audio recording to be transcribed and analyzed
3. **Photo** - Receipt or document image

## Authentication

All requests must include an API key in the `X-Api-Key` header.

```
X-Api-Key: your-shortcuts-api-key
```

## Endpoint

```
POST /api/message
```

## Request Formats

### 1. Text Input

Send a JSON payload with the transaction text:

```bash
curl -X POST https://your-bot-url/api/message \
  -H "X-Api-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"text":"Spent 50 PLN on coffee"}'
```

**iOS Shortcuts Configuration:**

1. Add "Get Contents of URL" action
2. Method: POST
3. Headers:
   - `X-Api-Key`: Your API key
   - `Content-Type`: application/json
4. Request Body: JSON
   ```json
   {
     "text": [Shortcut Input]
   }
   ```

### 2. Voice Input

Send audio file as multipart/form-data:

```bash
curl -X POST https://your-bot-url/api/message \
  -H "X-Api-Key: your-api-key" \
  -F "file=@recording.m4a"
```

**iOS Shortcuts Configuration:**

1. Add "Dictate Text" action to record voice
2. Add "Get Contents of URL" action
3. Method: POST
4. Headers:
   - `X-Api-Key`: Your API key
5. Request Body: Form
   - Add field named `file` with the recorded audio

### 3. Photo Input

Send image file as multipart/form-data:

```bash
curl -X POST https://your-bot-url/api/message \
  -H "X-Api-Key: your-api-key" \
  -F "file=@receipt.jpg"
```

**iOS Shortcuts Configuration:**

1. Add "Take Photo" or "Select Photos" action
2. Add "Get Contents of URL" action
3. Method: POST
4. Headers:
   - `X-Api-Key`: Your API key
5. Request Body: Form
   - Add field named `file` with the photo

## Response Format

### Success Response

```json
{
  "success": true,
  "messageId": 123456,
  "actions": 1
}
```

**Fields:**

- `success`: Always `true` for successful requests
- `messageId`: Unique identifier for this message
- `actions`: Number of transactions recorded

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "queued": false
}
```

**Fields:**

- `success`: Always `false` for errors
- `error`: Description of what went wrong
- `queued`: `true` if the message was queued for retry (Claude API unavailable)

## Setup Instructions

### 1. Generate API Key

Create a random API key:

```bash
openssl rand -hex 32
```

### 2. Add to Google Cloud Secret Manager

```bash
# Create secret
echo -n "your-generated-api-key" | gcloud secrets create shortcuts-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Grant access to service account
gcloud secrets add-iam-policy-binding shortcuts-api-key \
  --member="serviceAccount:personal-finance-bot@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy

The GitHub Actions workflow will automatically deploy with the secret.

### 4. Get Your Bot URL

After deployment:

```bash
gcloud run services describe finance-bot \
  --region=europe-west1 \
  --format='value(status.url)'
```

### 5. Create iOS Shortcuts

#### Text Transaction Shortcut

1. Create new Shortcut
2. Add "Ask for Input" (prompt: "Describe transaction")
3. Add "Get Contents of URL"
   - URL: `https://your-bot-url/api/message`
   - Method: POST
   - Headers: `X-Api-Key: your-key`, `Content-Type: application/json`
   - Request Body: JSON `{"text":"[Provided Input]"}`
4. Add "Show Result" to display the response

#### Voice Transaction Shortcut

1. Create new Shortcut
2. Add "Dictate Text"
3. Add "Get Contents of URL"
   - URL: `https://your-bot-url/api/message`
   - Method: POST
   - Headers: `X-Api-Key: your-key`
   - Request Body: Form, field `file` = Dictated Text
4. Add "Show Result"

#### Photo Receipt Shortcut

1. Create new Shortcut
2. Add "Take Photo" or "Select Photos"
3. Add "Get Contents of URL"
   - URL: `https://your-bot-url/api/message`
   - Method: POST
   - Headers: `X-Api-Key: your-key`
   - Request Body: Form, field `file` = Photo
4. Add "Show Result"

## File Size Limits

- Maximum file size: **20MB**
- Supported audio formats: OGG, M4A, MP3, WAV
- Supported image formats: JPG, PNG, WEBP

## Rate Limits

No explicit rate limits, but:

- Voice transcription takes ~5-30 seconds
- Image analysis takes ~3-10 seconds
- Text analysis takes ~2-5 seconds

Please don't spam the endpoint.

## Error Handling

The API will return appropriate HTTP status codes:

- `200 OK`: Request processed successfully
- `400 Bad Request`: Invalid payload or file type
- `401 Unauthorized`: Invalid or missing API key
- `413 Payload Too Large`: File exceeds 20MB
- `422 Unprocessable Entity`: File processing failed
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Claude API or Sheets temporarily unavailable

If you get a 503 error with `"queued": true`, the message will be retried automatically within the next hour.

## Security Notes

1. **Keep your API key secret** - don't share it or commit it to version control
2. The API key is equivalent to Telegram bot access
3. Anyone with the key can add transactions to your sheet
4. Rotate the key periodically for security
5. Cloud Run automatically provides HTTPS encryption

## Troubleshooting

### "Invalid or missing API key"

- Check that `X-Api-Key` header is present and matches the secret in GCP

### "Invalid file type"

- Ensure you're sending audio/* or image/* MIME types
- For Shortcuts, use "Dictate Text" or "Take Photo", not text input

### "File processing failed"

- Check file size (must be < 20MB)
- Ensure audio is in supported format
- Verify image is readable

### "AI service temporarily unavailable"

- Claude API may be rate-limited or down
- Message is automatically queued for retry
- Check back in 1 hour or use Telegram bot as fallback

## Architecture

The Shortcuts API shares the same processing pipeline as the Telegram bot:

```
iOS Shortcuts
     ↓
  POST /api/message
     ↓
Normalize to internal format
     ↓
Same processing as Telegram
     ↓
Write to Google Sheets
```

This ensures consistent behavior across both input methods.

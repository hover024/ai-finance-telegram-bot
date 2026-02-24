# Personal Finance Bot

AI-powered Telegram bot for expense tracking with voice, photo, and text support. Built with microservices architecture for reliability and performance.

## Features

- 📝 **Text messages**: "coffee 20 USD" → automatically logged
- 📸 **Receipt photos**: AI extracts amount, date, merchant
- 🎤 **Voice messages**: Speech-to-text via Whisper
- 📊 **Google Sheets**: All data stored in spreadsheet
- 💱 **Multi-currency**: Automatic conversion with formulas
- 🏦 **Multiple accounts**: Track different bank accounts, cash, etc.
- ⚡ **Always-on service**: Instant webhook processing + periodic polling fallback
- 🔄 **Auto-restart**: Resilient microservices with health checks

## Architecture

The system consists of two microservices:

```
┌─────────────────────┐     ┌──────────────────────────┐
│  whisper-service    │     │   finance-bot            │
│  (always-on)        │     │   (always-on)            │
│                     │     │                          │
│  whisper.cpp        │◄────│  Express HTTP Server     │
│  HTTP API :8080     │     │  ├─ Webhook endpoint     │
│  ggml-small.bin     │     │  ├─ Periodic polling     │
│  restart: always    │     │  ├─ Claude AI            │
└─────────────────────┘     │  └─ Google Sheets        │
                            └──────────────────────────┘
                                     ▲
                                     │ webhook
                            ┌────────┴─────────┐
                            │  Telegram API    │
                            └──────────────────┘
```

**Operating Modes**:
- **Webhook mode** (primary): Instant message processing when configured with public HTTPS endpoint
- **Polling mode** (fallback): Checks for new messages every 5 minutes automatically
- **Hybrid approach**: Both run simultaneously for maximum reliability

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical documentation.

## Setup

### 1. Create Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token

### 2. Get Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Create new API key
3. Copy the key

### 3. Setup Google Sheets

#### Create Spreadsheet

Create a new Google Sheet with a sheet named **Transactions** with these columns:

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | Date | Date | Transaction date (YYYY-MM-DD) |
| B | Account | Text | Account name (e.g., "Bank Account") |
| C | Type | Text | "Income" / "Expense" / "Transfer" |
| D | Source | Text | Merchant or source name |
| E | Category | Text | Expense/income category |
| F | Amount | Number | Amount (always positive) |
| G | Currency | Text | "USD" / "EUR" / "PLN" |
| H | Amount(Base) | Formula | Auto-conversion formula |
| I | Note | Text | Optional notes |

**Formula for column H** (auto-convert to base currency):
```
=IF(G2="USD";F2;IF(G2="EUR";F2*Dashboard!$B$4;F2))
```

Where `Dashboard!$B$4` contains the exchange rate.

#### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google Sheets API**
4. Go to **IAM & Admin** → **Service Accounts**
5. Create service account
6. Create JSON key and download as `service-account.json`
7. Copy the service account email
8. Open your Google Sheet → **Share** → paste email → give **Editor** access

### 4. Download Whisper Model

Download the AI model for voice transcription:

```bash
./scripts/download-models.sh
```

This downloads `ggml-small.bin` (~466 MB) to the `models/` directory.

### 5. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your values:

```env
TELEGRAM_BOT_TOKEN=your-bot-token
CLAUDE_API_KEY=sk-ant-api03-your-key
GOOGLE_SHEET_ID=your-sheet-id
DEFAULT_ACCOUNT=Bank Account

# Whisper service (default is fine for Docker Compose)
WHISPER_API_URL=http://whisper-service:8080

# Server configuration
PORT=3000
POLLING_INTERVAL=300000  # 5 minutes

# Webhook (optional, for production)
WEBHOOK_URL=
```

The `GOOGLE_SHEET_ID` is from the spreadsheet URL:
```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
```

### 6. Customize AI Prompt

Copy `prompt.example.txt` to `prompt.txt`:

```bash
cp prompt.example.txt prompt.txt
```

Edit `prompt.txt` to match your:
- Account names
- Categories
- Currency preferences
- Parsing rules

## Running

### Quick Start (Docker)

```bash
# Build and start services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

The bot runs as an always-on service:
- **Whisper service**: Loads AI model and listens on port 8080
- **Bot service**: Listens on port 3000 for webhooks, polls every 5 minutes

### Webhook Setup (Optional, for Production)

For instant message processing, configure a webhook:

1. Setup public HTTPS domain with reverse proxy (Nginx/Caddy)
2. Update `.env` with your webhook URL
3. Run setup script:

```bash
export TELEGRAM_BOT_TOKEN="your-token"
export WEBHOOK_URL="https://your-domain.com/webhook"
./scripts/setup-webhook.sh
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed production deployment guide.

### Development Mode

```bash
# Run in foreground with logs
docker-compose up --build

# Rebuild after code changes
docker-compose up --build

# Stop services
docker-compose down
```

## Usage

Send messages to your Telegram bot:

**Text:**
```
coffee 20 USD
```

**Voice:**
Say "paid 50 dollars for groceries"

**Photo:**
Send a receipt photo

The bot will parse and write to Google Sheets automatically.

## Customization

### Change Default Account

Edit `.env`:
```env
DEFAULT_ACCOUNT=My Bank Account
```

### Add Categories

Edit `prompt.txt` and add to the categories list:
```
EXPENSE CATEGORIES:
- Groceries
- Transport
- Your New Category
```

### Change Currency

Edit `prompt.txt`:
```
Default currency: EUR
```

Update the formula in Google Sheets column H to match your base currency.

### Multi-Account Setup

Edit `prompt.txt` to list your accounts:
```
AVAILABLE ACCOUNTS:
- Checking Account (default)
- Savings Account
- Cash Wallet
```

Specify account in messages:
```
coffee 20 from cash wallet
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f finance-bot
docker-compose logs -f whisper-service

# Filter errors
docker-compose logs finance-bot | jq -r 'select(.level=="error")'

# Recent activity
docker-compose logs --tail 50 finance-bot
```

### Health Checks

```bash
# Bot service
curl http://localhost:3000/health

# Whisper service
curl http://localhost:8080/

# Check webhook status
export TELEGRAM_BOT_TOKEN="your-token"
./scripts/check-webhook.sh
```

### Service Status

```bash
# Container status
docker-compose ps

# Resource usage
docker stats
```

## Project Structure

```
src/
├── index.ts       - Main entry point (always-on service)
├── server.ts      - Express HTTP server + webhook
├── polling.ts     - Periodic polling fallback
├── processor.ts   - Message processing orchestration
├── whisper.ts     - Whisper HTTP client
├── telegram.ts    - Telegram Bot API client
├── claude.ts      - Claude AI integration
├── sheets.ts      - Google Sheets API
├── logger.ts      - Structured logging
├── config.ts      - Configuration management
└── types.ts       - TypeScript interfaces

scripts/
├── download-models.sh    - Download Whisper model
├── setup-webhook.sh      - Configure Telegram webhook
└── check-webhook.sh      - Verify webhook status

docs/
├── ARCHITECTURE.md   - Detailed system architecture
└── DEPLOYMENT.md     - Production deployment guide

models/               - Whisper AI models (gitignored)
prompt.txt           - AI prompt (customize this)
docker-compose.yml   - Service orchestration
```

## Tech Stack

**Bot Service**:
- Node.js 20 + TypeScript
- Express.js (HTTP server)
- Claude AI (Haiku 4.5)
- Google Sheets API v4
- Telegram Bot API

**Whisper Service**:
- whisper.cpp (C++ implementation)
- ggml-small.bin model
- HTTP API server

**Infrastructure**:
- Docker + Docker Compose
- Structured JSON logging
- Health checks + auto-restart

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Detailed system architecture, data flows, and design decisions
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Production deployment guide, monitoring, and troubleshooting

## Troubleshooting

**Bot not responding?**
1. Check logs: `docker-compose logs -f finance-bot`
2. Verify services are running: `docker-compose ps`
3. Test health endpoints: `curl http://localhost:3000/health`

**Voice messages not working?**
1. Check Whisper service: `docker-compose logs whisper-service`
2. Verify model loaded: `curl http://localhost:8080/`
3. Test transcription directly (see DEPLOYMENT.md)

**Webhook not working?**
- Polling fallback will catch messages within 5 minutes automatically
- Check webhook status: `./scripts/check-webhook.sh`
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for webhook troubleshooting

## Contributing

Contributions are welcome! Please check the architecture documentation before making major changes.

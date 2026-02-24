# Personal Finance Bot

AI-powered Telegram bot for expense tracking with voice, photo, and text support.

## Features

- 📝 **Text messages**: "coffee 20 USD" → automatically logged
- 📸 **Receipt photos**: AI extracts amount, date, merchant
- 🎤 **Voice messages**: Speech-to-text via Whisper
- 📊 **Google Sheets**: All data stored in spreadsheet
- 💱 **Multi-currency**: Automatic conversion with formulas
- 🏦 **Multiple accounts**: Track different bank accounts, cash, etc.

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

### 4. Configure Environment

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
```

The `GOOGLE_SHEET_ID` is from the spreadsheet URL:
```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
```

### 5. Customize AI Prompt

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

### Docker (Recommended)

```bash
docker-compose up --build
```

This will process new Telegram messages and exit. Run manually or setup a cron job to run every 5-10 minutes.

### Local

Requires Node.js 20+ and Python 3.11+:

```bash
pip3 install -r requirements.txt
npm start
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

## Project Structure

```
src/
├── index.ts       - Entry point
├── config.ts      - Configuration
├── telegram.ts    - Telegram Bot API
├── claude.ts      - Claude AI integration
├── whisper.ts     - Whisper transcription
├── sheets.ts      - Google Sheets API
├── processor.ts   - Message processing
└── types.ts       - TypeScript types

transcribe.py      - Python script for Whisper
prompt.txt         - AI prompt (customize this)
```

## Tech Stack

- Node.js 20 + TypeScript
- Claude AI (Haiku 4.5)
- Faster Whisper (small model)
- Google Sheets API v4
- Telegram Bot API
- Docker

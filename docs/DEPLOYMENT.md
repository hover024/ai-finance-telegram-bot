# Deployment Guide

This guide covers how to deploy and operate the Personal Finance Bot system in both development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Webhook Configuration](#webhook-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Backup and Recovery](#backup-and-recovery)

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **curl** or **wget**: For downloading models
- **jq**: For parsing webhook responses (optional but recommended)

Install on Ubuntu/Debian:
```bash
sudo apt update
sudo apt install docker.io docker-compose git curl jq
sudo usermod -aG docker $USER  # Add user to docker group
```

Install on macOS:
```bash
brew install docker docker-compose git jq
```

### Required Credentials

1. **Telegram Bot Token**
   - Create bot via [@BotFather](https://t.me/BotFather)
   - Save token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Claude API Key**
   - Sign up at [console.anthropic.com](https://console.anthropic.com/)
   - Generate API key (format: `sk-ant-api03-...`)

3. **Google Sheets**
   - Create Google Cloud project
   - Enable Google Sheets API
   - Create service account
   - Download `service-account.json` credentials
   - Share spreadsheet with service account email

### System Requirements

**Minimum**:
- 2 CPU cores
- 4 GB RAM
- 10 GB disk space

**Recommended**:
- 4 CPU cores
- 8 GB RAM
- 20 GB disk space

**Whisper Model Sizes**:
- `ggml-tiny.bin`: ~75 MB, fast but less accurate
- `ggml-base.bin`: ~142 MB, balanced
- `ggml-small.bin`: ~466 MB, good accuracy (default)
- `ggml-medium.bin`: ~1.5 GB, better accuracy
- `ggml-large.bin`: ~2.9 GB, best accuracy

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd personal-finance
```

### 2. Download Whisper Model

```bash
./scripts/download-models.sh
```

This will:
- Create `models/` directory
- Download `ggml-small.bin` (~466 MB)
- Skip download if model already exists

**Alternative models**:
```bash
# Faster but less accurate
curl -L -o models/ggml-tiny.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin

# Better accuracy but slower
curl -L -o models/ggml-medium.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
```

Update `docker-compose.yml` to use different model:
```yaml
command: whisper-server --host 0.0.0.0 --port 8080 -m /models/ggml-tiny.bin -l ru
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env  # or vim, code, etc.
```

Fill in required values:
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
CLAUDE_API_KEY=sk-ant-api03-your-key-here
GOOGLE_SHEET_ID=1a2b3c4d5e6f7g8h9i0j
DEFAULT_ACCOUNT=Bank Account

# Whisper service (default is fine for Docker Compose)
WHISPER_API_URL=http://whisper-service:8080

# Server configuration
PORT=3000
POLLING_INTERVAL=300000  # 5 minutes in milliseconds

# Webhook (leave empty for polling-only mode)
WEBHOOK_URL=
```

### 4. Add Google Service Account

```bash
# Place service-account.json in project root
cp /path/to/service-account.json ./service-account.json
chmod 600 service-account.json  # Restrict permissions
```

Verify service account email in file:
```bash
jq -r '.client_email' service-account.json
```

Share your Google Sheet with this email address.

## Development Deployment

### Start Services

```bash
# Build and start all services
docker-compose up --build

# Or in detached mode (background)
docker-compose up --build -d
```

**First startup**:
- Whisper service: ~30 seconds (loads model into memory)
- Bot service: ~5 seconds (waits for Whisper health check)

### View Logs

```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f finance-bot
docker-compose logs -f whisper-service

# Last 100 lines
docker-compose logs --tail 100 finance-bot

# Logs since 1 hour ago
docker-compose logs --since 1h finance-bot
```

### Test the System

**1. Test Whisper Service**:
```bash
# Check health
curl http://localhost:8080/

# Test transcription (need audio file)
curl -X POST http://localhost:8080/inference \
  -F "file=@test.ogg" \
  -F "response_format=json"
```

**2. Test Bot Service**:
```bash
# Check health
curl http://localhost:3000/health

# Send test message to bot via Telegram
# Should see logs in `docker-compose logs -f finance-bot`
```

**3. Verify Polling**:
- Wait 5 minutes (default polling interval)
- Check logs for "Polling for updates" message
- Send message to bot, should be processed within 5 minutes

### Stop Services

```bash
# Stop services (keep containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop, remove containers, and delete volumes
docker-compose down -v
```

## Production Deployment

### 1. Server Setup

**Create non-root user**:
```bash
sudo adduser financebot
sudo usermod -aG docker financebot
sudo su - financebot
```

**Clone and configure**:
```bash
cd ~
git clone <repository-url> personal-finance
cd personal-finance
./scripts/download-models.sh
cp .env.example .env
nano .env  # Fill in production values
```

### 2. Security Hardening

**Restrict file permissions**:
```bash
chmod 600 .env
chmod 600 service-account.json
chmod 600 .telegram-offset
```

**Docker security**:
```bash
# Limit container resources
# Edit docker-compose.yml, add to each service:
```
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4G
    reservations:
      cpus: '1.0'
      memory: 2G
```

### 3. Start Services

```bash
docker-compose up -d --build
```

### 4. Setup Systemd (Optional)

Create `/etc/systemd/system/finance-bot.service`:
```ini
[Unit]
Description=Personal Finance Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/financebot/personal-finance
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
User=financebot

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable finance-bot
sudo systemctl start finance-bot
sudo systemctl status finance-bot
```

### 5. Firewall Configuration

```bash
# Allow webhook port (if using webhooks)
sudo ufw allow 3000/tcp

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

## Webhook Configuration

Webhooks provide instant message delivery but require a public HTTPS endpoint.

### Prerequisites

- Public domain name (e.g., `bot.example.com`)
- SSL/TLS certificate (Let's Encrypt recommended)
- Reverse proxy (Nginx/Caddy/Traefik)

### Setup Reverse Proxy (Nginx)

**Install Certbot**:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

**Create Nginx config** `/etc/nginx/sites-available/finance-bot`:
```nginx
server {
    listen 80;
    server_name bot.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable and get SSL certificate**:
```bash
sudo ln -s /etc/nginx/sites-available/finance-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d bot.example.com
```

### Configure Telegram Webhook

**Update .env**:
```env
WEBHOOK_URL=https://bot.example.com/webhook
```

**Restart bot**:
```bash
docker-compose restart finance-bot
```

**Set webhook**:
```bash
export TELEGRAM_BOT_TOKEN="your-token"
export WEBHOOK_URL="https://bot.example.com/webhook"
./scripts/setup-webhook.sh
```

**Verify webhook**:
```bash
export TELEGRAM_BOT_TOKEN="your-token"
./scripts/check-webhook.sh
```

Expected output:
```json
{
  "ok": true,
  "result": {
    "url": "https://bot.example.com/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

### Remove Webhook (Switch to Polling Only)

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook"
```

## Monitoring and Maintenance

### Health Checks

**Bot service**:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"2024-01-15T10:30:45.123Z"}
```

**Whisper service**:
```bash
curl http://localhost:8080/
# Expected: HTTP 200 OK
```

**Service status**:
```bash
docker-compose ps
```

### Log Analysis

**View structured logs**:
```bash
# All error logs
docker-compose logs finance-bot | jq -r 'select(.level=="error")'

# Voice processing events
docker-compose logs finance-bot | jq -r 'select(.message | contains("voice"))'

# Processing duration
docker-compose logs finance-bot | jq -r 'select(.message=="Message processed successfully") | {messageId, type}'

# Last 10 errors with details
docker-compose logs finance-bot | jq -r 'select(.level=="error")' | tail -10
```

**Export logs**:
```bash
# Last 24 hours to file
docker-compose logs --since 24h finance-bot > logs-$(date +%Y%m%d).json

# Compressed archive
docker-compose logs finance-bot | gzip > finance-bot-logs.json.gz
```

### Resource Monitoring

**Docker stats**:
```bash
docker stats
```

**Detailed container inspection**:
```bash
docker-compose exec finance-bot ps aux
docker-compose exec finance-bot free -h
docker-compose exec whisper-service ps aux
```

**Disk usage**:
```bash
# Log file sizes
docker-compose exec finance-bot du -sh /var/lib/docker/containers/*/

# Model size
du -h models/
```

### Updates and Upgrades

**Update bot code**:
```bash
git pull
docker-compose build finance-bot
docker-compose up -d finance-bot
```

**Update Whisper service**:
```bash
docker-compose pull whisper-service
docker-compose up -d whisper-service
```

**Update dependencies**:
```bash
# Update package.json versions
npm update
docker-compose build finance-bot
docker-compose up -d finance-bot
```

## Troubleshooting

### Bot Not Responding

**Check service status**:
```bash
docker-compose ps
docker-compose logs --tail 50 finance-bot
```

**Common causes**:
1. **Configuration error**: Check logs for "Configuration error"
   - Verify .env file values
   - Ensure service-account.json exists

2. **Whisper service unhealthy**: Check Whisper logs
   ```bash
   docker-compose logs whisper-service
   docker-compose restart whisper-service
   ```

3. **Telegram API issues**: Test connectivity
   ```bash
   curl https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe
   ```

4. **Offset stuck**: Reset offset file
   ```bash
   rm .telegram-offset
   docker-compose restart finance-bot
   ```

### Voice Messages Not Transcribing

**Check Whisper service**:
```bash
# Service running?
docker-compose ps whisper-service

# Model loaded?
docker-compose logs whisper-service | grep "model loaded"

# API accessible?
curl http://localhost:8080/
```

**Test with sample audio**:
```bash
# Download sample (Russian)
curl -L -o test.ogg "https://example.com/sample.ogg"

# Test Whisper directly
curl -X POST http://localhost:8080/inference \
  -F "file=@test.ogg" \
  -F "response_format=json"
```

**Common issues**:
- Model file corrupted: Delete and re-download
- Out of memory: Increase Docker memory limit
- Wrong audio format: Check ffmpeg is working

### Webhook Not Working

**Verify webhook registration**:
```bash
export TELEGRAM_BOT_TOKEN="your-token"
./scripts/check-webhook.sh
```

**Check for errors**:
```json
{
  "ok": true,
  "result": {
    "url": "https://bot.example.com/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 5,  // ← Messages waiting!
    "last_error_date": 1705320645,
    "last_error_message": "Connection timeout"
  }
}
```

**Common issues**:
1. **SSL certificate invalid**: Verify with `curl -v https://bot.example.com/webhook`
2. **Port not accessible**: Check firewall rules
3. **Telegram can't reach server**: Verify public IP/domain
4. **Nginx misconfigured**: Check `sudo nginx -t`

**Solution**: Polling will catch missed messages automatically.

### High Memory Usage

**Check Whisper model size**:
```bash
docker stats whisper-service
```

**Solutions**:
- Use smaller model: `ggml-tiny.bin` or `ggml-base.bin`
- Increase swap space
- Upgrade server RAM
- Add memory limits in docker-compose.yml

### Claude API Errors

**Rate limiting**:
```bash
docker-compose logs finance-bot | jq -r 'select(.message | contains("Claude"))'
```

**Solutions**:
- Check API key has credits
- Implement exponential backoff
- Switch to Claude Haiku model (faster, cheaper)

### Google Sheets Permission Denied

**Verify service account**:
```bash
jq -r '.client_email' service-account.json
```

**Check spreadsheet sharing**:
- Open Google Sheet
- Click "Share"
- Ensure service account email has Editor access

**Check logs**:
```bash
docker-compose logs finance-bot | jq -r 'select(.message | contains("Sheets"))'
```

## Backup and Recovery

### Backup

**Configuration and data**:
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup essential files
cp .env backups/$(date +%Y%m%d)/
cp service-account.json backups/$(date +%Y%m%d)/
cp .telegram-offset backups/$(date +%Y%m%d)/

# Create tarball
tar -czf backups/finance-bot-$(date +%Y%m%d).tar.gz \
  .env service-account.json .telegram-offset docker-compose.yml

# Encrypt backup (optional)
gpg -c backups/finance-bot-$(date +%Y%m%d).tar.gz
```

**Google Sheets**:
- Automatic Google Drive backups
- Manual: File → Download → Excel (.xlsx)

**Telegram offset**:
```bash
# Backup offset before maintenance
cp .telegram-offset .telegram-offset.backup
```

### Recovery

**Restore configuration**:
```bash
# Extract backup
tar -xzf backups/finance-bot-20240115.tar.gz

# Or decrypt first
gpg -d backups/finance-bot-20240115.tar.gz.gpg | tar -xz

# Restart services
docker-compose up -d
```

**Restore offset**:
```bash
# Copy backup offset
cp .telegram-offset.backup .telegram-offset

# Restart bot
docker-compose restart finance-bot
```

**Recovery from scratch**:
1. Clone repository
2. Download Whisper model
3. Restore `.env` and `service-account.json`
4. Restore `.telegram-offset` (optional, prevents reprocessing)
5. Start services

### Disaster Recovery Plan

**If server is lost**:
1. All transactions safe in Google Sheets (cloud)
2. Redeploy on new server (30 minutes)
3. Configure webhook with new domain
4. No message loss (Telegram keeps messages 24h)

**If Google Sheets deleted**:
- Restore from Google Drive trash (30 days)
- Restore from manual backup

**If credentials compromised**:
1. Revoke Telegram bot token via @BotFather
2. Regenerate Claude API key
3. Create new Google service account
4. Update .env and restart

## Performance Tuning

### Optimize Polling Interval

**Faster polling** (lower latency, higher resource usage):
```env
POLLING_INTERVAL=60000  # 1 minute
```

**Slower polling** (lower resource usage, higher latency):
```env
POLLING_INTERVAL=600000  # 10 minutes
```

### Optimize Whisper

**Faster inference**:
- Use `ggml-tiny.bin` (75 MB, 3x faster)
- Add `-t 4` flag for 4 CPU threads
- Enable GPU with CUDA/OpenCL build

**Better accuracy**:
- Use `ggml-medium.bin` (1.5 GB)
- Add `--beam-size 5` for beam search

### Optimize Claude

**Faster responses**:
- Use `claude-haiku-4-5-20251001` (current default)
- Reduce `maxTokens` to 2048 if responses are short

**Better accuracy**:
- Switch to `claude-sonnet-4-5-20250929`
- Increase `maxTokens` to 8192

### Database Optimization

**Google Sheets performance**:
- Current: Append-only, O(1) writes
- Improvement: Batch writes (collect multiple transactions)
- Limitation: 50 requests/sec per project

## Support and Resources

**Documentation**:
- [Architecture Overview](ARCHITECTURE.md)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [Claude API Docs](https://docs.anthropic.com/)

**Getting Help**:
- Check logs first: `docker-compose logs -f`
- Verify configuration: `.env` and `service-account.json`
- Test individual services (Whisper, Claude, Sheets)
- Search error messages in documentation

**Common Commands Cheat Sheet**:
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f finance-bot

# Restart service
docker-compose restart finance-bot

# Stop all
docker-compose down

# Health check
curl http://localhost:3000/health

# Check webhook
TELEGRAM_BOT_TOKEN="token" ./scripts/check-webhook.sh
```

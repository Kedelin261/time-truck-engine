# Trucking.Time — Owner Operator Load Intelligence Platform

A full-stack automation system that buys back time for owner operators by:
- **Intelligently scoring and ranking loads** from DAT One based on your history and preferences
- **Sending automated SMS summaries** of top loads with broker contact info
- **Sending automated email reports** — rich HTML with full load details
- **Automated broker intro emails** — introduces your company to new brokers
- **Automated broker follow-up emails** — builds rapport over time
- **Availability broadcasts** — notifies brokers when you have trucks open
- **Fleet management** — track all your trucks, their locations, and availability

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                  │
│    Dashboard │ Loads │ Trucks │ Brokers │ Notifications  │
│         Deployed to: Cloudflare Pages                    │
└─────────────────────────────────────────────────────────┘
                          │ /api/*
┌─────────────────────────────────────────────────────────┐
│              Backend (Spring Boot 3 / Java 17)           │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              INTENT LAYER (Rule: All new logic)  │   │
│  │  IntentType → IntentRequest → IntentRouter       │   │
│  │  No Action Layer modified directly               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Engine:  LoadScorer │ HistoryProfile │ EngineScheduler │
│  Store:   AccountStore │ PreferencesStore │ TruckStore  │
│           BrokerContactStore │ LoadHistoryStore         │
│  Notify:  SmsService (Twilio) │ EmailService (SendGrid) │
│  API:     Loads │ Account │ Trucks │ Brokers │ Intent   │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start (Local Development)

### Prerequisites
- Java 17+
- Node.js 18+
- Maven (or use `./mvnw`)

### 1. Run the Backend
```bash
# From repo root
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./mvnw spring-boot:run
```
Backend starts on http://localhost:8080

### 2. Run the Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Frontend dev server on http://localhost:5173 (proxies /api → :8080)

### 3. Connect a DAT Token (Demo)
```bash
curl -X POST http://localhost:8080/api/users/demo/accounts/dat \
  -H "Content-Type: application/json" \
  -d '{"token":"your-dat-token-here"}'
```
Or use the Settings page in the UI.

---

## Deployment

### Frontend → Cloudflare Pages

**Option 1: Direct Upload via Wrangler CLI**
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=trucking-time
```

**Option 2: GitHub Actions (Automated)**
Set these GitHub Secrets:
- `CLOUDFLARE_API_TOKEN` — your Cloudflare API token (Pages:Edit permission)
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
- `VITE_API_URL` — your backend URL (e.g. `https://your-backend.railway.app/api`)

Push to `main` or `Trucking.Time` branch → auto-deploys.

**Option 3: Cloudflare Pages Dashboard (No Code)**
1. Go to https://dash.cloudflare.com → Pages
2. Create a project → Connect to Git
3. Select your repo
4. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm ci && npm run build`
   - **Build output directory**: `frontend/dist`
5. Environment variable: `VITE_API_URL` = your backend URL

### Backend → Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd /path/to/repo
railway up
```
Set environment variables in Railway dashboard:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `SENDGRID_API_KEY`
- `EMAIL_FROM_ADDRESS`

### Backend → Render
1. New Web Service → Connect GitHub repo
2. Build Command: `./mvnw clean package -DskipTests`
3. Start Command: `java -jar target/truckengine-0.0.1-SNAPSHOT.jar`
4. Add environment variables in Render dashboard

---

## API Reference

### Load Endpoints
```
GET  /api/users/{userId}/top20          # Get top 20 scored loads
GET  /api/users/{userId}/newLoads       # Get new matching loads
```

### Account Endpoints
```
GET  /api/users/{userId}/accounts/status   # DAT connection status
POST /api/users/{userId}/accounts/dat      # Connect DAT token
     Body: { "token": "..." }
```

### Preferences Endpoints
```
GET  /api/users/{userId}/preferences       # Get preferences
POST /api/users/{userId}/preferences       # Update preferences
```

### Truck Endpoints
```
GET    /api/users/{userId}/trucks           # List all trucks
GET    /api/users/{userId}/trucks/available # Available trucks only
POST   /api/users/{userId}/trucks           # Add/update truck
DELETE /api/users/{userId}/trucks/{id}      # Remove truck
```

### Broker Endpoints
```
GET    /api/users/{userId}/brokers                   # List all brokers
POST   /api/users/{userId}/brokers                   # Add/update broker
DELETE /api/users/{userId}/brokers/{id}              # Remove broker
POST   /api/users/{userId}/brokers/{id}/send-intro       # Send intro email
POST   /api/users/{userId}/brokers/{id}/send-followup    # Send follow-up
POST   /api/users/{userId}/brokers/{id}/send-availability # Send availability
```

### Intent Endpoints
```
POST /api/users/{userId}/intent              # Generic intent dispatch
POST /api/users/{userId}/intent/sms-top20    # Trigger SMS summary
POST /api/users/{userId}/intent/email-top20  # Trigger email summary
POST /api/users/{userId}/intent/run-engine   # Re-run engine
POST /api/users/{userId}/intent/activate     # Activate subscription
POST /api/users/{userId}/intent/deactivate   # Deactivate subscription
```

### Booking Endpoints
```
POST /api/users/{userId}/bookings         # Record a booking
GET  /api/users/{userId}/bookings         # List bookings
GET  /api/users/{userId}/bookings/profile # Booking history profile
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS |
| `TWILIO_FROM_NUMBER` | Your Twilio phone number | For SMS |
| `SENDGRID_API_KEY` | SendGrid API key | For Email |
| `EMAIL_FROM_ADDRESS` | Verified sender email | For Email |
| `EMAIL_FROM_NAME` | Sender display name | For Email |
| `PORT` | Server port (default: 8080) | Optional |

**Dev mode**: Without credentials, all SMS/emails are logged to console.

---

## SMS Integration (Twilio)
1. Create account at https://www.twilio.com
2. Buy a phone number
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
4. Enable SMS in Notifications settings
5. Receive top 5 load alerts with broker phone numbers

## Email Integration (SendGrid)
1. Create account at https://sendgrid.com
2. Verify your sender domain
3. Create an API key
4. Set `SENDGRID_API_KEY` and `EMAIL_FROM_ADDRESS`
5. Enable Email in Notifications settings
6. Receive rich HTML reports with all 20 loads + broker contacts

---

## Intent Layer Architecture Rule

> **All new logic communicates only via the Intent Layer — no Action Layer changes.**

Every new automation feature must:
1. Define an `IntentType` enum value
2. Create an `IntentRequest` via `IntentRequest.builder(type, userId).build()`
3. Submit via `intentRouter.dispatch(request)`
4. Handle the response in `IntentRouter.dispatch()` switch statement

This ensures all automation is centrally managed, logged, and testable.

---

## Load Scoring Algorithm

Loads are scored using a combination of:
- **Base score**: `($/mile × 60) - (deadhead × 0.6) + (min(miles, 900) × 0.03)`
- **Lane boost**: Up to +20 pts for lanes you run frequently (from booking history)
- **Miles boost**: Up to +10 pts for loads similar to your average haul distance
- **Equipment boost**: +10 pts when load matches your most common equipment type

Result: The engine surfaces loads that match YOUR specific operation, not generic rankings.

---

*Trucking.Time — Smarter loads. Your time back.*

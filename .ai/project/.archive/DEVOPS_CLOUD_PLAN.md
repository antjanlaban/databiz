# [DEVOPS] Cloud Deployment Plan - DataBiz Next

**Status:** Draft  
**Datum:** December 17, 2025  
**Auteur:** DevOps Engineer Agent  
**Review door:** Architect Agent  

---

## 📋 Executive Summary

Dit document beschrijft het deployment plan voor DataBiz Next naar cloud-omgevingen, conform de company standards uit `BUSINESS_SYSTEM.md`. We implementeren een **OTAP-structuur** met Railway (backend/database) en Cloudflare (frontend/CDN).

### Budget Samenvatting
| Omgeving | Maandelijkse Kosten |
|----------|---------------------|
| Test (T) | €0 (CI/CD only) |
| Acceptance (A) | ~€5-7 |
| Production (P) | ~€7-10 |
| **Totaal** | **~€12-17/maand** |

---

## 🏗️ OTAP Environments (conform BUSINESS_SYSTEM.md)

### O - Development (Lokaal)
**Locatie:** Developer laptop  
**Database:** PostgreSQL (Docker)  
**Storage:** MinIO (Docker)  
**Status:** ✅ Reeds geïmplementeerd

```
┌─────────────────────────────────────────────────────────┐
│                    LOCALHOST (Docker)                    │
├──────────────┬──────────────┬──────────────────────────┤
│  PostgreSQL  │    MinIO     │   Backend (uvicorn)      │
│    :9020     │  :9022/:9023 │        :9000             │
└──────────────┴──────────────┴──────────────────────────┘
```

### T - Test (CI/CD)
**Locatie:** GitHub Actions  
**Database:** Ephemeral PostgreSQL (service container)  
**Doel:** Automated tests op elke commit

### A - Acceptance/Staging
**Locatie:** Railway (staging project)  
**Database:** Railway PostgreSQL (managed)  
**Storage:** Cloudflare R2  
**Frontend:** Cloudflare Pages (preview)  
**URL:** `staging.databiz.antjan.nl`

### P - Production
**Locatie:** Railway (production project)  
**Database:** Railway PostgreSQL (managed, daily backups)  
**Storage:** Cloudflare R2  
**Frontend:** Cloudflare Pages (production)  
**URL:** `app.databiz.antjan.nl`

---

## ✅ OTAP Blueprint (Dummyproof)

### 0) Single Config Contract (anti-config-hell)

**Rule:** we define exactly 1 canonical config contract, and we enforce it everywhere (local, CI, staging, prod). Where legacy exists, we support aliases in code.

**Canonical backend env vars (source of truth):**

- `ENVIRONMENT` = `development|test|staging|production`
- `DATABASE_URL` (cloud) **or** `POSTGRES_*` (local)
- `MINIO_*` (local) / S3-compatible (cloud, e.g. Cloudflare R2)
- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`

**Implemented:** backend settings accept aliases (`JWT_SECRET` → `SECRET_KEY`, `PYTHON_ENV` → `ENVIRONMENT`, etc.).

### 1) Promotion / Release Flow (fast + safe)

**Goal:** stakeholders see a stable Production that only contains changes that passed Test and were accepted in Staging.

- `feature/*` → PR into `dev`
- `dev` = CI Test environment gate (T)
- merge `dev` → `staging` deploys Acceptance (A)
- manual QA + sign-off on A
- merge `staging` → `main` deploys Production (P)

**Quality gate alignment:**
- Tests in O: Unit + Integration (no E2E)
- Tests in T (CI): Unit + Integration + E2E (DEC-010)
- A is manual QA/smoke; P is monitoring

SSOT: `.ai/project/TEST_STRATEGY_LITE.md`

### 2) Stakeholder Demo Strategy (fast path)

To get “something live” quickly without breaking the OTAP rules:

- First deploy Staging (A) with a minimal, stable slice-set
- Promote the exact same build to Production (P) after sign-off
- Keep Production read-only or with limited demo data until we have full operational readiness

### 3) Health/Readiness Standards

- Liveness: `/health` returns 200
- Deploy/agent health: `/api/v2/health` returns 200 + environment metadata
- Readiness: `/api/v2/ready` returns DB connectivity status

---

## 🚀 Fase 1: Infrastructure Setup

### 1.1 Railway Project Structuur

```
Railway Organization: antjan
├── databiz-staging (A)
│   ├── backend (Python service)
│   ├── postgres (managed)
│   └── environment variables
└── databiz-production (P)
    ├── backend (Python service)
    ├── postgres (managed, with backups)
    └── environment variables
```

### 1.2 Cloudflare Setup

```
Cloudflare Account: antjan
├── R2 Storage
│   ├── databiz-staging-storage
│   └── databiz-production-storage
├── Pages
│   ├── databiz-staging (preview deployments)
│   └── databiz-production (main branch)
└── DNS
    ├── staging.databiz.antjan.nl → Pages preview
    └── app.databiz.antjan.nl → Pages production
```

---

## 📦 Fase 2: Backend Deployment (Railway)

### 2.1 Dockerfile voor Production

Maak aan: `backend/Dockerfile`

```dockerfile
# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY alembic.ini .
COPY migrations/ ./migrations/

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/v2/health || exit 1

# Expose port (Railway uses $PORT)
EXPOSE 8080

# Run with gunicorn for production
CMD ["sh", "-c", "alembic upgrade head && gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT"]
```

### 2.2 Railway Configuration

Maak aan: `railway.toml`

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
healthcheckPath = "/api/v2/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### 2.3 Environment Variables per Omgeving

**Staging (.env.staging)**
```env
# Database (Railway provides DATABASE_URL automatically)
DATABASE_URL=${DATABASE_URL}

# MinIO/R2 Storage
MINIO_ENDPOINT=<r2-account-id>.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=${R2_ACCESS_KEY}
MINIO_SECRET_KEY=${R2_SECRET_KEY}
MINIO_BUCKET_RAW=databiz-staging-raw
MINIO_BUCKET_PROCESSED=databiz-staging-processed
MINIO_USE_SSL=true

# Security
JWT_SECRET=${JWT_SECRET_STAGING}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Environment
ENVIRONMENT=staging
DEBUG=false
LOG_LEVEL=INFO
```

**Production (.env.production)**
```env
# Database
DATABASE_URL=${DATABASE_URL}

# MinIO/R2 Storage
MINIO_ENDPOINT=<r2-account-id>.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=${R2_ACCESS_KEY}
MINIO_SECRET_KEY=${R2_SECRET_KEY}
MINIO_BUCKET_RAW=databiz-production-raw
MINIO_BUCKET_PROCESSED=databiz-production-processed
MINIO_USE_SSL=true

# Security
JWT_SECRET=${JWT_SECRET_PRODUCTION}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING
```

---

## 🎨 Fase 3: Frontend Deployment (Cloudflare Pages)

### 3.1 Build Configuration

Update: `frontend/package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "build:staging": "VITE_API_URL=https://staging-api.databiz.antjan.nl vite build",
    "build:production": "VITE_API_URL=https://api.databiz.antjan.nl vite build"
  }
}
```

### 3.2 Cloudflare Pages Settings

```yaml
# wrangler.toml (frontend)
name = "databiz-frontend"
compatibility_date = "2024-01-01"

[env.staging]
route = "staging.databiz.antjan.nl/*"

[env.production]  
route = "app.databiz.antjan.nl/*"
```

### 3.3 Environment-Specific API URLs

Maak aan: `frontend/.env.example`

```env
# API Configuration
VITE_API_URL=http://localhost:9000/api/v2
VITE_ENVIRONMENT=development
```

---

## 🔄 Fase 4: CI/CD Pipeline (GitHub Actions)

### 4.1 Test Pipeline

Maak aan: `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [dev, staging, main]
  pull_request:
    branches: [dev]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: databiz_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        working-directory: backend
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx
          
      - name: Run migrations
        working-directory: backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/databiz_test
        run: alembic upgrade head
        
      - name: Run tests
        working-directory: backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/databiz_test
          JWT_SECRET: test-secret-key
        run: pytest -v --tb=short

  frontend-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
        
      - name: Type check
        working-directory: frontend
        run: npm run typecheck
        
      - name: Lint
        working-directory: frontend
        run: npm run lint
        
      - name: Build
        working-directory: frontend
        run: npm run build
```

### 4.2 Deploy Pipeline

Maak aan: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches:
      - staging  # Deploy to Acceptance (A)
      - main     # Deploy to Production (P)

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway (Staging)
        if: github.ref == 'refs/heads/staging'
        uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN_STAGING }}
          service: databiz-backend
          
      - name: Deploy to Railway (Production)
        if: github.ref == 'refs/heads/main'
        uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN_PRODUCTION }}
          service: databiz-backend

  deploy-frontend:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
        
      - name: Build (Staging)
        if: github.ref == 'refs/heads/staging'
        working-directory: frontend
        run: npm run build:staging
        
      - name: Build (Production)
        if: github.ref == 'refs/heads/main'
        working-directory: frontend
        run: npm run build:production
        
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy frontend/dist --project-name=databiz
```

---

## 🔐 Fase 5: Secrets Management

### 5.1 GitHub Secrets (Repository Settings)

```
# Railway
RAILWAY_TOKEN_STAGING     # Token voor staging project
RAILWAY_TOKEN_PRODUCTION  # Token voor production project

# Cloudflare
CLOUDFLARE_API_TOKEN      # API token met Pages/R2 permissions
CLOUDFLARE_ACCOUNT_ID     # Account ID

# R2 Storage
R2_ACCESS_KEY_STAGING
R2_SECRET_KEY_STAGING
R2_ACCESS_KEY_PRODUCTION
R2_SECRET_KEY_PRODUCTION
```

### 5.2 Railway Environment Variables

Via Railway Dashboard of CLI:
```bash
# Staging
railway variables set JWT_SECRET=<generated-secret>
railway variables set R2_ACCESS_KEY=<key>
railway variables set R2_SECRET_KEY=<secret>

# Production (zelfde, met andere values)
```

---

## 📊 Fase 6: Monitoring & Observability

### 6.1 Health Endpoints

Update backend health endpoint (`backend/src/main.py`):

```python
@app.get("/api/v2/health")
async def health():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",  # TODO: Read from package/git
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v2/ready")
async def ready():
    # Check database connection
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ready" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }
```

### 6.2 Logging Configuration

Update `backend/src/shared/config.py`:

```python
import logging
import sys
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "environment": settings.ENVIRONMENT
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(settings.LOG_LEVEL)
```

### 6.3 Error Tracking (Optioneel - Fase 2)

Voor toekomstige uitbreiding met Sentry:
```python
# In main.py
if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1
    )
```

---

## 🔄 Fase 7: Database Backup & Recovery

### 7.1 Railway Automatic Backups

Railway PostgreSQL biedt automatische daily backups (production):
- Retentie: 7 dagen
- Point-in-time recovery beschikbaar

### 7.2 Manual Backup Script

Maak aan: `scripts/backup-db.sh`

```bash
#!/bin/bash
# Manual database backup to Cloudflare R2

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="databiz_backup_${TIMESTAMP}.sql"

# Dump database
pg_dump $DATABASE_URL > /tmp/$BACKUP_FILE

# Compress
gzip /tmp/$BACKUP_FILE

# Upload to R2
aws s3 cp /tmp/${BACKUP_FILE}.gz s3://databiz-backups/${BACKUP_FILE}.gz \
    --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# Cleanup
rm /tmp/${BACKUP_FILE}.gz

echo "Backup completed: ${BACKUP_FILE}.gz"
```

---

## 📅 Implementatie Roadmap

### Week 1: Foundation
- [ ] Railway accounts aanmaken (staging + production)
- [ ] Cloudflare R2 buckets aanmaken
- [ ] DNS configuratie (staging.databiz.antjan.nl, app.databiz.antjan.nl)
- [ ] GitHub Secrets configureren

### Week 2: Backend Deployment
- [ ] Dockerfile maken en testen lokaal
- [ ] Railway service configureren
- [ ] Environment variables instellen
- [ ] Eerste deploy naar staging

### Week 3: Frontend & CI/CD
- [ ] Cloudflare Pages configureren
- [ ] GitHub Actions workflows testen
- [ ] Full CI/CD pipeline live

### Week 4: Production Go-Live
- [ ] Production environment inrichten
- [ ] Database migratie
- [ ] Eerste admin user aanmaken
- [ ] Go-live!

---

## ✅ Definition of Done

- [ ] Staging environment draait op Railway
- [ ] Production environment draait op Railway
- [ ] Frontend deployed via Cloudflare Pages
- [ ] CI/CD pipeline werkt (push to main = auto-deploy)
- [ ] Health endpoints beschikbaar
- [ ] Secrets veilig opgeslagen (niet in code)
- [ ] Database backups geconfigureerd
- [ ] Monitoring/logging actief
- [ ] Documentation bijgewerkt

---

## 📝 Architect Review Punten

**[ARCHITECT] Review gevraagd voor:**

1. **Storage Strategy**: MinIO lokaal → Cloudflare R2 cloud. Is de `storage.py` abstraction voldoende?
2. **Database URLs**: Railway injecteert `DATABASE_URL`. Moet `database.py` worden aangepast?
3. **Environment Detection**: Hoe detecteren we `ENVIRONMENT` betrouwbaar?
4. **CORS Configuration**: Verschillende origins per environment - hoe configureren?
5. **API Versioning**: Is `/api/v2` de juiste prefix voor Railway routing?

---

## 🔗 Gerelateerde Documenten

- [BUSINESS_SYSTEM.md](../.ai/company/BUSINESS_SYSTEM.md) - Company standards
- [TECH_STACK.md](../.ai/company/TECH_STACK.md) - Technical implementation guide
- [DEVOPS_ENGINEER.md](../.ai/company/agent-library/specialized/DEVOPS_ENGINEER.md) - Agent responsibilities
- [PORT_REGISTRY.yaml](PORT_REGISTRY.yaml) - Local port allocation

---

**Volgende stap:** Review door [ARCHITECT], daarna starten met Week 1 taken.

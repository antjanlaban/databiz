# DataBiz Next - Deployment Guide

> **Laatst bijgewerkt:** 2025-12-17  
> **Door:** AI-DIRECTOR

Dit document beschrijft de volledige deployment setup voor DataBiz Next naar Railway (backend) en Cloudflare Pages (frontend).

---

## 📋 Overzicht Architectuur

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE PAGES                         │
│                    (Frontend - React/Vite)                       │
│              databiz-next-staging.pages.dev                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS API calls
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                          RAILWAY                                 │
│  ┌─────────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Backend      │  │  PostgreSQL │  │       MinIO         │  │
│  │   (FastAPI)     │◄─┤  (Database) │  │  (Object Storage)   │  │
│  │   Port: $PORT   │  │  Port: 5432 │  │  API: 9000          │  │
│  └─────────────────┘  └─────────────┘  │  Console: 9001      │  │
│                                         └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌍 Environments

| Environment | Git Branch | Backend URL | Frontend URL |
|-------------|------------|-------------|--------------|
| Acceptance | `staging` | `databiz-next-acceptance-production.up.railway.app` | `databiz-next-staging.pages.dev` |
| Production | `main` | `databiz-next-production.up.railway.app` | `databiz-next.pages.dev` |

---

## 🚂 Railway Setup (Backend + Database + Storage)

### Stap 1: Project Aanmaken

1. Ga naar https://railway.app
2. Klik **New Project** → **Deploy from GitHub repo**
3. Selecteer `antjanlaban/databiz-next`
4. Railway maakt automatisch een environment aan

### Stap 2: PostgreSQL Toevoegen

1. In je Railway project, klik **+ New**
2. Kies **Database** → **PostgreSQL**
3. Railway maakt automatisch:
   - Database instance
   - `DATABASE_URL` environment variable

### Stap 3: MinIO Toevoegen (Object Storage)

1. Klik **+ New** → **Docker Image**
2. Image: `minio/minio`
3. Ga naar **Settings** → **Deploy**:
   - **Start Command:**
     ```
     minio server /data --address ":9000" --console-address ":9001"
     ```
4. Ga naar **Settings** → **Volumes**:
   - Klik **Add Volume**
   - Mount Path: `/data`
5. Ga naar **Variables** en voeg toe:
   ```
   MINIO_ROOT_USER=databiz
   MINIO_ROOT_PASSWORD=<genereer-sterk-wachtwoord>
   ```
6. Ga naar **Settings** → **Networking**:
   - Genereer public domain voor port **9000** (API)
   - (Optioneel) Genereer domain voor port **9001** (Console UI)

### Stap 4: Backend Service Configureren

1. Klik op de backend service
2. Ga naar **Settings** → **Source**:
   - **Branch:** `staging` (voor acceptance) of `main` (voor production)
3. Ga naar **Settings** → **Deploy**:
   - **Start Command:**
     ```
     python -m alembic upgrade head && python -m src.domains.identity.seed && python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT
     ```
   - Dit draait automatisch:
     1. Database migraties
     2. Admin user seeding
     3. API server
4. Ga naar **Variables** en voeg toe:

| Variable | Waarde | Beschrijving |
|----------|--------|--------------|
| `DATABASE_URL` | (automatisch door Railway) | PostgreSQL connection string |
| `JWT_SECRET` | `<genereer-sterk-wachtwoord>` | JWT signing key |
| `MINIO_ENDPOINT` | `minio-xxx.up.railway.app` | MinIO public URL (port 9000) |
| `MINIO_ACCESS_KEY` | `databiz` | MinIO username |
| `MINIO_SECRET_KEY` | `<zelfde als MINIO_ROOT_PASSWORD>` | MinIO password |
| `MINIO_BUCKET` | `raw-uploads` | Default bucket naam |
| `MINIO_SECURE` | `true` | HTTPS enabled |
| `ENVIRONMENT` | `acceptance` of `production` | Environment naam |

5. Ga naar **Settings** → **Networking**:
   - Genereer public domain
   - Health check path: `/api/v2/health`

### Stap 5: MinIO Buckets Aanmaken

1. Open MinIO Console: `https://minio-xxx.up.railway.app:9001`
   - Of via de port 9001 domain als je die hebt aangemaakt
2. Login met `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
3. Klik **Buckets** → **Create Bucket**:
   - `raw-uploads` (voor uploads)
   - `processed-json` (optioneel, voor verwerkte data)

### Stap 6: Verificatie

Test de endpoints:

```bash
# Health check
curl https://[backend-url]/health
# Expected: {"status":"healthy"}

# Database connection
curl https://[backend-url]/api/v2/ready
# Expected: {"status":"ready","database":"connected",...}

# Hello endpoint
curl https://[backend-url]/hello
# Expected: {"message":"Hello from DataBiz!",...}
```

---

## ☁️ Cloudflare Pages Setup (Frontend)

### Stap 1: Project Aanmaken

1. Ga naar https://dash.cloudflare.com
2. Klik **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Selecteer repository: `antjanlaban/databiz-next`
4. Klik **Begin setup**

### Stap 2: Build Settings

| Setting | Waarde |
|---------|--------|
| **Production branch** | `staging` (acceptance) of `main` (production) |
| **Build command** | `npm install --prefix frontend && npm run build --prefix frontend` |
| **Deploy command** | `echo "Deploy handled by Pages"` |
| **Path** (Build output) | `frontend/dist` |
| **Root directory** | `/` (leeg) |

### Stap 3: Environment Variables

Ga naar **Settings** → **Variables and Secrets** en voeg toe:

| Variable | Waarde | Environment |
|----------|--------|-------------|
| `VITE_API_URL` | `https://[backend-url].up.railway.app` | Production + Preview |

**Belangrijk:** Na het toevoegen van variables, trigger een redeploy!

### Stap 4: API Token Permissies

Als je een custom API token gebruikt, zorg dat deze permissies heeft:
- **Account** → **Cloudflare Pages** → **Edit**
- **Account** → **Account Settings** → **Read**

### Stap 5: Verificatie

1. Open de Cloudflare Pages URL
2. Je zou naar `/login` geredirect moeten worden
3. Login met: `admin@databiz.nl` / `admin123`

---

## 🔐 CORS Configuratie

De backend moet de frontend URL toestaan. Check `backend/src/shared/config.py`:

```python
CORS_ORIGINS: list[str] = Field(
    default=["http://localhost:9003", "http://localhost:5173"],
    validation_alias=AliasChoices("CORS_ORIGINS"),
)
```

Voor production, voeg de Cloudflare Pages URL toe via environment variable:
```
CORS_ORIGINS=["https://databiz-next-staging.pages.dev","https://databiz-next.pages.dev"]
```

---

## 📁 Dockerfile Configuratie

De `Dockerfile` in de root is geconfigureerd voor Railway:

```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc postgresql-client
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY backend/src ./src
COPY backend/migrations ./migrations
COPY backend/alembic.ini .

ENV PYTHONUNBUFFERED=1
EXPOSE ${PORT:-9000}

# Railway provides $PORT dynamically
CMD ["/bin/sh", "-c", "python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT"]
```

---

## 🔧 railway.toml Configuratie

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
numReplicas = 1
healthcheckPath = "/api/v2/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
startCommand = "python -m alembic upgrade head && python -m src.domains.identity.seed && python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT"
```

---

## 🚀 Deployment Workflow

### Automatische Deploys

| Push naar branch | Triggert |
|------------------|----------|
| `staging` | Railway Acceptance + Cloudflare Pages Staging |
| `main` | Railway Production + Cloudflare Pages Production |

### Handmatige Deploy (Railway)

1. Railway Dashboard → Service → **Deploy** → **Deploy Latest Commit**

### Handmatige Deploy (Cloudflare)

1. Cloudflare Dashboard → Pages → Deployments → **Retry deployment**

---

## 🐛 Troubleshooting

### Backend start niet

1. Check logs: Railway → Service → **Deployments** → klik op deployment
2. Veelvoorkomende issues:
   - `$PORT` niet correct: Zorg dat Start Command `$PORT` gebruikt (niet hardcoded)
   - Database niet bereikbaar: Check `DATABASE_URL` format (`postgresql+asyncpg://`)
   - Migraties falen: Run handmatig in Railway shell

### MinIO werkt niet

1. Check Start Command: `minio server /data --address ":9000" --console-address ":9001"`
2. Check Volume is gemount op `/data`
3. Check MINIO_ROOT_USER en MINIO_ROOT_PASSWORD zijn gezet

### Frontend kan niet met backend praten

1. Check `VITE_API_URL` is correct in Cloudflare
2. Check CORS_ORIGINS in backend bevat frontend URL
3. Check backend is publiek toegankelijk

### Login werkt niet

1. Check database migraties zijn gedraaid: `alembic upgrade head`
2. Check admin user bestaat: `python -m src.domains.identity.seed`
3. Check JWT_SECRET is gezet

---

## 📊 Kosten Indicatie (Railway)

| Resource | Acceptance | Production |
|----------|------------|------------|
| Backend | ~$5/maand | ~$10/maand |
| PostgreSQL | ~$5/maand | ~$10/maand |
| MinIO | ~$5/maand + storage | ~$10/maand + storage |
| **Totaal** | ~$15/maand | ~$30/maand |

Cloudflare Pages: **Gratis** (tot 500 builds/maand)

---

## ✅ Checklist Nieuwe Environment

- [ ] Railway project aangemaakt
- [ ] PostgreSQL toegevoegd
- [ ] MinIO toegevoegd met Start Command en Volume
- [ ] Backend environment variables geconfigureerd
- [ ] Backend branch correct ingesteld
- [ ] MinIO buckets aangemaakt (`raw-uploads`)
- [ ] Backend health check werkt (`/api/v2/ready`)
- [ ] Cloudflare Pages project aangemaakt
- [ ] Build settings correct
- [ ] `VITE_API_URL` geconfigureerd
- [ ] Frontend laadt en redirect naar login
- [ ] Login werkt met admin credentials
- [ ] CORS correct geconfigureerd

---

## 📞 Support

Bij problemen:
- Railway Docs: https://docs.railway.app
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages
- MinIO Docs: https://min.io/docs/minio/linux/index.html

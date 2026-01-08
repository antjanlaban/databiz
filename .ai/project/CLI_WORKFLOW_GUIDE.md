# 🛠️ CLI Workflow Guide

> **Role:** [DEVOPS] & [ARCHITECT] > **Philosophy:** "If it's not in a script, it doesn't exist."

This guide defines the **CLI-First** approach for DataBiz Next. All infrastructure, deployment, and testing tasks must be executable via terminal commands.

---

## 1. Infrastructure Management (Railway)

We use the `railway` CLI for all environment configuration.

### 🌍 Environment Variables

**View current variables:**

```bash
railway variables
```

**Set Storage Provider (Cloudflare R2):**

```bash
railway variables --set "STORAGE_PROVIDER=minio" \
  --set "MINIO_ENDPOINT=https://<account>.r2.cloudflarestorage.com" \
  --set "MINIO_BUCKET_RAW=databiz-development"
```

**Sync Remote Env to Local:**

```bash
# Updates backend/.env with Railway values
npm run sync:env
```

### 🚀 Deployment

**Deploy current directory:**

```bash
railway up
```

**Check Status:**

```bash
railway status
```

---

## 2. Database Operations

We use `npm` scripts as wrappers around Alembic and Python scripts to ensure consistency.

### 🏥 Health & Status

**Check Connection & Migrations:**

```bash
npm run db:check
```

**Show Current Revision:**

```bash
npm run db:current
```

### 🔄 Migrations

**Create New Migration:**

```bash
# Usage: npm run db:migrate:create -- "description"
cd backend && alembic revision --autogenerate -m "add_product_table"
```

**Apply Migrations:**

```bash
npm run db:migrate
```

**Rollback (Undo Last):**

```bash
npm run db:rollback
```

### 🌱 Seeding

**Seed Development Data:**

```bash
npm run seed
```

---

## 3. Development Workflow

### ⚡ Start Services

**Start All (Backend + Frontend):**

```bash
npm start
```

**Start Backend Only:**

```bash
npm run dev:backend
```

### 🧹 Cleanup

**Kill Orphaned Processes:**

```bash
npm run clean:ports
```

---

## 4. Testing & Verification

### 🧪 Backend Tests

**Run All Tests:**

```bash
cd backend && .\run_tests.bat
```

**Run Fast Tests (Skip Integration):**

```bash
cd backend && .\run_tests.bat fast
```

**Run Specific Domain:**

```bash
cd backend && pytest tests/domains/imports/
```

### 🔍 Storage Verification

**List Files in R2 Bucket:**

```bash
# Requires AWS CLI configured or use our python script
python scripts/list_r2_files.py
```

---

## 5. n8n Workflow Management

While n8n is visual, we manage its configuration via CLI.

**Export Workflows to Git:**

```bash
# Manual step currently, planned for automation
# Save JSON to: docs/n8n-workflows/
git add docs/n8n-workflows/*.json
git commit -m "feat(n8n): update import workflow"
```

**Trigger Webhook (Test):**

```bash
curl -X POST https://databiz-dev-n8n.up.railway.app/webhook/import-trigger \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

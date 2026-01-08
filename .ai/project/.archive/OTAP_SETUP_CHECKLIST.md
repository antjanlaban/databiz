# OTAP Setup Checklist

Deze checklist begeleidt je door het instellen van de complete OTAP pipeline (T→A→P).

## Phase 1: GitHub Configuration (Repository Settings)

### 1.1 Add Repository Secrets

Go to **GitHub → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value | Used in |
|-------------|-------|---------|
| `RAILWAY_TOKEN_STAGING` | Railway API token for staging project | `deploy-staging.yml` |
| `RAILWAY_TOKEN_PROD` | Railway API token for production project | `deploy-prod.yml` |

**How to get Railway tokens:**
1. Go to https://railway.app/dashboard
2. Create or select your staging project
3. Settings → API Token → Copy token
4. Add as `RAILWAY_TOKEN_STAGING`
5. Repeat for production project

### 1.2 Create Branch Protection Rules

Go to **GitHub → Settings → Branches → Branch protection rules**:

#### Rule 1: Protect `main`
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Required checks: `quality-gate` (from `ci.yml`)
- ✅ Restrict who can push to matching branches (optional, for enterprises)
- ✅ Require branches to be up to date before merging

#### Rule 2: Protect `staging`
- Branch name pattern: `staging`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Required checks: `quality-gate` (from `ci.yml`)
- ✅ Require branches to be up to date before merging

#### Rule 3: Protect `dev`
- Branch name pattern: `dev`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Required checks: `quality-gate` (from `ci.yml`)
- ✅ Require branches to be up to date before merging

### 1.3 Verify Workflow Triggers

Test that workflows trigger correctly:
1. Create a feature branch: `git checkout -b feature/test-ci main`
2. Make a small change: `echo "# Test" > test.md`
3. Commit and push: `git add test.md && git commit -m "test: trigger CI" && git push -u origin feature/test-ci`
4. Create PR on GitHub targeting `dev`
5. Watch `ci.yml` run in the PR checks

**Expected result:** ✅ All checks pass (backend tests, frontend build, E2E).

## Phase 2: Railway Configuration

### 2.1 Create Railway Projects

1. Go to https://railway.app/dashboard
2. Create a new project:
   - Name: `databiz-next-staging`
   - Description: "Acceptance (A) environment"
3. Create another project:
   - Name: `databiz-next-prod`
   - Description: "Production (P) environment"

### 2.2 Configure Railway Services

For each project (staging + prod):

#### Backend Service
1. Click "+ New" → "Database" → PostgreSQL
   - Name: `postgres-staging` (or `postgres-prod`)
   - Version: 16

2. Click "+ New" → "GitHub Repo" → select `databiz-next`
   - Name: `backend-api`
   - Root directory: `backend/`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`

3. Link PostgreSQL: 
   - In backend service settings, add plugin: PostgreSQL
   - Environment variable: `DATABASE_URL` (auto-mapped)

#### Frontend Service
1. Click "+ New" → "GitHub Repo" → select `databiz-next`
   - Name: `frontend-web`
   - Root directory: `frontend/`
   - Build command: `npm ci && npm run build`
   - Start command: `npm run preview`
   - Publish: Port 5173 (or 4173)

### 2.3 Test Deployment

Push to staging branch:
```bash
git checkout staging
git push origin staging
```

Watch **Actions** tab → `deploy-staging.yml` runs.

**Check Railway:**
- Go to `databiz-next-staging` project
- Verify backend + frontend are running
- Check logs for errors

## Phase 3: Cloudflare Configuration

### 3.1 Create R2 Buckets (Object Storage)

1. Go to https://dash.cloudflare.com
2. R2 → Create bucket:
   - Name: `databiz-staging-files`
   - Location: region of choice

3. Create another:
   - Name: `databiz-prod-files`

### 3.2 Setup Cloudflare Pages for Frontend

1. Go to https://dash.cloudflare.com
2. Pages → Create a project:
   - Select your `databiz-next` repo
   - Choose framework: Vite
   - Build directory: `frontend/dist`
   - Production branch: `main` (later add staging)

3. Deploy once via UI (test)

4. Later: Add staging deployment
   - Pages → Settings → Add branch
   - `staging` → deploy to `staging.databiz.dev`

## Phase 4: Test the Full Pipeline

### 4.1 Feature Development (O)
```bash
git checkout -b feature/my-feature dev
# ... make changes
git push -u origin feature/my-feature
# Create PR on GitHub → targeting dev
```

### 4.2 T (CI) — Auto-runs
- GitHub Actions runs `ci.yml`
- Backend: pytest ✅
- Frontend: build + lint ✅
- E2E: Playwright ✅

### 4.3 Merge to Dev
```bash
# After PR approval + CI green
# Merge PR via GitHub UI
```

### 4.4 Promote to A (Staging)
```bash
git checkout staging
git merge dev
git push origin staging
# deploy-staging.yml runs automatically
# Railway staging + Cloudflare Pages staging updated
```

### 4.5 Promote to P (Production)
```bash
git checkout main
git merge staging
git push origin main
# deploy-prod.yml runs automatically
# Railway prod + Cloudflare Pages prod updated
```

## Phase 5: Ongoing Maintenance

### Database Migrations
- Add migration file in `backend/migrations/versions/`
- `deploy-staging.yml` and `deploy-prod.yml` must run migrations before starting the app
- TODO: Add Alembic upgrade step in workflows

### Monitoring
- Railway: Logs & CPU/Memory monitoring
- Cloudflare: Analytics + error tracking
- GitHub Actions: Workflow runs + failure alerts

### Secrets Rotation
- Every 90 days: rotate Railway API tokens
- Update in GitHub Secrets

## Troubleshooting

### CI fails but local tests pass
- Check: Node version in CI vs local (`actions/setup-node@v4` uses 18)
- Check: Python version in CI vs local (`actions/setup-python@v5` uses 3.11)
- Check: Database connection string in CI (uses test DB container)

### Staging/Prod deploy fails
- Check Railway logs: `databiz-next-staging` → Logs
- Check if `DATABASE_URL` is set correctly
- Check if port is correct (Railway assigns dynamic `$PORT`)

### E2E tests timeout
- Increase timeout in `ci.yml`: `--timeout 60000` (milliseconds)
- Check if backend is actually running in CI (see "Wait for backend" step)

## Next Steps

- [ ] Phase 1: Secrets + branch protection ← **START HERE**
- [ ] Phase 2: Railway projects + services
- [ ] Phase 3: Cloudflare R2 + Pages
- [ ] Phase 4: Full pipeline test
- [ ] Phase 5: Monitor + maintain

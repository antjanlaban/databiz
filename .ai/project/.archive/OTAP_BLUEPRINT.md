# [DEVOPS] + [ARCHITECT] OTAP Blueprint (Dummyproof) — DataBiz Next

**Status:** Active proposal (ready for execution)  
**Datum:** December 17, 2025  
**Doel:** Een simpel, voorspelbaar OTAP-systeem dat agents en engineers zonder “config hell” kunnen uitvoeren, en waarmee we snel een stabiele productie omgeving voor stakeholders hebben.

---

## 1) Non‑Negotiables (Company Standards)

- **OTAP is fixed:** O → T → A → P, altijd in deze volgorde.
- **Infra stack:** Railway (backend + Postgres), Cloudflare Pages (frontend), Cloudflare R2 (storage) + GitHub Actions (CI/CD).
- **No secrets in code:** alleen env vars / GitHub secrets / Railway vars.
- **Single Config Contract:** 1 canonical set env vars (met beperkte backwards-compatible aliases).

---

## 2) OTAP Definitie (wat is wat)

### O — Development (lokaal)
**Doel:** snelle iteration, disposable.  
**Runs:** `docker compose up -d db storage` + local backend + local frontend.

- DB: PostgreSQL Docker `:9020`
- Storage: MinIO Docker `:9022` / console `:9023`
- Backend: `:9000`
- Frontend: `:9003`

**Tests in O (conform TEST_STRATEGY_LITE + DEC-010):**
- Unit + Integration (snel, < 2 min)
- Geen E2E lokaal

### T — Test (CI)
**Doel:** automatische gatekeeper; niets gaat naar A/P zonder T green.

- Trigger: PR naar `dev` en pushes naar `dev|staging|main`
- DB: ephemeral postgres service container
- Output: test results + build artifacts

**Tests in T (conform TEST_STRATEGY_LITE + DEC-010):**
- Unit + Integration + E2E (Playwright) via GitHub Actions
- Quality gates: lint + typecheck + coverage thresholds

### A — Acceptance (staging)
**Doel:** QA + stakeholder preview; “release candidate”.

- Backend + DB: Railway staging project
- Frontend: Cloudflare Pages staging project
- Storage: Cloudflare R2 staging buckets

**Tests in A:**
- Smoke + manual QA (geen automatische E2E hier, tenzij later expliciet toegevoegd)

### P — Production
**Doel:** stabiele omgeving voor stakeholders/users.

- Backend + DB: Railway production project (daily backups)
- Frontend: Cloudflare Pages production project
- Storage: Cloudflare R2 production buckets

**Tests/Checks in P:**
- Health + readiness + monitoring (runtime)

---

## 2b) SSOT: Test Strategy

**Rule:** voor dit project is `.ai/project/TEST_STRATEGY_LITE.md` de Single Source of Truth.

- Beslissingen: DEC-008 (pyramid), DEC-009 (coverage), DEC-010 (E2E alleen op T)
- OTAP en CI moeten hier altijd mee in sync blijven

---

## 3) Release Flow (dummyproof)

### Branch mapping (SSOT)
- `feature/*` = O (developer)
- `dev` = T (CI)
- `staging` = A (Acceptance)
- `main` = P (Production)

### Promotion rules
- `feature/*` → PR → `dev`
- **CI must be green** on `dev` before merge
- `dev` → merge → `staging` triggers deploy to Acceptance
- Acceptance sign‑off (manual QA) → merge `staging` → `main` triggers Production deploy

### “Stakeholder-first” fast path (zonder OTAP te breken)
- Deploy eerst Acceptance (A) met een minimal, stabiel slice-set.
- Laat stakeholders daar al meekijken.
- Promote dezelfde build naar Production (P) zodra A is goedgekeurd.

---

## 4) Single Config Contract (anti‑config hell)

### Canonical backend env vars
Deze set is de **enige** die agents hoeven te kennen:

- `ENVIRONMENT`: `development|test|staging|production`
- **Database**: `DATABASE_URL` (cloud) *of* `POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB|POSTGRES_HOST|POSTGRES_PORT` (local)
- **Storage**: `MINIO_ENDPOINT|MINIO_ROOT_USER|MINIO_ROOT_PASSWORD|MINIO_BUCKET_RAW|MINIO_BUCKET_JSON`
- **Auth**: `SECRET_KEY|ALGORITHM|ACCESS_TOKEN_EXPIRE_MINUTES`
- **CORS**: `CORS_ORIGINS` (list/CSV)

### Allowed aliases (maximale compat, minimale mentale load)
- `PYTHON_ENV` → `ENVIRONMENT`
- `JWT_SECRET` → `SECRET_KEY`
- `JWT_ALGORITHM` → `ALGORITHM`
- `ALLOWED_ORIGINS` → `CORS_ORIGINS`

**Rule:** nieuwe docs/agents gebruiken alleen canonical namen.

---

## 5) Health/Readiness contract (deploy proof)

- Liveness: `GET /health` → 200
- Deploy/agent health: `GET /api/v2/health` → 200 + `environment` + `timestamp`
- Readiness: `GET /api/v2/ready` → 200 + DB status

**Architect intent:** A/P moet automatisch kunnen zien: “app start” vs “app ready”.

---

## 6) Environment Blueprint (Railway + Cloudflare)

### Railway (A + P)
Per omgeving een afzonderlijk Railway project:

- Services: `backend`
- Add-on: `PostgreSQL`
- Vars: set canonical env vars (Railway injecteert vaak `DATABASE_URL`)

### Cloudflare Pages (A + P)
- Project `databiz-frontend-staging` → builds from `staging`
- Project `databiz-frontend-production` → builds from `main`
- `VITE_API_URL` set per environment

### Cloudflare R2 (A + P)
- Buckets per environment:
  - `databiz-staging-raw`, `databiz-staging-processed`
  - `databiz-production-raw`, `databiz-production-processed`

**Architect decision:** scheiding per environment voorkomt cross‑contamination.

---

## 7) DDD Work Package (voor andere DevOps engineers)

Behandel OTAP als een “Platform” capability met verticale slices:

### Domain: Platform
#### Epic: Delivery
- Feature: OTAP Environments
  - Slice: `PLT-DEL-OTAP-001` — Define config contract + `.env.example`
  - Slice: `PLT-DEL-OTAP-002` — CI Test gate (GitHub Actions)
  - Slice: `PLT-DEL-OTAP-003` — Staging deploy pipeline
  - Slice: `PLT-DEL-OTAP-004` — Production deploy pipeline
  - Slice: `PLT-DEL-OTAP-005` — Health/ready endpoints + monitoring hooks

### Acceptance criteria (samengevat)
- AC1: `dev` PRs run backend+frontend checks
- AC2: merge to `staging` deployt automatisch naar A
- AC3: merge to `main` deployt automatisch naar P
- AC4: Secrets nooit in repo, alleen in GitHub/Railway/Cloudflare
- AC5: Agents kunnen OTAP uitleggen in < 2 min met dit document

### Prompt template (voor een DevOps engineer/agent)
Gebruik dit als “handover prompt”:

"""
Je bent [DEVOPS] engineer. Implementeer OTAP conform `.ai/project/OTAP_BLUEPRINT.md`.
Scope:
1) GitHub Actions: test workflow (backend + frontend)
2) Deploy workflow: staging branch → A deploy, main branch → P deploy
3) Railway: service config + env var contract (canonical)
4) Cloudflare Pages: staging/prod builds met VITE_API_URL
Constraints:
- Geen secrets in code
- Geen extra config flags toevoegen
- Houd `.env.example` en docs exact in sync
Deliverables:
- `.github/workflows/test.yml`
- `.github/workflows/deploy.yml`
- Updates aan docs indien nodig
"""

---

## 8) Agent Playbook (hoe leg je dit uit aan een agent)

- **Vraag 1:** “Waar deployt dit?” → check branch mapping
- **Vraag 2:** “Welke config?” → canonical env vars (sectie 4)
- **Vraag 3:** “Is het veilig om te promoten?” → CI green + staging sign-off
- **Vraag 4:** “Is prod ok?” → `/api/v2/health` + `/api/v2/ready`

---

## 9) Architect Review (beslispunten)

- Storage in cloud: blijven we `MINIO_*` naming gebruiken voor R2, of introduceren we `S3_*` (met alias)?
- Database URL: willen we afdwingen dat Railway `postgresql+asyncpg://` levert, of doen we een transform?
- CORS: fixed allowlist per env of dynamisch via env var (nu via `CORS_ORIGINS`)

---

## 10) Where to look (SSOT)

- OTAP/ports: `.ai/project/PORT_REGISTRY.yaml`
- Blueprint: `.ai/project/OTAP_BLUEPRINT.md`
- Cloud plan: `.ai/project/DEVOPS_CLOUD_PLAN.md`
- Local run: `LOCAL_SETUP.md`
- Env template: `.env.example`

---

## 11) Worktree Strategy (Agent Focus zonder Branch-Mix)

Je observatie klopt: **worktree-per-slice** is vaak te fijnmazig als je agents “langer” op een stuk domein wil laten werken.

### Aanbevolen schaalniveau

**Default (meestal ideaal): worktree per Feature (of Epic) binnen een domein**

- Voor Imports:
  - `imports-supplier-management`
  - `imports-file-intake`
  - `imports-dataset-lifecycle`

Zo blijven agents langere tijd in één worktree, en je behoudt paralleliteit zonder dat branches door elkaar lopen.

**Alternatief: worktree per domein (grover)**

- `imports-domain`
- `identity-domain`

Dit werkt goed als je sequentieel werkt binnen het domein. Voor echte paralleliteit binnen hetzelfde domein is Feature/Epic meestal beter.

### Belangrijk principe

- 1 VS Code window ↔ 1 worktree ↔ 1 “agent focus area”.
- Binnen een worktree kun je nog steeds branches wisselen, maar dan geldt: iedereen in dát window volgt die branch.
- Daarom: **geen branch-switching in een worktree waar meerdere agents tegelijk in werken.**

### Concrete naming conventions

- Worktree map: `../databiz-next__{domain}__{feature}`
- Branch: `feature/{feature-key}` (lange focus) of `feature/{slice-id}-{short}` (kort)

Voorbeeld:

- Worktree: `../databiz-next__imports__file-intake`
- Branch: `feature/imports-file-intake`

### Commands (Windows)

```powershell
# Vanuit repo root
git worktree add ..\databiz-next__imports__file-intake feature/imports-file-intake
git worktree add ..\databiz-next__imports__supplier-management feature/imports-supplier-management
```

### Hoe je Optie A (slice-by-slice) combineert met worktree-per-feature

**Patroon:** Worktree is je “werkruimte”, slices blijven je “delivery units”.

- Agents implementeren één slice tegelijk, maar blijven in dezelfde worktree (feature-gebied).
- Per slice maak je een kleine branch (of je gebruikt direct de feature-branch en maakt kleine commits).

**Best practice om OTAP-gates te behouden:**

- Maak alsnog een PR per slice naar `dev` (T gate), ook al werk je in één feature-worktree.

---

## 12) Agent Focus Strategies (Scope Fences)

Dit voorkomt dat agents “per ongeluk” buiten scope werken.

### Scope Fence (moet in elke agent prompt)

1. **Objective (1 zin)**: welke slice/feature precies?
2. **Allowed paths**: alleen deze folders mogen wijzigen.
3. **Explicit non-goals**: wat mag NIET?
4. **Definition of Done**: tests, endpoints, docs, registry status.
5. **Quality gate**: unit+integration lokaal, E2E via T/CI (DEC-010).

### Allowed paths (voorbeeld Imports / File Intake)

- `backend/src/domains/imports/file_intake/**`
- `backend/tests/**` (alleen tests)
- `.ai/project/DOMAIN_REGISTRY.yaml` (alleen status van de slice die je afmaakt)

### “No config hell” fence

- Geen nieuwe env vars toevoegen zonder architect review.
- Alles moet passen binnen de canonical set uit sectie 4.

### PR discipline (dummyproof)

- 1 PR = 1 slice (of expliciet 1 feature-PR, maar dan met sub-PR’s/kleine commits)
- PR bevat: code + tests + (waar nodig) docs
- Merge alleen als CI (T) groen is

### Prompt template (copy/paste)

"""
Je bent een engineer agent.

Objective:
- Implementeer slice: <SLICE_ID> (<korte naam>)

Allowed paths:
- <path1>
- <path2>

Non-goals:
- Geen refactors buiten scope
- Geen nieuwe config flags/env vars

DoD:
- Unit + integration tests lokaal groen
- CI (T) groen (incl. E2E waar van toepassing)
- Update DOMAIN_REGISTRY.yaml: alleen deze slice status

Reference:
- OTAP: .ai/project/OTAP_BLUEPRINT.md
- Test SSOT: .ai/project/TEST_STRATEGY_LITE.md
"""

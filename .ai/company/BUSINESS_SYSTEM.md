# Antjan's Business System Core

## The Non-Negotiable Foundation (Read-Only)

**Version:** 1.0
**Date:** December 14, 2025
**Status:** Active & Locked
**Scope:** All projects

---

## 1. WHO WE ARE

**Antjan Laban** – Dutch product leader, solo founder with 25+ years ICT.

- **Style:** Heavy vibecoding, fast iteration, high quality
- **Values:** Autonomy, innovation, work pleasure, balance
- **Decision-making:** Data-driven, pragmatic, risk-aware
- **Language:** Dutch (preferred), English (secondary)

---

## 2. WHY THIS BUSINESS SYSTEM EXISTS

To eliminate:

- Inconsistency across projects
- Repeated decision-making
- Agent context-switching
- Knowledge loss between tools
- Cost surprises

To enable:

- Fast, predictable delivery
- Clear agent scope
- Scalable architecture
- Fixed monthly costs
- Professional quality

---

## 3. THE TECH STACK (Non-Negotiable)

### Frontend

Language: TypeScript
Frameworks: Next.js 15 / Vite / SvelteKit
Styling: Tailwind CSS
Deployment: Cloudflare Pages
Cost: €0/month (free tier)

### Backend

Language: Python 3.11+
Frameworks: FastAPI (primary) / Flask (if simpler)
Database ORM: SQLAlchemy
Validation: Pydantic
Deployment: Railway
Cost: €5-10/month

### Database

Type: PostgreSQL 16+
Hosting: Railway (managed)
Backups: Daily automatic
Migration: Alembic

### Infrastructure

Version Control: GitHub
CI/CD: GitHub Actions
Storage: Railway Storage / Cloudflare R2
Secrets: Railway env vars (never in code)

### AI Development

Primary IDE: Antigravity (Google AI Pro)
Backup IDE: VS Code + Claude Code
Tertiary: Cursor Pro (if needed)
Model: Gemini 3 Pro
Cost: €16.50/month (annual)

**RULE: No exceptions. Every project uses this stack.**

---

## 4. OTAP ENVIRONMENTS (Fixed)

Every project has exactly 4 environments.

### O (Development)

Where: Your laptop
Database: PocketBase (SQLite)
Rule: Local only, disposable

### T (Test)

Where: GitHub Actions
Database: Ephemeral PostgreSQL
Rule: Automated, all commits tested

### A (Acceptance – Staging)

Where: Railway staging instance
Database: PostgreSQL (schema copy)
Rule: For QA, before production

### P (Production)

Where: Railway production instance
Database: PostgreSQL (real data, daily backup)
Rule: Live users, maximum stability

**Promotion flow:** O → T → A → P (always in this order)

---

## 5. GIT STRATEGY (Fixed)

### Branches

- `main` = Production (P)
- `staging` = Acceptance (A)
- `dev` = Test/Integration (T)
- `feature/*` = Development (O)

### Workflow (Every Time)

1. `git checkout -b feature/description`
2. Code locally
3. `npm test && python -m pytest`
4. `git push origin feature/description`
5. Create PR to `dev`
6. GitHub Actions runs (T)
7. Review tests + code
8. Merge to `dev`
9. Merge `dev` → `staging` (A)
10. After QA: merge `staging` → `main` + tag (P)

Live:\*\* ± 3–5 minutes (if everything is green)

---

## 6. CODE STANDARDS (Non-Negotiable)

### Python

- FastAPI with async/await
- Type hints on all functions
- Pydantic for all input
- SQLAlchemy with relations
- pytest, minimum 70% coverage
- pylint + black
- HTTPException + correct HTTP codes
- Logging via `logger.*`, no `print`

### TypeScript

- No `any` – full type coverage
- Zod + React Hook Form for forms
- Jest + React Testing Library
- ESLint + Prettier
- Try/catch + clean error messages
- WCAG 2.1 AA minimum
- Mobile-first, always responsive

### Database

- Minimum 3NF
- Foreign keys enforced
- `created_at`, `updated_at` everywhere
- `deleted_at` for soft delete
- `user_id` where relevant (audit)
- Indexes on FK + frequently used queries
- Migrations versioned + reversible

**RULE: Code meets these standards before merge.**

---

## 7. DOMAIN-DRIVEN DESIGN (Architecture Standard)

### Bounded Contexts

Organization happens on **business domain**, not on technical layers.

- **Domain** = Coherent business capability (e.g., `PIM`)
- **Epic** = Strategic grouping of capabilities (e.g., `Ingestion`)
- **Feature** = Specific functional component (e.g., `SupplierUpload`)
- **Slice** = Atomic vertical use case (end‑to‑end) (e.g., `ValidateFile`)

### Structure (backend example)

- `backend/src/domains/{domain}/{epic}/{feature}/{slice}/`
  - Per slice: `models.py`, `services.py`, `routes.py`, `schemas.py`

### Coupling Rules

- Use events for cross-domain communication
- Each domain has its own logic and remains testable
- No direct imports between domains
- No shared domain models across domains
- No cross-domain foreign keys

---

## 8. FEATURE DELIVERY (Fixed Process)

Every feature:

1. Idea
2. Split into small, vertical slices
3. Build slice in O (local, Antigravity)
4. Test locally
5. Commit + push to `feature/*`
6. GitHub Actions (T) runs tests, lint, types
7. PR + review
8. Merge to `dev` (integration)
9. Merge to `staging` → deploy to A
10. QA on staging
11. QA ok? Merge to `main` → deploy P
12. Monitor, update changelog, update roadmap

**Goal:** small slices in 1–3 days from idea to live.

---

## 9. MONITORING & SLA

### Health

- `/api/health` → 200 within 2s
- Check every 5 minutes
- Alert if >5 min down

### Performance

- API: < 500 ms (p95)
- Frontend: < 3 s load
- Queries: < 200 ms (p95)

### Errors

- Goal: < 0.1% 5xx
- Alert: > 0.5% 5xx
- Sentry for error tracking

### Alerts

- Critical: Slack + SMS
- Warning: Slack
- Info: logs

---

## 10. SECURITY CHECKLIST (Every Feature)

- No secrets in code; everything via env vars
- Input validation (Pydantic + Zod)
- JWT + httpOnly cookies
- Authorization via roles/permissions
- Passwords hashed (bcrypt), PII encrypted where necessary
- Rate limiting + correct CORS + no information leaks
- `pip check` / `npm audit` clean
- Security tests present
- Security review done

---

## 11. COST MODEL

- Google AI Pro (annual): ~€16.50/month
- Railway infra (staging + prod): ~€7–10/month
- Cloudflare: €0
- GitHub: €3

Total: **± €23.50–29.50/month** for all projects combined.

---

## 12. AGENT PROTOCOL (Strict)

### Phase 1: Requirement Gathering (Business Analyst)

**Trigger**: New feature request.

1.  **Ask WHY**: What is the business value?
2.  **Define WHAT**: Create User Story ("As a... I want... So that...").
3.  **Define DONE**: List detailed Acceptance Criteria (Happy path, Edge cases).
4.  **Confirm**: Get User Approval on 1-3.

### Phase 2: Implementation (Dev Agents)

**Trigger**: User Approval of Phase 1.

1.  **Bounded Context**: Determine Domain/Epic/Slice.
2.  **TDD**: Write failing tests FIRST (Iron Dome Rule).
3.  **Code**: Implement slice using specified stack.
4.  **Security**: Check inputs, secrets, permissions.

### Phase 3: The Circular Protocol (Validation Loop)

**Goal**: Eliminate "AI says it works, but it breaks" scenarios.

1.  **Code**: AI generates implementation.
2.  **Test**: AI runs Playwright E2E tests (`npm run test:e2e`).
3.  **Fail?**:
    - AI reads the error.
    - AI fixes the code.
    - AI runs test again.
4.  **Succcess?**: Only then move to Verification.

### Phase 4: Verification (QA)

**Trigger**: Code is written.

1.  **DoD Checklist**:
    - [ ] Acceptance Criteria met?
    - [ ] Tests passed?
    - [ ] No lint errors?
    - [ ] Security check done?
    - [ ] Documentation updated?
2.  **Report**: Show results to User.

Before you start coding:

- Read `.ai/company/BUSINESS_SYSTEM.md`
- Read `.ai/project/project-goals.md`
- Read `.ai/project/roadmap.md`
- Determine your bounded context

During coding:

- Stick to this stack
- Domain > Epic > Slice structure
- Tests + types + security
- No secrets in code
- No cross-domain imports

Upon slice completion:

- All tests green (local + CI)
- No lint/type errors
- Security checklist done
- Ready for PR

---

## 13. SYSTEM EVOLUTION (Vibe Coding)

Because we iterate fast, we review this system **Quarterly** (or whenever friction occurs).

- **Trigger**: When a rule blocks the "Vibe" or quality drops.
- **Action**: Evaluate, Discuss, Update.
- **Goal**: A living system that grows with us.

**Rule**: Don't wait for December. Fix the process when it breaks.

---

## 14. QUICK REFERENCE

- Backend: Python + FastAPI
- Frontend: TypeScript + Next.js/Vite
- Infra: Railway + Cloudflare + GitHub
- Environments: O → T → A → P
- Organization: Domain > Epic > Slice
- €23.50–26.50/monthBudget:

---

**This is our business operating system.
All projects run on this.**

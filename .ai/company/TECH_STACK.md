# Technology Implementation Guide

**NOTE:** The definitive, non-negotiable Tech Stack definition (Versions, Costs, Tools) is located in **[.ai/company/BUSINESS_SYSTEM.md](BUSINESS_SYSTEM.md)**.

This document focuses on **Architecture Patterns** and **Implementation Details**.

---

## 1. Hybrid Vertical Slice Architecture

We use a hybrid approach to transition from Legacy (Node) to Modern (Python) without rewriting everything at once.

### The Separation of Concerns

- **Backend V2 (Python/FastAPI):**
  - **Scope:** ALL NEW FEATURES, AI Agents, Complex Data Processing, ETL.
  - **Pattern:** Domain-Driven Design (DDD) with Vertical Slices.
  - **Location:** `backend/src/domains/`
- **Backend V1 (Node.js/Fastify):**
  - **Scope:** Maintenance of existing features ONLY. No new business logic.
  - **Pattern:** Layered (Controller/Service/Repo).
  - **Location:** `backend/src/`
- **Frontend (TypeScript):**
  - **Scope:** Unified UI for both backends.
  - **Pattern:** Feature-based folders matching the Backend V2 structure where possible.

---

## 2. Implementation Standards (The "Iron Dome")

To enforce the safety and reliability goals of the Business System, we use the following technical patterns:

### 2.1 Strict Typing & Contracts

- **Python:** Full type hinting (`mypy` strict mode). Pydantic models for all I/O.
- **TypeScript:** No `any`. Zod schemas for runtime validation.
- **The Bridge:**
  - Backend V2 MUST generate `openapi.json`.
  - Frontend MUST generate TypeScript clients from this spec (using `openapi-typescript-codegen` or similar).
  - _Result:_ Breaking backend changes cause immediate frontend build errors.

### 2.2 Database Access

- **ORM:** SQLAlchemy 2.0+ (Async).
- **Migrations:** Alembic.
- **Rule:** Never use raw SQL strings for logic; use the ORM expression language to prevent injection and ensure type safety.

### 2.3 Error Handling

- **Backend:** Use `HTTPException` with clear detail codes.
- **Frontend:** Global Error Boundary + Toast notifications for API errors.
- **Logging:** Structured JSON logging (no `print` statements).

---

## 3. Inter-Service Communication

### 3.1 Port Strategy (Strict)

Port allocations are **project-specific** and must follow the SSOT:

- `.ai/project/PORT_REGISTRY.yaml`

For DataBiz Next (development defaults), this typically means:

- Backend API: `9000`
- Frontend: `9003`
- PostgreSQL (local/dev): `9020`
- MinIO/S3 (local/dev): `9022` (API) and `9023` (console)

If you need to change ports, update the registry first and then update the corresponding runtime configs (e.g. `docker-compose.yml`, `frontend/vite.config.ts`, backend settings).

### 3.2 Proxy Rules

Proxy rules are defined by the active frontend configuration (see `frontend/vite.config.ts`).
When documenting or changing proxies, always reference the ports from `.ai/project/PORT_REGISTRY.yaml`.

---

---

## 4. Testing Strategy

- **Unit Tests:** Pytest for every Slice (Service layer).
- **Integration Tests:** Pytest with a real (Dockerized/Service) DB for Repositories.
- **E2E Tests:** Playwright (optional, for critical flows).
- **CI Pipeline:** GitHub Actions blocks merge if coverage < 70%.

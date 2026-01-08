# 📋 N8N Migration Plan - Controlled Handoff

> **Status:** Draft
> **Owner:** [N8N-EXPERT] > **Goal:** Safely move complex logic from Backend to N8N without breaking the application.

---

## 🗓️ Phase 1: Infrastructure & Foundation (Completed)

- [x] **Railway Setup:** Deploy n8n to Railway using `n8n/Dockerfile`.
- [x] **Database Config:** Configure n8n to use the main Postgres DB (env vars added to `railway.json`).
- [x] **Local Dev:** Run n8n via `npm start` (Hybrid mode).
- [x] **Network Config:** Ensure n8n can talk to `localhost:9000` (Backend) via Tunnel or public URL.

## 🧪 Phase 2: The Pilot (Proof of Concept) (Completed)

**Candidate:** `POST /api/v1/system/echo` (New endpoint)

- [x] Create a simple "Echo" workflow in n8n.
- [x] Backend sends data -> n8n processes -> n8n returns response.
- [x] **Goal:** Verify the "Thin Backend" pattern works.

## 📦 Phase 3: Migration Candidates (Priority Order)

### 1. Import Processing (High Complexity)

_Current:_ Python parses CSV, validates rows, maps columns, inserts to DB.
_Problem:_ Hard to debug, memory intensive, rigid mapping logic.
_N8N Solution:_

- Backend: Uploads file to MinIO, sends "File Ready" webhook.
- N8N: Downloads file, streams CSV, uses AI to map columns, inserts to DB.

### 2. AI Enrichment (High Hallucination Risk)

_Current:_ Python constructs prompts, calls OpenAI, parses JSON, handles retries.
_Problem:_ Agents struggle to test this, prompts are buried in code.
_N8N Solution:_

- N8N: Visual chain with "AI Agent" nodes. Easy to tweak prompts in UI.

### 3. Background Jobs

_Current:_ `BackgroundTasks` in FastAPI.
_Problem:_ No visibility, lost on restart.
_N8N Solution:_ N8N executions are persistent and visible.

## 🧹 Phase 4: Cleanup

- Remove migrated Python code.
- Deprecate old endpoints.
- Update documentation.

---

## 🛡️ Risk Mitigation

- **Dual Run:** For critical flows, keep Python running but shadowed by N8N until verified.
- **Fallback:** If N8N is down, Backend should handle it gracefully (e.g., "Service Busy").
- **Version Control:** All workflows MUST be exported to `n8n/workflows/` JSON files.

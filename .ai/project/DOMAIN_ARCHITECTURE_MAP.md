# 🗺️ Domain Architecture Map & Contracts

> **Status:** Active (Strategic Pivot)
> **Purpose:** Defines the "Execution Engine" (FastAPI vs n8n) and Interface Contracts for each domain.
> **Rule:** All new features must check this map to determine _where_ to write code.

---

## 📜 The "Thin Backend" Contract Template

For every feature, we must decide: **Is this CRUD or Logic?**

| Component    | Responsibility                    | Contract Type          |
| :----------- | :-------------------------------- | :--------------------- |
| **Frontend** | UI/UX, State, Uploads             | REST API (OpenAPI)     |
| **Backend**  | Auth, Validation, Webhook Trigger | Webhook Payload (JSON) |
| **n8n**      | ETL, AI, Background Jobs          | Database Schema (SQL)  |

---

## 🏗️ Domain Strategies

### 📦 1. Imports Domain (Phase 1-3)

**Strategy:** ⚡ **Hybrid (n8n Heavy + R2 Direct)**
_Complex CSV parsing and mapping logic moves to n8n. Files go directly to R2._

#### 🤝 The Contract

1.  **Frontend:**
    - Calls Backend: `POST /api/v1/imports/upload-url` to get Presigned URL.
    - Uploads file **directly** to Cloudflare R2 (PUT).
    - Calls Backend: `POST /api/v1/imports/jobs` with `file_key`.
2.  **Backend (FastAPI):**
    - Validates user permissions.
    - Generates Presigned URLs (via `boto3`).
    - Creates `ImportJob` record (Status: `PENDING`).
    - **TRIGGER:** Sends Webhook to n8n.
3.  **n8n (Workflow: `import-processor`):**
    - **Input:** `{ "job_id": "uuid", "file_key": "raw/...", "supplier_id": "..." }`
    - **Process:** S3 Get Object -> Stream CSV -> Apply Mapping -> Insert to DB.
    - **Output:** Updates `ImportJob` status to `COMPLETED` / `FAILED`.

---

### 🛍️ 2. Catalog & Assortment (Phase 4-6)

**Strategy:** 🐢 **Backend Heavy (CRUD)**
_High-performance reading/writing of product data._

#### 🤝 The Contract

1.  **Frontend:**
    - Standard React Query hooks.
2.  **Backend (FastAPI):**
    - `GET /api/v1/products` (Fast, paginated, filtered).
    - `PATCH /api/v1/products/{id}` (Atomic updates).
3.  **n8n:**
    - _Not involved in standard CRUD._
    - _Only involved for "Bulk Actions" (e.g., "Update 1000 prices")._

---

### 🧠 3. Enrichment Domain (Phase 7)

**Strategy:** 🤖 **n8n Native (AI)**
_LLM interaction and external API calls._

#### 🤝 The Contract

1.  **Frontend:**
    - Button: "Generate Description".
    - Calls Backend: `POST /api/v1/enrichment/generate`.
2.  **Backend:**
    - **TRIGGER:** Sends Webhook to n8n.
3.  **n8n (Workflow: `ai-description-generator`):**
    - **Input:** `{ "product_id": "uuid", "context": "..." }`
    - **Process:** Fetch Product -> Gemini Flash -> Parse JSON.
    - **Output:** Updates `product.description` in DB.

---

### 🔐 4. Identity & System (Support)

**Strategy:** 🛡️ **Pure Backend**
_Security, Auth, and Config must stay in code._

- **Auth:** FastAPI + OAuth2 (No n8n).
- **Tenancy:** FastAPI Middleware (No n8n).

---

## 📝 Interface Standards

### Webhook Payload Standard (Backend -> n8n)

All triggers must follow this JSON schema:

```json
{
  "event": "domain.entity.action",  // e.g., "import.file.uploaded"
  "payload": {
    "id": "uuid",                   // Primary Key of the entity
    "user_id": "uuid",              // Who triggered it
    "timestamp": "iso-8601",
    "data": { ... }                 // Context specific data
  },
  "callback_url": "http://..."      // Optional: For n8n to report back
}
```

### Database Access Standard (n8n -> DB)

- n8n connects **directly** to Postgres.
- n8n must respect the **same** schema constraints as the Backend.
- **Rule:** n8n never alters table structure (DDL). Only Data (DML).

---

**Approved By:** [AI-DIRECTOR]
**Date:** December 21, 2025

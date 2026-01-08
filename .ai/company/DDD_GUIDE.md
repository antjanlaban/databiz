# Domain-Driven Design (DDD) Guide

## Domain → Epic → Feature → Slice

This guide defines how all projects are structured, so code, agents, and features stay predictable and scalable.

---

## 1. The Hierarchy

To manage complexity at scale (100+ slices), we use a strict 4‑level hierarchy.

### 1.1 DOMAIN (Bounded Context)

- A clearly bounded business area with its own language, rules, and data model.
- Examples (PiM):
  - `Ingestion` – anything related to importing and mapping source data.
  - `Catalog` – the “Golden Record”, variants, taxonomy.
  - `Sales` – prices, channels, availability.
- Rules:
  - Domains are independent.
  - Communication is via stable public APIs or domain events (no direct cross‑domain imports).

### 1.2 EPIC (Strategic Capability within a Domain)

- A logical grouping of capabilities/features inside a single domain.
- Examples:
  - Domain `Ingestion`: `ImportPipeline`, `DataValidation`.
  - Domain `Sales`: `PriceManagement`, `StockSynchronization`.
- Rules:
  - An Epic always belongs to exactly one Domain.
  - Epics organize Features at capability level.

### 1.3 FEATURE (Functional Product Component)

- A concrete, user‑facing product capability with clear business value.
- Examples:
  - Epic `ImportPipeline`: `SupplierUpload`, `DeltaImport`.
  - Epic `PriceManagement`: `MarginCalculator`, `BulkPriceUpdate`.
- Rules:
  - A Feature groups multiple Slices that together deliver that capability.
  - Roadmaps and planning primarily talk in terms of Features.

### 1.4 SLICE (Smallest Vertical Unit)

- The smallest unit of work: one end‑to‑end use case (request → logic → database → response).
- Examples:
  - Feature `SupplierUpload`:
    - Slice `UploadFile`
    - Slice `ValidateFile`
    - Slice `ProcessRows`
  - Feature `MarginCalculator`:
    - Slice `GetMargin`
    - Slice `RecalculateMarginsBatch`
- Rules:
  - A Slice contains everything required for that use case:
    - API endpoint(s)
    - Business logic
    - Data access
    - Tests
  - A Slice should be small enough to design, implement, test, and deploy in 1–3 days.

### 1.5 THE BRIDGE: USER STORY = SLICE

This is where Business meets IT. We do not translate requirements into "tasks"; we implement the story directly.

- **Business View (User Story):**

  - Format: _"As a [Role], I want [Action], so that [Value]."_
  - Example: _"As a Supplier Manager, I want to upload a CSV file, so I can update prices."_

- **Technical View (Slice):**
  - Implementation: `ingestion/import_pipeline/supplier_upload/upload_file/`
  - Contains: The API, the validation logic, the database save, and the test for exactly this story.

**The Golden Rule:**

> **1 User Story = 1 Slice**
>
> If a User Story is too big for one Slice (e.g., >3 days), split the Story.
> If a Slice does not deliver value to a user, it is not a User Story (it might be a chore/refactor).

---

## 2. Directory Structure (Python V2)

The physical folder structure MUST mirror the logical hierarchy.

```text
backend/src/
 domains/
   ├── [domain_name]/           # e.g. ingestion, catalog, sales
   │   ├── [epic_name]/         # e.g. import_pipeline, price_management
   │   │   ├── [feature_name]/  # e.g. supplier_upload, margin_calculator
   │   │   │   ├── [slice_name]/ # e.g. upload_file, validate_file
   │   │   │   │   ├── __init__.py
   │   │   │   │   ├── router.py    # API endpoints (FastAPI)
   │   │   │   │   ├── service.py   # Use case / business logic
   │   │   │   │   ├── models.py    # Domain / data models for this feature/slice
   │   │   │   │   ├── schemas.py   # Pydantic DTOs (request/response)
   │   │   │   │   ├── repository.py # Optional: data access abstraction
   │   │   │   │   └── tests/       # Co‑located tests
   │   │   │   │       └── test_[slice_name].py
```

Guidelines:

- No top‑level `controllers/`, `services/`, `repositories/` folders.
- Group by **feature/slice**, not by technical layer (“package by feature”).
- Shared code that belongs to a single Domain (e.g. value objects, shared models) lives in:
  - `backend/src/domains/[domain_name]/_shared/`

---

## 3. Example Bounded Contexts (PiM)

### 3.1 Ingestion Context

Purpose: importing, mapping, and normalizing external data.

- Domain: `ingestion`
- Example Epics:
  - `import_pipeline`
  - `data_validation`
- Example Features:
  - `supplier_upload`
  - `delta_import`
- Example Slices (Feature `supplier_upload`):
  - `upload_file`
  - `validate_file`
  - `process_rows`

### 3.2 Catalog Context

Purpose: managing the “Golden Record” of products.

- Domain: `catalog`
- Example Epics:
  - `product_management`
  - `taxonomy_management`
- Example Features:
  - `product_editor`
  - `variant_management`
- Example Slices (Feature `product_editor`):
  - `create_product`
  - `update_product`
  - `archive_product`

### 3.3 Sales Context

Purpose: pricing, channels, availability, and sales‑related logic.

- Domain: `sales`
- Example Epics:
  - `price_management`
  - `availability`
- Example Features:
  - `margin_calculator`
  - `channel_price_sync`
- Example Slices (Feature `margin_calculator`):
  - `get_margin`
  - `recalculate_margins_batch`

---

## 4. Coupling & Boundaries

### Within a Domain

- Slices may share:
  - Domain models
  - Value objects
  - Helpers in `domains/[domain]/_shared/`
- They can reference each other as long as they remain inside the same Domain boundary.

### Between Domains

- No direct imports from one domain’s code into another.
- Communication uses:
  - Asynchronous domain events, or
  - Stable, read‑only APIs.
- Concepts can be modeled differently per domain:
  - `CatalogProduct` vs `SalesProduct`, etc.

---

## 6. THE CENTRAL REGISTRY (The Nervous System)

To guarantee that Business and IT remain synchronized, we maintain a **Single Source of Truth**.

**File:** `.ai/project/DOMAIN_REGISTRY.yaml`

This file maps every User Story to its technical implementation across the stack.

### 6.1 The Registry Structure

```yaml
domains:
  ingestion:
    epics:
      import_pipeline:
        features:
          supplier_upload:
            slices:
              upload_file:
                id: "ING-IMP-SUP-001"
                user_story: "As a Supplier Manager, I want to upload a CSV..."
                status: "active"
                backend: "backend/src/domains/ingestion/import_pipeline/supplier_upload/upload_file"
                frontend: "frontend/src/domains/ingestion/features/supplier_upload/components/UploadFile"
```

### 6.2 Traceability Rules

1.  **Registration First:** No code is written before the Slice is defined in `DOMAIN_REGISTRY.yaml`.
2.  **Full Stack Mapping:** The registry MUST link to both Backend and Frontend paths.
3.  **Status Tracking:** Use the `status` field (`planned` → `active` → `done`) to track progress.
4.  **Validation:** Automated scripts will verify that the paths in the registry actually exist in the codebase.

---

## 7. Slice Checklist (for Devs & Agents)

Before starting a new Slice:

1. **REGISTER**: Add the Slice to `.ai/project/DOMAIN_REGISTRY.yaml` with its User Story.
2. Identify **Domain**: e.g. `ingestion`, `catalog`, `sales`.
3. Identify **Epic** inside that Domain.
4. Identify **Feature** with clear business value.
5. Define the **Slice** as one concrete, end‑to‑end use case.
6. Use or create the correct directory:
   `backend/src/domains/[domain]/[epic]/[feature]/[slice]/`
7. Ensure the Slice includes at least:
   - `router.py` – API endpoint(s)
   - `service.py` – use case / business logic
   - `schemas.py` – request/response contracts
   - `models.py` – domain/data models (when needed)
   - `tests/` – unit/integration tests for this slice
8. Respect domain boundaries:
   - No imports from other domains.
   - For cross‑domain behavior: publish/handle events or call external APIs.

---

## 8. Rules for Agents

When working on backend code:

- Always think and speak in **Domain → Epic → Feature → Slice**.
- Never create folders outside this structure under `domains/`.
- When unsure which Domain or Epic to use:
  - Ask for clarification; do not invent new Domains casually.
- Do **not**:
  - Introduce cross‑domain imports.
  - Create generic “util” domains for shared business logic.
- Do:
  - Keep slices vertical and complete.
  - Keep domains cohesive and loosely coupled.

---

This DDD guide is **company‑wide and project‑agnostic**.
Only the names of Domains, Epics, Features, and Slices change per project – the structure and rules never do.

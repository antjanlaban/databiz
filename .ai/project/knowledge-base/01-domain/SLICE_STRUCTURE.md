# Vertical Slice Structure (Domain-Driven)

This document defines the mandatory organizational structure for the codebase.
We follow a **Domain-Driven Design (DDD)** approach combined with **Vertical Slices**.

## 1. The Hierarchy

To manage complexity at scale (100+ slices), we use a 3-level hierarchy:

1.  **DOMAIN** (Bounded Context)

    - A high-level business area.
    - _Examples_: `PIM`, `Logistics`, `Commercial`, `TeamManagement`.
    - _Rule_: Domains are independent. Communication between domains happens via public APIs or Events.

2.  **EPIC** (Capability)

    - A logical grouping of features within a domain.
    - _Examples_: `ImportPipeline`, `PriceManagement`, `MatchScheduling`.
    - _Rule_: Epics organize slices but do not enforce strict boundaries like Domains do.

3.  **SLICE** (Vertical Feature)
    - A single, end-to-end use case.
    - _Examples_: `UploadFile`, `CalculateMargin`, `PlanMatch`.
    - _Rule_: A slice contains ALL code needed for that feature (API, Logic, Data Access).

## 2. Directory Structure (Python V2)

The physical folder structure MUST mirror the logical hierarchy.

```text
backend/src/
├── domains/
│   ├── [domain_name]/           # e.g., pim
│   │   ├── [epic_name]/         # e.g., catalog
│   │   │   ├── [slice_name]/    # e.g., create_product
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py    # API Endpoint
│   │   │   │   ├── service.py   # Business Logic
│   │   │   │   ├── models.py    # Data Models
│   │   │   │   └── tests/       # Co-located Tests
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── shared/                      # Cross-cutting concerns ONLY (Auth, DB)
```

## 3. Examples

### Example A: DataBiz (PIM Project)

- **Domain**: `Ingestion`
  - **Epic**: `ImportPipeline`
    - **Slice**: `UploadSupplierFile` (POST /upload)
    - **Slice**: `AnalyzeColumns` (POST /analyze)
    - **Slice**: `ActivateDataset` (POST /activate)

### Example B: Sports App (Generic)

- **Domain**: `MatchManagement`
  - **Epic**: `Planning`
    - **Slice**: `ScheduleMatch`
    - **Slice**: `CancelMatch`
  - **Epic**: `Results`
    - **Slice**: `EnterScore`

## 4. Rules of Engagement

1.  **No Horizontal Layers**: Do NOT create global `services/` or `controllers/` folders.
2.  **Isolation**: A slice should ideally not import code from other slices. Shared logic goes to `shared/` or a Domain Service.
3.  **Naming**: Use `kebab-case` for folders (`create-product`) and `snake_case` for Python files (`create_product.py`).

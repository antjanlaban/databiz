# DDD Workflow Map - DataBiz Next

> **⚠️ CRITICAL DOCUMENT - READ BEFORE ANY IMPLEMENTATION**
>
> **Last Updated:** December 21, 2025  
> **Status:** AUTHORITATIVE  
> **Registry:** `DOMAIN_REGISTRY.yaml` (compact: id + story + status per slice)
> **Purpose:** Single Source of Truth for domain architecture and data workflow
>
> ## 🎯 ACTIVE SPRINT: MVP Happy Path (67% Compleet)
>
> **Focus:** Frontend Promotion UI (laatste 33%)
> **Document:** [`MVP_HAPPY_PATH.md`](MVP_HAPPY_PATH.md) ← **BIJGEWERKT MET ACTUAL STATUS** > **Time to MVP:** 1-2 dagen (was onjuist geschat op 4 dagen)
>
> ## ⚠️ STATUS UPDATE: December 21, 2025
>
> **TERMINOLOGY CLARIFICATION:**
>
> - **Activeren (Dataset):** Status `inactive` → `active` (extract naar `supplier_products`)
> - **Promoveren (Product):** Copy `supplier_product` → `assortment_master` (eigen assortiment)
> - **Browse (Catalog):** Bekijk `supplier_products` uit actieve datasets
>
> **Werkelijke Status:**
>
> - ✅ Fase 1-4: Imports + Catalog = 100% DONE
> - ✅ Fase 5: Promotion Backend API = 100% DONE
> - ✅ Fase 6: Assortment Backend + Frontend List = 95% DONE
> - ❌ Fase 5: Promotion Frontend UI = NOT IMPLEMENTED (blocker voor MVP)
> - ❌ Fase 7-8: Enrichment + Export = PLANNED
>
> ## Quick Reference
>
> | Resource                 | Purpose                                           |
> | ------------------------ | ------------------------------------------------- |
> | **MVP_HAPPY_PATH.md**    | 🎯 **CURRENT SPRINT** - 4-day implementation plan |
> | **This file**            | Domain architecture, 8-phase workflow, navigation |
> | `DOMAIN_REGISTRY.yaml`   | All slices with id, story, status                 |
> | `user-stories/{domain}/` | Detailed acceptance criteria per slice            |
> | `ACTIVE_WORKSTREAMS.md`  | Who is working on what                            |
>
> **This document defines:**
>
> - The 8-phase data workflow (business process)
> - Domain boundaries and responsibilities
> - Navigation structure
> - Implementation status (✅ what's done)

---

## 📋 Why This Document Matters

As the project grows, the risk of **hallucination** and **scope creep** increases. This document:

1. **Prevents confusion** - Clear domain boundaries stop code from ending up in wrong places
2. **Guides implementation** - Every feature maps to a specific phase and domain
3. **Enables parallel work** - Multiple agents can work without stepping on each other
4. **Maintains coherence** - All parts of the system follow the same business workflow

**Rule:** Before implementing ANY feature, verify it fits within this workflow map.

**Cross-Reference:**

- Slice details → `DOMAIN_REGISTRY.yaml` (id, story, status)
- Full acceptance criteria → `.ai/project/user-stories/{domain}/{slice_id}.md`

---

## 🔄 The Complete Data Workflow (8 Phases)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        THE COMPLETE DATABIZ DATA WORKFLOW                            │
│                      (Van leveranciersbestand naar verkoop)                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════════
                            🔷 LEVERANCIERS DATA ZONE 🔷
                      (Data van externe bronnen - niet van ons)
═══════════════════════════════════════════════════════════════════════════════════════

   FASE 1                FASE 2                FASE 3              FASE 4
   INTAKE               MAPPING              ACTIVATION           CATALOG
   ───────              ────────             ──────────           ────────

   ┌─────────┐        ┌──────────┐        ┌─────────────┐      ┌─────────────┐
   │ UPLOAD  │───────▶│ AI FIELD │───────▶│  ACTIVATE   │─────▶│  BROWSE/    │
   │  FILE   │        │ MAPPING  │        │   DATASET   │      │  SEARCH     │
   └─────────┘        └──────────┘        └─────────────┘      └─────────────┘
       │                   │                    │                    │
       ▼                   ▼                    ▼                    ▼
   [imports]          [imports]           [imports]            [catalog]
   file_intake        field_mapping       data_extraction      browse/search
   ✅ DONE            ✅ DONE             ✅ DONE              ✅ DONE
                                                                     │
═══════════════════════════════════════════════════════════════════════════════════════
                              🔶 EIGEN ASSORTIMENT ZONE 🔶
   🟡 API DONE          ✅ 95% DONE          ❌ NOT BUILT
   ❌ UI TODO           (UI list done)        (PLANNED))
═══════════════════════════════════════════════════════════════════════════════════════
                                                                     │
   FASE 5                FASE 6                FASE 7              ◀─┘
   PROMOTE              ASSORTMENT            ENRICH
   ────────             ──────────            ────────

   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │  SELECTEER  │─────▶│   BEHEER    │─────▶│  VERRIJK    │
   │  PRODUCTEN  │      │   EIGEN     │      │   DATA      │
   │  UIT CATALOG│      │ ASSORTIMENT │      │             │
   └─────────────┘      └─────────────┘      └─────────────┘
       │                     │                    │
       ▼                     ▼                    ▼
   [promotion]          [assortment]         [enrichment]
   ❌ NOT BUILT         ❌ NOT BUILT         ❌ NOT BUILT

═══════════════════════════════════════════════════════════════════════════════════════
                              🔴 OUTPUT ZONE 🔴
                    (Data naar externe systemen)
═══════════════════════════════════════════════════════════════════════════════════════
                                                   │
   FASE 8                                          │
   EXPORT                                          │
   ────────                                        │
                                                   │
   ┌─────────────┐                                 │
   │  EXPORTEER  │◀────────────────────────────────┘
   │  NAAR       │
   │  KANALEN    │
   └─────────────┘
       │
       ▼
   [export]
   ❌ NOT BUILT
```

---

## 📐 Phase Definitions

| Phase | Name           | Domain       | Description                                        | Status       |
| ----- | -------------- | ------------ | -------------------------------------------------- | ------------ |
| **1** | **Intake**     | `imports`    | Upload CSV/Excel from supplier, parse to JSON      | ✅ Done      |
| **2** | **Mapping**    | `imports`    | AI detects columns (EAN, brand, color, size, etc.) | ✅ Done      |
| **3** | **Activation** | `imports`    | Extract SupplierProducts & SupplierVariants        | ✅ Done      |
| **4** | **Catalog**    | `catalog`    | Browse/search supplier products (raw data)         | ✅ Done      |
| **5** | **Promote**    | `promotion`  | Select products from catalog → own assortment      | ❌ Not Built |
| **6** | **Assortment** | `assortment` | Manage own Master/Variant products                 | ❌ Not Built |
| **7** | **Enrich**     | `enrichment` | Add prices, external links, extra content          | ❌ Not Built |
| **8** | **Export**     | `export`     | Export to channels (bol.com, webshop, etc.)        | ❌ Not Built |

---

## 🏗️ Domain Architecture

### WORKFLOW DOMAINS (The 8 Phases)

These domains implement the core business workflow:

```yaml
imports: # Phase 1-3
  description: "Import, map, and activate supplier files"
  responsibility: "Get data INTO the system"
  status: ✅ COMPLETE
  location: backend/src/domains/imports/
  epics:
    - file_intake # Upload, parse, validate
    - field_mapping # AI column mapping
    - dataset_lifecycle # Status management
    - data_extraction # Extract SupplierProducts/Variants

catalog: # Phase 4
  description: "Browse and search supplier products"
  responsibility: "VIEW supplier data (read-only)"
  status: ✅ COMPLETE
  location: backend/src/domains/catalog/
  note: "Only browse and master_detail - NO master data here"
  epics:
    - browse # List/filter supplier products
    - master_detail # View product with variants

promotion: # Phase 5
  description: "Promote supplier products to own assortment"
  responsibility: "SELECT what we want to sell"
  status: ❌ NOT BUILT
  epics:
    - product_selection # Select from catalog
    - promotion_flow # Wizard/confirmation

assortment: # Phase 6
  description: "Manage own Master/Variant products"
  responsibility: "OWN the products we sell"
  status: ❌ NOT BUILT
  epics:
    - master_management # Own master products
    - variant_management # Own variants
    - product_lifecycle # Active/inactive

enrichment: # Phase 7
  description: "Enrich products with prices and external links"
  responsibility: "ADD VALUE to our products"
  status: ❌ NOT BUILT
  note: "Data attaches to assortment Master/Variants"
  epics:
    - pricing # Purchase/sales prices
    - external_mapping # Gripp, Calculate, etc.

export: # Phase 8
  description: "Export to external channels"
  responsibility: "Get data OUT of the system"
  status: ❌ NOT BUILT
  epics:
    - channel_management # Define channels
    - export_templates # Format configurations
    - export_execution # Run exports
```

### SUPPORT DOMAINS (Not part of workflow)

These domains support the workflow but are not phases themselves:

```yaml
identity:
  description: "Users, roles, authentication"
  responsibility: "WHO can use the system"
  status: ✅ COMPLETE
  location: backend/src/domains/identity/
  epics:
    - user_lifecycle
    - authentication
    - authorization

maintenance:
  description: "Master data for the system (Databeheer)"
  responsibility: "REFERENCE DATA the system needs"
  status: 🟡 PARTIAL
  note: "Samenvoeging Brondata + Standaardisatie"
  location: backend/src/domains/maintenance/ # To be created
  entities:
    - suppliers # ✅ Backend exists (currently in imports)
    - brands # ✅ Backend exists (currently in imports)
    - categories # ✅ Backend exists (currently in supplier_catalog)
    - colors # ❌ Not built
    - sizes # ❌ Not built

system:
  description: "Application configuration"
  responsibility: "HOW the system works"
  status: 🟡 PARTIAL
  location: backend/src/domains/system/
  epics:
    - ai_integration # 🔄 In progress (worktree active)

platform:
  description: "UI shell, navigation, theme"
  responsibility: "LOOK of the application"
  status: ✅ COMPLETE
  location: frontend/src/components/layout/
```

---

## 🧭 Navigation Structure

### Final Navigation (v2.0)

```
🟦 PRODUCTEN (What you have)
├── Assortiment         /products/assortment      → Phase 6 (ASSORTMENT)
└── Catalogi            /products/catalogs        → Phase 4 (CATALOG)

🟧 ACTIES (What you do) - In workflow order!
├── Importeren          /actions/import           → Phase 1-2 (INTAKE + MAPPING)
├── Activeren           /actions/activate         → Phase 3 (ACTIVATION)
├── Promoveren          /actions/promote          → Phase 5 (PROMOTE)
├── Verrijken           /actions/enrich           → Phase 7 (ENRICH)
└── Exporteren          /actions/export           → Phase 8 (EXPORT)

🟩 ONDERHOUD (Background data)
├── Databeheer          /maintenance/data         → maintenance domain
│   ├── Leveranciers    /maintenance/data/suppliers
│   ├── Merken          /maintenance/data/brands
│   ├── Categorieën     /maintenance/data/categories
│   ├── Kleuren         /maintenance/data/colors
│   └── Maten           /maintenance/data/sizes
├── Datasets            /maintenance/datasets     → imports.dataset_lifecycle
├── AI Configuratie     /maintenance/ai           → system.ai_integration
└── Applicatiebeheer    /maintenance/admin        → identity
    ├── Gebruikers      /maintenance/admin/users
    └── Rollen          /maintenance/admin/roles
```

---

## 📦 Current Implementation Status (Verified December 18, 2025)

### Backend Domains (What Actually Exists)

```
backend/src/domains/
├── identity/                    ✅ COMPLETE
│   ├── access_control/          → Login, JWT, auth middleware
│   └── user_management/         → Users CRUD, invite flow
│
├── imports/                     ✅ COMPLETE
│   ├── file_intake/             → Upload CSV/XLSX, parse
│   ├── field_mapping/           → AI column detection
│   ├── dataset_lifecycle/       → Dataset CRUD, status
│   ├── data_extraction/         → Extract products/variants
│   ├── supplier_management/     → Suppliers CRUD (⚠️ logically: maintenance)
│   └── brand_management/        → Brands CRUD (⚠️ logically: maintenance)
│
├── supplier_catalog/            ✅ BROWSE/SEARCH ONLY
│   ├── browse/                  → List/filter supplier products
│   ├── master_detail/           → Product + variants view
│   ├── category_management/     → ⚠️ MISPLACED (logically: maintenance)
│   └── shared/                  → Filters, pagination, image resolver
│
├── catalog/                     🟡 EMPTY (to be removed/merged)
│
└── system/                      ✅ COMPLETE
    └── ai_configuration/        → AI providers, test, activate
```

**Note:** Code location ≠ logical domain. Categories is maintenance, not catalog.

### Frontend Features (What Actually Exists)

| Feature Folder       | Status      | Maps to Domain |
| -------------------- | ----------- | -------------- |
| `ai-config/`         | ✅ Complete | system         |
| `brands/`            | ✅ Complete | maintenance    |
| `suppliers/`         | ✅ Complete | maintenance    |
| `datasets/`          | ✅ Complete | imports        |
| `import-wizard/`     | ✅ Complete | imports        |
| `field-mapping/`     | ✅ Complete | imports        |
| `supplier-products/` | ✅ Complete | catalog        |
| `supplier-catalog/`  | ✅ Complete | catalog        |

### Frontend Pages (What Actually Exists)

| Page                   | Route                   | Status      | Domain      |
| ---------------------- | ----------------------- | ----------- | ----------- |
| `LoginPage`            | `/login`                | ✅ Works    | identity    |
| `AcceptInvitePage`     | `/accept-invite`        | ✅ Works    | identity    |
| `UsersPage`            | `/maintenance/users`    | ✅ Works    | identity    |
| `DashboardPage`        | `/dashboard`            | ✅ Works    | platform    |
| `BasisPage`            | `/maintenance/basis`    | 🟡 Shell    | maintenance |
| `WerkPage`             | `/maintenance/werk`     | 🟡 Shell    | maintenance |
| `ApplicatiePage`       | `/maintenance/app`      | 🟡 Shell    | system      |
| `SupplierCatalogsPage` | `/products/catalogs`    | ✅ Works    | catalog     |
| `CatalogusPage`        | `/products/catalog`     | 🔀 Redirect | catalog     |
| `AssortimentPage`      | `/products/assortiment` | 🟡 Shell    | assortment  |
| `PromoverenPage`       | `/actions/promote`      | 🟡 Shell    | promotion   |
| `ExporterenPage`       | `/actions/export`       | 🟡 Shell    | export      |
| `JobsPage`             | `/jobs`                 | ✅ Works    | platform    |

### What's DONE vs What's a SHELL

**✅ FULLY WORKING (Backend + Frontend):**

- Identity: Login, Users, Invite flow
- Imports: Upload, Parse, Field Mapping, Activate
- Catalog: Browse supplier products, Master/Variant view
- System: AI Configuration
- Maintenance: Suppliers, Brands (UI exists, just needs routing)

**🟡 SHELL ONLY (UI exists, no functionality):**

- AssortimentPage - Empty page, needs backend
- PromoverenPage - Empty page, needs backend
- ExporterenPage - Empty page, needs backend
- BasisPage, WerkPage - Navigation placeholders

**❌ NOT BUILT:**

- Categories frontend (backend exists in supplier_catalog - will be moved to maintenance)
- Colors, Sizes (neither backend nor frontend)
- Enrichment domain (Phase 7)

### Quick Win Opportunities

These features have backend code but missing/incomplete frontend:

1. **Categories Page** - Backend exists, needs frontend in `/maintenance/categories`
2. **Catalog Browse** - Backend complete, frontend needs polish
3. **Master/Variant Detail** - Backend complete, frontend needs polish

---

## 🔧 Code vs Logical Domain Mapping

Current code location may differ from logical domain:

| Feature         | Code Location                           | Logical Domain  | Notes             |
| --------------- | --------------------------------------- | --------------- | ----------------- |
| Suppliers       | `imports/supplier_management/`          | **maintenance** | Master data       |
| Brands          | `imports/brand_management/`             | **maintenance** | Master data       |
| Categories      | `supplier_catalog/category_management/` | **maintenance** | Used at promotion |
| Browse Products | `supplier_catalog/browse/`              | **catalog**     | Correct           |
| Master Detail   | `supplier_catalog/master_detail/`       | **catalog**     | Correct           |

**Future migration:** Move supplier/brand/category code to `maintenance/` domain.

**Note:** Reorganization is optional. We can also document the current mapping and work with it.

---

## 🎯 Implementation Roadmap

### Phase Status Summary

| Phase | Domain     | Backend     | Frontend    | Priority  |
| ----- | ---------- | ----------- | ----------- | --------- |
| 1-3   | imports    | ✅ Complete | ✅ Complete | -         |
| 4     | catalog    | ✅ Complete | 🟡 Shell    | P2        |
| 5     | promotion  | ❌          | ❌          | P1 (Next) |
| 6     | assortment | ❌          | ❌          | P1 (Next) |
| 7     | enrichment | ❌          | ❌          | P2        |
| 8     | export     | ❌          | ❌          | P3        |

### Current Sprint

1. ✅ DDD_WORKFLOW_MAP documented (this document)
2. 🔄 AI Configuration (worktree active)

### Next Sprint

1. Navigation alignment (update navigation.ts + App.tsx)
2. Databeheer page (unified master data management)
3. Categories frontend component

### Future Sprints

1. Promotion domain design + implementation
2. Assortment domain design + implementation
3. Enrichment features
4. Export capabilities

---

## ✅ Implementation Checklist

Before implementing ANY feature, verify:

- [ ] Which phase (1-8) does this feature belong to?
- [ ] Which domain is responsible for this?
- [ ] Is this feature in DOMAIN_REGISTRY.yaml?
- [ ] Is the navigation route defined?
- [ ] Does it respect domain boundaries (no cross-domain imports)?

---

## 📚 Related Documents

| Document                | Purpose                               | Priority    |
| ----------------------- | ------------------------------------- | ----------- |
| **DDD_WORKFLOW_MAP.md** | Domain architecture (THIS FILE)       | 🔴 CRITICAL |
| `DOMAIN_REGISTRY.yaml`  | Detailed slice definitions per domain | 🟠 HIGH     |
| `DDD_GUIDE.md`          | DDD principles and coding rules       | 🟡 MEDIUM   |
| `FRONTEND_GUIDE.md`     | Frontend architecture (150-line rule) | 🟡 MEDIUM   |
| `ACTIVE_CONTEXT.md`     | Current sprint focus                  | 🟢 LOW      |

---

_This document is the bridge between business workflow and technical implementation._
_When in doubt, consult this document first._

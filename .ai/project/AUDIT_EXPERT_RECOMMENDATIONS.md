# 🎭 Expert Aanbevelingen: Audit Steps 1-4

**Datum:** 2025-12-20  
**Input:** AUDIT_STEPS_1_4.md  
**Deelnemers:** [AI-ARCHITECT], [FULLSTACK], [DEVOPS]

---

## 🏛️ [AI-ARCHITECT] Analyse

### Strategische Observaties

Na review van de audit bevindingen identificeer ik drie fundamentele problemen:

#### 1. **Architecturale Fragmentatie in Catalog Domain**

Het supplier_catalog domain heeft een duidelijke backend structuur maar de frontend is gefragmenteerd over meerdere locaties. Dit is een **architectural smell** die we moeten oplossen vóór verdere ontwikkeling.

**Mijn Aanbeveling:**

```
CONSOLIDATIE PLAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VERWIJDEREN:
   - pages/CatalogusPage.tsx (orphaned placeholder)

2. BEHOUDEN als primair:
   - pages/SupplierCatalogsPage.tsx (actieve route)

3. VERPLAATSEN implementatie naar:
   - features/supplier-catalog/browse/
   - features/supplier-catalog/master-detail/

4. PATTERN:
   - Page importeert feature components
   - Feature bevat business logic + API calls
   - Consistent met DDD vertical slice principe
```

#### 2. **API Status Geverifieerd** ✅

Na verificatie van `main.py` blijkt dat ALLE catalog routers WEL gemount zijn:

```python
# Regel 266-270: Browse router
app.include_router(catalog_browse_router, prefix="/api/v1", tags=["Catalog - Browse"])

# Regel 271-275: Master Detail router
app.include_router(catalog_master_detail_router, prefix="/api/v1", tags=["Catalog - Master Detail"])

# Regel 276-280: Category Hierarchy router
app.include_router(category_hierarchy_router, prefix="/api/v1/catalog", tags=["Catalog - Categories"])
```

**Conclusie:** Het probleem is NIET dat de API's niet gemount zijn, maar dat de **frontend ze niet gebruikt**. SupplierCatalogsPage is een placeholder.

**Prioriteit verschuift:** Van "mount API" naar "implementeer frontend".

#### 3. **Standardization Route Inconsistentie**

De navigatie verwijst naar `/maintenance/standardization` maar dit bestaat niet. Dit is een **UX breach** - gebruikers zien een menu item dat nergens naartoe gaat.

**Twee Opties:**

| Optie | Beschrijving                                                    | Effort   |
| ----- | --------------------------------------------------------------- | -------- |
| A     | Nieuwe StandardizationPage met tabs (Colors, Sizes, Attributes) | 8-12 uur |
| B     | Redirect naar DataMaintenancePage met Colors tab geselecteerd   | 30 min   |

**Mijn Voorkeur:** Optie B als interim, Optie A als backlog item. Colors en Sizes horen logisch bij "Brondata" (DataMaintenance) omdat ze stamgegevens zijn.

---

### Architecturale Beslissingen Nodig

| Beslissing            | Opties                               | Mijn Advies                                          |
| --------------------- | ------------------------------------ | ---------------------------------------------------- |
| Waar hoort SizesPage? | Standalone / Tab in DataMaintenance  | **Tab in DataMaintenance** (consistent met Colors)   |
| Jobs in navigatie?    | Sidebar item / Alleen via widget     | **Widget-only** (is monitoring, geen primaire actie) |
| Accept-invite route?  | Public / Protected                   | **Public** (zoals /login)                            |
| Catalog naamgeving?   | CatalogusPage / SupplierCatalogsPage | **SupplierCatalogsPage** (explicieter)               |

---

## 💻 [FULLSTACK] Analyse

### Implementatie Volgorde

Op basis van de audit stel ik deze **gefaseerde aanpak** voor:

```
╔═══════════════════════════════════════════════════════════════╗
║                    FASE 1: ROUTE FIXES                         ║
║                    (Navigatie & Routes)                        ║
║                    Geschatte tijd: 1-2 uur                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  1.1 Fix /maintenance/standardization route                   ║
║      → Redirect naar /maintenance/data?tab=colors              ║
║      OF maak placeholder page                                  ║
║      Effort: 30 min                                            ║
║                                                                ║
║  1.2 Add /accept-invite route als public                      ║
║      → Toevoegen aan App.tsx buiten ProtectedRoute             ║
║      Effort: 15 min                                            ║
║                                                                ║
║  1.3 Verify catalog API endpoints werken                      ║
║      → curl tests naar /api/v1/supplier-catalog/products       ║
║      Effort: 15 min                                            ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║                    FASE 2: SIZES FRONTEND                      ║
║                    (Backend bestaat, frontend mist)            ║
║                    Geschatte tijd: 1 dag                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  2.1 Maak features/sizes/ folder                               ║
║      - SizesPage.tsx (copy ColorsPage pattern)                ║
║      - SizesTable.tsx                                          ║
║      - SizeFormModal.tsx                                       ║
║      - DeleteSizeModal.tsx                                     ║
║      - useSizes.ts hook                                        ║
║      - types.ts                                                ║
║      Effort: 4-6 uur                                           ║
║                                                                ║
║  2.2 Voeg SizesPage toe aan DataMaintenancePage tabs          ║
║      Effort: 30 min                                            ║
║                                                                ║
║  2.3 Voeg sizes-api.ts toe aan lib/                           ║
║      Effort: 1 uur                                             ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║                    FASE 3: CATALOG BROWSE                      ║
║                    (API gemount, frontend implementeren)       ║
║                    Geschatte tijd: 2-3 dagen                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  3.1 SupplierCatalogsPage functioneel maken                   ║
║      - useSupplierProducts hook                                ║
║      - ProductGrid component                                   ║
║      - FilterSidebar component                                 ║
║      - SearchBar component                                     ║
║      Effort: 8-12 uur                                          ║
║                                                                ║
║  3.2 Master → Variants expansion                               ║
║      - MasterCard component                                    ║
║      - VariantsList component                                  ║
║      - useMasterDetail hook                                    ║
║      Effort: 4-6 uur                                           ║
║                                                                ║
║  3.3 Verwijder CatalogusPage.tsx (orphaned)                   ║
║      Effort: 5 min                                             ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║                    FASE 4: JOBS UPGRADE                        ║
║                    (Placeholder → Functioneel)                 ║
║                    Geschatte tijd: 1 dag                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  4.1 JobsPage aansluiten op API                               ║
║      - Import useBackgroundJobs hook                           ║
║      - Vervang hardcoded data met API calls                    ║
║      - Add real-time polling                                   ║
║      Effort: 2-3 uur                                           ║
║                                                                ║
║  4.2 Jobs UI componenten                                       ║
║      - JobCard component                                       ║
║      - JobProgressBar component                                ║
║      - JobStatusBadge component                                ║
║      Effort: 2-3 uur                                           ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

### Effort Samenvatting

| Fase       | Items          | Geschatte Uren | Prioriteit |
| ---------- | -------------- | -------------- | ---------- |
| 1          | Route Fixes    | 1 uur          | 🔴 Kritiek |
| 2          | Sizes Frontend | 6-8 uur        | 🟡 Hoog    |
| 3          | Catalog Browse | 12-18 uur      | 🟡 Hoog    |
| 4          | Jobs Upgrade   | 4-6 uur        | 🟢 Medium  |
| **Totaal** |                | **23-33 uur**  |            |

### Dependencies

```
Fase 1 ──► Fase 2 (parallel mogelijk)
    │
    └────► Fase 3 (wacht op API mount)
              │
              └────► Fase 4 (parallel met Fase 3)
```

---

## 🔧 [DEVOPS] Analyse

### API Mounting Verificatie ✅ AFGEROND

Na inspectie van `main.py` (regels 211-295) is de status:

**ALLE ROUTERS ZIJN GEMOUNT:**

```python
# Identity
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(users_router, prefix="/api/v1/identity")

# Imports domain
app.include_router(brands_router, prefix="/api/v1/imports")
app.include_router(colors_router, prefix="/api/v1/imports")
app.include_router(sizes_router, prefix="/api/v1/imports")
app.include_router(suppliers_router, prefix="/api/v1/imports/suppliers")
app.include_router(files_router, prefix="/api/v1/imports/files")
app.include_router(datasets_router, prefix="/api/v1/imports/datasets")
app.include_router(field_mapping_router, prefix="/api/v1/imports")
app.include_router(extraction_router, prefix="/api/v1/imports")

# Jobs
app.include_router(jobs_router, prefix="/api/v1/jobs")

# Catalog domain ✅
app.include_router(catalog_browse_router, prefix="/api/v1")
app.include_router(catalog_master_detail_router, prefix="/api/v1")
app.include_router(category_hierarchy_router, prefix="/api/v1/catalog")

# System
app.include_router(ai_config_router, prefix="/api/v1/system/ai")
```

### Werkelijke API Structuur

```
/api/v1/
├── auth/                   ✅ Gemount
├── identity/               ✅ Gemount
├── imports/
│   ├── suppliers/          ✅ Gemount
│   ├── brands/             ✅ Gemount (via prefix)
│   ├── datasets/           ✅ Gemount
│   ├── colors/             ✅ Gemount (via prefix)
│   ├── sizes/              ✅ Gemount (via prefix)
│   ├── files/              ✅ Gemount
│   └── field-mapping/      ✅ Gemount (via prefix)
│
├── supplier-catalog/       ✅ Gemount (prefix=/api/v1)
│   └── products/           ✅ browse router endpoints
│
├── catalog/
│   └── categories/         ✅ Gemount
│
└── jobs/                   ✅ Gemount
```

### Conclusie DEVOPS

**Geen API mounting werk nodig.** Het probleem is puur frontend:

- SupplierCatalogsPage moet API calls implementeren
- JobsPage moet useBackgroundJobs hook gebruiken

---

## 🎯 Gezamenlijke Aanbevelingen

### Consensus Punten

Alle experts zijn het eens over:

1. **Fase 1 is non-negotiable** - Foundation fixes moeten eerst
2. **SizesPage volgt ColorsPage** - Proven pattern, laag risico
3. **CatalogusPage verwijderen** - Geen waarde, alleen verwarring
4. **Jobs blijft widget-only** - Geen sidebar item nodig

---

## 🎬 FASE EXECUTION PROTOCOL

Elke fase volgt dit protocol:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRE-FASE DISCUSSIE                          │
├─────────────────────────────────────────────────────────────────┤
│  1. [ORCHESTRATOR] Reviewt scope en afhankelijkheden            │
│  2. [ARCHITECT] Valideert architecturale beslissingen           │
│  3. [FULLSTACK] Confirmeert implementatie aanpak                │
│  4. [DEVOPS] Checkt infra/deployment impact                     │
│  5. Consensus → GO/NO-GO besluit                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IMPLEMENTATIE                               │
├─────────────────────────────────────────────────────────────────┤
│  • [FULLSTACK] voert uit                                        │
│  • [ORCHESTRATOR] documenteert in .ai/project/domains/          │
│  • Slice registratie in DOMAIN_REGISTRY.yaml                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     POST-FASE VALIDATIE                         │
├─────────────────────────────────────────────────────────────────┤
│  • Alle acceptance criteria ✅                                  │
│  • Tests groen                                                  │
│  • [ORCHESTRATOR] sign-off                                      │
│  • Fase status → COMPLETED                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 FASE 1: ROUTE FIXES

### Pre-Fase Discussie Punten

| Topic               | Vraag                                                | Besluit Nodig Van |
| ------------------- | ---------------------------------------------------- | ----------------- |
| StandardizationPage | Redirect naar DataMaintenance OF nieuwe page?        | [ARCHITECT]       |
| Accept-invite       | Public route toevoegen OF identity flow niet actief? | [ARCHITECT]       |
| Tab parameter       | DataMaintenance URL met ?tab=colors support?         | [FULLSTACK]       |

### Scope Definitie

```yaml
fase: 1
naam: "Route Fixes"
doel: "Navigatie consistent maken met daadwerkelijke routes"

deliverables:
  - /maintenance/standardization route werkt
  - /accept-invite route werkt (indien nodig)
  - Geen dode links in navigatie

niet_in_scope:
  - Nieuwe UI componenten
  - API wijzigingen
  - Database changes
```

### Acceptance Criteria (Testbaar)

| #   | Criterium                                          | Test Methode         | Verwacht Resultaat       |
| --- | -------------------------------------------------- | -------------------- | ------------------------ |
| 1.1 | Klik "Standaardisatie" in sidebar                  | Handmatig in browser | Geen 404, pagina laadt   |
| 1.2 | Direct navigeren naar /maintenance/standardization | URL in browser       | Redirect of pagina toont |
| 1.3 | /accept-invite route                               | URL in browser       | Pagina laadt (public)    |
| 1.4 | Alle nav items klikbaar                            | Loop door sidebar    | Geen console errors      |

### Domein Documentatie

```
.ai/project/domains/platform/
└── navigation/
    └── ROUTE_FIXES.md  ← Te maken door [ORCHESTRATOR]
```

---

## 📋 FASE 2: SIZES FRONTEND

### Pre-Fase Discussie Punten

| Topic           | Vraag                                        | Besluit Nodig Van |
| --------------- | -------------------------------------------- | ----------------- |
| Size Categories | Tonen we categories (CLOTHING, SHOES, etc.)? | [ARCHITECT]       |
| Sort Order      | Hoe sorteren we maten (numeriek vs alfabet)? | [FULLSTACK]       |
| Bulk Import     | Nu of later?                                 | [ORCHESTRATOR]    |
| Maat Codes      | Validatie regels (format, duplicaten)?       | [ARCHITECT]       |

### Scope Definitie

```yaml
fase: 2
naam: "Sizes Frontend"
doel: "Gebruiker kan maten beheren via UI"

deliverables:
  - SizesPage component (CRUD)
  - Tab in DataMaintenancePage
  - useSizes hook
  - sizes-api.ts

niet_in_scope:
  - Size categories beheer (aparte slice)
  - Bulk import/export
  - Size mapping naar supplier maten
```

### Acceptance Criteria (Testbaar)

| #   | Criterium             | Test Methode            | Verwacht Resultaat        |
| --- | --------------------- | ----------------------- | ------------------------- |
| 2.1 | Maten tab zichtbaar   | Open /maintenance/data  | "Maten" tab aanwezig      |
| 2.2 | Lijst maten           | Klik Maten tab          | Tabel met bestaande maten |
| 2.3 | Nieuwe maat toevoegen | Klik +, vul form, save  | Maat in lijst             |
| 2.4 | Maat bewerken         | Klik edit, wijzig, save | Wijziging opgeslagen      |
| 2.5 | Maat verwijderen      | Klik delete, confirm    | Maat verwijderd           |
| 2.6 | Zoeken                | Type in zoekbalk        | Gefilterde resultaten     |
| 2.7 | Paginering            | >25 maten               | Paginering werkt          |
| 2.8 | Error handling        | API fout simuleren      | Toast met foutmelding     |

### Domein Documentatie

```
.ai/project/domains/imports/
└── size_management/
    └── SIZES_FRONTEND_SPEC.md  ← Te maken door [ORCHESTRATOR]
```

### Slice Registratie

```yaml
# Toe te voegen aan DOMAIN_REGISTRY.yaml
size_management:
  features:
    size_crud:
      slices:
        frontend_sizes_page:
          id: "IMP-SIZE-FE-001"
          story: "User manages sizes via UI"
          status: "in_progress"
```

---

## 📋 FASE 3: CATALOG BROWSE

### Pre-Fase Discussie Punten

| Topic          | Vraag                                         | Besluit Nodig Van |
| -------------- | --------------------------------------------- | ----------------- |
| Grid vs List   | Default view mode? Toggle aanwezig?           | [ARCHITECT]       |
| Filters        | Welke filters MVP? Color/Size/Brand/Supplier? | [ARCHITECT]       |
| Pagination     | Infinite scroll of page numbers?              | [FULLSTACK]       |
| Performance    | Cache strategie voor product images?          | [DEVOPS]          |
| Master/Variant | Auto-expand of click-to-expand?               | [ARCHITECT]       |
| Empty State    | Wat tonen als geen producten?                 | [FULLSTACK]       |

### Scope Definitie

```yaml
fase: 3
naam: "Catalog Browse"
doel: "Gebruiker kan supplier producten browsen en filteren"

deliverables:
  - SupplierCatalogsPage functioneel
  - ProductGrid component
  - FilterSidebar component
  - SearchBar component
  - MasterCard met variants expansion
  - useSupplierProducts hook
  - useMasterDetail hook

niet_in_scope:
  - Promote actie (Fase 5+)
  - Export naar Excel
  - Bulk selectie
```

### Acceptance Criteria (Testbaar)

| #    | Criterium              | Test Methode            | Verwacht Resultaat       |
| ---- | ---------------------- | ----------------------- | ------------------------ |
| 3.1  | Pagina laadt producten | Open /products/catalogs | Product grid zichtbaar   |
| 3.2  | Zoeken werkt           | Type productnaam        | Gefilterde resultaten    |
| 3.3  | Filter op merk         | Selecteer brand filter  | Alleen dat merk getoond  |
| 3.4  | Filter op kleur        | Selecteer color filter  | Gefilterde producten     |
| 3.5  | Filter op maat         | Selecteer size filter   | Gefilterde producten     |
| 3.6  | Filters combineren     | Meerdere filters        | AND logica werkt         |
| 3.7  | Master expanderen      | Klik op master card     | Variants zichtbaar       |
| 3.8  | Variant details        | Bekijk variant          | Kleur, maat, EAN getoond |
| 3.9  | Performance            | Laad 100+ producten     | <100ms response          |
| 3.10 | Empty state            | Filter zonder results   | Vriendelijke melding     |

### Domein Documentatie

```
.ai/project/domains/supplier_catalog/
└── browse/
    └── BROWSE_FRONTEND_SPEC.md  ← Te maken door [ORCHESTRATOR]
```

### Slice Registratie

```yaml
# Toe te voegen aan DOMAIN_REGISTRY.yaml
catalog:
  epics:
    browse:
      features:
        product_listing:
          slices:
            frontend_browse_page:
              id: "CAT-BROWSE-FE-001"
              story: "User browses supplier catalog"
              status: "in_progress"
```

---

## 📋 FASE 4: JOBS UPGRADE

### Pre-Fase Discussie Punten

| Topic            | Vraag                             | Besluit Nodig Van |
| ---------------- | --------------------------------- | ----------------- |
| Polling interval | 10 seconden OK? Websocket later?  | [ARCHITECT]       |
| Job history      | Hoeveel historie tonen?           | [FULLSTACK]       |
| Retry/Cancel     | Kunnen gebruikers jobs annuleren? | [ARCHITECT]       |
| Notifications    | Toast bij job completion?         | [FULLSTACK]       |
| Job logs         | Detail view met logs?             | [ORCHESTRATOR]    |

### Scope Definitie

```yaml
fase: 4
naam: "Jobs Upgrade"
doel: "JobsPage toont real-time job status"

deliverables:
  - JobsPage met API data
  - JobCard component
  - JobProgressBar component
  - Real-time polling (10s)

niet_in_scope:
  - Websocket (later)
  - Job cancellation
  - Detailed log viewer
```

### Acceptance Criteria (Testbaar)

| #   | Criterium         | Test Methode       | Verwacht Resultaat           |
| --- | ----------------- | ------------------ | ---------------------------- |
| 4.1 | Pagina toont jobs | Open /jobs         | Lijst met actieve jobs       |
| 4.2 | Real-time update  | Wacht 10 seconden  | Data refresht automatisch    |
| 4.3 | Progress bar      | Bekijk running job | Progress % getoond           |
| 4.4 | Status badge      | Verschillende jobs | Correct: running/done/failed |
| 4.5 | Elapsed time      | Running job        | Tijd sinds start             |
| 4.6 | Job details       | Bekijk job         | Type, dataset, timestamps    |
| 4.7 | Empty state       | Geen jobs          | Vriendelijke melding         |
| 4.8 | Error state       | API down           | Foutmelding, geen crash      |

### Domein Documentatie

```
.ai/project/domains/imports/
└── job_monitoring/
    └── JOBS_FRONTEND_SPEC.md  ← Te maken door [ORCHESTRATOR]
```

---

## 🎛️ ORCHESTRATOR TRACKING

### Fase Status Dashboard

| Fase | Status     | Discussie | Implementatie | Validatie |
| ---- | ---------- | --------- | ------------- | --------- |
| 1    | 🟡 Pending | ⬜ TODO   | ⬜ TODO       | ⬜ TODO   |
| 2    | ⬜ Blocked | ⬜ TODO   | ⬜ TODO       | ⬜ TODO   |
| 3    | ⬜ Blocked | ⬜ TODO   | ⬜ TODO       | ⬜ TODO   |
| 4    | ⬜ Blocked | ⬜ TODO   | ⬜ TODO       | ⬜ TODO   |

### Documentatie Checklist

```
.ai/project/domains/
├── platform/
│   └── navigation/
│       └── ROUTE_FIXES.md                    ⬜ TODO
├── imports/
│   ├── size_management/
│   │   └── SIZES_FRONTEND_SPEC.md            ⬜ TODO
│   └── job_monitoring/
│       └── JOBS_FRONTEND_SPEC.md             ⬜ TODO
└── supplier_catalog/
    └── browse/
        └── BROWSE_FRONTEND_SPEC.md           ⬜ TODO
```

### Registry Updates Needed

```yaml
# DOMAIN_REGISTRY.yaml updates per fase
Fase 1: Geen (routes zijn platform, niet in registry)
Fase 2: IMP-SIZE-FE-001 toevoegen
Fase 3: CAT-BROWSE-FE-001 toevoegen
Fase 4: IMP-MON-FE-001 toevoegen
```

---

## 🚀 VOLGENDE STAP

**Klaar om te starten met Fase 1 Pre-Discussie?**

De [ORCHESTRATOR] zal:

1. Discussievragen voorleggen aan experts
2. Beslissingen documenteren
3. GO/NO-GO geven voor implementatie

---

### Volgorde Prioritering

```
WEEK 1:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dag 1-2: Fase 1 (Foundation Fix)
         ├── API mount
         ├── Route fixes
         └── Verify in browser

WEEK 1-2:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dag 2-3: Fase 2 (Sizes Frontend)
         ├── Copy Colors pattern
         ├── Add to DataMaintenance
         └── Test CRUD operations

WEEK 2:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dag 4-6: Fase 3 (Catalog Browse)
         ├── Product grid
         ├── Filters
         └── Master/Variant expansion

WEEK 2-3:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dag 7:   Fase 4 (Jobs Upgrade)
         ├── Connect to API
         └── Real-time updates
```

### Risico Mitigatie

| Risico                           | Mitigatie                                                        |
| -------------------------------- | ---------------------------------------------------------------- |
| API mount breekt bestaande calls | Test in dev eerst, geen bestaande endpoints wijzigen             |
| SizesPage bugs                   | Volg exact ColorsPage pattern, copy tests                        |
| Catalog performance              | Performance targets al gedefinieerd (<100ms list, <150ms detail) |

---

## 📋 Actie Items

### Immediate (Vandaag)

- [x] **[DEVOPS]** ~~Verify welke routers EXACT gemount zijn in main.py~~ → ALLE gemount ✅
- [ ] **[ARCHITECT]** Besluit: StandardizationPage of redirect?
- [ ] **[FULLSTACK]** Start met Fase 1.1 (Route fixes)

### Deze Week

- [ ] Fase 1 compleet
- [ ] Fase 2 gestart
- [ ] CatalogusPage.tsx verwijderd

### Volgende Week

- [ ] Fase 2 compleet
- [ ] Fase 3 gestart
- [ ] End-to-end test: Import → Browse flow

---

## ✅ Sign-off

| Expert         | Akkoord met Plan? | Opmerkingen                      |
| -------------- | ----------------- | -------------------------------- |
| [AI-ARCHITECT] | ✅                | Consolidatie eerst, dan features |
| [FULLSTACK]    | ✅                | Fase volgorde is logisch         |
| [DEVOPS]       | ✅                | Geen deployment risico's         |

---

_Expert Review Session - 2025-12-20_

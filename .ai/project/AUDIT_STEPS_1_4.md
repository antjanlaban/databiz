# 🔍 Audit Rapport: Stappen 1-4 (Import → Catalog)

**Datum:** 2025-12-20  
**Scope:** Imports domain + Supplier Catalog domain  
**Doel:** Identificeren van gaps, duplicaten, ontbrekende frontends en navigatie-issues

---

## 📋 Executive Summary

Deze audit analyseert de eerste 4 stappen van de DataBiz workflow:

1. **Import** - Bestand uploaden en valideren
2. **Field Mapping** - Kolommen koppelen aan velden
3. **Dataset Activatie** - Data extracten naar supplier_masters/variants
4. **Catalog Browse** - Producten browsen en zoeken

**Conclusie:** Er zijn significante gaps tussen backend en frontend, placeholder pagina's die niet functioneel zijn, en navigatie-inconsistenties die de gebruikerservaring verstoren.

---

## 📊 Bevindingen Matrix

| #   | Type                | Ernst     | Component                    | Probleem                       |
| --- | ------------------- | --------- | ---------------------------- | ------------------------------ |
| 1   | ❌ Niet aangesloten | 🔴 Hoog   | AcceptInvitePage             | Geen route in App.tsx          |
| 2   | ✅ Opgelost         | -         | supplier_catalog browse API  | WEL gemount, frontend mist     |
| 3   | ✅ Opgelost         | -         | master_detail API            | WEL gemount, frontend mist     |
| 4   | ❌ Niet aangesloten | 🟡 Medium | SupplierCatalogsPage         | Placeholder, gebruikt geen API |
| 5   | ❌ Niet aangesloten | 🟢 Laag   | CatalogusPage                | Orphaned file, redirect only   |
| 6   | 🔄 Duplicaat        | 🟡 Medium | Browse concepten             | 3 overlappende implementaties  |
| 7   | 🚫 Frontend mist    | 🔴 Hoog   | SizesPage                    | Backend API bestaat, geen UI   |
| 8   | 🚫 Frontend mist    | 🟡 Medium | JobsPage (data)              | Placeholder met hardcoded data |
| 9   | 🧭 Navigatie gap    | 🟡 Medium | /jobs                        | Route bestaat, niet in sidebar |
| 10  | 🧭 Navigatie gap    | 🔴 Hoog   | /maintenance/standardization | In nav, route bestaat niet     |
| 11  | 🧭 Navigatie gap    | 🟢 Laag   | /field-mapping               | Route bestaat, niet in sidebar |
| 12  | 🧭 Navigatie gap    | 🟢 Laag   | /accept-invite               | Nergens aangesloten            |

---

## 🔬 Gedetailleerde Analyse

### 1. NIET AANGESLOTEN FUNCTIONALITEIT

#### 1.1 AcceptInvitePage (Ernst: 🔴 Hoog)

**Locatie:** `frontend/src/pages/AcceptInvitePage.tsx`

**Probleem:**  
Pagina bestaat maar heeft geen route in `App.tsx`. Gebruikers die een invite link krijgen kunnen de pagina niet bereiken.

**Impact:**

- Identity/Access flow is gebroken
- Nieuwe gebruikers kunnen geen account activeren via invite

**Verificatie:**

```bash
# Geen match in App.tsx routes
grep -n "AcceptInvite\|accept-invite" frontend/src/App.tsx
# Resultaat: Geen matches
```

---

#### 1.2 supplier_catalog browse API (Ernst: ✅ OPGELOST)

**Locatie:** `backend/src/domains/supplier_catalog/browse/router.py`

**Beschikbare Endpoints:**
| Endpoint | Functie |
|----------|---------|
| `GET /products` | Lijst alle producten |
| `GET /suppliers/{id}/products` | Producten per supplier |
| `GET /brands/{name}/products` | Producten per merk |
| `GET /brands/summary` | Merk samenvatting |
| `GET /masters/{id}` | Master detail |
| `GET /filters` | Filter opties |

**Status: GEMOUNT** ✅  
Na verificatie blijkt de router WEL gemount te zijn in `main.py` (regel 266-270):

```python
app.include_router(
    catalog_browse_router,
    prefix="/api/v1",
    tags=["Catalog - Browse"],
)
```

**Werkelijk Probleem:**  
De API is beschikbaar, maar de frontend (SupplierCatalogsPage) maakt er geen gebruik van - het is een placeholder.

---

#### 1.3 master_detail API (Ernst: ✅ GEMOUNT, Frontend mist)

**Locatie:** `backend/src/domains/supplier_catalog/master_detail/router.py`

**Beschikbare Endpoints:**
| Endpoint | Functie |
|----------|---------|
| `GET /products/{master_id}` | Master met variants |
| `GET /products/{master_id}/grouped` | Variants gegroepeerd op kleur/maat |

**Status: GEMOUNT** ✅  
Router is gemount in `main.py` (regel 271-275):

```python
app.include_router(
    catalog_master_detail_router,
    prefix="/api/v1",
    tags=["Catalog - Master Detail"],
)
```

**Werkelijk Probleem:**  
API is beschikbaar, maar geen frontend component roept de endpoints aan.

---

#### 1.4 SupplierCatalogsPage Placeholder (Ernst: 🟡 Medium)

**Locatie:** `frontend/src/pages/SupplierCatalogsPage.tsx`

**Probleem:**  
Pagina is een statische "Under Construction" placeholder met hardcoded tekst. Geen API calls, geen dynamische data.

**Huidige Inhoud:**

- Statische bullet points over wat nog komt
- Verwijzing naar "supplier-catalog/browse worktree"
- Performance targets die niet getest kunnen worden

---

#### 1.5 CatalogusPage Orphaned (Ernst: 🟢 Laag)

**Locatie:** `frontend/src/pages/CatalogusPage.tsx`

**Probleem:**

- Pagina bestaat als file
- Route `/products/catalog` redirect naar `/products/catalogs`
- CatalogusPage zelf is placeholder
- Niet duidelijk of dit een legacy file is of toekomstige implementatie

**Aanbeveling:** Verwijderen of consolideren met SupplierCatalogsPage.

---

### 2. DUBBELE ONDERDELEN

#### 2.1 Browse Concepten Overlap (Ernst: 🟡 Medium)

**Overlappende Implementaties:**

| Component                        | Locatie                                              | Status            |
| -------------------------------- | ---------------------------------------------------- | ----------------- |
| CatalogusPage                    | `pages/CatalogusPage.tsx`                            | Placeholder       |
| SupplierCatalogsPage             | `pages/SupplierCatalogsPage.tsx`                     | Placeholder       |
| supplier-catalog feature         | `features/supplier-catalog/`                         | Bijna leeg        |
| SupplierCatalogsPage (duplicate) | `features/supplier-catalog/SupplierCatalogsPage.tsx` | In feature folder |

**Probleem:**  
Drie of vier locaties voor hetzelfde concept zorgt voor verwarring:

- Waar moet nieuwe code komen?
- Welke wordt uiteindelijk gebruikt?
- Risico op divergente implementaties

**Structuur nu:**

```
pages/
├── CatalogusPage.tsx          # Placeholder (orphaned)
├── SupplierCatalogsPage.tsx   # Placeholder (active route)

features/supplier-catalog/
├── browse/                     # Leeg of minimaal
├── SupplierCatalogsPage.tsx   # Nog een versie?
```

---

### 3. FRONTEND MIST

#### 3.1 SizesPage (Ernst: 🔴 Hoog)

**Backend API:** `backend/src/domains/imports/size_management/router.py`

**Beschikbare Endpoints:**
| Endpoint | Functie |
|----------|---------|
| `GET /sizes` | Lijst alle maten (paginated) |
| `GET /sizes/categories` | Maat categorieën |
| `GET /sizes/code/{code}` | Maat op code |
| `GET /sizes/{id}` | Maat op ID |
| `POST /sizes` | Nieuwe maat |
| `PUT /sizes/{id}` | Update maat |
| `DELETE /sizes/{id}` | Verwijder maat |

**Frontend Status:** ❌ Niet geïmplementeerd

**Context:**

- ColorsPage bestaat en werkt volledig
- COLOR_COMPLETION_REPORT.md vermeldt: "5. Frontend (SizesPage component - follow ColorsPage pattern)"
- Size management is essentieel voor fashion/apparel PIM

**Geschatte Effort:** 4-6 uur (copy ColorsPage pattern)

---

#### 3.2 JobsPage Functioneel (Ernst: 🟡 Medium)

**Backend API:** `backend/src/domains/imports/job_monitoring/router.py`

**Beschikbare Endpoints:**
| Endpoint | Functie |
|----------|---------|
| `GET /active` | Actieve jobs |
| `GET /{job_id}` | Job details |
| `POST /` | Nieuwe job aanmaken |

**Frontend Status:** ⚠️ Placeholder met hardcoded data

**Huidige Implementatie:**

```tsx
// JobsPage.tsx - Statische content
<div className="p-4 border">
  <h3>Import: FHB-Artikelstammdaten</h3> // Hardcoded
  <span>65% voltooid</span> // Hardcoded
</div>
```

**Probleem:**

- Geen API calls naar `/api/v1/jobs/active`
- Geen real-time updates
- useBackgroundJobs hook bestaat maar JobsPage gebruikt het niet

---

### 4. NAVIGATIE GAPS

#### 4.1 /jobs Route (Ernst: 🟡 Medium)

| Aspect            | Status                |
| ----------------- | --------------------- |
| Route in App.tsx  | ✅ `/jobs` → JobsPage |
| In navigation.ts  | ❌ Niet aanwezig      |
| Sidebar zichtbaar | ❌ Nee                |

**Gevolg:** Pagina alleen bereikbaar via directe URL of JobsWidget klik.

---

#### 4.2 /maintenance/standardization (Ernst: 🔴 Hoog)

| Aspect           | Status                    |
| ---------------- | ------------------------- |
| In navigation.ts | ✅ "Standaardisatie" item |
| Route in App.tsx | ❌ Route bestaat niet     |
| Pagina component | ❌ Niet geïmplementeerd   |

**Gevolg:** Klikken op "Standaardisatie" in sidebar geeft 404 of blank pagina.

**Navigation.ts config:**

```typescript
{
  label: "Standaardisatie",
  path: "/maintenance/standardization",
  icon: Palette,
  description: "Kleuren, maten en attributen",
}
```

---

#### 4.3 /field-mapping Route (Ernst: 🟢 Laag)

| Aspect           | Status                                     |
| ---------------- | ------------------------------------------ |
| Route in App.tsx | ✅ `/field-mapping` → FieldMappingFlowPage |
| In navigation.ts | ❌ Niet aanwezig                           |
| Bereikbaar via   | ✅ Import wizard flow                      |

**Context:** Field mapping is onderdeel van de import wizard flow, niet een standalone feature. Daarom mogelijk bewust niet in navigatie.

---

#### 4.4 /accept-invite Route (Ernst: 🟢 Laag)

| Aspect           | Status                                |
| ---------------- | ------------------------------------- |
| Route in App.tsx | ❌ Niet aanwezig                      |
| In navigation.ts | ❌ Niet aanwezig (correct, is public) |
| Pagina component | ✅ Bestaat                            |

**Context:** Accept invite zou een public route moeten zijn (zoals /login), niet in protected routes.

---

## 🔗 Afhankelijkheden Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        IMPORT FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [ImportWizardPage] ──── Upload ────► [file_intake API] ✅      │
│         │                                                        │
│         ▼                                                        │
│  [FieldMappingFlowPage] ───────────► [field_mapping API] ✅     │
│         │                                                        │
│         ▼                                                        │
│  [DatasetsPage] ──── Activate ─────► [dataset_lifecycle API] ✅ │
│         │                                                        │
│         ▼                                                        │
│  [SupplierCatalogsPage] ◄────────── [browse API] ❌ NOT MOUNTED │
│         │                            [master_detail API] ❌      │
│         │                                                        │
│         ▼                                                        │
│  [JobsPage] ◄───────────────────────[job_monitoring API] ⚠️     │
│                                      (page is placeholder)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

LEGENDA:
✅ = Volledig werkend
⚠️ = Gedeeltelijk / Placeholder
❌ = Niet aangesloten
```

---

## 📁 Bestands Referenties

### Backend Routers

| Router             | Pad                                                                    | Mount Status                        |
| ------------------ | ---------------------------------------------------------------------- | ----------------------------------- |
| color_management   | `backend/src/domains/imports/color_management/router.py`               | ✅ Gemount                          |
| size_management    | `backend/src/domains/imports/size_management/router.py`                | ✅ Gemount                          |
| job_monitoring     | `backend/src/domains/imports/job_monitoring/router.py`                 | ✅ Gemount                          |
| browse             | `backend/src/domains/supplier_catalog/browse/router.py`                | ✅ Gemount (prefix=/api/v1)         |
| master_detail      | `backend/src/domains/supplier_catalog/master_detail/router.py`         | ✅ Gemount (prefix=/api/v1)         |
| category_hierarchy | `backend/src/domains/supplier_catalog/category_management/*/router.py` | ✅ Gemount (prefix=/api/v1/catalog) |

### Frontend Pages

| Page                 | Pad                                               | Route    | Nav                 |
| -------------------- | ------------------------------------------------- | -------- | ------------------- |
| DatasetsPage         | `features/datasets/DatasetsPage.tsx`              | ✅       | via redirect        |
| ImportWizardPage     | `features/import-wizard/ImportWizardPage.tsx`     | ✅       | via nav             |
| FieldMappingFlowPage | `features/field-mapping/FieldMappingFlowPage.tsx` | ✅       | ❌                  |
| ColorsPage           | `features/colors/ColorsPage.tsx`                  | ✅ (tab) | via DataMaintenance |
| SizesPage            | ❌ NIET GEÏMPLEMENTEERD                           | -        | -                   |
| JobsPage             | `pages/JobsPage.tsx`                              | ✅       | ❌                  |
| SupplierCatalogsPage | `pages/SupplierCatalogsPage.tsx`                  | ✅       | ✅                  |

---

## 📝 Ruwe Data voor Expert Review

### Files die mogelijk verwijderd kunnen worden:

1. `frontend/src/pages/CatalogusPage.tsx` - Orphaned placeholder

### Files die geconsolideerd moeten worden:

1. `pages/SupplierCatalogsPage.tsx` vs `features/supplier-catalog/SupplierCatalogsPage.tsx`

### Routes die toegevoegd moeten worden:

1. `/accept-invite` → AcceptInvitePage (public route)
2. `/maintenance/standardization` → StandardizationPage (new)

### Navigatie items die toegevoegd moeten worden:

1. Jobs link (ergens onder Onderhoud of als widget-only?)

### API routers die gemount moeten worden:

1. `browse` router → `/api/v1/supplier-catalog/...`
2. `master_detail` router → `/api/v1/supplier-catalog/masters/...`

---

## ⏭️ Volgende Stap

Dit document wordt voorgelegd aan de expert persona's voor hun analyse en aanbevelingen:

1. **[AI-ARCHITECT]** - Architecturale beslissingen en consolidatie strategie
2. **[FULLSTACK]** - Implementatie volgorde en effort inschatting
3. **[DEVOPS]** - API mounting verificatie en deployment impact

---

_Gegenereerd door AI Audit Agent - 2025-12-20_

# Improvement Backlog - Acceptance Testing December 2025

**Doel:** Verzamel alle verbeterpunten voor 1 geconsolideerde worktree.

---

## 🔧 Verbeterpunten

### IMP-001: Verwijder Supplier Code volledig

**Prioriteit:** 🔴 High  
**Categorie:** Data Model Cleanup

**Huidige situatie:**

- Supplier model heeft `code` + `name` velden
- Code wordt getoond in dropdown, CRUD, en overzichten
- Dubbele informatie, niet nodig

**Gewenste situatie:**

- Verwijder `code` veld uit Supplier model
- Alleen `name` tonen in UI
- Database migratie nodig

**Bestanden:**

- `backend/src/domains/imports/models.py` - Supplier model
- `backend/src/domains/identity/seed.py` - Seed data
- `frontend/src/pages/SuppliersPage.tsx` - CRUD
- `frontend/src/pages/ImportWizardPage.tsx` - Dropdown
- `frontend/src/pages/ImportsPage.tsx` - Lijst
- Alembic migratie genereren

---

### IMP-002: Logout functie ontbreekt

**Prioriteit:** 🟡 Medium  
**Categorie:** UI/UX

**Huidige situatie:**

- Geen logout knop in UI
- Marked as "under construction" (layout nog niet gerealiseerd)

**Gewenste situatie:**

- Logout knop in header/navigation
- Clears tokens en redirect naar login

**Bestanden:**

- `frontend/src/components/Layout.tsx` (nog te maken)
- `frontend/src/lib/store.ts` - logout action exists

---

### IMP-003: Excel header detectie niet altijd correct

**Prioriteit:** 🟡 Medium  
**Categorie:** File Parsing

**Huidige situatie:**

- Bij Excel uploads wordt niet altijd de juiste header rij gekozen
- CSV werkt goed, Excel is problematisch

**Gewenste situatie:**

- Betere header detectie logica
- Mogelijk: gebruiker laten kiezen welke rij de header is

**Bestanden:**

- `backend/src/domains/imports/file_intake/` - parsing logic
- Onderzoek nodig naar huidige implementatie

---

### IMP-004: Dataset Activatie werkt niet correct

**Prioriteit:** 🔴 High  
**Categorie:** Dataset Lifecycle - BUG

**Huidige situatie:**

- Activatie knop triggert niets (geen feedback, geen actie)
- Backend endpoint mogelijk niet correct aangeroepen

**Gewenste situatie:**

- Activatie triggert backend processing
- Duidelijke feedback: loading state → success/error

**Bestanden:**

- `frontend/src/pages/DatasetsPage.tsx` - activate button
- `backend/src/domains/imports/dataset_lifecycle/` - activate endpoint
- Debugging nodig

---

### IMP-005: Dataset Deactivatie toont foutmelding

**Prioriteit:** 🔴 High  
**Categorie:** Dataset Lifecycle - BUG

**Huidige situatie:**

- Deactivatie voert wel uit maar toont foutmelding
- Onduidelijk of actie succesvol was

**Gewenste situatie:**

- Correcte success/error handling
- UI update na deactivatie

**Bestanden:**

- `frontend/src/pages/DatasetsPage.tsx` - deactivate button
- `backend/src/domains/imports/dataset_lifecycle/` - deactivate endpoint

---

### IMP-006: Verwijder knop moet disabled zijn bij actieve dataset

**Prioriteit:** 🟡 Medium  
**Categorie:** UI/UX

**Huidige situatie:**

- Verwijder knop altijd zichtbaar en klikbaar
- Actieve datasets kunnen verwijderd worden (ongewenst)

**Gewenste situatie:**

- Verwijder knop disabled (grijs) bij actieve datasets
- Tooltip: "Deactiveer dataset eerst"
- Alleen actief bij status "inactive"

**Bestanden:**

- `frontend/src/pages/DatasetsPage.tsx` - delete button logic

---

### IMP-007: Brands niet geseeded op staging

**Prioriteit:** 🔴 High  
**Categorie:** Seed Data - BUG

**Huidige situatie:**

- Brands pagina is leeg, geen seed data
- Seed endpoint verwijst naar lokaal pad: `c:/Users/antja/Google Drive/VK PiM docs/Seeds/brand.csv`
- Dit werkt niet op Railway

**Gewenste situatie:**

- Brands seed data embedded in repo of via env var
- Auto-seed bij startup (zoals suppliers)
- Of: DEMO_BRANDS constant zoals DEMO_SUPPLIERS

**Bestanden:**

- `backend/src/domains/imports/brand_management/router.py` - seed endpoint
- `backend/src/domains/identity/seed.py` - voorbeeld van DEMO_SUPPLIERS

---

### IMP-008: Brand model mist logo veld

**Prioriteit:** 🟢 Low  
**Categorie:** Data Model

**Huidige situatie:**

- Brand heeft alleen code + name
- Geen logo URL/upload veld

**Gewenste situatie:**

- `logo_url` veld toevoegen (optioneel)
- UI voor logo upload of URL input

**Bestanden:**

- `backend/src/domains/imports/models.py` - Brand model
- `frontend/src/pages/BrandsPage.tsx` - UI
- Alembic migratie nodig

---

### IMP-009: [PLACEHOLDER - volgende bevinding]

**Prioriteit:**  
**Categorie:**

**Huidige situatie:**

**Gewenste situatie:**

**Bestanden:**

---

## 📊 Samenvatting

| ID      | Beschrijving                       | Prioriteit | Effort |
| :------ | :--------------------------------- | :--------- | :----- |
| IMP-001 | Verwijder Supplier Code            | 🔴 High    | Medium |
| IMP-002 | Logout functie                     | 🟡 Medium  | Low    |
| IMP-003 | Excel header detectie              | 🟡 Medium  | Medium |
| IMP-004 | Dataset Activatie bug              | 🔴 High    | Medium |
| IMP-005 | Dataset Deactivatie foutmelding    | 🔴 High    | Low    |
| IMP-006 | Verwijder knop disabled bij actief | 🟡 Medium  | Low    |
| IMP-007 | Brands niet geseeded               | 🔴 High    | Medium |
| IMP-008 | Brand logo veld                    | 🟢 Low     | Medium |

---

## 🌳 Worktree Planning

**Naam:** `feature/qa-improvements-dec2025`

**Scope:**

- Alle IMP-xxx items uit deze lijst
- Geen nieuwe features, alleen cleanup/fixes

**Aanpak:**

1. Database migratie voor code verwijdering
2. Backend model updates
3. Frontend UI updates
4. Tests updaten

---

_Laatst bijgewerkt: 2025-12-18_

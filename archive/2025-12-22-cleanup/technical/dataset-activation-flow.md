# Dataset Activation Flow - Auto-Activate Architecture

**Last Updated:** 2025-11-12  
**Version:** 7.0 - Auto-Activate with Historie Behoud

---

## 🎯 Overview

Nieuwe datasets worden **automatisch geactiveerd** tijdens import. Oude producten met dezelfde EAN binnen dezelfde leverancier worden automatisch gedeactiveerd. Historie wordt behouden.

## 🔄 New Flow

```
Import Wizard → Dataset Maken (Auto-ACTIVE) → Direct beschikbaar in Catalogus
```

**Optioneel:** Databeheer Tab → Deactiveren → Re-activeren via Activate Page

### Fase 1: Import & Opslaan (Auto-ACTIVE)
- Gebruiker doorloopt import wizard (4 stappen)
- Stap 4: "Dataset Maken"
- Alle nieuwe producten krijgen meteen `product_status: 'ACTIVE'`
- Oude producten met zelfde EAN worden automatisch `product_status: 'INACTIVE'`
- Dataset krijgt `file_status: 'ACTIVE'`
- Historie behoud: Meerdere records per supplier+EAN mogelijk

### Fase 2: Dataset Management (Databeheer Tab)
- Datasets gegroepeerd per Leverancier + Merk (Accordion UI)
- Duidelijke badges: ACTIEF / INACTIEF
- Action buttons: Deactiveer / Verwijder / Bekijk (geen "Activeer" voor nieuwe uploads)

### Fase 3: Re-activatie via Activate Page (Optioneel)
**Alleen voor gedeactiveerde datasets:**
- Priority selector: REPLACE vs DOMINATE
- Impact preview: Toont affected datasets/products
- Bevestiging: Checkbox om door te gaan
- Call naar `activate-dataset` edge function

**Priority Logic (bij re-activatie):**
- **REPLACE**: Deactiveer andere datasets + smart EAN-based product deactivation
- **DOMINATE**: Houd alle datasets actief, voeg toe

### Fase 4: Deactivatie via Dialoog (Optioneel)
**DatasetDeactivationDialog:**
- Waarschuwing: X producten worden inactief
- Optie: Activeer vervangende dataset
- Bevestiging: Checkbox
- Call naar `deactivate-dataset` edge function

## 🔧 Database Functions & Logic

### map_staging_chunk (Updated)
**Auto-activatie tijdens import:**
1. Parse staging data
2. **Deactivate old ACTIVE products** with same supplier+EAN (different import_job)
3. **Insert new products as ACTIVE** (always new row, no ON CONFLICT)
4. Return stats: inserted, deactivated, errors

### activate-dataset (Edge Function)
**Alleen voor re-activatie:**
**Input:** `import_job_id`, `priority` ('replace' | 'dominate')
**Logic:**
1. Check if dataset already ACTIVE → error
2. Warn if dataset < 5 minutes old (should be auto-activated)
3. Execute priority logic (REPLACE: deactivate others, DOMINATE: keep all)
4. Set `file_status: 'ACTIVE'`
5. Set all products `product_status: 'ACTIVE'`

### deactivate-dataset
**Input:** `import_job_id`, `activate_other_id?` (optional)
**Logic:**
1. Verify dataset is ACTIVE
2. Set `file_status: 'INACTIVE'`
3. Set all products `product_status: 'INACTIVE'`
4. Optionally activate replacement dataset

### deactivate_products_not_in_dataset (Database Function)
**Purpose:** Smart product deactivation for REPLACE priority
**Logic:**
- Only deactivate products NOT in new dataset (EAN-based)
- Only deactivate products in INACTIVE datasets
- Preserve products in other ACTIVE datasets

## ✅ Benefits

1. **Snellere Workflow**: Geen handmatige activatiestap meer
2. **Historie Behoud**: Oude imports blijven beschikbaar (INACTIVE)
3. **Automatische Vervanging**: Oude producten met zelfde EAN worden automatisch vervangen
4. **Transparantie**: Gebruiker ziet hoeveel producten zijn gedeactiveerd
5. **Flexibiliteit**: Re-activatie blijft mogelijk via Activate Page
6. **Consistentie**: Eén EAN per leverancier actief (automatisch afgedwongen)

---

**See also:**
- `docs/technical/import-architecture.md` - Complete import flow
- `docs/technical/FASEN_OVERZICHT.md` - Implementation phases

# Context 6: Data Quality & Readiness

**Doel:** quality scoring, missing fields, export readiness per kanaal.

## Core Termen
- **Quality Score:** meetlat voor completeness.
- **Coverage (P0–P3):** mate van volledigheid per prioriteit.
- **Blockers:** P0 issues die export voorkomen.
- **Warnings:** P1 issues die aandacht vereisen.
- **Readiness:** export-geschiktheid.

## Belangrijkste Data
- `product_quality_scores`
- `product_quality_history`
- `data_quality_status` (View voor snelle status checks)
- (en quality/rules tabellen)

## Belangrijkste Backend
- **DB Functie:** `calculate_product_quality()`
- **Edge Function:** `calculate-product-quality`
- **Edge Function:** `predictive-quality-check` (voor import validatie)
- (en gerelateerde reporting functies)

## Invariants
1. **Blockers:** P0 missing = blockers (niet export-ready).
2. **Consistentie:** Weighting/definities moeten consistent zijn tussen UI (predictive) en backend (definitief).

## Toegestane Contracten (Interfaces)
- **Supplier Catalog/Master Catalog → Data Quality & Readiness**: DB function `calculate_product_quality(p_entity_type, p_entity_id)`
- **Data Quality & Readiness → Data Quality & Readiness (persist/serve)**: Edge Function `calculate-product-quality`
- **Export & Integraties → Data Quality & Readiness**: Edge Function `check-export-readiness`

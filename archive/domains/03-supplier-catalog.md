# Context 3: Supplier Catalog (Supplier Products Lifecycle)

**Doel:** opslag van geïmporteerde leverancier-productdata met lifecycle (ACTIVE/INACTIVE) en traceability.

## Core Termen
- **Supplier Product:** gemapte leverancier-record in `supplier_products`.
- **Source Staging ID:** link naar de originele staging row.
- **Product Status:** status van het product (ACTIVE, INACTIVE, ARCHIVED).
- **Dataset/Job provenance:** herkomst van de data.

## Belangrijkste Data
- `supplier_products`

## Invariants
1. **Traceability:** Traceability blijft intact: herleidbaarheid naar import job/staging.
2. **Controlled Lifecycle:** Deactivatie/activatie gebeurt gecontroleerd (geen “silent overwrites”).

## Toegestane Contracten (Interfaces)
- **Import Intake → Supplier Catalog**: DB RPC `map_staging_chunk(p_import_job_id, p_column_mappings, ..., p_bundle_id)`
- **Supplier Catalog/Master Catalog → Data Quality & Readiness**: DB function `calculate_product_quality(p_entity_type, p_entity_id)`

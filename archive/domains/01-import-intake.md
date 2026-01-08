# Context 1: Import Intake (Upload → Staging → Mapping)

**Doel:** leverancier-bestand verwerken naar staging en vervolgens mappen.

## Architectural Decision: Storage Strategy
**Conclusie (Dec 2025):** We gebruiken een **hybride** strategie.
- **Raw Storage:** De `raw-datasets` bucket wordt gebruikt voor de initiële upload van het bestand. Dit zorgt ervoor dat we grote bestanden veilig kunnen ontvangen voordat we ze parsen.
- **Staging:** De `supplier_datasets` tabel (JSONB) wordt gebruikt voor de geparsede rijen. Dit is performant genoeg voor 2M+ rijen en biedt betere query-mogelijkheden voor de mapping UI.
- **Cleanup:** Originele bestanden in de bucket kunnen na succesvolle parsing verwijderd worden (of gearchiveerd), maar de bucket is essentieel voor de intake.

## Core Termen
- **Import Job:** één ingest-run van een leverancier-bestand.
- **Staging Row:** één ruwe rij uit het bestand (nog niet gemapt/definitief).
- **Column Mappings:** bronkolom → PIM veld.
- **Fallback Selections:** standaardwaarden indien leeg.
- **Chunk:** deel van de data voor batch processing.

## Belangrijkste Data
- `import_supplier_dataset_jobs`
- `supplier_datasets`
- `import_job_errors`

## Belangrijkste Backend
- **Edge Functions:**
    - `parse-and-stage-file`
    - `batch-insert-raw-staging`
    - `execute-mapping`
    - `create-dataset-atomic`
- **DB Functie:**
    - `map_staging_chunk()`

## Invariants
1. **P0 Completeness:** P0 moet 100% zijn vóór “converteren/doorzetten” (predictive check aan UI-kant, harde checks aan DB-kant waar nodig).
2. **Bundle-Driven Mapping:** Mapping is bundle-driven: alleen velden die in de bundle zitten mogen naar `supplier_products`.

## Toegestane Contracten (Interfaces)
- **Import Intake → Supplier Catalog**: DB RPC `map_staging_chunk(p_import_job_id, p_column_mappings, ..., p_bundle_id)`
- **Import Intake → Import Intake (orchestratie)**: Edge Function `create-dataset-atomic`
- **Import Intake → Import Intake (mapping trigger)**: Edge Function `execute-mapping`
- **Import Intake → Import Intake (file ingest)**: Edge Function `parse-and-stage-file`
- **Import Intake → Import Intake (raw staging batch)**: Edge Function `batch-insert-raw-staging`
- **Import Intake → AI Assistance**: Edge Function `ai-suggest-mapping`

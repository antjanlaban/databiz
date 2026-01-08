# Business Requirements

**Summary**  
Belangrijkste doelen, uitdagingen en succescriteria van het PIM-systeem voor Van Kruiningen Reclame.

## Stakeholders

- Eigenaren Van Kruiningen Reclame
- Interne medewerkers (geautoriseerde users)

## Core Need

- Supplier data eenvoudig verwerken tot een uniforme, beheerbare eigen database
- Publicatie en beheer van productdata sneller en foutloos maken
- **🤖 Data Dirigent: AI-assisted data transformatie vanaf ruwe import tot export-ready products**

### Data Dirigent Capabilities

**1. Dataset maken (Mapping & Validation)**
- Intelligente kolom mapping van leveranciersdata naar PIM structuur
- AI-powered suggesties met confidence scores (Gemini 2.5 Flash)
- Template learning: systeem wordt slimmer per import
- P0/P1/P2 validatie voor data quality assurance
- Direct vanuit import flow: onderdeel van bestand inlezen

**2. Activeren (Controlled Promotion)**
- Gecontroleerde promotie van INACTIVE temp data naar ACTIVE catalogus
- Dataset priority management (hoogste prioriteit wint bij duplicates)
- Quality score preview voor activatie beslissing
- Leveranciers Catalogus toont alleen ACTIVE products

**3. Promoveren (Assortiment Selectie)**
- Selectie van leveranciers assortiment voor eigen "Mijn Assortiment"
- Promotion wizard met AI enrichment suggesties
- Master product creation met variants (color × size)
- Separate state: PROMOTED products zichtbaar in Mijn Assortiment

**4. Verrijken (AI Data Completion)**
- AI-powered data completion voor missing fields
- Conversational enrichment chat per product
- Quality rule checking en suggestions
- Bulk enrichment workflows voor efficiency

## Main Business Objectives (KPIs)

### Data Quality KPIs
- **Foutmarge reductie:** 35% → <5% binnen 6 maanden (via P0/P1/P2 validatie)
- **Verwerkingstijd nieuwe data:** 4 uren handmatig werk → 15 minuten met AI mapping
- **Data completeness:** 60% → >90% door AI enrichment suggesties
- **Export readiness:** >90% van actieve producten voldoen aan channel requirements

### Data Dirigent Efficiency KPIs
- **AI Mapping Acceptance Rate:** >80% AI suggesties direct geaccepteerd door users
- **Template Learning Improvement:** 30% reductie in handmatige correcties per iteratie
- **Dataset Activation Time:** <2 minuten voor 1000 producten (transform + quality check)
- **Manual Mapping Time:** 75% reductie door AI + template hergebruik

### Export & Integration KPIs
- **Generic Export System:** Support >5 channels zonder custom code per channel
- **Export Success Rate:** >98% zonder errors (via readiness pre-check)
- **Channel Configuration Time:** <30 minuten per nieuwe export channel
- **Scheduled Export Reliability:** 99.5% uptime voor automated syncs

## Compliance / Special Constraints

- Geen branche- of wettelijke eisen (focus: betrouwbaarheid en efficiency)

## Technology Enablers

### AI Integration (Lovable AI - Gemini 2.5 Flash)
- **Kolom mapping suggesties** met confidence scores (0-100%)
- **Pattern learning** van gebruiker feedback (ai_mapping_feedback tabel)
- **Data quality prediction** voor pre-activation beslissingen
- **Export readiness checking** tegen channel requirements
- **Conversational enrichment** voor missing field completion

### Automation & Orchestration
- **Scheduled exports** via pg_cron (hourly/daily/weekly per channel)
- **Real-time quality monitoring** via quality_rules engine
- **Predictive validation** tijdens mapping fase (prevent errors early)
- **Template versioning** met automatic optimization
- **Dataset priority** management voor conflict resolution

### Import Template Intelligence (v8.0)
- **BR-023: Auto-save templates** na succesvolle import (P0 velden only)
- **BR-024: Auto-load templates** bij matching supplier+brand combinatie
- **Column mismatch detection** met clear user feedback
- **Zero-config template management** (geen handmatige save/load acties nodig)
- **Intelligent template matching** op basis van supplier_id + brand_id
- **Template usage analytics** voor success rate tracking

### Generic Export Architecture
- **Channel-agnostic** export system (config-driven, no hardcoded vendors)
- **Field mapping transformers** via JSON configuration per channel
- **Multiple delivery methods:** API, File, SFTP, Webhook
- **Readiness pre-checks** to prevent export failures
- **Retry logic** en error handling per channel

## Business Requirements Detail

### BR-023: Auto-save Import Templates (v8.0)

**Requirement:** Systeem moet automatisch import templates opslaan na succesvolle import zonder handmatige gebruikersactie.

**Rationale:**
- Elimineer "template vergeten op te slaan" errors
- Reduce cognitive load: gebruikers hoeven niet aan template management te denken
- Zero-config philosophy: systeem leert automatisch van elke import

**Success Criteria:**
- Na succesvolle import (status = 'completed'): template automatisch opgeslagen
- Alleen P0 field mappings worden opgeslagen (simplified scope)
- Template gekoppeld aan `supplier_id` + `brand_id` combinatie
- `usage_count` wordt geïncrementeerd
- `last_used_at` timestamp wordt bijgewerkt
- Gebruiker ziet succes indicator: "Template opgeslagen voor toekomstige imports"

**Technical Implementation:**
- Edge Function `save-import-template` wordt aangeroepen na import completion
- UPSERT operation: update bestaande template of create nieuwe
- Template matching logic: `(supplier_id, brand_id)` unique constraint

---

### BR-024: Auto-load Import Templates (v8.0)

**Requirement:** Systeem moet automatisch matching template laden wanneer gebruiker import start met bekende supplier+brand combinatie.

**Rationale:**
- Eliminate repetitive mapping work voor regelmatige leveranciers
- Drastische reductie in mapping tijd: van 15 minuten naar 30 seconden
- Intelligent default: gebruiker kan altijd nog aanpassen als nodig

**Success Criteria:**
- Bij file upload: systeem detecteert supplier+brand
- Als template bestaat: automatisch laden P0 mappings
- Column mismatch detection: systeem waarschuwt als file kolommen verschillen van template
- Visual feedback:
  - ✅ Groen: Template geladen, kolommen matchen perfect
  - ⚠️ Geel: Template geladen, maar kolommen verschillen (toon differences)
  - ℹ️ Grijs: Geen template beschikbaar voor deze combinatie
- Gebruiker kan geladen mappings aanpassen en opslaan (update template)

**Technical Implementation:**
- React Hook `useAutoImportTemplate(supplierId, brandId, fileColumns)`
- Haalt active template op uit `import_templates` tabel
- Vergelijkt `template.file_columns` met `currentFileColumns`
- Returns: `{ template, columnMismatch, isLoading }`
- Frontend toont appropriate UI state op basis van mismatch indicator

## Scope

- Gericht op bedrijfskleding en decoratie
- Domeinspecifiek, geen plannen voor andere productsegmenten (voor nu)
- **Data Dirigent:** Focus op Nederlandse leveranciers (NL/EN language support)
- **Export channels:** Primair Gripp ERP, Calculated KMS, Shopify - uitbreidbaar naar andere systemen

_Document is a living artifact – update as business changes._

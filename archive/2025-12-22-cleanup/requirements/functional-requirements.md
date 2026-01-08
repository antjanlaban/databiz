# Functional Requirements

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Dit document beschrijft **wat** het systeem moet kunnen (niet hoe). Georganiseerd per module met priority levels.

---

## FR-001: Product Management

**Priority:** Critical  
**Status:** Required for MVP

### FR-001.1: Create Product Style

**User Story:** Als productmanager wil ik een nieuw product style aanmaken zodat ik een basis heb voor varianten.

**Acceptance Criteria:**

- [ ] Formulier met verplichte velden: style_name (uniek per brand), brand_id
- [ ] Optionele velden: supplier_article_code, supplier, materiaal, gewicht, pasvorm
- [ ] Validatie: style_name uniek per brand, 1-200 karakters
- [ ] KERN/RAND selectie (default: KERN)
- [ ] Success toast + redirect naar created style

### FR-001.2: Edit Product Style

**User Story:** Als productmanager wil ik product styles kunnen wijzigen.

**Acceptance Criteria:**

- [ ] Pre-filled form met huidige waarden
- [ ] Kan wijzigen: name, beschrijving, materiaal, supplier_article_code, etc.
- [ ] Validatie: style_name moet uniek blijven per brand
- [ ] Audit log: wie wijzigde wat wanneer

### FR-001.3: Archive Product Style

**User Story:** Als productmanager wil ik oude producten kunnen archiveren zonder data te verliezen.

**Acceptance Criteria:**

- [ ] Set is_active = FALSE (soft delete)
- [ ] Confirm dialog: "X varianten en Y SKUs worden ook gedeactiveerd"
- [ ] Kan niet archiveren als actieve orders bestaan
- [ ] Gearchiveerde producten niet tonen in lijsten (filter!)

### FR-001.4: List Product Styles

**User Story:** Als gebruiker wil ik alle products kunnen zien en filteren.

**Acceptance Criteria:**

- [ ] Tabel met kolommen: code, naam, merk, type (KERN/RAND), status
- [ ] Filter: actief/inactief, KERN/RAND, merk, leverancier
- [ ] Zoeken: naam, code
- [ ] Paginatie: 20 items per pagina
- [ ] Sort: naam, code, created_at

---

## FR-002: Color Variant Management

**Priority:** Critical  
**Status:** Required for MVP

### FR-002.1: Add Color Variant to Style

**User Story:** Als productmanager wil ik kleurvarianten toevoegen aan een style.

**Acceptance Criteria:**

- [ ] Formulier binnen style detail page
- [ ] Verplicht: color_code, color_family_id, color_name_nl
- [ ] Optioneel: hex_color, pantone_code, supplier color name
- [ ] Auto-suggest color family op basis van kleur naam
- [ ] Validatie: color_code uniek binnen style

### FR-002.2: Upload Color Variant Images

**User Story:** Als productmanager wil ik foto's per kleur uploaden.

**Acceptance Criteria:**

- [ ] Drag & drop image upload
- [ ] Max 10 afbeeldingen per kleur
- [ ] Supported formats: JPG, PNG (max 5MB)
- [ ] Auto-resize naar 800x800px
- [ ] Set één als primaire afbeelding
- [ ] Sorteervolgorde aanpasbaar (drag & drop)

---

## FR-003: SKU Management

**Priority:** Critical  
**Status:** Required for MVP

### FR-003.1: Generate SKUs for Color Variant

**User Story:** Als productmanager wil ik automatisch SKUs genereren voor alle maten.

**Acceptance Criteria:**

- [ ] Selecteer maten (checkboxes: XS, S, M, L, XL, etc.)
- [ ] Auto-generate sku_code: MASTER-{id} (database trigger, starting MASTER-100000)
- [ ] EAN verplicht (handmatig invoeren of auto-generate)
- [ ] Set default prijs (kan later per SKU wijzigen)
- [ ] Bulk create alle geselecteerde maten

### FR-003.2: Edit SKU Price

**User Story:** Als productmanager wil ik prijzen per SKU kunnen aanpassen.

**Acceptance Criteria:**

- [ ] Inline edit in tabel
- [ ] Velden: cost_price, selling_price_excl_vat, sales_discount
- [ ] Validatie: selling > cost (warning als negatieve marge)
- [ ] Auto-berekening: margin_percentage, price_incl_vat
- [ ] Price history log (BR-009)

### FR-003.3: Update Stock Levels

**User Story:** Als magazijnmedewerker wil ik voorraadniveaus kunnen wijzigen.

**Acceptance Criteria:**

- [ ] Inline edit: stock_quantity
- [ ] Bulk update mogelijk (selecteer meerdere SKUs)
- [ ] Validatie: stock_quantity >= 0
- [ ] Voorraad mutatie log (voor audit)

---

## FR-004: Import - Bestand Inlezen

**Priority:** Critical  
**Status:** Required for MVP  
**Phase:** IMPORT (Funnel Step 1)

### FR-004.1: Upload Import File

**User Story:** Als productmanager wil ik Excel/CSV bestanden uploaden met productdata van leveranciers.

**Acceptance Criteria:**

- [ ] File upload: .xlsx, .xls, .csv (max 10MB)
- [ ] Upload naar Supabase Storage (`imports` bucket)
- [ ] Validatie: bestandstype, grootte
- [ ] Progress indicator tijdens upload
- [ ] Create `import_supplier_dataset_jobs` record (status: `pending`)

### FR-004.2: Parse File Columns

**User Story:** Als productmanager wil ik kolommen uit mijn bestand gedetecteerd krijgen.

**Acceptance Criteria:**

- [ ] Automatische kolom detectie via `parse-file-columns` Edge Function
- [ ] Sheet selectie voor Excel bestanden (meerdere sheets)
- [ ] Encoding detectie (UTF-8, ISO-8859-1, Windows-1252)
- [ ] Preview eerste 10 rijen per kolom
- [ ] Kolom statistieken (unieke waarden, null rate)

---

## FR-004A: Dataset Maken (Import Fase)

**Priority:** Critical  
**Status:** Required for MVP  
**Phase:** IMPORT - Dataset Creatie (onderdeel van Bestand Inlezen)  
**Note:** Voorheen "Data Dirigent - Converteren", nu geïntegreerd in Import flow

### FR-004A.1: AI-Assisted Mapping

**User Story:** Als productmanager wil ik AI-suggesties voor kolom mapping.

**Acceptance Criteria:**

- [ ] Trigger `ai-suggest-mapping` Edge Function
- [ ] AI analyseert kolom namen + sample data
- [ ] Confidence score per suggestie (0-100%)
- [ ] Gebruiker kan accepteren/afwijzen per suggestie
- [ ] Feedback wordt opgeslagen in `ai_mapping_feedback` tabel
- [ ] Template learning: hogere acceptance bij volgende import

### FR-004A.2: Manual Column Mapping (v8.0 Simplified Templates)

**User Story:** Als productmanager wil ik handmatig kolommen mappen naar PIM velden met intelligente template ondersteuning.

**Acceptance Criteria:**

- [ ] Dropdown per PIM veld met beschikbare kolommen
- [ ] **P0 fields ONLY** worden gemapped (simplified template scope)
- [ ] Required fields (P0) gemarkeerd in rood
- [ ] Optional fields (P1/P2) gemarkeerd met badge (niet opgeslagen in template)
- [ ] "Vaste waarde" optie voor constante waarden
- [ ] **BR-023: Auto-save template** na succesvolle import (geen handmatige save actie nodig)
- [ ] **BR-024: Auto-load template** wanneer supplier+brand match wordt gedetecteerd
- [ ] **Column mismatch detection** met duidelijke visuele feedback:
  - Groene indicator: Template geladen, kolommen matchen perfect
  - Gele waarschuwing: Template geladen, maar kolommen verschillen (toon verschillen)
  - Grijze status: Geen template beschikbaar voor deze combinatie
- [ ] Mapping preview met sample data
- [ ] Template usage statistics (last used, success rate)

### FR-004A.3: Execute Mapping & Validation (v8.0 Auto-Active Flow)

**User Story:** Als productmanager wil ik mapping uitvoeren met automatische activatie en template opslag.

**Acceptance Criteria:**

- [ ] Trigger `execute-mapping` Edge Function
- [ ] Parse alle rijen + apply mapping
- [ ] Insert naar `supplier_products` tabel (direct ACTIVE, geen temp fase meer)
- [ ] **Auto-active flow:** Producten zijn direct zichtbaar in Leveranciers Catalogus
- [ ] Validatie volgens P0/P1/P2 rules
- [ ] Error rapport met rijnummers + field names
- [ ] Download error rapport als CSV
- [ ] Kan doorgaan met warnings, niet met errors
- [ ] **BR-023: Auto-save template** na succesvolle import:
  - Alleen P0 mappings worden opgeslagen
  - Template_id wordt gekoppeld aan import_job
  - Usage_count wordt geïncrementeerd
  - Last_used_at wordt bijgewerkt

---

## FR-004B: Data Dirigent - Activeren (v8.0 DEPRECATED)

**Priority:** ~~Critical~~ DEPRECATED in v8.0  
**Status:** ~~Required for MVP~~ REPLACED BY AUTO-ACTIVE FLOW  
**Phase:** ~~DATA DIRIGENT - ACTIVEREN~~ **REMOVED IN V8.0**

**⚠️ V8.0 CHANGE:** Separate activation step is verwijderd. Import flow activeert producten automatisch.

### FR-004B.1: Dataset Activation (DEPRECATED in v8.0)

**⚠️ DEPRECATED:** In v8.0 worden producten automatisch ACTIVE gemaakt tijdens import (zie FR-004A.3).

~~**User Story:** Als productmanager wil ik een gevalideerde dataset activeren.~~

**V8.0 Replacement:**
- Import flow maakt producten direct ACTIVE (geen aparte activatie stap)
- Producten zijn direct zichtbaar in Leveranciers Catalogus na import
- Quality checks gebeuren tijdens mapping fase
- Geen temp/staging fase meer nodig

### FR-004B.2: Dataset Deactivation (Still Valid in v8.0)

**User Story:** Als productmanager wil ik een actieve dataset kunnen deactiveren.

**Acceptance Criteria:**

- [ ] Toon impact: hoeveel producten worden INACTIVE
- [ ] Confirm dialog met warning
- [ ] Trigger `deactivate-dataset` Edge Function
- [ ] Set `product_status = 'INACTIVE'` voor gedeactiveerde producten
- [ ] Update `file_status = 'INACTIVE'` op import job record
- [ ] Leveranciers Catalogus toont alleen ACTIVE producten
- [ ] Deactivatie is omkeerbaar (re-activatie mogelijk)

**V8.0 Note:** Deze functionaliteit blijft relevant voor dataset lifecycle management.

### FR-004B.3: Dataset Priority Management (Still Valid in v8.0)

**User Story:** Als productmanager wil ik prioriteit tussen datasets kunnen beheren.

**Acceptance Criteria:**

- [ ] View datasets per supplier (gesorteerd op prioriteit)
- [ ] Drag & drop prioriteit volgorde aanpassen
- [ ] Bij overlappende SKUs: hoogste prioriteit wint
- [ ] Visual indicator van conflicten
- [ ] Automatic re-prioritization bij deactivatie
- [ ] Priority change audit log

**V8.0 Note:** Dataset prioriteit management blijft belangrijk voor conflict resolution.

---

## FR-005: Export & Integratie - Generiek Systeem

**Priority:** High  
**Status:** Required post-MVP  
**Phase:** EXPORT & INTEGRATIE (Funnel Step 7)

### FR-005.1: Export Channel Configuration

**User Story:** Als admin wil ik export channels kunnen configureren.

**Acceptance Criteria:**

- [ ] Create/edit export channel in `export_channels` tabel
- [ ] Channel types: API, FILE, SFTP, WEBHOOK
- [ ] Configuratie per channel: endpoint, auth, format
- [ ] Define required fields via `export_channel_requirements`
- [ ] Map PIM fields → channel fields (JSON transformer)
- [ ] Test connection functionaliteit

### FR-005.2: Export Readiness Check

**User Story:** Als productmanager wil ik zien welke producten klaar zijn voor export.

**Acceptance Criteria:**

- [ ] Trigger `check-export-readiness` Edge Function
- [ ] Check per product: voldoet aan channel requirements
- [ ] Visual indicator: ✅ Ready, ⚠️ Missing optional, ❌ Blocked
- [ ] Filter producten: alleen ready voor channel X
- [ ] Bulk view: hoeveel % van assortiment is ready

### FR-005.3: Generic Export Execution

**User Story:** Als productmanager wil ik producten exporteren naar configured channel.

**Acceptance Criteria:**

- [ ] Selecteer channel uit dropdown
- [ ] Filter producten: categorie, merk, status
- [ ] Preview export (sample 10 records)
- [ ] Trigger `export-generic` Edge Function
- [ ] Transform data volgens channel mapping
- [ ] Send via channel method (API/File/SFTP/Webhook)
- [ ] Create `export_jobs` record met status tracking
- [ ] Real-time progress bar
- [ ] Success/error rapport

### FR-005.4: Export Scheduling

**User Story:** Als admin wil ik automatische exports kunnen inplannen.

**Acceptance Criteria:**

- [ ] Configuratie per channel: frequentie (hourly, daily, weekly)
- [ ] Kies sync type: full or delta (gewijzigd sinds laatste sync)
- [ ] Enable/disable scheduling toggle
- [ ] Cron job via `pg_cron` extension
- [ ] View last sync time + status per channel
- [ ] Error notifications via email/webhook

### FR-005.5: Export History & Monitoring

**User Story:** Als productmanager wil ik export geschiedenis kunnen bekijken.

**Acceptance Criteria:**

- [ ] Tabel met export jobs: datum, channel, status, counts
- [ ] Filter: datum range, channel, status (success/failed/partial)
- [ ] View error details per job
- [ ] Download export data voor troubleshooting
- [ ] Retry failed exports

---

## FR-006: Decoration Management

**Priority:** Medium  
**Status:** Post-MVP

### FR-006.1: Configure Decoration Options

**User Story:** Als productmanager wil ik aangeven welke decoratie mogelijk is per product.

**Acceptance Criteria:**

- [ ] Per style: selecteer methode (borduren, print, transfer)
- [ ] Per methode: selecteer posities (borst, rug, mouw)
- [ ] Set pricing: setup fee, prijs per stuk
- [ ] Set constraints: min order qty, max colors

### FR-006.2: Upload Logo for Decoration

**User Story:** Als verkoopmedewerker wil ik klant logo's uploaden voor decoratie.

**Acceptance Criteria:**

- [ ] Upload afbeelding (PNG, JPG, SVG)
- [ ] Validatie: min resolutie (300 DPI borduren, 150 DPI print)
- [ ] Preview met positie op kledingstuk
- [ ] Opslaan per klant (herbruikbaar)

---

## FR-007: Search & Filter

**Priority:** High  
**Status:** Required for MVP

### FR-007.1: Full-Text Search

**User Story:** Als gebruiker wil ik producten kunnen zoeken op naam/code.

**Acceptance Criteria:**

- [ ] Zoekbalk: search in style_name, sku_code, color_name
- [ ] Real-time suggesties (autocomplete)
- [ ] Highlight search terms in results

### FR-007.2: Advanced Filters

**User Story:** Als gebruiker wil ik producten filteren op eigenschappen.

**Acceptance Criteria:**

- [ ] Filter opties:
  - Merk (multi-select)
  - Kleur (multi-select)
  - Maat (multi-select)
  - Prijsrange (slider)
  - Voorraad (in stock / out of stock)
  - Type (KERN / RAND)
- [ ] Combineerbaar (AND logic)
- [ ] Clear filters button
- [ ] Filter count badge (X filters actief)

---

## FR-008: User Management

**Priority:** Low  
**Status:** Post-MVP

### FR-008.1: Invite User

**User Story:** Als eigenaar wil ik medewerkers uitnodigen.

**Acceptance Criteria:**

- [ ] Invite via email
- [ ] Set role: Owner / Employee
- [ ] User ontvangt email met setup link
- [ ] Automatisch gekoppeld aan tenant

### FR-008.2: Manage Permissions

**User Story:** Als eigenaar wil ik permissies per gebruiker instellen.

**Acceptance Criteria:**

- [ ] Role-based permissions:
  - Owner: alles
  - Employee: view + edit products, no delete, no user management
- [ ] Kan users deactiveren (niet verwijderen)

---

## FR-009: Reporting

**Priority:** Low  
**Status:** Post-MVP

### FR-009.1: Product Overview Report

**User Story:** Als management wil ik overzicht van producten.

**Acceptance Criteria:**

- [ ] Metrics: totaal producten, per merk, per type
- [ ] Charts: verdeling KERN/RAND, top 10 merken
- [ ] Export naar PDF

### FR-009.2: Import History Report

**User Story:** Als productmanager wil ik import geschiedenis zien.

**Acceptance Criteria:**

- [ ] Tabel: datum, bestand, status, counts
- [ ] Filter: datum range, status
- [ ] Re-download import bestanden

---

## Priority Matrix

| Module             | Priority | MVP | Post-MVP |
| ------------------ | -------- | --- | -------- |
| Product Management | Critical | ✓   | -        |
| Variant Management | Critical | ✓   | -        |
| SKU Management     | Critical | ✓   | -        |
| Import             | Critical | ✓   | -        |
| Export             | High     | -   | ✓        |
| Decoration         | Medium   | -   | ✓        |
| Search/Filter      | High     | ✓   | -        |
| User Management    | Low      | -   | ✓        |
| Reporting          | Low      | -   | ✓        |

---

## Non-Functional Requirements

**Performance:**

- Page load < 2s
- Import 1000 products < 5 min
- Search results < 500ms

**Usability:**

- Desktop-only (minimum 1280px schermbreed)
- Keyboard shortcuts voor power users
- Undo functie voor bulk operations

### Platform Requirements

**Desktop-Only Rationale:**

Van Kruiningen PIM is **expliciet niet responsive** en ondersteunt **geen mobiele of tablet devices**. Deze keuze is gebaseerd op:

1. **Workflow Complexiteit:** Import mapping vereist side-by-side preview van 50+ kolommen
2. **Data Density:** Product lijsten tonen 10+ kolommen met inline editing
3. **Bulk Operations:** Multi-select + batch actions zijn niet touch-friendly
4. **User Base:** Interne medewerkers werken uitsluitend op desktop workstations

**Minimum Screen Size:** 1280px breed (laptop/desktop)
**Recommended:** 1440px+ voor optimale UX

**Reliability:**

- 99.9% uptime
- Auto-save drafts
- Graceful degradation bij API failures

**Security:**

- Tenant isolation (zie multi-tenancy-strategy.md)
- Audit logs voor wijzigingen
- HTTPS only

---

_Requirements evolueren op basis van gebruiker feedback._

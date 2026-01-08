# User Stories

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

User stories georganiseerd per Epic met priority en story points.

**Format:**

```
Als [rol]
Wil ik [actie]
Zodat [waarde/doel]
```

---

## Epic 1: Product Catalogus Beheer

**Priority:** Critical | **Target Sprint:** 1-2

### US-001: Nieuw Product Aanmaken

**Als** productmanager  
**Wil ik** een nieuw product style kunnen aanmaken  
**Zodat** ik een basis heb om varianten en SKUs aan toe te voegen

**Acceptance Criteria:**

- [ ] Formulier met style_name (uniek per brand), brand, supplier
- [ ] Optioneel: supplier_article_code voor leverancier referentie
- [ ] Validatie: style_name uniek per brand, 1-200 karakters
- [ ] KERN/RAND selectie
- [ ] Success notification + redirect

**Story Points:** 5  
**Dependencies:** None

---

### US-002: Kleurvarianten Toevoegen

**Als** productmanager  
**Wil ik** kleuren toevoegen aan een product style  
**Zodat** ik verschillende kleurvarianten kan aanbieden

**Acceptance Criteria:**

- [ ] Kleurcode, naam, kleur familie verplicht
- [ ] Hex code en Pantone optioneel
- [ ] Foto's uploaden per kleur (max 10)
- [ ] Primaire foto instellen

**Story Points:** 8  
**Dependencies:** US-001

---

### US-003: SKUs Genereren voor Maten

**Als** productmanager  
**Wil ik** automatisch SKUs genereren voor alle beschikbare maten  
**Zodat** ik niet handmatig elke maat hoef in te voeren

**Acceptance Criteria:**

- [ ] Selecteer maten (XS-5XL checkboxes)
- [ ] Auto-generate SKU code: MASTER-{id} (database handles this, starting MASTER-100000)
- [ ] EAN verplicht (handmatig invoeren)
- [ ] Default prijs voor alle maten (kan later wijzigen)

**Story Points:** 5  
**Dependencies:** US-002

---

### US-004: Prijzen Beheren

**Als** productmanager  
**Wil ik** prijzen per SKU kunnen instellen en wijzigen  
**Zodat** ik juiste verkoopprijzen kan hanteren

**Acceptance Criteria:**

- [ ] Inline edit in SKU tabel
- [ ] Velden: inkoopprijs, verkoopprijs, korting
- [ ] Automatische berekening marge percentage
- [ ] Warning bij negatieve marge
- [ ] Prijs wijzigingen worden gelogd

**Story Points:** 3  
**Dependencies:** US-003

---

### US-005: Voorraad Bijwerken

**Als** magazijnmedewerker  
**Wil ik** voorraadniveaus kunnen wijzigen  
**Zodat** het systeem actuele voorraad toont

**Acceptance Criteria:**

- [ ] Inline edit stock_quantity
- [ ] Bulk update mogelijk (selecteer meerdere SKUs)
- [ ] Validatie: voorraad >= 0
- [ ] Voorraad mutatie log

**Story Points:** 3  
**Dependencies:** US-003

---

### US-006: Producten Archiveren

**Als** productmanager  
**Wil ik** oude/uitgefaseerde producten kunnen archiveren  
**Zodat** ze niet meer zichtbaar zijn maar data behouden blijft

**Acceptance Criteria:**

- [ ] Soft delete (is_active = FALSE)
- [ ] Confirm dialog met impact (X variants, Y SKUs)
- [ ] Kan niet archiveren met actieve orders
- [ ] Filter om gearchiveerde te verbergen/tonen

**Story Points:** 3  
**Dependencies:** US-001

---

## Epic 2: Import - Bestand Inlezen

**Priority:** Critical | **Target Sprint:** 2

### US-007: Excel/CSV Uploaden

**Als** productmanager  
**Wil ik** Excel of CSV bestanden uploaden met productdata  
**Zodat** ik bulk imports kan doen van leveranciers

**Acceptance Criteria:**

- [ ] Drag & drop of file picker
- [ ] Accept .xlsx, .xls, .csv (max 10MB)
- [ ] Upload naar Supabase Storage (`imports` bucket)
- [ ] Progress indicator tijdens upload
- [ ] Create `import_supplier_dataset_jobs` record

**Story Points:** 3  
**Dependencies:** None

---

### US-008: Kolom Detectie

**Als** productmanager  
**Wil ik** automatische detectie van kolommen  
**Zodat** ik weet welke data beschikbaar is

**Acceptance Criteria:**

- [ ] Parse headers via `parse-file-columns` Edge Function
- [ ] Sheet selectie voor Excel (meerdere sheets)
- [ ] Encoding detectie (UTF-8, ISO-8859-1)
- [ ] Preview eerste 10 rijen
- [ ] Kolom statistieken (unieke waarden, null rate)

**Story Points:** 5  
**Dependencies:** US-007

---

## Epic 2: Import - Dataset Maken

**Priority:** Critical | **Target Sprint:** 2-3  
**Note:** Voorheen "Data Dirigent - Converteren", nu onderdeel van Import flow

### US-009: AI Mapping Suggesties

**Als** productmanager  
**Wil ik** AI-suggesties voor kolom mapping  
**Zodat** ik sneller kan mappen bij nieuwe leveranciers

**Acceptance Criteria:**

- [ ] Trigger `ai-suggest-mapping` via button
- [ ] AI analyseert kolom namen + sample data
- [ ] Toon confidence score per suggestie (0-100%)
- [ ] Gebruiker kan accepteren/afwijzen
- [ ] Feedback opslaan in `ai_mapping_feedback`
- [ ] Template learning: hogere acceptance bij herhaling

**Story Points:** 8  
**Dependencies:** US-008

---

### US-010: Handmatige Kolom Mapping (v8.0 Intelligent Templates)

**Als** productmanager  
**Wil ik** leveranciers kolommen mappen naar PIM velden met automatische template ondersteuning  
**Zodat** ik niet elke keer opnieuw hoef te mappen

**Acceptance Criteria:**

- [ ] Dropdown per PIM veld met beschikbare kolommen
- [ ] Required fields (P0) gemarkeerd met ⚠️ (alleen P0 in template)
- [ ] Optional fields (P1/P2) met badge (niet opgeslagen in template)
- [ ] "Vaste waarde" optie voor constanten
- [ ] **BR-024: Auto-load template** bij herkenning supplier+brand
- [ ] **Column mismatch indicator:**
  - ✅ Groen: Template past perfect
  - ⚠️ Geel: Template geladen maar kolommen verschillen (toon verschillen)
  - ℹ️ Grijs: Geen template beschikbaar
- [ ] Preview met sample data
- [ ] Template statistieken (last used, usage count)
- [ ] **BR-023: Auto-save** na succesvolle import (geen handmatige actie)

**Story Points:** 8  
**Dependencies:** US-009

**V8.0 Changes:**
- Templates zijn simplified (P0 only)
- Zero-config: automatisch laden en opslaan
- Column mismatch detection voor user awareness

---

### US-011: Mapping Uitvoeren & Valideren (v8.0 Auto-Active)

**Als** productmanager  
**Wil ik** mapping uitvoeren met automatische activatie en template opslag  
**Zodat** producten direct beschikbaar zijn na import

**Acceptance Criteria:**

- [ ] Trigger `execute-mapping` Edge Function
- [ ] Parse alle rijen + apply mapping
- [ ] Insert naar `supplier_products` (direct ACTIVE status)
- [ ] **Auto-active:** Producten direct zichtbaar in Leveranciers Catalogus
- [ ] Validatie volgens P0/P1/P2 rules
- [ ] Error rapport met rijnummers
- [ ] Download error log als CSV
- [ ] Kan doorgaan met warnings, niet met errors
- [ ] **BR-023: Auto-save template** na succesvolle import:
  - P0 mappings opgeslagen
  - Usage count verhoogd
  - Template gekoppeld aan import job

**Story Points:** 13  
**Dependencies:** US-010

**V8.0 Changes:**
- Geen temp/staging fase meer (direct ACTIVE)
- Template automatisch opgeslagen (geen handmatige actie)
- Simplified flow: import → validate → active (was: import → validate → stage → activate)

---

## Epic 3: Data Dirigent - Activeren (v8.0 SIMPLIFIED)

**Priority:** ~~Critical~~ PARTIALLY DEPRECATED | **Target Sprint:** ~~3~~ INTEGRATED IN SPRINT 2

**⚠️ V8.0 CHANGE:** Auto-active flow vervangt handmatige activatie. US-012 is deprecated, US-013 en US-014 blijven relevant voor dataset management.

### US-012: Dataset Activeren (DEPRECATED in v8.0)

**⚠️ DEPRECATED:** Producten worden nu automatisch ACTIVE gemaakt tijdens import (zie US-011).

~~**Als** productmanager~~  
~~**Wil ik** een gevalideerde dataset activeren~~  
~~**Zodat** producten zichtbaar worden in Leveranciers Catalogus~~

**V8.0 Replacement:**
- Import flow maakt producten direct ACTIVE (US-011 bevat nu deze functionaliteit)
- Geen aparte activatie stap meer nodig
- Quality checks gebeuren tijdens mapping fase
- Dataset management (deactivatie, prioriteit) blijft beschikbaar via US-013 en US-014

**Story Points:** ~~13~~ N/A (functionaliteit verplaatst naar US-011)  
**Dependencies:** ~~US-011~~ DEPRECATED

---

### US-013: Dataset Deactiveren (Still Valid in v8.0)

**Als** productmanager  
**Wil ik** een actieve dataset kunnen deactiveren  
**Zodat** verouderde producten niet meer zichtbaar zijn

**Acceptance Criteria:**

- [ ] Toon impact: hoeveel producten INACTIVE
- [ ] Confirm dialog met warning
- [ ] Trigger `deactivate-dataset` Edge Function
- [ ] Set `product_status = 'INACTIVE'`
- [ ] Update `file_status = 'INACTIVE'` op import job
- [ ] Leveranciers Catalogus filtert INACTIVE producten
- [ ] Deactivatie is omkeerbaar (re-activatie mogelijk)

**Story Points:** 5  
**Dependencies:** ~~US-012~~ US-011 (v8.0 update)

**V8.0 Note:** Dataset deactivatie blijft belangrijk voor lifecycle management, ook al is er geen aparte activatie stap meer.

---

### US-014: Dataset Prioriteit Beheren (Still Valid in v8.0)

**Als** productmanager  
**Wil ik** prioriteit tussen datasets kunnen beheren  
**Zodat** bij overlappende SKUs de juiste versie actief is

**Acceptance Criteria:**

- [ ] View datasets per supplier (gesorteerd op prioriteit)
- [ ] Drag & drop prioriteit volgorde aanpassen
- [ ] Bij duplicate SKUs: hoogste prioriteit wint
- [ ] Visual indicator van conflicten
- [ ] Automatic re-prioritization bij deactivatie
- [ ] Priority change audit log

**Story Points:** 8  
**Dependencies:** ~~US-012~~ US-011 (v8.0 update)

**V8.0 Note:** Priority management blijft essentieel voor het oplossen van SKU conflicts tussen datasets.

---

### US-015: Import Historie Bekijken

**Als** productmanager  
**Wil ik** eerdere imports kunnen terugzien  
**Zodat** ik kan traceren wanneer data is geïmporteerd

**Acceptance Criteria:**

- [ ] Tabel: datum, bestand, status, counts
- [ ] Filter: datum range, status, supplier
- [ ] View dataset details
- [ ] Re-download originele bestanden
- [ ] **Template indicator:** Welke template werd gebruikt
- [ ] **Column mismatch history:** Of er kolom verschillen waren

**Story Points:** 3  
**Dependencies:** ~~US-012~~ US-011 (v8.0 update)

**V8.0 Addition:** Import history toont ook template usage informatie.

---

## Epic 3: Export & Integratie - Generiek Systeem

**Priority:** High | **Target Sprint:** 4-5

### US-016: Export Channel Configureren

**Als** admin  
**Wil ik** export channels kunnen configureren  
**Zodat** ik flexibel kan integreren met externe systemen

**Acceptance Criteria:**

- [ ] Create/edit channel in `export_channels` tabel
- [ ] Channel types: API, FILE, SFTP, WEBHOOK
- [ ] Config per channel: endpoint, auth, format
- [ ] Define required fields via `export_channel_requirements`
- [ ] Map PIM fields → channel fields (JSON transformer)
- [ ] Test connection functionaliteit

**Story Points:** 13  
**Dependencies:** None

---

### US-017: Export Readiness Checken

**Als** productmanager  
**Wil ik** zien welke producten klaar zijn voor export  
**Zodat** ik weet welke data compleet is

**Acceptance Criteria:**

- [ ] Trigger `check-export-readiness` Edge Function
- [ ] Check per product: voldoet aan channel requirements
- [ ] Visual indicator: ✅ Ready, ⚠️ Missing optional, ❌ Blocked
- [ ] Filter producten: alleen ready voor channel X
- [ ] Bulk view: % van assortiment ready

**Story Points:** 8  
**Dependencies:** US-016

---

### US-018: Generiek Export Uitvoeren

**Als** productmanager  
**Wil ik** producten exporteren naar configured channel  
**Zodat** externe systemen actuele data krijgen

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

**Story Points:** 13  
**Dependencies:** US-017

---

### US-019: Automatische Exports Inplannen

**Als** admin  
**Wil ik** regelmatige exports kunnen inplannen  
**Zodat** externe systemen altijd actuele data hebben

**Acceptance Criteria:**

- [ ] Configuratie per channel: frequentie (hourly, daily, weekly)
- [ ] Kies sync type: full or delta (gewijzigd sinds laatste sync)
- [ ] Enable/disable scheduling toggle
- [ ] Cron job via `pg_cron` extension
- [ ] View last sync time + status per channel
- [ ] Error notifications via email/webhook

**Story Points:** 8  
**Dependencies:** US-18

---

### US-020: Export History Bekijken

**Als** productmanager  
**Wil ik** export geschiedenis kunnen bekijken  
**Zodat** ik kan troubleshooten bij problemen

**Acceptance Criteria:**

- [ ] Tabel met export jobs: datum, channel, status, counts
- [ ] Filter: datum range, channel, status (success/failed/partial)
- [ ] View error details per job
- [ ] Download export data voor troubleshooting
- [ ] Retry failed exports

**Story Points:** 5  
**Dependencies:** US-019

---

## Epic 4: Zoeken & Filteren

**Priority:** High | **Target Sprint:** 3

### US-016: Producten Zoeken

**Als** gebruiker  
**Wil ik** producten kunnen zoeken op naam of code  
**Zodat** ik snel vind wat ik zoek

**Acceptance Criteria:**

- [ ] Zoekbalk: search in style_name, sku_code, color_name
- [ ] Real-time autocomplete suggesties
- [ ] Highlight search terms in resultaten

**Story Points:** 5  
**Dependencies:** None

---

### US-017: Geavanceerd Filteren

**Als** gebruiker  
**Wil ik** producten filteren op eigenschappen  
**Zodat** ik specifieke producten kan vinden

**Acceptance Criteria:**

- [ ] Filter opties: merk, kleur, maat, prijs, voorraad, type
- [ ] Multi-select filters (AND logic)
- [ ] Clear filters button
- [ ] Filter count badge

**Story Points:** 8  
**Dependencies:** US-016

---

## Epic 5: Decoratie Beheer

**Priority:** Medium | **Target Sprint:** 6

### US-018: Decoratie Opties Configureren

**Als** productmanager  
**Wil ik** decoratie mogelijkheden instellen per product  
**Zodat** verkopers weten wat mogelijk is

**Acceptance Criteria:**

- [ ] Per style: selecteer methode (borduren, print)
- [ ] Per methode: selecteer posities (borst, rug, mouw)
- [ ] Set pricing: setup fee, prijs per stuk
- [ ] Set constraints: min order, max kleuren

**Story Points:** 8  
**Dependencies:** US-001

---

### US-019: Logo Uploaden voor Decoratie

**Als** verkoopmedewerker  
**Wil ik** klant logo's uploaden  
**Zodat** decoratie uitgevoerd kan worden

**Acceptance Criteria:**

- [ ] Upload PNG, JPG, SVG (max 5MB)
- [ ] Validatie: min 300 DPI borduren, 150 DPI print
- [ ] Preview op kledingstuk
- [ ] Opslaan per klant (herbruikbaar)

**Story Points:** 5  
**Dependencies:** US-018

---

## Epic 6: User Management

**Priority:** Low | **Target Sprint:** 7+

### US-020: Medewerker Uitnodigen

**Als** eigenaar  
**Wil ik** nieuwe medewerkers kunnen uitnodigen  
**Zodat** zij toegang krijgen tot het systeem

**Acceptance Criteria:**

- [ ] Invite via email
- [ ] Set role: Owner / Employee
- [ ] User ontvangt setup email
- [ ] Auto-koppeling aan tenant

**Story Points:** 5  
**Dependencies:** None

---

### US-021: Permissies Beheren

**Als** eigenaar  
**Wil ik** permissies per gebruiker kunnen instellen  
**Zodat** ik controle heb over wie wat kan

**Acceptance Criteria:**

- [ ] Role-based: Owner (alles), Employee (limited)
- [ ] Kan users deactiveren
- [ ] Audit log van user acties

**Story Points:** 8  
**Dependencies:** US-020

---

## Story Points Reference

| Points | Complexity | Time Estimate      |
| ------ | ---------- | ------------------ |
| 1      | Trivial    | 1-2 hours          |
| 3      | Small      | 0.5 day            |
| 5      | Medium     | 1 day              |
| 8      | Large      | 2-3 days           |
| 13     | Very Large | 1 week             |
| 21     | Epic       | Split into smaller |

---

## Sprint Planning

### Sprint 1 (MVP Foundation)

- US-001: Nieuw Product Aanmaken (5)
- US-002: Kleurvarianten Toevoegen (8)
- US-003: SKUs Genereren (5)
- **Total:** 18 points

### Sprint 2 (MVP Core + v8.0 Import)

- US-004: Prijzen Beheren (3)
- US-005: Voorraad Bijwerken (3)
- US-007: Excel/CSV Uploaden (3)
- US-008: Kolom Detectie (5)
- US-010: Kolom Mapping met Intelligent Templates v8.0 (8)
- **Total:** 22 points

### Sprint 3 (MVP Import Completion)

- US-009: AI Mapping Suggesties (8)
- US-011: Mapping Uitvoeren met Auto-Active v8.0 (13)
- ~~US-012: Dataset Activeren~~ (DEPRECATED in v8.0)
- **Total:** 21 points

**V8.0 Note:** Sprint 3 is korter door wegvallen aparte activatie stap.

### Sprint 4 (Dataset Management + Search)

- US-013: Dataset Deactiveren (5)
- US-014: Dataset Prioriteit Beheren (8)
- US-015: Import Historie Bekijken (3)
- US-016: Producten Zoeken (5)
- **Total:** 21 points

### Sprint 5 (Export - Post MVP)

- US-017: Export Channel Configureren (13)
- US-018: Export Readiness Checken (8)
- **Total:** 21 points

---

**V8.0 Template Features:**
- **BR-023: Auto-save templates** → Geïntegreerd in US-011 (geen aparte story nodig)
- **BR-024: Auto-load templates** → Geïntegreerd in US-010 (geen aparte story nodig)
- **Column mismatch detection** → Onderdeel van US-010

_Story priority en scope kunnen wijzigen op basis van stakeholder feedback._

# Context 8: Content Enrichment (Verrijking)

**Doel:** Centraal domein voor het verrijken van product content (attributen, taal-omschrijvingen, afbeeldingen, PDF's, pricing) op Master/Variant level. EAN of UUID dient als connector. Data bundles zorgen voor structuur.

---

## 🎯 Core Termen

- **Content Enrichment:** Het proces van aanvullen/verbeteren van product data op master of variant niveau.
- **EAN Connector:** Unieke identifier die variant data koppelt aan externe bronnen en verrijkingen.
- **UUID Connector:** Alternative universal identifier voor entiteiten zonder EAN (masters, leveranciers).
- **Enrichment Source:** Bron van verrijking (import, AI, manual, external API, bulk upload).
- **Enrichment Type:** Type verrijking (attribute, description, image, document, pricing).
- **Master Enrichment:** Verrijking op master level (shared across variants: descriptions, images, categories).
- **Variant Enrichment:** Verrijking op variant level (specific: EAN, color, size, price, stock).
- **Enrichment Status:** Pending, In Progress, Completed, Failed, Manual Review Required.

---

## 🏗️ Architectuur Principes

### Principe 1: **Altijd op Master of Variant, NOOIT op Supplier Product**

**Rationale:**
- `supplier_products` = raw import data (immutable audit trail)
- `master_products` + `product_variants` = normalized, enriched, export-ready data
- Verrijking is een normalisatie-activiteit, niet een import-activiteit

**Voorbeeld:**
```
❌ WRONG:
supplier_products.description = "AI generated description"  
→ Overschrijft originele supplier data!

✅ CORRECT:
master_products.description = "AI generated description"
variant.price = calculated_price
```

### Principe 2: **EAN/UUID als Centrale Connector**

**EAN (Variant Level):**
- Primary identifier voor product variants
- Gebruikt voor:
  - Afbeeldingen ophalen via externe API's
  - Prijsinformatie matching
  - Stock synchronisatie
  - Export naar externe systemen (Gripp, Shopify)

**UUID/ID (Master Level):**
- `master_products.id` (UUID mogelijk in toekomst)
- Gebruikt voor:
  - Groeperen van variants
  - Shared content (descriptions, images, documents)
  - Category/brand mappings

**Voorbeeld Query:**
```sql
-- Verrijk variant via EAN
UPDATE product_variants
SET price = 29.95, stock = TRUE
WHERE ean = '5701234567890';

-- Verrijk master via ID
UPDATE master_products
SET description = 'Premium werkbroek...'
WHERE id = 1234;
```

### Principe 3: **Data Bundles Bepalen Verrijking Structuur**

**Bundle Fields configureren welke velden:**
- Verrijkbaar zijn (allow_enrichment flag)
- Prioriteit hebben (P0=critical, P1=important, P2/P3=optional)
- Van welke bron mogen komen (import, AI, manual)

**Voorbeeld Bundle Config:**
```sql
-- Bundle 2: Assortiment Import + Enrichment
SELECT 
  column_name,
  priority_level,
  allow_enrichment,
  enrichment_sources -- JSONB: ['ai', 'manual', 'api']
FROM data_bundle_fields
WHERE bundle_id = 2
  AND table_name = 'master_products'
ORDER BY sort_order;
```

---

## 📊 Data Model

### Nieuwe Tabellen (Voorgesteld)

#### `enrichment_requests`
Centrale queue voor verrijkingsverzoeken.

```sql
CREATE TABLE enrichment_requests (
  id BIGSERIAL PRIMARY KEY,
  
  -- Target Entity
  entity_type TEXT NOT NULL CHECK (entity_type IN ('master', 'variant')),
  entity_id INTEGER NOT NULL,
  connector_value TEXT, -- EAN voor variant, UUID/ID voor master
  
  -- Enrichment Details
  enrichment_type TEXT NOT NULL CHECK (enrichment_type IN (
    'attribute',      -- Velden zoals gender, fit, material
    'description',    -- Text content (short/long descriptions)
    'image',          -- Afbeeldingen (URLs, uploads)
    'document',       -- PDF's, spec sheets
    'pricing',        -- Cost/selling prices
    'stock',          -- Voorraad info
    'category'        -- Category mapping
  )),
  enrichment_source TEXT NOT NULL CHECK (enrichment_source IN (
    'import',         -- Aanvullende import
    'ai',             -- AI generation (Lovable/Gemini)
    'manual',         -- Handmatige invoer door gebruiker
    'api',            -- Externe API (Gripp, KMS, etc.)
    'bulk_upload'     -- Bulk CSV/Excel upload
  )),
  
  -- Request Data
  field_names TEXT[], -- Welke velden verrijken
  source_data JSONB,  -- Input data voor verrijking
  
  -- Status & Progress
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed', 'manual_review'
  )),
  progress_percentage INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Result
  enriched_data JSONB, -- Output van verrijking
  confidence_scores JSONB, -- Confidence per veld (AI only)
  
  -- Audit
  requested_by_user_id UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  bundle_id INTEGER REFERENCES data_bundles(id), -- Welke bundle werd gebruikt
  batch_id UUID, -- Groepeer bulk requests
  
  CONSTRAINT ck_progress CHECK (progress_percentage BETWEEN 0 AND 100)
);

CREATE INDEX idx_enrichment_requests_entity ON enrichment_requests(entity_type, entity_id);
CREATE INDEX idx_enrichment_requests_status ON enrichment_requests(status) WHERE status != 'completed';
CREATE INDEX idx_enrichment_requests_connector ON enrichment_requests(connector_value) WHERE connector_value IS NOT NULL;
CREATE INDEX idx_enrichment_requests_batch ON enrichment_requests(batch_id) WHERE batch_id IS NOT NULL;
```

#### `enrichment_history`
Audit trail voor alle verrijkingen.

```sql
CREATE TABLE enrichment_history (
  id BIGSERIAL PRIMARY KEY,
  
  -- Target
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  connector_value TEXT,
  
  -- Change Details
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  enrichment_source TEXT NOT NULL,
  enrichment_request_id BIGINT REFERENCES enrichment_requests(id),
  
  -- Quality
  confidence_score NUMERIC(5,2) CHECK (confidence_score BETWEEN 0 AND 100),
  manual_verified BOOLEAN DEFAULT FALSE,
  
  -- Audit
  enriched_by_user_id UUID REFERENCES auth.users(id),
  enriched_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Rollback Support
  reverted BOOLEAN DEFAULT FALSE,
  reverted_at TIMESTAMPTZ,
  revert_reason TEXT
);

CREATE INDEX idx_enrichment_history_entity ON enrichment_history(entity_type, entity_id);
CREATE INDEX idx_enrichment_history_field ON enrichment_history(field_name);
CREATE INDEX idx_enrichment_history_date ON enrichment_history(enriched_at);
```

### Uitbreidingen op Bestaande Tabellen

#### `master_products` - Enrichment Metadata
```sql
-- Toevoegen aan master_products:
ALTER TABLE master_products ADD COLUMN IF NOT EXISTS enrichment_status JSONB DEFAULT '{
  "description": "pending",
  "images": "pending",
  "category": "pending",
  "attributes": "pending"
}'::JSONB;

ALTER TABLE master_products ADD COLUMN IF NOT EXISTS enrichment_score NUMERIC(5,2) DEFAULT 0
  CHECK (enrichment_score BETWEEN 0 AND 100);

ALTER TABLE master_products ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
ALTER TABLE master_products ADD COLUMN IF NOT EXISTS enriched_by_user_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN master_products.enrichment_status IS 
  'Status per enrichment category (pending/completed/failed)';
COMMENT ON COLUMN master_products.enrichment_score IS 
  'Overall enrichment completeness (0-100%)';
```

#### `product_variants` - Enrichment Metadata
```sql
-- Toevoegen aan product_variants:
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS enrichment_status JSONB DEFAULT '{
  "pricing": "pending",
  "stock": "pending",
  "images": "pending"
}'::JSONB;

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS enrichment_score NUMERIC(5,2) DEFAULT 0
  CHECK (enrichment_score BETWEEN 0 AND 100);

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS enriched_by_user_id UUID REFERENCES auth.users(id);
```

---

## 🔄 Verrijking Workflows

### Workflow 1: AI Content Generatie (Master Level)

```
User selecteert master(s) → Kiest velden (description, category) → AI genereert content
                           ↓
                   enrichment_request aangemaakt
                           ↓
                   Edge Function: ai-enrich-master
                           ↓
                   Lovable AI (Gemini) genereert:
                   - Short description (150 chars)
                   - Long description (200-400 words)
                   - Category suggestion (met confidence)
                           ↓
                   Review screen: Accept/Reject/Edit
                           ↓
                   Apply → UPDATE master_products
                           ↓
                   enrichment_history log
```

**Edge Function:** `ai-enrich-master`
```typescript
// Input:
{
  master_id: 123,
  fields: ['description', 'short_description', 'category'],
  context: {
    brand_name: 'Santino',
    supplier_data: { ... },
    existing_variants: [ ... ]
  }
}

// Output:
{
  enrichments: [
    {
      field: 'description',
      suggested_value: 'Premium werkbroek...',
      confidence: 92,
      reasoning: 'Based on brand + category + materials'
    },
    {
      field: 'category_id',
      suggested_value: 42,
      suggested_label: 'Werkkleding > Broeken',
      confidence: 88
    }
  ]
}
```

### Workflow 2: Bulk Pricing Update (Variant Level via EAN)

```
User upload CSV met kolommen: EAN, Cost Price, Selling Price, Margin
                           ↓
                   Validatie: EAN bestaat? Format correct?
                           ↓
                   Batch enrichment_requests aangemaakt
                           ↓
                   Edge Function: bulk-enrich-pricing
                           ↓
                   Voor elke rij:
                     1. Zoek variant via EAN
                     2. UPDATE product_variants SET price, cost_price
                     3. Log in enrichment_history
                           ↓
                   Progress tracking (per batch_id)
                           ↓
                   Success report: X updated, Y skipped (not found)
```

**Edge Function:** `bulk-enrich-pricing`
```typescript
// Input:
{
  batch_id: 'uuid',
  rows: [
    { ean: '5701234567890', cost_price: 15.50, selling_price: 29.95 },
    { ean: '5701234567891', cost_price: 16.20, selling_price: 31.50 }
  ]
}

// Output:
{
  batch_id: 'uuid',
  total: 2,
  updated: 2,
  skipped: 0,
  errors: [],
  enrichment_request_ids: [456, 457]
}
```

### Workflow 3: Afbeelding Verrijking (Variant Level via EAN)

```
User selecteert variant(s) → Kiest enrichment source:
                               - Upload files
                               - External API (via EAN)
                               - AI generation (concept images)
                           ↓
                   enrichment_request aangemaakt
                           ↓
                   Edge Function: enrich-images
                           ↓
                   Voor elke variant:
                     1. Download/upload afbeeldingen
                     2. Store in Supabase Storage (product-images bucket)
                     3. Generate thumbnails (reuse existing image processing)
                     4. UPDATE master_products.product_image_urls (JSONB array)
                           ↓
                   enrichment_history log
```

**Integratie met Bestaande Image Processing:**
- Reuse `image_processing_status` kolommen
- Reuse `process-product-images` Edge Function
- Extend met enrichment tracking

### Workflow 4: PDF Document Upload (Master Level)

```
User selecteert master → Upload PDF (spec sheet, certifications, manuals)
                           ↓
                   enrichment_request aangemaakt
                           ↓
                   Upload naar Supabase Storage (product-documents bucket)
                           ↓
                   UPDATE master_products:
                     - documents JSONB array: [
                         { type: 'spec_sheet', url: '...', uploaded_at: '...' },
                         { type: 'certificate', url: '...', uploaded_at: '...' }
                       ]
                           ↓
                   enrichment_history log
```

### Workflow 5: Aanvullende Import (Extend Bestaande Data)

```
User heeft dataset geïmporteerd → Enkele velden zijn leeg (bijv. gender, fit)
                           ↓
                   User uploadt aanvullend bestand met kolommen:
                     - EAN (connector)
                     - Gender
                     - Fit
                     - Material Composition
                           ↓
                   Parse + map via bundles (reuse import flow)
                           ↓
                   enrichment_requests aangemaakt per variant
                           ↓
                   Edge Function: enrich-from-import
                           ↓
                   UPDATE product_variants via EAN matching
                           ↓
                   enrichment_history log
```

---

## 🎨 Menu Structuur (UI/UX)

**Navigatie:** 1 enkel menu-item "📋 Verrijking"

**Page Layout:** Single-page met secties/tabs

### Verrijking Page Structuur

**Route:** `/enrichment`

**Layout:** Tabs (horizontaal op desktop) of Accordion (verticaal op mobile)

```
┌─────────────────────────────────────────────────────────────┐
│  📋 VERRIJKING                                    [Dashboard] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [📝 Content] [🎨 Media] [💰 Pricing] [🏷️ Attributen] [📦 Voorraad] │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  📝 Content Verrijking (Active Tab)                          │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AI Beschrijvingen Genereren                          │   │
│  │ • Selecteer masters → Genereer NL/EN descriptions    │   │
│  │ • Confidence-based auto-apply                        │   │
│  │ [Start Generator]                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Handmatig Bewerken                                   │   │
│  │ • Zoek product → Edit velden → Save                  │   │
│  │ [Open Editor]                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Bulk Content Upload                                  │   │
│  │ • CSV met EAN + Content → Match & Update             │   │
│  │ [Upload CSV]                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Tab/Sectie 1: 📝 Content Verrijking

**Componenten:**
- AI Beschrijvingen Genereren (card met action button)
- Handmatig Bewerken (card met search + edit)
- Bulk Content Upload (card met CSV upload)

### Tab/Sectie 2: 🎨 Media Verrijking

**Componenten:**
- Afbeeldingen Upload (manual drag-drop card)
- PDF Documenten Upload (technical sheets, certificates)
- External Image API (fetch from supplier APIs)

### Tab/Sectie 3: 💰 Pricing Verrijking

**Componenten:**
- Bulk Pricing Upload (CSV/Excel met EAN matching)
- Price Calculator (margin-based, marge engine)
- Pricing Historie (temporal pricing view)

### Tab/Sectie 4: 🏷️ Attributen Verrijking

**Componenten:**
- AI Attributen Detectie (category, material, gender, fit)
- Handmatig Attributen Invullen (form-based)
- Category Mapping (AI suggestions + manual override)

### Tab/Sectie 5: 📦 Voorraad Verrijking

**Componenten:**
- Stock Update (bulk CSV upload)
- Stock Synchronisatie (real-time API sync)

### Dashboard Section (Always Visible/Sticky Top)

**Dashboard Cards:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Completeness: 78%] [Pending: 12] [Recent: 45]  [Rollback]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 Completeness Score        ⏳ Pending Requests            │
│  ────────────────────────     ────────────────────────      │
│  [Cirkeldiagram: 78%]          • 8 AI Descriptions (processing)│
│  Per Bundle Breakdown:         • 3 Pricing Updates (pending) │
│  • Content: 85%                • 1 Image Upload (queued)     │
│  • Media: 60%                                                │
│  • Pricing: 90%                🕒 Recent History             │
│  • Attributes: 70%             ────────────────────────      │
│                                 • Description updated (2m ago)│
│                                 • 15 Prices uploaded (5m ago)│
│                                 • Image added (12m ago)      │
│                                                               │
│                                 [↩️ Rollback Options]        │
└─────────────────────────────────────────────────────────────┘
```

### Detailpagina's (Modal/Drawer Pattern)

Wanneer user op action button klikt (bv. "Start Generator"), open modal/drawer met full workflow.

#### 1. **AI Beschrijvingen Genereren Modal**

**Route:** `/enrichment/ai-descriptions`

**Componenten:**
- Filter: Brand, Category, Missing Descriptions Only
- Selectie: Multi-select masters
- Configuratie:
  - Velden: [x] Short Description, [x] Long Description, [x] Key Features
  - Taal: NL (default), EN (optional)
  - Tone: Professional, Casual, Technical
- Actie: "Genereer Beschrijvingen" → AI batch job
- Review Screen:
  - Voor/Na vergelijking
  - Accept/Reject/Edit per master
  - Bulk Accept All (>90% confidence)

#### 2. **Bulk Pricing Upload**

**Route:** `/enrichment/pricing-upload`

**Componenten:**
- Upload Zone: Drag & Drop CSV/Excel
- Template Download: "Download Pricing Template"
- Column Mapping:
  - EAN → Vereist (primary connector)
  - Cost Price → cost_price (optional)
  - Selling Price → price (required)
  - Margin % → margin_percentage (calculated or input)
  - Currency → Assume EUR (or mapping)
- Preview: Toon 10 rijen + validatie errors
- Actie: "Start Upload" → batch enrichment
- Progress: Real-time progress bar (via enrichment_requests.progress_percentage)
- Results: X updated, Y skipped, Z errors (downloadable error report)

#### 3. **Afbeeldingen Toevoegen**

**Route:** `/enrichment/images`

**Tabs:**
1. **Upload** (Manual)
   - Multi-select variants
   - Drag & Drop zone (multiple files)
   - EAN matching:
     - Filename bevat EAN? → Auto-match
     - Manual mapping: Dropdown per image
   - Preview: Thumbnail grid
   - Actie: "Upload & Verwerk" → image processing + storage

2. **External API** (via EAN)
   - Multi-select variants
   - Choose API: Gripp, Custom URL Pattern
   - Test 1 variant → Show preview
   - Actie: "Fetch All" → batch API calls

3. **AI Generation** (Future)
   - Text-to-image voor concept visualisatie
   - Not MVP (P3)

#### 4. **Verrijking Dashboard**

**Route:** `/enrichment/dashboard`

**Widgets:**

**Completeness Overview:**
```
Master Products:
  Description:  ████████░░ 80% (1200/1500)
  Images:       ██████░░░░ 65% (975/1500)
  Category:     █████████░ 92% (1380/1500)
  
Variants:
  Pricing:      ███████░░░ 72% (7200/10000)
  Stock:        ████░░░░░░ 45% (4500/10000)
  Images:       ██████░░░░ 63% (6300/10000)
```

**Enrichment Queue Status:**
```
Pending:      150 requests
In Progress:  25 requests (AI generation: 15, Image processing: 10)
Failed:       8 requests (requires manual review)
```

**Recent Activity:**
```
2024-12-23 14:32  AI Descriptions      125 masters  ✅ Completed
2024-12-23 14:15  Bulk Pricing Upload  450 variants ✅ Completed
2024-12-23 13:58  Image Processing     89 variants  ⏳ In Progress (67%)
2024-12-23 13:45  Category Mapping     200 masters  ❌ Failed (API timeout)
```

---

## 🔌 Toegestane Contracten (Interfaces)

### Inkomend

**Import Intake → Content Enrichment:**
- Gebruiker kan na import direct verrijken (knop in import success screen)
- Trigger: enrichment_requests voor missing fields

**Supplier Catalog → Content Enrichment:**
- Bulk select in catalog → "Verrijk Selectie" menu
- Context menu per product: "Verrijk Dit Product"

**Master Catalog → Content Enrichment:**
- Bulk actions op master list
- Detail page: "Verrijk" tab

### Uitgaand

**Content Enrichment → Master Catalog:**
- UPDATE master_products (descriptions, images, categories)
- UPDATE product_variants (pricing, stock, variant-specific images)

**Content Enrichment → Data Quality:**
- Update enrichment_score → triggers quality recalculation
- enrichment_history → audit trail voor quality validation

**Content Enrichment → Export:**
- Enriched data → ready for export to Gripp/Shopify/KMS
- export_readiness flag updated based on enrichment_score

---

## 🔐 Invariants (Business Rules)

### 1. **Immutability van Supplier Products**

❌ **NOOIT:**
```sql
UPDATE supplier_products
SET description = 'AI enriched...'
WHERE id = 123;
```

✅ **ALTIJD:**
```sql
UPDATE master_products
SET description = 'AI enriched...'
WHERE id = (
  SELECT master_id FROM promotion_mapping WHERE supplier_product_id = 123
);
```

### 2. **EAN als Primaire Variant Connector**

- Variant enrichment MOET via EAN of variant_id
- EAN validatie verplicht voor bulk uploads
- EAN uniekheid gegarandeerd (database constraint)

```sql
-- Bulk pricing update via EAN:
UPDATE product_variants
SET price = enrichment_data.selling_price
FROM (SELECT * FROM jsonb_to_recordset($1) AS x(ean TEXT, selling_price NUMERIC)) AS enrichment_data
WHERE product_variants.ean = enrichment_data.ean;
```

### 3. **Bundle-Driven Verrijking**

- Alleen velden in data_bundle_fields met allow_enrichment=TRUE mogen verrijkt worden
- Prioriteit bepaalt UI volgorde + automatische toepassing (P0 auto-apply, P1+ review)
- Bundle configuratie bepaalt enrichment_sources (ai, manual, api, etc.)

```sql
-- Check of veld verrijkbaar is:
SELECT allow_enrichment, enrichment_sources
FROM data_bundle_fields
WHERE bundle_id = 2
  AND table_name = 'master_products'
  AND column_name = 'description';
```

### 4. **Confidence-Based Auto-Apply**

- AI enrichment met confidence ≥90% → Auto-apply (P0/P1 velden)
- AI enrichment met confidence <90% → Manual review required
- Manual enrichment → Altijd direct applied
- API enrichment → Altijd direct applied (source trusted)

```sql
-- Auto-apply logic:
IF enrichment_source = 'ai' AND confidence_score >= 90 AND priority IN ('P0', 'P1') THEN
  -- Direct UPDATE master_products / product_variants
  status := 'completed';
ELSE
  -- Wacht op manual review
  status := 'manual_review';
END IF;
```

### 5. **Enrichment Score Calculation**

**Master Level:**
```
enrichment_score = (
  (description_filled ? 30 : 0) +
  (images_count > 0 ? 25 : 0) +
  (category_id IS NOT NULL ? 20 : 0) +
  (attributes_count / max_attributes * 25)
) / 100 * 100
```

**Variant Level:**
```
enrichment_score = (
  (price IS NOT NULL ? 40 : 0) +
  (stock IS NOT NULL ? 20 : 0) +
  (color_id IS NOT NULL ? 20 : 0) +
  (size_id IS NOT NULL ? 20 : 0)
) / 100 * 100
```

### 6. **Rollback Support**

- enrichment_history.reverted flag voor undo
- Old value opgeslagen → kan terugdraaien
- Max 30 dagen rollback window
- Manual reverts only (geen auto-revert)

```sql
-- Rollback enrichment:
UPDATE master_products
SET description = (
  SELECT old_value FROM enrichment_history
  WHERE entity_type = 'master' AND entity_id = master_products.id
    AND field_name = 'description'
  ORDER BY enriched_at DESC LIMIT 1
)
WHERE id = 123;

UPDATE enrichment_history
SET reverted = TRUE, reverted_at = NOW(), revert_reason = 'User requested undo'
WHERE entity_type = 'master' AND entity_id = 123 AND field_name = 'description'
ORDER BY enriched_at DESC LIMIT 1;
```

---

## 📋 Verboden Patronen (Anti-Patterns)

### ❌ Anti-Pattern 1: Direct Update zonder History

```sql
-- ❌ WRONG: Geen audit trail
UPDATE master_products SET description = 'New value' WHERE id = 123;

-- ✅ CORRECT: Via enrichment flow
BEGIN;
  UPDATE master_products SET description = 'New value' WHERE id = 123;
  INSERT INTO enrichment_history (entity_type, entity_id, field_name, old_value, new_value, enrichment_source, enriched_by_user_id)
  VALUES ('master', 123, 'description', 'Old value', 'New value', 'manual', auth.uid());
COMMIT;
```

### ❌ Anti-Pattern 2: Overwrite Supplier Data

```sql
-- ❌ WRONG: Overschrijft originele import
UPDATE supplier_products SET supplier_brand_name = 'Normalized Brand' WHERE id = 456;

-- ✅ CORRECT: Normalisatie gebeurt bij promotie
UPDATE master_products SET brand_id = 42 WHERE id = 789;
```

### ❌ Anti-Pattern 3: Hardcoded Field Lists

```typescript
// ❌ WRONG: Hardcoded fields
const enrichableFields = ['description', 'short_description', 'category_id'];

// ✅ CORRECT: Bundle-driven
const { data: enrichableFields } = await supabase
  .from('data_bundle_fields')
  .select('column_name')
  .eq('bundle_id', 2)
  .eq('allow_enrichment', true);
```

### ❌ Anti-Pattern 4: Zonder Confidence Score (AI)

```typescript
// ❌ WRONG: Blind auto-apply AI suggestions
const aiResult = await generateDescription(master);
await supabase.from('master_products').update({ description: aiResult }).eq('id', masterId);

// ✅ CORRECT: Confidence-based flow
const aiResult = await generateDescription(master); // { value: '...', confidence: 0.92 }
if (aiResult.confidence >= 0.90) {
  // Auto-apply
  await supabase.from('master_products').update({ description: aiResult.value }).eq('id', masterId);
} else {
  // Manual review
  await supabase.from('enrichment_requests').insert({
    entity_type: 'master', entity_id: masterId, status: 'manual_review',
    enriched_data: aiResult
  });
}
```

---

## 🚀 Implementatie Roadmap

### Fase 1: Foundation (Week 1-2)

**Database:**
- [ ] Create enrichment_requests table
- [ ] Create enrichment_history table
- [ ] Extend master_products + product_variants met enrichment metadata
- [ ] Add allow_enrichment + enrichment_sources to data_bundle_fields
- [ ] RLS policies voor enrichment tables

**Backend:**
- [ ] Edge Function: enrich-master (AI descriptions)
- [ ] Edge Function: enrich-variant-pricing (bulk pricing)
- [ ] Database Function: calculate_enrichment_score()
- [ ] Database Function: log_enrichment_history()

**Frontend:**
- [ ] Verrijking menu item (top-level nav)
- [ ] Enrichment Dashboard (completeness overview)
- [ ] Enrichment Queue status widget

### Fase 2: AI Content (Week 3-4)

**Backend:**
- [ ] AI prompts for master descriptions (reuse existing)
- [ ] AI prompts for category mapping
- [ ] Batch enrichment queue (process async)

**Frontend:**
- [ ] AI Beschrijvingen Genereren page
- [ ] Review screen (accept/reject/edit)
- [ ] Bulk accept (confidence ≥90%)

### Fase 3: Bulk Operations (Week 5-6)

**Backend:**
- [ ] Edge Function: bulk-enrich-from-csv
- [ ] CSV parser + EAN matching
- [ ] Progress tracking per batch

**Frontend:**
- [ ] Bulk Pricing Upload page
- [ ] CSV template download
- [ ] Column mapping UI
- [ ] Progress indicator (real-time)

### Fase 4: Media Enrichment (Week 7-8)

**Backend:**
- [ ] Edge Function: enrich-images
- [ ] Storage bucket: product-documents
- [ ] Integrate met existing image processing

**Frontend:**
- [ ] Afbeeldingen Toevoegen page
- [ ] Upload zone (drag & drop)
- [ ] EAN auto-matching for filenames
- [ ] PDF upload for masters

### Fase 5: Rollback & History (Week 9)

**Backend:**
- [ ] Database Function: rollback_enrichment()
- [ ] Enrichment history viewer (RPC)

**Frontend:**
- [ ] Enrichment History page
- [ ] Undo button per enrichment
- [ ] Audit trail visualization

---

## 🧪 Testing Scenarios

### Scenario 1: AI Content Generatie

```
1. User navigeert naar /enrichment/ai-descriptions
2. Filter: Brand = "Santino", Missing Descriptions = TRUE
3. Selecteer 10 masters
4. Kies velden: [x] Short Description, [x] Long Description
5. Klik "Genereer Beschrijvingen"
6. AI batch job:
   - 10 enrichment_requests aangemaakt (status=in_progress)
   - Edge Function processes elk master
   - Returns confidence scores
7. Review screen:
   - 8 masters: confidence ≥90% → Auto-applied
   - 2 masters: confidence <90% → Manual review
8. User accept 1, edit 1
9. Success: 10 masters enriched
10. Dashboard: Description completeness 80% → 87%
```

### Scenario 2: Bulk Pricing Update via EAN

```
1. User navigeert naar /enrichment/pricing-upload
2. Download template CSV
3. Fill template:
   EAN,Cost Price,Selling Price
   5701234567890,15.50,29.95
   5701234567891,16.20,31.50
   ...
4. Upload CSV
5. Column mapping:
   - EAN → ean (auto-detected)
   - Cost Price → cost_price (mapped)
   - Selling Price → price (mapped)
6. Preview: 100 rows, 0 errors
7. Klik "Start Upload"
8. Batch processing:
   - 100 enrichment_requests aangemaakt (batch_id=uuid)
   - Edge Function: bulk-enrich-pricing
   - Progress: 0% → 100% (real-time)
9. Results:
   - 98 updated (EAN found)
   - 2 skipped (EAN not found → download error report)
10. Success notification
11. Dashboard: Pricing completeness 72% → 75%
```

### Scenario 3: Afbeeldingen via External API

```
1. User navigeert naar /enrichment/images
2. Tab: External API
3. Selecteer 50 variants (filter: Missing Images)
4. Choose API: Gripp Image API
5. Test 1 variant:
   - EAN: 5701234567890
   - Fetch image → Preview shown
6. Klik "Fetch All"
7. Batch processing:
   - 50 enrichment_requests (type=image, source=api)
   - Edge Function: enrich-images
   - Downloads images, stores in product-images bucket
   - Triggers image processing (thumbnails)
8. Progress: 50/50 (100%)
9. Results:
   - 47 images fetched successfully
   - 3 failed (404 not found)
10. Dashboard: Images completeness 63% → 68%
```

---

## 📚 Referenties

### Bestaande Systemen (Hergebruik)

**AI Enrichment (Legacy):**
- `ai_enrichment_patterns` table → Reuse for pattern learning
- `ai_enrichment_conversations` table → Reuse for chat-based enrichment
- Edge Functions: `ai-enrich-product`, `batch-enrich-products` → Extend for new master/variant model

**Image Processing:**
- `image_processing_status` kolommen → Integrate met enrichment tracking
- `process-product-images` Edge Function → Reuse for bulk image enrichment
- Storage bucket: `product-images` → Use for enriched images

**Pricing (Bestaand):**
- `variant_pricing_extension` table → Already handles cost/selling prices
- Extend met enrichment_history tracking

### Documentatie

- [Context 5: Master Catalog](05-master-catalog.md) - Master/Variant data model
- [Context 2: Bundle Config](02-bundle-config.md) - Bundle-driven field configuration
- [Context 6: Data Quality](06-data-quality.md) - Quality scoring integration
- [docs/archive/ai-product-enrichment.md](../archive/ai-product-enrichment.md) - Legacy AI enrichment specs

---

## ✅ Success Criteria

**Dashboard Metrics:**
- Master enrichment score: >85% (target 90%)
- Variant enrichment score: >75% (target 80%)
- AI confidence rate: ≥90% auto-apply (P0/P1)
- Bulk upload success rate: ≥95%

**User Experience:**
- AI enrichment: <10 seconds per master
- Bulk pricing: <30 seconds per 1000 variants
- Image enrichment: <5 minutes per 100 variants

**Data Quality:**
- Audit trail complete (100% of enrichments logged)
- Rollback possible within 30 days
- No data loss (supplier_products immutable)
- EAN matching accuracy: >99%

---

**Version:** 1.0  
**Status:** Design Phase  
**Owner:** Architect + Business Analyst  
**Next Step:** Validate met stakeholders + start Fase 1 implementatie

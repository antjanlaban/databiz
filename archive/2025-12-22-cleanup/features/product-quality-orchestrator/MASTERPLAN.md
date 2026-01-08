# Product Quality Orchestrator - MASTERPLAN IMPLEMENTATIE

**Versie:** 1.0 FINAL  
**Status:** Definitief - Dit is de ENIGE bron van waarheid  
**Scope:** Volledige implementatie volgens originele feature spec  
**Duur:** 16-20 weken (5 fasen)  
**Commitment:** Dit plan is LEIDEND - geen afwijkingen zonder expliciete gebruiker goedkeuring

---

## EXECUTIVE SUMMARY

We bouwen de **Product Quality Orchestrator** - een AI-driven systeem dat product data kwaliteit automatisch monitort, valideert, verrijkt en optimaliseert. Dit is NIET een simpele quality checker, maar een **zelflerend systeem** met:

- **4-Layer Quality Scoring** (Base Completeness 20%, Integration Readiness 30%, Data Quality 25%, AI Semantic 25%)
- **Channel-Specific Profiles** (E-commerce, WMS, Procurement, Financial, Compliance)
- **Conversational AI Enrichment** (chat-interface voor data completie)
- **Predictive Quality** (voorspelt problemen voordat ze ontstaan)
- **Live Integration Testing** (dagelijkse connectivity tests)

Dit vereist een **grootschalige database herstructurering** en **nieuwe AI-componenten**.

---

## FASE 1: DATABASE FOUNDATION & EXTENSIONS (4-5 weken)

### Doel
Bouw de database basis voor multi-layer quality scoring met alle vereiste extension tabellen.

### Database Changes

#### 1.1 NEW: data_quality_status
Centrale quality tracking per product (style + variant level).

```sql
CREATE TABLE data_quality_status (
  id BIGSERIAL PRIMARY KEY,
  
  -- Target entity
  entity_type TEXT NOT NULL CHECK (entity_type IN ('style', 'variant')),
  entity_id INTEGER NOT NULL,
  
  -- Overall Score (0-100)
  overall_quality_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_quality_score BETWEEN 0 AND 100),
  
  -- Layer Scores (weighted)
  base_completeness_score INTEGER NOT NULL DEFAULT 0 CHECK (base_completeness_score BETWEEN 0 AND 100),
  integration_readiness_score INTEGER NOT NULL DEFAULT 0 CHECK (integration_readiness_score BETWEEN 0 AND 100),
  data_validity_score INTEGER NOT NULL DEFAULT 0 CHECK (data_validity_score BETWEEN 0 AND 100),
  ai_semantic_score INTEGER NOT NULL DEFAULT 0 CHECK (ai_semantic_score BETWEEN 0 AND 100),
  
  -- Composite Scores per Channel
  ecommerce_readiness INTEGER DEFAULT 0 CHECK (ecommerce_readiness BETWEEN 0 AND 100),
  wms_readiness INTEGER DEFAULT 0 CHECK (wms_readiness BETWEEN 0 AND 100),
  procurement_readiness INTEGER DEFAULT 0 CHECK (procurement_readiness BETWEEN 0 AND 100),
  finance_readiness INTEGER DEFAULT 0 CHECK (finance_readiness BETWEEN 0 AND 100),
  compliance_readiness INTEGER DEFAULT 0 CHECK (compliance_readiness BETWEEN 0 AND 100),
  
  -- Error Tracking
  validation_errors JSONB DEFAULT '[]'::jsonb,
  enrichment_suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_improved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_quality_status_entity ON data_quality_status(entity_type, entity_id);
CREATE INDEX idx_quality_status_overall_score ON data_quality_status(overall_quality_score DESC);
CREATE INDEX idx_quality_status_ecommerce ON data_quality_status(ecommerce_readiness DESC);
```

#### 1.2 NEW: quality_rules
Configureerbare validatie regels per channel.

```sql
CREATE TABLE quality_rules (
  id SERIAL PRIMARY KEY,
  
  -- Rule Identification
  rule_code TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  
  -- Target
  target_entity TEXT NOT NULL CHECK (target_entity IN ('style', 'variant', 'both')),
  target_field TEXT NOT NULL,
  
  -- Rule Logic
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'required', 'min_length', 'max_length', 'pattern', 
    'enum', 'range', 'custom_function'
  )),
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Scoring Impact
  layer TEXT NOT NULL CHECK (layer IN (
    'base_completeness', 'integration_readiness', 
    'data_validity', 'ai_semantic'
  )),
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
  
  -- Channel Association
  channels TEXT[] DEFAULT '{}', -- ['ecommerce', 'wms', 'procurement']
  
  -- Preconditions
  preconditions JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quality_rules_target ON quality_rules(target_entity, target_field);
CREATE INDEX idx_quality_rules_layer ON quality_rules(layer);
CREATE INDEX idx_quality_rules_channels ON quality_rules USING GIN(channels);
```

#### 1.3 NEW: quality_profiles
Channel-specific requirement bundles.

```sql
CREATE TABLE quality_profiles (
  id SERIAL PRIMARY KEY,
  
  -- Profile Info
  profile_code TEXT NOT NULL UNIQUE,
  profile_name TEXT NOT NULL,
  profile_description TEXT,
  
  -- Channel Type
  channel_type TEXT NOT NULL CHECK (channel_type IN (
    'ecommerce', 'wms', 'procurement', 'finance', 'compliance'
  )),
  
  -- Requirements
  required_rules INTEGER[] DEFAULT '{}', -- Array of quality_rules.id
  minimum_overall_score INTEGER NOT NULL DEFAULT 70,
  minimum_layer_scores JSONB NOT NULL DEFAULT '{
    "base_completeness": 80,
    "integration_readiness": 60,
    "data_validity": 70,
    "ai_semantic": 50
  }'::jsonb,
  
  -- Integration Config
  integration_endpoint TEXT,
  test_frequency_hours INTEGER DEFAULT 24,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quality_profiles_channel ON quality_profiles(channel_type);
```

#### 1.4 EXTEND: product_styles
Voeg SEO, images, en enrichment velden toe.

```sql
ALTER TABLE product_styles
-- SEO Fields
ADD COLUMN meta_title TEXT,
ADD COLUMN meta_description TEXT,
ADD COLUMN meta_keywords TEXT[],
ADD COLUMN url_slug TEXT UNIQUE,

-- Features
ADD COLUMN key_features TEXT[],
ADD COLUMN target_audience TEXT,
ADD COLUMN usage_scenarios TEXT[],

-- Enrichment Status
ADD COLUMN enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN (
  'pending', 'in_progress', 'completed', 'needs_review'
)),
ADD COLUMN last_enrichment_at TIMESTAMPTZ,
ADD COLUMN enrichment_confidence NUMERIC(5,2) DEFAULT 0;

-- Update indexes
CREATE INDEX idx_product_styles_enrichment_status ON product_styles(enrichment_status);
CREATE INDEX idx_product_styles_url_slug ON product_styles(url_slug);
```

#### 1.5 EXTEND: product_variants
Voeg dimensions, packaging, compliance toe.

```sql
ALTER TABLE product_variants
-- Physical Dimensions
ADD COLUMN width_mm INTEGER,
ADD COLUMN height_mm INTEGER,
ADD COLUMN depth_mm INTEGER,
ADD COLUMN volume_cm3 INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN width_mm IS NOT NULL AND height_mm IS NOT NULL AND depth_mm IS NOT NULL
    THEN (width_mm * height_mm * depth_mm) / 1000
    ELSE NULL
  END
) STORED,

-- Packaging
ADD COLUMN package_type TEXT, -- 'single', 'multipack', 'bulk'
ADD COLUMN units_per_package INTEGER DEFAULT 1,
ADD COLUMN package_weight_grams INTEGER,

-- Compliance
ADD COLUMN compliance_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN certifications TEXT[],
ADD COLUMN safety_class TEXT,
ADD COLUMN hazard_warnings TEXT[];

-- Indexes
CREATE INDEX idx_variants_compliance ON product_variants(compliance_validated);
CREATE INDEX idx_variants_certifications ON product_variants USING GIN(certifications);
```

#### 1.6 NEW: procurement_extension
Procurement-specific data per style.

```sql
CREATE TABLE procurement_extension (
  id SERIAL PRIMARY KEY,
  style_id INTEGER NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
  
  -- Supplier Terms
  moq INTEGER, -- Minimum Order Quantity
  moq_unit TEXT DEFAULT 'pieces',
  lead_time_days INTEGER,
  incoterms TEXT, -- 'EXW', 'FOB', 'CIF', etc.
  
  -- Supplier Contacts
  supplier_contact_name TEXT,
  supplier_contact_email TEXT,
  supplier_contact_phone TEXT,
  
  -- Cost History
  cost_history JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(style_id)
);

CREATE INDEX idx_procurement_style ON procurement_extension(style_id);
```

#### 1.7 NEW: finance_extension
Financial metadata per variant.

```sql
CREATE TABLE finance_extension (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  
  -- Accounting
  gl_account_code TEXT,
  cost_center_code TEXT,
  budget_code TEXT,
  tax_classification TEXT,
  
  -- Pricing Rules
  currency_code TEXT DEFAULT 'EUR',
  price_list_code TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(variant_id)
);

CREATE INDEX idx_finance_variant ON finance_extension(variant_id);
CREATE INDEX idx_finance_gl_account ON finance_extension(gl_account_code);
```

#### 1.8 NEW: compliance_extension
Safety & certification data per variant.

```sql
CREATE TABLE compliance_extension (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  
  -- Certifications
  ce_mark BOOLEAN DEFAULT FALSE,
  oeko_tex_certified BOOLEAN DEFAULT FALSE,
  iso_norms TEXT[],
  
  -- Safety
  protection_level TEXT, -- 'EN ISO 20345 S3', etc.
  safety_features TEXT[],
  restrictions TEXT[],
  
  -- Documents
  certification_docs JSONB DEFAULT '[]'::jsonb,
  test_reports JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(variant_id)
);

CREATE INDEX idx_compliance_variant ON compliance_extension(variant_id);
CREATE INDEX idx_compliance_ce_mark ON compliance_extension(ce_mark);
```

#### 1.9 NEW: enrichment_suggestions
AI-generated enrichment recommendations.

```sql
CREATE TABLE enrichment_suggestions (
  id BIGSERIAL PRIMARY KEY,
  
  -- Target
  entity_type TEXT NOT NULL CHECK (entity_type IN ('style', 'variant')),
  entity_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  
  -- Suggestion
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  reasoning TEXT,
  
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN (
    'ai_lovable', 'pattern_learning', 'similar_products', 'manual_feedback'
  )),
  source_data JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'auto_applied', 'needs_review'
  )),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_feedback TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id, field_name, status) WHERE status = 'pending'
);

CREATE INDEX idx_enrichment_pending ON enrichment_suggestions(status, entity_type, entity_id) WHERE status = 'pending';
CREATE INDEX idx_enrichment_confidence ON enrichment_suggestions(confidence_score DESC);
```

#### 1.10 NEW: integration_tests
Live integration health monitoring.

```sql
CREATE TABLE integration_tests (
  id BIGSERIAL PRIMARY KEY,
  
  -- Test Info
  profile_id INTEGER NOT NULL REFERENCES quality_profiles(id),
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN (
    'connectivity', 'authentication', 'data_validation', 'full_sync'
  )),
  
  -- Test Execution
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Results
  status TEXT NOT NULL CHECK (status IN (
    'running', 'passed', 'failed', 'timeout', 'skipped'
  )),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  -- Error Details
  error_message TEXT,
  error_details JSONB,
  
  -- Sample Data
  test_sample_ids INTEGER[],
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_tests_profile ON integration_tests(profile_id);
CREATE INDEX idx_integration_tests_status ON integration_tests(status);
CREATE INDEX idx_integration_tests_started ON integration_tests(started_at DESC);
```

### Seed Data

#### Quality Rules Seed (50+ regels)

**Layer 1: Base Completeness (20% weight)**

```sql
INSERT INTO quality_rules (rule_code, rule_name, target_entity, target_field, rule_type, rule_config, layer, weight, channels) VALUES
-- Style Level
('BC_STYLE_NAME', 'Style Name Required', 'style', 'style_name', 'required', '{}', 'base_completeness', 3, '{"ecommerce","wms","procurement"}'),
('BC_STYLE_CODE', 'Style Code Required', 'style', 'style_code', 'required', '{}', 'base_completeness', 3, '{"ecommerce","wms","procurement"}'),
('BC_BRAND', 'Brand Required', 'style', 'brand_id', 'required', '{}', 'base_completeness', 2, '{"ecommerce","wms"}'),
('BC_DESC_MIN', 'Description Minimum Length', 'style', 'description', 'min_length', '{"min": 50}', 'base_completeness', 2, '{"ecommerce"}'),
('BC_CATEGORY', 'Category Required', 'style', 'primary_category_id', 'required', '{}', 'base_completeness', 3, '{"ecommerce","wms"}'),

-- Variant Level
('BC_SKU_CODE', 'SKU Code Required', 'variant', 'sku_code', 'required', '{}', 'base_completeness', 3, '{"ecommerce","wms","procurement","finance"}'),
('BC_EAN', 'EAN Required', 'variant', 'ean', 'required', '{}', 'base_completeness', 3, '{"ecommerce","wms"}'),
('BC_COLOR', 'Color Display Required', 'variant', 'color_display_nl', 'required', '{}', 'base_completeness', 2, '{"ecommerce"}'),
('BC_SIZE', 'Size Display Required', 'variant', 'size_display_nl', 'required', '{}', 'base_completeness', 2, '{"ecommerce"}');
```

**Layer 2: Integration Readiness (30% weight)**

```sql
INSERT INTO quality_rules (rule_code, rule_name, target_entity, target_field, rule_type, rule_config, layer, weight, channels) VALUES
-- E-commerce Readiness
('IR_IMAGE_PRIMARY', 'Primary Image Required', 'style', 'primary_image_url', 'required', '{}', 'integration_readiness', 3, '{"ecommerce"}'),
('IR_PRICE_RETAIL', 'Retail Price Required', 'variant', 'selling_price_excl_vat', 'required', '{}', 'integration_readiness', 3, '{"ecommerce","finance"}'),
('IR_STOCK_QTY', 'Stock Quantity Present', 'variant', 'stock_quantity', 'required', '{}', 'integration_readiness', 2, '{"ecommerce","wms"}'),
('IR_SEO_TITLE', 'SEO Meta Title', 'style', 'meta_title', 'required', '{}', 'integration_readiness', 2, '{"ecommerce"}'),

-- WMS Readiness
('IR_WEIGHT', 'Weight Required', 'variant', 'weight_grams', 'required', '{}', 'integration_readiness', 3, '{"wms"}'),
('IR_DIMENSIONS', 'Dimensions Required', 'variant', 'width_mm', 'required', '{}', 'integration_readiness', 2, '{"wms"}'),
('IR_PACKAGE_TYPE', 'Package Type Required', 'variant', 'package_type', 'required', '{}', 'integration_readiness', 2, '{"wms"}'),

-- Procurement Readiness
('IR_MOQ', 'MOQ Defined', 'style', 'moq', 'required', '{}', 'integration_readiness', 2, '{"procurement"}'),
('IR_LEAD_TIME', 'Lead Time Defined', 'style', 'lead_time_days', 'required', '{}', 'integration_readiness', 2, '{"procurement"}'),

-- Finance Readiness
('IR_COST_PRICE', 'Cost Price Required', 'variant', 'cost_price', 'required', '{}', 'integration_readiness', 3, '{"finance"}'),
('IR_GL_ACCOUNT', 'GL Account Mapped', 'variant', 'gl_account_code', 'required', '{}', 'integration_readiness', 2, '{"finance"}');
```

**Layer 3: Data Validity (25% weight)**

```sql
INSERT INTO quality_rules (rule_code, rule_name, target_entity, target_field, rule_type, rule_config, layer, weight, channels) VALUES
-- Format Validation
('DV_EAN_FORMAT', 'EAN Format Valid', 'variant', 'ean', 'pattern', '{"pattern": "^[0-9]{13}$"}', 'data_validity', 3, '{"ecommerce","wms"}'),
('DV_EMAIL_FORMAT', 'Email Format Valid', 'style', 'supplier_contact_email', 'pattern', '{"pattern": "^[^@]+@[^@]+\\.[^@]+$"}', 'data_validity', 1, '{"procurement"}'),
('DV_PRICE_POSITIVE', 'Price Positive', 'variant', 'selling_price_excl_vat', 'range', '{"min": 0, "max": 1000000}', 'data_validity', 2, '{"ecommerce","finance"}'),
('DV_STOCK_RANGE', 'Stock in Valid Range', 'variant', 'stock_quantity', 'range', '{"min": 0, "max": 100000}', 'data_validity', 1, '{"wms"}'),

-- Consistency Checks
('DV_DESC_LENGTH', 'Description Length Reasonable', 'style', 'description', 'range', '{"min": 50, "max": 5000}', 'data_validity', 2, '{"ecommerce"}'),
('DV_WEIGHT_RANGE', 'Weight Realistic', 'variant', 'weight_grams', 'range', '{"min": 10, "max": 50000}', 'data_validity', 2, '{"wms"}');
```

**Layer 4: AI Semantic (25% weight)**

```sql
INSERT INTO quality_rules (rule_code, rule_name, target_entity, target_field, rule_type, rule_config, layer, weight, channels) VALUES
-- Semantic Validation (evaluated by AI)
('AI_DESC_QUALITY', 'Description Quality Check', 'style', 'description', 'custom_function', '{"function": "ai_semantic_description"}', 'ai_semantic', 3, '{"ecommerce"}'),
('AI_CATEGORY_MATCH', 'Category-Product Match', 'style', 'primary_category_id', 'custom_function', '{"function": "ai_semantic_category"}', 'ai_semantic', 3, '{"ecommerce"}'),
('AI_PRICE_REASONABLE', 'Price Reasonableness', 'variant', 'selling_price_excl_vat', 'custom_function', '{"function": "ai_semantic_pricing"}', 'ai_semantic', 2, '{"ecommerce","finance"}'),
('AI_IMAGE_QUALITY', 'Image Quality Check', 'style', 'primary_image_url', 'custom_function', '{"function": "ai_semantic_image"}', 'ai_semantic', 2, '{"ecommerce"}');
```

#### Quality Profiles Seed

**Generieke Profiles per Functioneel Domein**

Deze profiles zijn **generiek** en **niet gekoppeld aan specifieke externe systemen**. Export configuraties (Gripp, Shopify, Calculated, etc.) refereren naar deze profiles.

```sql
INSERT INTO quality_profiles (
  profile_code, 
  profile_name, 
  profile_description,
  channel_type, 
  minimum_overall_score, 
  minimum_layer_scores
) VALUES

-- INKOOP: Leveranciersbeheer en procurement
('PROCUREMENT_STANDARD', 'Inkoop Standaard', 
 'Minimale kwaliteitseisen voor inkoopbeheer en leverancier communicatie. Focus op MOQ, lead times, cost prices.',
 'procurement', 65, '{
   "base_completeness": 75,
   "integration_readiness": 60,
   "data_validity": 65,
   "ai_semantic": 50
 }'),

-- VERKOOP E-COMMERCE: Online verkoop via webshops
('SALES_ECOMMERCE', 'Verkoop E-commerce',
 'Kwaliteitseisen voor online verkoop via webshops en platforms. Focus op beschrijvingen, SEO, images, prijzen, voorraad.',
 'ecommerce', 80, '{
   "base_completeness": 90,
   "integration_readiness": 80,
   "data_validity": 75,
   "ai_semantic": 65
 }'),

-- VERKOOP B2B: Business-to-business verkoop
('SALES_B2B', 'Verkoop B2B',
 'Kwaliteitseisen voor business-to-business verkoop. Focus op SKU codes, bulk prijzen, contracten.',
 'ecommerce', 75, '{
   "base_completeness": 85,
   "integration_readiness": 70,
   "data_validity": 75,
   "ai_semantic": 60
 }'),

-- MAGAZIJN: Warehouse Management
('WAREHOUSE_STANDARD', 'Magazijn Standaard',
 'Kwaliteitseisen voor magazijnbeheer en logistics. Focus op dimensies, gewicht, verpakking, voorraad tracking.',
 'wms', 70, '{
   "base_completeness": 80,
   "integration_readiness": 70,
   "data_validity": 70,
   "ai_semantic": 40
 }'),

-- FINANCIËN: Accounting en rapportage
('FINANCE_STANDARD', 'Financiën Standaard',
 'Kwaliteitseisen voor financiële administratie en rapportage. Focus op GL accounts, cost centers, prijzen, BTW classificatie.',
 'finance', 80, '{
   "base_completeness": 85,
   "integration_readiness": 80,
   "data_validity": 90,
   "ai_semantic": 55
 }'),

-- COMPLIANCE: Veiligheid en certificering
('COMPLIANCE_STANDARD', 'Compliance Standaard',
 'Kwaliteitseisen voor veiligheid, certificeringen en regelgeving. Focus op CE marking, ISO normen, veiligheidsklasse.',
 'compliance', 75, '{
   "base_completeness": 70,
   "integration_readiness": 75,
   "data_validity": 80,
   "ai_semantic": 70
 }');
```

#### Architectuur Principe: Generic Profiles

**Waarom generiek?**
- ✅ **Schaalbaar**: Nieuwe integraties (WooCommerce, Magento) gebruiken bestaande profiles
- ✅ **Herbruikbaar**: Eén profile kan door meerdere export systemen gebruikt worden
- ✅ **Maintainbaar**: Wijzigingen in één profile propageren naar alle exports
- ✅ **Functioneel**: Nomenclatuur reflecteert bedrijfsproces, niet technologie
- ✅ **Toekomstbestendig**: Onafhankelijk van externe systemen

**Mapping naar externe systemen:**

De specifieke veld mappings per extern systeem (Gripp, Shopify, Calculated, etc.) worden gedefinieerd in de **export configuratie laag**, niet in de quality profiles. Dit zorgt voor scheiding van concerns:

- **Quality Profiles**: Wat moet een product bevatten voor een bepaald domein (Verkoop, Inkoop, etc.)
- **Export Configs**: Hoe wordt data omgezet voor een specifiek extern systeem

```typescript
// Voorbeeld: Export configuraties refereren naar generieke profiles

const grippExportConfig = {
  system_name: 'Gripp ERP',
  required_profile: 'SALES_ECOMMERCE', // References generic profile
  field_mappings: {
    'style_name': 'productomschrijving',
    'sku_code': 'productcode',
    'selling_price_excl_vat': 'verkoopprijs'
  }
};

const shopifyExportConfig = {
  system_name: 'Shopify',
  required_profile: 'SALES_ECOMMERCE', // Same generic profile
  field_mappings: {
    'style_name': 'title',
    'description': 'body_html',
    'sku_code': 'sku'
  }
};
```

### Verificatie Criteria

- [ ] Alle 10 database tabellen succesvol aangemaakt
- [ ] Minimaal 50 quality rules gezaaid in database
- [ ] 6 quality profiles actief
- [ ] Performance: < 2s per quality score berekening

### Succesvol als:

- Database constraints voorkomen invalid data
- Indexes zijn geoptimaliseerd voor queries
- Seed data is correct geïmporteerd

---

## FASE 2: AI INTEGRATION & ENRICHMENT (4-5 weken)

### Doel
Implementeer AI-driven enrichment met Lovable AI (Gemini 2.5 Flash) voor automatische data completie.

### Edge Functions

#### 2.A ai-enrich-product

**Path:** `supabase/functions/ai-enrich-product/index.ts`

Gebruikt Lovable AI om velden te verrijken met confidence scoring en auto-apply functionaliteit.

### AI Prompts (Templates)

#### Description Enrichment Prompt

```
You are a product copywriter for workwear. Based on the following product information, write a compelling product description (50-200 words):

Product Name: {style_name}
Brand: {brand_name}
Category: {category_name}
Material: {material_composition}
Color: {color_name}
Supplier Info: {supplier_article_name}

Guidelines:
- Focus on practical benefits for workwear users
- Mention material properties (comfort, durability, breathability)
- Highlight key features
- Use professional but accessible tone
- Write in Dutch

Description:
```

### Verificatie Criteria

- [ ] Lovable AI integration werkt (test 10 prompts)
- [ ] AI enrichment genereert suggesties voor description/category/material
- [ ] Confidence scores zijn realistisch (70-95% range)
- [ ] Auto-apply werkt voor confidence > 90%
- [ ] Accept/Reject flow werkt in UI
- [ ] Batch enrichment verwerkt 50+ producten zonder crashes

### Succesvol als:

- AI acceptance rate > 70% (gebruikers accepteren suggesties)
- Gemiddelde quality score stijgt met 15+ punten na enrichment
- Response tijd < 5s per enrichment suggestie
- Lovable AI kosten < €50/maand voor 100 enrichments

---

## FASE 3: SMART AUTOMATION & LEARNING (4-5 weken)

### Doel
Self-learning systeem dat leert van user feedback en patterns.

### Database Changes

#### 3.1 NEW: enrichment_patterns

Learning table voor pattern recognition.

### Edge Functions

- `learn-from-feedback` - Updates patterns based on user acceptance
- `predictive-quality-check` - Identifies at-risk products

### Verificatie Criteria

- [ ] Pattern learning table bevat 100+ learned patterns
- [ ] Confidence scores stijgen na user feedback
- [ ] Predictive quality check identificeert at-risk products
- [ ] Conversational chat interface is bruikbaar
- [ ] Self-learning verbetert acceptance rate (meten over 2 weken)

---

## FASE 4: ADVANCED FEATURES & INTEGRATION (4-5 weken)

### Doel
Live integration testing, dynamic quality profiles, bulk workflows.

### Edge Functions

- `daily-integration-health-check` - Scheduled via pg_cron
- `bulk-enrich-workflow` - Batch enrichment processing

### Verificatie Criteria

- [ ] Daily integration tests draaien automatisch via pg_cron
- [ ] Integration health dashboard toont real-time status
- [ ] Bulk enrichment verwerkt 100+ producten in < 5 minuten
- [ ] Alerts worden verstuurd bij integration failures

---

## FASE 5: POLISH & OPTIMIZATION (3-5 weken)

### Doel
Performance tuning, comprehensive reporting, production-ready deployment.

### Database Optimizations

- Partial indexes voor common queries
- Materialized views voor dashboard
- Query performance tuning

### Verificatie Criteria

- [ ] All performance targets achieved
- [ ] Zero critical bugs in production first week
- [ ] User adoption > 80% within 2 weeks
- [ ] Manual quality work reduced by 70%+

---

## TECHNOLOGY STACK DEFINITIEF

### Backend
- **Database:** PostgreSQL 15+ (via Supabase)
- **API:** Supabase Auto-generated REST + RPC functions
- **Edge Functions:** Deno runtime
- **AI:** Lovable AI (Gemini 2.5 Flash) - NO external OpenAI API needed
- **Scheduling:** pg_cron for daily integration tests

### Frontend
- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6
- **State:** TanStack Query v5 (React Query)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui (Radix UI primitives + Tailwind)
- **Charts:** Recharts

---

## QUALITY SCORING FORMULES

### Overall Score Calculation

```
Overall Score = 
  (Base Completeness × 0.20) +
  (Integration Readiness × 0.30) +
  (Data Validity × 0.25) +
  (AI Semantic × 0.25)
```

### Layer Score Calculation

```
Layer Score = (Σ passed_rules_weights / Σ total_rules_weights) × 100

Example:
- Total rules in layer: 5 rules (weights: 3, 3, 2, 2, 1 = 11 total)
- Passed rules: 3 rules (weights: 3, 2, 1 = 6 total)
- Layer Score = (6 / 11) × 100 = 54.5
```

### Channel Readiness Calculation

```
Channel Readiness = 
  IF (all critical rules passed AND minimum_overall_score met)
  THEN Overall Score
  ELSE 0

Critical Rules per Channel:
- E-commerce: EAN, SKU, Name, Price, Image, Category
- WMS: EAN, SKU, Weight, Dimensions, Stock
- Procurement: Supplier ID, MOQ, Lead Time, Cost Price
- Finance: GL Account, Cost Price, VAT Code
- Compliance: Certifications, Safety Class (for workwear)
```

---

## AI PROMPTS & THRESHOLDS

### AI Model Configuration

```typescript
const AI_CONFIG = {
  model: 'google/gemini-2.5-flash',
  temperature: 0.3, // Low temperature for consistent results
  max_tokens: 500,
  top_p: 0.9
};
```

### Confidence Score Thresholds

```
95-100%: Auto-apply immediately
85-94%:  Auto-apply if pattern exists
70-84%:  Show as high-confidence suggestion
50-69%:  Show as medium-confidence suggestion
0-49%:   Show as low-confidence suggestion (needs review)
```

---

## KRITIEKE SUCCESFACTOREN

### Must-Have voor Go-Live

1. **Data Quality Status Table** werkt voor 500+ producten
2. **AI Enrichment** genereert bruikbare suggesties (>70% acceptance)
3. **Integration Tests** draaien dagelijks zonder failures
4. **Performance** < 2s per quality score berekening
5. **User Training** voltooid (admin + 2 power users)

---

## RISICO MITIGATIE

### Technische Risico's

**Risico:** AI model hallucinaties  
**Mitigatie:** Confidence thresholds, user review voor < 85%, pattern learning

**Risico:** Performance degradation met schaal  
**Mitigatie:** Database indexing, materialized views, batch processing

### Business Risico's

**Risico:** User adoption laag  
**Mitigatie:** Training, demo's, quick wins tonen, feedback loop

**Risico:** Scope creep  
**Mitigatie:** Strict phase gates, MVP approach, "nice-to-have" backlog

---

## DELIVERABLES PER FASE

### Fase 1
- ✅ 10 database tabellen + indexes
- ✅ 50+ quality rules gezaaid
- ✅ 6 quality profiles
- ✅ `calculate-quality-score` edge function
- ✅ `QualityScoreCard` UI component
- ✅ Verificatierapport

### Fase 2
- ✅ `ai-enrich-product` edge function
- ✅ `batch-enrich-products` edge function
- ✅ `EnrichmentAssistantPanel` UI component
- ✅ AI prompts getest en geoptimaliseerd
- ✅ Acceptance rate > 70%

### Fase 3
- ✅ `enrichment_patterns` learning table
- ✅ `learn-from-feedback` edge function
- ✅ `predictive-quality-check` edge function
- ✅ `ConversationalEnrichmentChat` UI component
- ✅ Self-learning metrics dashboard

### Fase 4
- ✅ `daily-integration-health-check` edge function
- ✅ `bulk-enrich-workflow` edge function
- ✅ `IntegrationHealthDashboard` UI component
- ✅ `BulkEnrichmentWorkflow` UI component
- ✅ pg_cron scheduled jobs

### Fase 5
- ✅ Database optimizations (indexes, materialized views)
- ✅ `QualityTrendChart` UI component
- ✅ `QualityRulesManager` UI component (admin)
- ✅ Performance tuning completed
- ✅ Production deployment checklist completed
- ✅ User documentation & training

---

## ROLLBACK PROCEDURES

### Database Rollback

```sql
-- Elke fase heeft zijn eigen rollback migratie
-- Voorbeeld voor Fase 1:
DROP TABLE IF EXISTS integration_tests CASCADE;
DROP TABLE IF EXISTS enrichment_suggestions CASCADE;
DROP TABLE IF EXISTS compliance_extension CASCADE;
DROP TABLE IF EXISTS finance_extension CASCADE;
DROP TABLE IF EXISTS procurement_extension CASCADE;
DROP TABLE IF EXISTS quality_profiles CASCADE;
DROP TABLE IF EXISTS quality_rules CASCADE;
DROP TABLE IF EXISTS data_quality_status CASCADE;

-- Remove extensions van product_styles
ALTER TABLE product_styles
DROP COLUMN IF EXISTS meta_title,
DROP COLUMN IF EXISTS meta_description,
DROP COLUMN IF EXISTS meta_keywords,
DROP COLUMN IF EXISTS url_slug,
DROP COLUMN IF EXISTS key_features,
DROP COLUMN IF EXISTS target_audience,
DROP COLUMN IF EXISTS usage_scenarios,
DROP COLUMN IF EXISTS enrichment_status,
DROP COLUMN IF EXISTS last_enrichment_at,
DROP COLUMN IF EXISTS enrichment_confidence;

-- Remove extensions van product_variants
ALTER TABLE product_variants
DROP COLUMN IF EXISTS width_mm,
DROP COLUMN IF EXISTS height_mm,
DROP COLUMN IF EXISTS depth_mm,
DROP COLUMN IF EXISTS volume_cm3,
DROP COLUMN IF EXISTS package_type,
DROP COLUMN IF EXISTS units_per_package,
DROP COLUMN IF EXISTS package_weight_grams,
DROP COLUMN IF EXISTS compliance_validated,
DROP COLUMN IF EXISTS certifications,
DROP COLUMN IF EXISTS safety_class,
DROP COLUMN IF EXISTS hazard_warnings;
```

---

## FINAL CHECKLIST VOOR GO-LIVE

- [ ] All database migrations verified in staging
- [ ] All edge functions deployed and tested
- [ ] RLS policies prevent unauthorized access
- [ ] Performance benchmarks achieved
- [ ] User training completed (2 sessions)
- [ ] Documentation published (user guide + API docs)
- [ ] Backup procedures tested
- [ ] Monitoring alerts configured
- [ ] Rollback procedure documented and tested
- [ ] Lovable AI credits sufficient (3 months)
- [ ] Legal/Privacy review completed
- [ ] Stakeholder sign-off obtained

---

**END OF MASTERPLAN**

Dit document is de ENIGE bron van waarheid voor Product Quality Orchestrator implementatie. Alle afwijkingen moeten EXPLICIET worden goedgekeurd door de gebruiker met een nieuwe plan versie.

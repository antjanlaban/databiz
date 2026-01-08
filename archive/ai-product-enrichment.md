# AI-Powered Product Enrichment Systeem (TRACK 2)

**Project:** Van Kruiningen PIM - Product Enrichment Engine  
**Versie:** 2.0 (Track 2 Repositioned)  
**Datum:** November 2025  
**Focus:** GAP FILLING na product promotie

---

## 📍 Positie in AI Engine

**DIT SYSTEEM = TRACK 2: Product Enrichment**

```
TRACK 1: Dataset Intelligence (Pre-Promotie)
  ↓ (produces)
supplier_datasets → Promoted to PIM
  ↓
TRACK 2: Product Enrichment (Post-Promotie) ← JE BENT HIER
  ↓ (fills gaps in)
product_master + product_variants
```

**Verschil met Track 1:**
- **Track 1** begrijpt **INPUT** (supplier datasets)
- **Track 2** verbetert **OUTPUT** (gerealiseerde products)

---

## Probleem Statement

**NA product promotie** ontbreken vaak nog velden die belangrijk zijn voor onze data kwaliteit:
- Categorieën niet toegewezen (handmatig categoriseren = 5 min)
- Materiaal samenstelling ontbreekt (handmatig zoeken in raw data = 2 min)
- Gender niet gedetecteerd (handmatig afleiden = 1 min)
- Product beschrijving leeg (handmatig schrijven = 5 min)

**Huidige situatie:** 10-15 minuten handmatig werk PER PRODUCT na promotie

**Doel:** AI vult ontbrekende velden automatisch in obv training samples → <2 min review tijd

---

## Oplossing Overzicht

### Kernprincipe: "Gebruik supplier samples om gaps te vullen"

1. **Gap Detection:** Detecteer ontbrekende velden in gepromote products obv `pim_field_definitions`
2. **Sample Lookup:** Haal training samples op van dezelfde supplier+brand (verzameld in Track 1)
3. **AI Enrichment:** Genereer suggesties om gaps te vullen obv sample patronen
4. **Self-Learning:** Opgeslagen patronen reduce AI calls over tijd
5. **Teach Me:** Conversational AI voor uitleg over suggesties

---

## Scope: Wat vult Product Enrichment in?

### P0 - Blokkeert Export (MUST HAVE)
Deze velden zijn **verplicht** voor export naar externe systemen:

| Veld | Gripp | Shopify | Calculated | Enrichment Strategie |
|------|-------|---------|------------|---------------------|
| `style_name` | ✅ | ✅ | ✅ | AI normalisatie naar NL + SEO |
| `sku_code` | ✅ | ✅ | ✅ | Auto-generated (pattern) |
| `ean` | ✅ | ✅ | ❌ | Validatie (13 digits) |
| `category_id` | ✅ | ✅ | ✅ | AI mapping + keywords |
| `color_option_id` | ❌ | ✅ | ✅ | AI fuzzy match + user feedback |
| `size_option_id` | ❌ | ✅ | ✅ | AI pattern match (XS-5XL) |
| `cost_price` | ✅ | ❌ | ❌ | Parser (RAW → cents) |
| `selling_price_excl_vat` | ✅ | ✅ | ✅ | Calculated (cost + margin) |

### P1 - Verrijkt Kwaliteit (SHOULD HAVE)
Verbetert product data quality en SEO:

- `material_composition` → AI extraction uit beschrijving
- `gender` → AI detectie (unisex, heren, dames)
- `description` → AI normalisatie + SEO keywords
- `product_images` → URL validatie + resize triggers

### P2 - Nice to Have (COULD HAVE)
Optionele metadata:

- `fit` (regular, slim, loose)
- `fabric_weight_gsm`
- `care_instructions`
- `decoration_options`

---

## Architectuur

### Database Schema

#### 1. `supplier_data_samples`
**Doel:** Training corpus voor AI (200 rows per leverancier + brand)

```sql
CREATE TABLE supplier_data_samples (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT REFERENCES suppliers(supplier_id),
  brand_id BIGINT REFERENCES brands(brand_id),
  import_job_id BIGINT REFERENCES import_supplier_dataset_jobs(id),
  
  sample_type TEXT, -- 'high_quality', 'diverse', 'edge_case'
  sample_row_data JSONB, -- Volledige RAW row
  sample_index INTEGER,
  
  extracted_features JSONB, -- {
    -- "product_type": "T-shirt",
    -- "color_mentions": ["blauw", "navy"],
    -- "material_keywords": ["katoen", "polyester"]
  -- }
  
  export_readiness JSONB, -- {
    -- "gripp": {"ready": false, "missing": ["selling_price"]},
    -- "shopify": {"ready": true, "missing": []},
    -- "calculated": {"ready": false, "missing": ["category_id"]}
  -- }
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Sampling Strategie (200 rows):**
- 100 rows: High quality (complete data, alle velden ingevuld)
- 80 rows: Diverse (max variatie kleuren/maten/prijzen)
- 20 rows: Edge cases (rare sizes, speciale kleuren, incomplete data)

#### 2. `ai_enrichment_patterns`
**Doel:** Self-learning pattern storage (cached mappings)

```sql
CREATE TABLE ai_enrichment_patterns (
  id BIGSERIAL PRIMARY KEY,
  pattern_type TEXT, -- 'color_mapping', 'size_mapping', 'category_detection'
  
  source_value TEXT, -- "Blue Ink"
  target_value TEXT, -- "Blauw"
  target_id BIGINT, -- color_option_id
  target_table TEXT, -- 'color_options'
  
  confidence_score DECIMAL(3,2), -- 0.85
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2), -- % accepted by users
  
  supplier_id BIGINT,
  brand_id BIGINT,
  
  blocks_export_to TEXT[], -- ['shopify'] if missing blocks export
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `ai_enrichment_conversations`
**Doel:** "Teach Me" conversational logs

```sql
CREATE TABLE ai_enrichment_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  supplier_product_id BIGINT,
  field_name TEXT,
  
  user_question TEXT, -- "Waarom suggereer je categorie X?"
  ai_response TEXT,
  user_feedback TEXT, -- "Aanpassing: gebruik Y in plaats van X"
  
  pattern_updated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Edge Functions

#### 1. `analyze-supplier-file`
**Wanneer:** Na succesvolle file parsing (tijdens dataset creatie)

**Taak:**
- Select 200 diverse sample rows (quality + diversity strategie)
- Extract features per row (product type, color mentions, materials)
- Check export readiness per sample (welke velden ontbreken voor Gripp/Shopify/Calculated)
- Store in `supplier_data_samples`

#### 2. `ai-enrich-product`
**Wanneer:** Tijdens promotie wizard (nieuwe Step 2)

**Intelligentie Flow:**
```
1. Check: Hebben we cached patterns voor deze leverancier+brand?
   ├─ JA (confidence >0.85) → Gebruik cached pattern (SKIP AI call)
   └─ NEE → Ga naar stap 2

2. Check: Hebben we global patterns (alle leveranciers)?
   ├─ JA (confidence >0.75) → Gebruik global pattern (SKIP AI call)
   └─ NEE → Ga naar stap 3

3. Call AI met training samples
   ├─ Fetch 10 beste samples van deze leverancier+brand
   ├─ Lovable AI prompt: "Stel enrichment voor op basis van samples"
   └─ Return suggesties + confidence scores

4. Post-processing:
   ├─ P0 fields met low confidence (<0.70) → Flag voor manual review
   ├─ P1/P2 fields met low confidence → Skip (laat leeg)
   └─ Store nieuwe patterns in ai_enrichment_patterns
```

**AI Prompt Strategie:**
```typescript
const systemPrompt = `
Je bent een product data specialist voor Nederlandse bedrijfskleding.

PRIORITEIT: Export-readiness voor Gripp, Shopify en Calculated.
- P0 velden MOETEN ingevuld worden (anders blokkeert export)
- P1 velden SHOULD (kwaliteitsverbetering)
- P2 velden COULD (nice to have)

BESCHIKBARE STAMDATA:
- Categorieën: ${categories}
- Kleuren: ${colorOptions}
- Maten: ${sizeOptions}
`;

const userPrompt = `
LEVERANCIER: ${supplier.supplier_name}
MERK: ${brand.brand_name}

TE VERRIJKEN PRODUCTEN:
${JSON.stringify(supplierProducts, null, 2)}

TRAINING SAMPLES (10 beste matches van deze leverancier):
${JSON.stringify(trainingSamples, null, 2)}

GEVRAAGDE ENRICHMENT (P0 eerst):
${targetFields.sort(byPriority).join(', ')}

RETURN JSON:
{
  "enrichments": [
    {
      "field": "category_id",
      "suggested_value": 42,
      "suggested_label": "Kleding > T-Shirts & Polo's > T-Shirts",
      "confidence": 0.88,
      "priority": "P0",
      "blocks_export_to": ["gripp", "shopify", "calculated"],
      "reasoning": "Keyword 'T-shirt' + materiaal katoen = casual T-shirt"
    }
  ]
}
`;
```

#### 3. `ai-conversation` (NEW)
**Wanneer:** User klikt "Teach Me" bij een suggestie

**Taak:**
- Conversational AI voor uitleg over suggesties
- User kan feedback geven → update patterns
- Log in `ai_enrichment_conversations`

**Example Flow:**
```
User: "Waarom suggereer je categorie 'T-Shirts Ronde Hals'?"
AI: "Op basis van 3 signalen:
     1. Product naam bevat 'T-shirt roundneck'
     2. Materiaal is 100% katoen (typisch casual T-shirt)
     3. In 87% van training samples met 'roundneck' → deze categorie"

User: "Klopt, maar dit is een premium merk. Gebruik categorie 'Premium T-Shirts'"
AI: "Bedankt! Ik heb dit patroon opgeslagen:
     - Merk 'X' + 'T-shirt' → Premium T-Shirts (confidence 0.95)"
```

---

### Frontend Integration

#### Promotion Wizard Flow Update

```
OLD FLOW:
Step 1: Product Selection
Step 2: Master Details (style name, description)
Step 3: Color Mapping
Step 4: Size Mapping
Step 5: Preview

NEW FLOW:
Step 1: Product Selection
Step 2: AI Enrichment ✨ (NIEUW)
Step 3: Review & Adjust (combined old steps 2-4)
Step 4: Preview
```

#### Step 2: AI Enrichment Component

**UI Features:**
1. **Auto-run AI** bij stap entry (loading state)
2. **Grouped by priority:**
   - 🔴 P0 Velden (blokkeert export) → Altijd tonen
   - 🟡 P1 Velden (kwaliteit) → Tonen indien AI confident
   - 🟢 P2 Velden (optional) → Alleen tonen bij high confidence

3. **Per-field review card:**
```tsx
<EnrichmentReviewCard
  field="category_id"
  priority="P0"
  blocksExportTo={['gripp', 'shopify']}
  originalValue={null}
  suggestedValue={42}
  suggestedLabel="T-Shirts & Polo's > T-Shirts"
  confidence={0.88}
  reasoning="Keyword match + training samples"
  onAccept={handleAccept}
  onReject={handleReject}
  onTeachMe={() => openConversation('category_id')}
/>
```

4. **Confidence indicators:**
   - 🟢 High (>90%): Auto-accept option
   - 🟡 Medium (70-90%): Show for review
   - 🔴 Low (<70%): Skip of require manual input

5. **Bulk actions:**
   - "Accepteer alle P0 suggesties" (indien confidence >85%)
   - "Skip P2 velden" (laat optioneel leeg)

---

## Implementatie Fases

### FASE 1: Sample Data Foundation (Week 1)
**Doel:** Bouw training corpus uit bestaande + nieuwe leveranciersbestanden

**Stappen:**
1. Database schema (`supplier_data_samples`, `ai_enrichment_patterns`, `ai_enrichment_conversations`)
2. Update `create-dataset-atomic`:
   - Add sampling logic (200 rows: 100 high quality, 80 diverse, 20 edge cases)
   - Store samples in `supplier_data_samples`
3. Create `analyze-supplier-file` Edge Function
4. **CRITICAL:** Run analysis op alle bestaande supplier datasets

**Deliverables:**
- ✅ Database met 200+ samples per leverancier
- ✅ Feature extraction werkend
- ✅ Export readiness tracking

---

### FASE 2: AI Enrichment Engine (Week 2)
**Doel:** AI genereert verrijkings-suggesties

**Stappen:**
1. Create `ai-enrich-product` Edge Function
2. Implement decision tree (cached patterns eerst, dan AI)
3. Test AI prompts met diverse leveranciers
4. Tune confidence thresholds per field type

**Deliverables:**
- ✅ AI suggesties werkend
- ✅ Confidence scores betrouwbaar
- ✅ P0/P1/P2 prioritering

---

### FASE 3: Frontend Integration (Week 3)
**Doel:** Promotie wizard met AI-step

**Stappen:**
1. Create `Step2AIEnrichment.tsx`
2. Create `EnrichmentReviewCard.tsx`
3. Update `PromotionWizard.tsx`
4. Add bulk accept/reject actions

**Deliverables:**
- ✅ UI voor review AI suggesties
- ✅ Confidence visualisatie
- ✅ Field-by-field accept/reject

---

### FASE 4: Self-Learning Loop (Week 4)
**Doel:** Patronen opslaan en hergebruiken

**Stappen:**
1. Pattern storage na acceptatie
2. Pattern lookup vóór AI call
3. Confidence decay algoritme (als gebruiker vaak verwerpt)
4. Global vs supplier-specific patterns

**Deliverables:**
- ✅ Cached patterns reduce AI calls 70%+
- ✅ Success rate tracking per pattern

---

### FASE 5: Teach Me Feature (Week 5)
**Doel:** Conversational AI voor uitleg + bijleren

**Stappen:**
1. Create `ai-conversation` Edge Function
2. Add "Teach Me" button per suggestie
3. Conversation UI (chat-style)
4. Feedback → pattern updates

**Deliverables:**
- ✅ Users kunnen AI "uitleg" vragen
- ✅ Users kunnen AI "corrigeren"
- ✅ Corrections → stored patterns

---

## Success Metrics

### Fase 1 (Na implementatie)
- **AI Call Rate:** 90%+ promoties → AI wordt aangeroepen
- **Coverage:** 80%+ P0 velden krijgen AI suggestie
- **Manual Review Time:** 8 min/promotie (van 10 min)

### Fase 2 (Na 5 promoties/leverancier)
- **AI Call Rate:** 50% (rest via cached patterns)
- **Coverage:** 90%+ P0 + P1 velden
- **Manual Review Time:** 4 min/promotie
- **Acceptance Rate:** 70%+ suggesties zonder wijziging

### Fase 3 (Na 10 promoties/leverancier)
- **AI Call Rate:** 20% (80% cached)
- **Coverage:** 95%+ P0 + P1 + P2 velden
- **Manual Review Time:** 2 min/promotie
- **Acceptance Rate:** 85%+ suggesties

### Ultimate Goal (After 20+ promoties/leverancier)
- **Manual Review Time:** <1 min (alleen final check)
- **Acceptance Rate:** 90%+
- **Export Readiness:** 100% producten export-ready na promotie

---

## Belangrijke Design Beslissingen

### Waarom 200 samples per leverancier?
- Voldoende variatie voor AI training (kleuren, maten, edge cases)
- Niet te veel (storage costs, AI prompt size)
- Sweet spot tussen kwaliteit en performance

### Waarom cached patterns priority?
- Reduce AI costs (minder calls)
- Sneller (geen API latency)
- Consistentie (zelfde mapping = zelfde resultaat)

### Waarom low confidence skippen?
- Avoid "garbage in, garbage out"
- P0 velden: Beter handmatig dan fout
- P1/P2 velden: Laat leeg indien onzeker

### Waarom "Teach Me" conversational?
- Users begrijpen AI logica beter
- Users kunnen AI "trainen" zonder code
- Verhoogt acceptance rate (uitleg → vertrouwen)

---

## Volgende Stap

**NU:** Sample data verzamelen uit echte leveranciersbestanden

**Proces:**
1. Upload leveranciersbestand via import wizard
2. Tijdens dataset creatie → 200 samples opslaan
3. Analyseer features (kleuren, maten, materialen)
4. Check export readiness (welke velden ontbreken)
5. Repeat voor alle leveranciers

**Doel:** Database met ≥10 leveranciers × 200 samples = 2000+ training rows

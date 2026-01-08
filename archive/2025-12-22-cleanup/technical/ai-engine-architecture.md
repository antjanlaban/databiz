# 🤖 AI Engine Architectuur - Complete Overzicht

**Project:** Van Kruiningen PIM - AI-Driven Data Intelligence  
**Versie:** 2.0  
**Datum:** November 2025  
**Doel:** Unificeren van AI functionaliteit in twee duidelijke tracks

---

## 🎯 Visie & Scope

Het Master PIM AI Engine is opgebouwd rond **twee onafhankelijke maar complementaire tracks**:

### TRACK 1: DATASET INTELLIGENCE (Pre-Promotie)
**Doel:** Begrijp en verbeter de **INPUT** data (supplier datasets)  
**Focus:** Herkenning, kwaliteitscheck, mapping advies  
**Timing:** Vóór product promotie

### TRACK 2: PRODUCT ENRICHMENT (Post-Promotie)  
**Doel:** Vul **GAPS** in gerealiseerde products  
**Focus:** Ontbrekende velden invullen, data verrijken  
**Timing:** Na product promotie

---

## 🏗️ TRACK 1: Dataset Intelligence

### Conceptuele Flow

```
┌─────────────────────────────────────────────────────────┐
│ STAP 1: DATASET HERKENNING                              │
│ → AI herkent kolommen in raw supplier data              │
│ → Input: Excel/CSV bestand van leverancier              │
│ → Gebruikt: pim_field_definitions voor matching         │
│ → Output: Mapping suggesties met confidence scores      │
│ → Tool: Dataset Mapping Insights                        │
│ → Edge Function: ai-suggest-mapping                     │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ STAP 2: DATASET KWALITEIT CHECK                         │
│ → Check compleetheid obv velddefinities prioriteit      │
│ → Bereken: % Verplichte velden aanwezig                 │
│ → Bereken: % Aanbevolen velden aanwezig                 │
│ → Output: Quality score per dataset (0-100%)            │
│ → Tool: Dataset Quality Dashboard                       │
│ → Edge Function: analyze-dataset-quality                │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ STAP 3: VELDDEFINITIES BEHEER                           │
│ → Beheer: Welke velden zijn belangrijk voor ons?        │
│ → Configureer: AI herkenning prompts per veld           │
│ → Genereer: Supplier advice (wat ontbreekt?)            │
│ → Tool: Velddefinities Management                       │
│ → Database: pim_field_definitions                       │
└─────────────────────────────────────────────────────────┘
```

### Componenten Detail

#### 1.1 Dataset Herkenning (Mapping)

**Wat doet het?**
- Analyseert kolomnamen in supplier Excel/CSV bestand
- Match kolommen naar gedefinieerde PIM velden
- Leert van eerdere feedback en correcties
- Genereert mapping suggesties met confidence scores

**Kern Database Structuur:**
- `import_templates` - Opgeslagen mappings per supplier
- `import_mapping_feedback` - User correcties voor learning loop
- `pim_field_definitions` - Target velden voor matching

**AI Prompts:**
```
System: "Je herkent supplier kolommen obv:
         - Field definitions (ai_recognition_prompt)
         - Example column names
         - Negative rules (wat NIET matchen)
         - Eerdere feedback van deze supplier"

User: "Analyseer deze kolommen: ['Barcode', 'Artikelnaam', 'Kleur']"
AI: "Suggesties:
     - Barcode → ean (confidence: 98%)
     - Artikelnaam → supplier_style_name (confidence: 85%)
     - Kleur → supplier_color_name (confidence: 95%)"
```

**UI Locatie:** `/ai-engine/dataset-mapping`

---

#### 1.2 Dataset Kwaliteit Check

**Wat doet het?**
- Berekent hoe compleet een dataset is
- Score gebaseerd op aanwezigheid van:
  - **Verplichte velden** (50% van score) - MUST HAVE voor basis kwaliteit
  - **Aanbevolen velden** (30% van score) - SHOULD HAVE voor goede kwaliteit
  - **Optionele velden** (20% van score) - NICE TO HAVE

**Voorbeeld Score Berekening:**
```typescript
Dataset: Santino Werkkleding
- Verplichte velden: 10/10 aanwezig (100%) → 50 punten
- Aanbevolen velden: 6/8 aanwezig (75%) → 22.5 punten  
- Optionele velden: 2/5 aanwezig (40%) → 8 punten
= Quality Score: 80.5%
```

**Database View:**
```sql
CREATE VIEW v_dataset_quality_scores AS
SELECT 
  dataset_id,
  supplier_name,
  brand_name,
  required_fields_present / total_required_fields * 50 +
  recommended_fields_present / total_recommended_fields * 30 +
  optional_fields_present / total_optional_fields * 20 
  AS quality_score
FROM ...
```

**Use Cases:**
1. **Pre-Import Check:** Valideer dataset compleetheid vóór import
2. **Supplier Advice:** Genereer rapport "Deze velden ontbreken in uw bestand"
3. **Quality Dashboard:** Overzicht beste/slechtste leveranciers

**UI Locatie:** `/ai-engine/dataset-quality` (toekomstig)

---

#### 1.3 Velddefinities Beheer

**Wat doet het?**
- **Centrale configuratie** van alle PIM velden
- Bepaalt **WAT** belangrijk is voor onze data kwaliteit
- Configureert **HOE** AI deze velden moet herkennen

**Veld Definitie Anatomie:**
```typescript
{
  field_key: "supplier_color_name",
  display_name_nl: "Kleur",
  display_name_en: "Color",
  priority: "Verplicht", // Verplicht | Aanbevolen | Optioneel
  
  // WAAROM is dit veld belangrijk?
  data_quality_impact: "CRITICAL - Kleur is noodzakelijk voor variant creatie. Zonder kleur kunnen we geen unieke SKU's genereren en geen kleur-opties tonen aan klanten.",
  
  // HOE herkent AI dit veld?
  ai_recognition_prompt: "Detecteer kolommen met kleur informatie zoals 'Rood', 'Navy', 'Black'. Vaak genaamd 'Kleur', 'Color', 'Colour', 'Farbe'.",
  
  ai_negative_rules: "Negeer kolommen met:\n- Alleen kleurcodes (bijv. '001', '#FF0000')\n- 'Kleurgroep' (te abstract)\n- 'Kleurafwijking' (kwaliteitscontrole veld)",
  
  example_column_names: ["Kleur", "Color", "Colour", "Farbe", "Couleur"],
  
  // Supplier advice template
  supplier_advice_template: "⚠️ Ontbrekend veld: KLEUR\nDeze dataset bevat geen kleur informatie. Zonder kleuren kunnen we geen product variants aanmaken.\n\nToevoegen in Excel:\n- Kolom naam: 'Kleur' of 'Color'\n- Waarden: 'Zwart', 'Navy', 'Wit', etc.\n- Per product variant één rij",
  
  supplier_advice_examples: [
    "Zwart", "Navy", "Wit", "Rood", "Grijs/Zwart (duo kleuren)"
  ]
}
```

**Database Schema:**
```sql
CREATE TABLE pim_field_definitions (
  id BIGSERIAL PRIMARY KEY,
  field_key TEXT UNIQUE,
  display_name_nl TEXT,
  display_name_en TEXT,
  priority TEXT CHECK (priority IN ('Verplicht', 'Aanbevolen', 'Optioneel')),
  
  -- Data kwaliteit impact
  data_quality_impact TEXT,
  is_required_for_variants BOOLEAN DEFAULT false,
  quality_weight INTEGER DEFAULT 1,
  
  -- AI herkenning
  ai_recognition_prompt TEXT,
  ai_negative_rules TEXT,
  example_column_names TEXT[],
  
  -- Supplier advice
  supplier_advice_template TEXT,
  supplier_advice_examples TEXT[],
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Priority Definitie:**
- **Verplicht:** MUST HAVE - Basis kwaliteit vereist. Zonder deze data is product onbruikbaar.
  - Voorbeelden: EAN, style_name, color, size
- **Aanbevolen:** SHOULD HAVE - Verbetert kwaliteit significant. Product is bruikbaar maar beperkt.
  - Voorbeelden: product_group, material, price
- **Optioneel:** NICE TO HAVE - Luxe metadata. Voegt waarde toe maar niet kritisch.
  - Voorbeelden: fabric_weight, care_instructions, certifications

**UI Locatie:** `/ai-engine/pim-fields`

---

## 🏗️ TRACK 2: Product Enrichment

### Conceptuele Flow

```
┌─────────────────────────────────────────────────────────┐
│ STAP 4: GAP DETECTION                                   │
│ → Detecteer ontbrekende velden in gepromote products    │
│ → Input: product_styles + product_variants na promotie  │
│ → Check obv pim_field_definitions priority              │
│ → Output: Lijst van velden die ingevuld moeten worden   │
│ → Tool: Product Enrichment Queue (toekomstig)           │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ STAP 5: AI ENRICHMENT                                   │
│ → AI vult ontbrekende velden in                         │
│ → Gebruikt: Training samples van supplier dataset       │
│ → Gebruikt: Opgeslagen patronen (category mapping, etc) │
│ → Learning loop: Leert van user correcties              │
│ → Output: Enrichment suggesties met confidence          │
│ → Tool: Product Enrichment Wizard (toekomstig)          │
│ → Edge Function: ai-enrich-product                      │
└─────────────────────────────────────────────────────────┘
```

### Componenten Detail

#### 2.1 Gap Detection

**Wat doet het?**
- Scan product master + variants na promotie
- Identificeer ontbrekende velden obv priority (Verplicht eerst)
- Prioriteer enrichment queue

**Voorbeeld Output:**
```json
{
  "product_style_id": 42,
  "gaps": [
    {
      "field": "primary_category_id",
      "priority": "Verplicht",
      "data_quality_impact": "CRITICAL - Categorie nodig voor export",
      "enrichment_possible": true,
      "confidence": 0.85
    },
    {
      "field": "material_composition",
      "priority": "Aanbevolen", 
      "data_quality_impact": "IMPORTANT - Verbetert SEO en filters",
      "enrichment_possible": true,
      "confidence": 0.72
    }
  ]
}
```

---

#### 2.2 AI Enrichment Engine

**Wat doet het?**
- Vult ontbrekende velden in via AI
- Gebruikt training samples (200 rijen per supplier van Track 1)
- Leert van eerdere promoties van dezelfde supplier

**AI Decision Tree:**
```
1. Check: Hebben we cached pattern voor dit veld + supplier?
   ├─ JA (confidence >85%) → Gebruik cached (SKIP AI call)
   └─ NEE → Ga naar stap 2

2. Check: Kunnen we afleiden uit andere velden?
   ├─ JA (bijv. category uit product_group) → Rule-based
   └─ NEE → Ga naar stap 3

3. Call AI met training samples
   ├─ Fetch 10 beste samples van deze supplier
   ├─ Prompt: "Vul ontbrekend veld X in obv samples"
   └─ Return suggestie + confidence

4. Post-processing:
   ├─ Confidence >85% → Auto-accept optie
   ├─ Confidence 70-85% → Toon ter review
   └─ Confidence <70% → Skip of manual input
```

**Database Schema:**
```sql
-- Training samples (collected in Track 1)
CREATE TABLE supplier_data_samples (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT,
  brand_id BIGINT,
  sample_type TEXT, -- 'high_quality', 'diverse', 'edge_case'
  sample_row_data JSONB,
  extracted_features JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enrichment patterns (learned from user feedback)
CREATE TABLE ai_enrichment_patterns (
  id BIGSERIAL PRIMARY KEY,
  pattern_type TEXT, -- 'category_mapping', 'color_normalization', etc
  source_value TEXT,
  target_value TEXT,
  target_id BIGINT,
  confidence_score DECIMAL(3,2),
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  supplier_id BIGINT,
  brand_id BIGINT
);
```

**UI Locatie:** `/products/enrich` (toekomstig in promotie wizard)

---

## 🔄 Interactie Tussen Tracks

### Data Flow

```
TRACK 1 (Dataset Intelligence)
     ↓ (genereert)
pim_field_definitions
     ↓ (gebruikt door)
TRACK 1: Mapping & Quality Check
     ↓ (creëert)
supplier_datasets (met samples)
     ↓ (gebruikt door)
TRACK 2: Product Enrichment
     ↓ (vult in)
product_styles + product_variants
```

### Shared Resources

**1. pim_field_definitions**
- **Track 1 gebruik:** Target voor kolom matching, basis voor quality scoring
- **Track 2 gebruik:** Bepaalt welke velden ingevuld moeten worden

**2. supplier_data_samples**
- **Track 1 creatie:** Verzameld tijdens dataset creatie (200 samples)
- **Track 2 gebruik:** Training data voor AI enrichment

**3. AI prompts & patterns**
- **Track 1 learning:** User corrigeert mapping → feedback opgeslagen
- **Track 2 learning:** User corrigeert enrichment → patterns opgeslagen

---

## 🎯 Key Differences (Cruciale Nuances)

| Aspect | TRACK 1: Dataset Intelligence | TRACK 2: Product Enrichment |
|--------|-------------------------------|----------------------------|
| **Timing** | Vóór promotie | Na promotie |
| **Input** | Raw supplier Excel/CSV | Gepromote products in PIM |
| **Focus** | Begrijp de dataset | Vul ontbrekende velden |
| **Output** | Mapping suggesties, quality scores | Enrichment suggesties |
| **Criteria** | Data completeness (hoeveel % aanwezig?) | Data quality (wat ontbreekt?) |
| **Goal** | Herken & valideer INPUT | Verbeter OUTPUT |
| **User vraag** | "Wat zit er in dit bestand?" | "Wat moet ik nog invullen?" |

### Praktisch Voorbeeld

**Scenario:** Santino Werkbroeken Excel bestand

**Track 1 (Dataset Intelligence):**
```
User uploadt: santino_werkbroeken_2025.xlsx

Stap 1 - Dataset Herkenning:
- Kolom "EAN-Code" → Gemapped naar pim_field: ean (98% confidence)
- Kolom "Artikelnaam" → Gemapped naar pim_field: supplier_style_name (85%)
- Kolom "Kleur" → Gemapped naar pim_field: supplier_color_name (95%)

Stap 2 - Kwaliteit Check:
- Verplichte velden: 10/10 aanwezig ✅
- Aanbevolen velden: 6/8 aanwezig ⚠️ (ontbreekt: fabric_weight, care_instructions)
- Quality Score: 85%

Stap 3 - Velddefinities:
- AI gebruikte definitie "supplier_color_name" om kolom "Kleur" te herkennen
- Supplier Advice: "⚠️ Aanbevolen veld FABRIC_WEIGHT ontbreekt (30% kwaliteitsimpact)"
```

**Track 2 (Product Enrichment):**
```
Na promotie: 50 werkbroeken in PIM

Stap 4 - Gap Detection:
- Ontbreekt: primary_category_id (Verplicht - blokkeert export)
- Ontbreekt: material_composition (Aanbevolen)
- Aanwezig: kleuren, maten, prijzen ✅

Stap 5 - AI Enrichment:
AI analyseert training samples:
- Sample 1: "Werkbroek stretch" → Category: "Broeken & Shorts > Werkbroeken"
- Sample 2: "65% polyester 35% katoen" → Material: "Polyester/Katoen blend"

Suggesties:
- primary_category_id: 42 (Werkbroeken, confidence: 88%)
- material_composition: "65% Polyester, 35% Katoen" (confidence: 72%)

User review → Accept/Reject → Pattern opgeslagen
```

---

## 📊 Success Metrics

### Track 1: Dataset Intelligence

**KPI's:**
- **Mapping Acceptance Rate:** % AI suggesties die zonder wijziging geaccepteerd worden
  - Target: >85% na 10 imports per supplier
- **Quality Score Trend:** Gemiddelde dataset quality over tijd
  - Target: >80% voor alle actieve suppliers
- **Supplier Advice Sent:** # leveranciers die feedback ontvangen over ontbrekende velden
  - Target: 100% suppliers met quality <70%

### Track 2: Product Enrichment

**KPI's:**
- **Enrichment Coverage:** % products met complete Verplichte + Aanbevolen velden
  - Target: >90% na enrichment
- **AI Acceptance Rate:** % enrichment suggesties die geaccepteerd worden
  - Target: >80% na 20 promoties per supplier
- **Manual Review Time:** Tijd besteed aan enrichment per product
  - Target: <2 min/product (van 10+ min handmatig)

---

## 🚀 Roadmap

### Q1 2025: Track 1 Foundation
- ✅ pim_field_definitions database & UI
- ✅ ai-suggest-mapping met field definitions
- ⏳ Dataset Quality Dashboard
- ⏳ Supplier Advice Generator

### Q2 2025: Track 1 Optimization
- ⏳ Learning loop (feedback → improved prompts)
- ⏳ Cross-supplier pattern recognition
- ⏳ Automated quality alerts

### Q3 2025: Track 2 Foundation
- ⏳ supplier_data_samples collection
- ⏳ ai-enrich-product Edge Function
- ⏳ Enrichment UI in promotion wizard

### Q4 2025: Track 2 Self-Learning
- ⏳ Pattern caching (reduce AI calls)
- ⏳ Batch enrichment (process multiple products)
- ⏳ Teach Me conversational AI

---

## 🔐 Security & Governance

### Data Privacy
- Supplier samples: Alleen metadata + beperkte sample rows (max 200)
- AI prompts: Geen PII, alleen product data
- User feedback: Gelogd voor audit trail

### Cost Management
- AI calls: Gecached patterns eerst checken (reduce 70% calls)
- Token limits: Max 4000 tokens per prompt
- Fallback: Bij AI timeout → manual fallback

### Quality Assurance
- Confidence thresholds: Per field type configureerbaar
- Manual review queue: Low confidence suggesties
- Rollback: User kan enrichment ongedaan maken

---

## 📚 Gerelateerde Documentatie

### Track 1 Documenten
- `docs/technical/ai-mapping-system.md` - Mapping engine details
- `docs/technical/pim-field-definitions.md` - Field requirements register
- `docs/technical/dataset-quality-scoring.md` - Quality metrics (nieuw)

### Track 2 Documenten  
- `docs/features/ai-product-enrichment.md` - Enrichment system design
- `docs/technical/pattern-learning.md` - Self-learning algoritmes (nieuw)

### Shared Documenten
- `docs/data-model/validation-rules.md` - Validatie regels voor velden
- `docs/supplier-analysis/` - Leverancier-specifieke patronen

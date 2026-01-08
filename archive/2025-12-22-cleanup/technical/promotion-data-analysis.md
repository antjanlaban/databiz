# Promotie Data Analyse
**Doel:** Minimale vereisten voor Shopify + VK producten identificeren en beschikbare supplier data optimaal benutten

---

## 📋 Minimale Vereisten

### Shopify ProductVariant (Minimaal voor Etalage)
```typescript
{
  // ABSOLUUT VERPLICHT
  sku: "VK-BRAND-STYLE-COLOR-SIZE",  // ✅ Nu: wordt gegenereerd
  barcode: "8712345678901",          // ✅ Nu: EAN wordt ingevuld
  
  // OPTIONEEL (voor "Prijs op aanvraag" etalage)
  price: "29.99",                    // 💡 NIEUW: OPTIONEEL voor etalage functie
  inventoryQuantity: 0,              // ✅ Nu: 0 (standaard, geen voorraad = op aanvraag)
  weight: 250,                       // ⚠️  Alleen verplicht bij actieve verkoop (verzending)
  weightUnit: "GRAMS",               // ⚠️  Alleen verplicht bij actieve verkoop
  
  // OPTIONEEL maar belangrijk voor UX
  image: { url: "https://..." },    // ❌ Nu: NIET gekoppeld
  compareAtPrice: null,              // Voor toekomstige kortingsacties
  taxable: true,                     // Standaard: true
  requiresShipping: true,            // Standaard: true (kan op false voor digitale producten)
}
```

**💡 NIEUW INZICHT: "Prijs op Aanvraag" Strategie**
- Shopify accepteert producten ZONDER prijs (draft mode)
- VK kan producten tonen als etalage zonder verkoopprijs
- Toekomstige pricing service vult prijzen in op basis van business rules
- Weight pas verplicht bij actieve verkoop (verzending)

### VK ProductVariant (Minimaal voor Etalage Functie)
```typescript
{
  // ABSOLUUT VERPLICHT (database constraints)
  sku_code: "VK-XXX-YYY-ZZZ-S",           // ✅ Nu: wordt gegenereerd (auto)
  ean: "8712345678901",                   // ✅ Nu: van supplier_products
  size_display_nl: "M",                   // ✅ Nu: van size_mappings
  size_order: 3,                          // ✅ Nu: wordt berekend
  color_variant_id: 123,                  // ✅ Nu: wordt aangemaakt
  
  // 💡 NIEUW: OPTIONEEL voor "Prijs op Aanvraag" strategie
  cost_price: null,                       // ⭕ OPTIONEEL - toekomstige pricing service
  selling_price_excl_vat: null,           // ⭕ OPTIONEEL - "Prijs op aanvraag" etalage
  vat_rate: 21,                           // ✅ Default 21% (NL standaard)
  
  // OPTIONEEL (verbetert data compleetheid)
  weight_grams: 250,                      // ⚠️  Alleen verplicht bij verkoop (verzending)
  international_size_id: 45,              // ⭕ Optioneel (verbetert size matching)
  supplier_sku: "SUPPLIER-ABC-123",       // ✅ Nu: van supplier_products
  supplier_article_nr: "ART-456",         // ✅ Nu: van supplier_products
}
```

**💡 BUSINESS RULE UPDATE:**
- **VR-018 (selling_price_excl_vat):** NIET LANGER VERPLICHT
- **VR-017 (cost_price):** OPTIONEEL (alleen voor marge rapportage)
- **BR-007 (positieve marge):** Alleen valideren ALS pricing ingevuld is
- **Etalage functie:** Producten zonder prijs tonen als "Prijs op aanvraag"
- **Toekomstige pricing service:** Vult prijzen in op basis van business rules

---

## 📊 Beschikbare Data in supplier_products

### Huidige supplier_products structuur:
```sql
CREATE TABLE supplier_products (
  id INTEGER PRIMARY KEY,
  ean VARCHAR NOT NULL,                          -- ✅ GEBRUIKT (variant.ean)
  
  -- PRICING DATA (NIET GEBRUIKT!)
  supplier_advised_price INTEGER,                -- ❌ Niet gebruikt, maar kan basis zijn!
  
  -- PRODUCT INFO
  supplier_sku VARCHAR,                          -- ✅ GEBRUIKT (variant.supplier_sku)
  supplier_article_code VARCHAR,                 -- ✅ GEBRUIKT (variant.supplier_article_nr)
  supplier_style_code VARCHAR,                   -- Info voor groepering
  supplier_style_name TEXT,                      -- Info voor product_style
  supplier_brand_name VARCHAR,                   -- Info voor brand matching
  
  -- KLEUR/MAAT INFO
  supplier_color_name TEXT,                      -- ✅ GEBRUIKT (voor groepering)
  supplier_color_code VARCHAR,                   -- Info voor color mapping
  supplier_accent_color_name VARCHAR,            -- Optioneel accent
  supplier_size_code VARCHAR,                    -- ✅ GEBRUIKT (size mapping)
  
  -- BESCHRIJVINGEN
  supplier_short_description TEXT,              -- ❌ Niet gebruikt (kan voor description!)
  supplier_long_description TEXT,               -- ❌ Niet gebruikt
  supplier_category_name TEXT,                  -- Info voor category mapping
  
  -- TECHNISCHE SPECS (NIET GEBRUIKT!)
  supplier_fabric_weight_gsm INTEGER,           -- ❌ Niet gebruikt (kan voor weight!)
  supplier_gender TEXT,                         -- Info voor product_style.gender
  supplier_fit TEXT,                            -- Info voor description
  supplier_country_of_origin TEXT,              -- Info voor compliance
  
  -- MEDIA (NIET GEBRUIKT!)
  supplier_image_urls TEXT[],                   -- ❌ Niet gebruikt (kan voor color_variant_media!)
  supplier_product_url TEXT,                    -- Referentie naar leverancier
  
  -- METADATA
  raw_data JSONB NOT NULL,                      -- ❌ GOUDMIJN VAN EXTRA DATA!
  mapped_brand_id INTEGER,                      -- Al gematcht brand
  mapped_category_id INTEGER,                   -- Al gematchte category
  
  -- TIMESTAMPS
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_synced_at TIMESTAMP
);
```

---

## 🔍 Data Gap Analyse

### 1. PRICING (💡 NIEUW: OPTIONEEL voor Etalage Functie!)

**💡 NIEUW INZICHT: "Prijs op Aanvraag" Strategie**
- Shopify accepteert producten **ZONDER** prijs (etalage functie)
- VK kan producten tonen **ZONDER** verkoopprijs ("Prijs op aanvraag")
- Toekomstige **Pricing Service** vult prijzen in op basis van:
  - Inkoopprijs + markup regels
  - Category-based defaults
  - Concurrentie analyse
  - Seizoen/promotie logica

**Huidige Situatie:**
- `selling_price_excl_vat`: **NIET LANGER VERPLICHT** ✅
- `cost_price`: OPTIONEEL (alleen voor marge rapportage)
- Promotie kan nu **zonder pricing** succesvol zijn

**Beschikbare data (voor toekomstige pricing service):**
```typescript
supplier_products.supplier_advised_price: 2500  // €25.00 (in cents)
```

**Oplossing:** Pricing volledig optioneel maken
```typescript
// Promotie: Pricing SKIP (NULL blijft NULL)
cost_price = null                      // ⭕ Optioneel
selling_price_excl_vat = null          // ⭕ Optioneel - "Prijs op aanvraag"

// Toekomstige Pricing Service:
// - Batch processing van alle producten zonder prijs
// - Intelligente markup op basis van category/brand/seizoen
// - Manual override via Admin UI
// - Realtime pricing updates
```

**Validatie:** BR-007 - Alleen valideren ALS pricing is ingevuld:
```typescript
if (selling_price_excl_vat && cost_price) {
  assert(selling_price_excl_vat > cost_price, "Positieve marge vereist");
}
```

---

### 2. WEIGHT (⚠️ Alleen Verplicht bij Actieve Verkoop)

**💡 NIEUW INZICHT:**
- Weight is **NIET verplicht** voor etalage functie
- Weight pas **verplicht bij actieve verkoop** (verzending)
- Shopify: `requiresShipping: false` voor digitale/aanvraag producten

**Huidige Situatie:**
- Momenteel: **NULL** na promotie ✅ (acceptabel voor etalage)
- Toekomst: Weight invullen wanneer product actief verkoopbaar wordt

**Beschikbare data:**
```typescript
supplier_products.supplier_fabric_weight_gsm: 180  // Stof gewicht in g/m²
```

**Oplossing:** Weight estimation (voor toekomstige actieve verkoop)
```typescript
// Optie 1: Fabric weight → Total weight schatting
// Gemiddeld kledingstuk = ~1m² stof + verpakking
estimated_weight_grams = supplier_fabric_weight_gsm + 50  // +50g voor verpakking

// Optie 2: Clothing type defaults
const WEIGHT_DEFAULTS = {
  'T-shirt': 150,
  'Polo': 200,
  'Sweater': 400,
  'Jas': 800,
  // ...
};
weight_grams = WEIGHT_DEFAULTS[clothing_type] || 250  // 250g fallback

// Optie 3: Manual input tijdens "Activeer voor Verkoop" flow
// Gebruiker vult weight in wanneer product live gaat
```

**Strategie:**
- Promotie: `weight_grams = NULL` (etalage functie)
- Activeer voor Verkoop: Vraag weight + pricing (verplicht voor verzending)

---

### 3. IMAGES (BELANGRIJK - Impact op Conversie)

**Probleem:**
- Shopify gebruikt variant-specifieke images voor betere UX
- Momenteel: **GEEN images gekoppeld** aan color_variants
- `color_variant_media` tabel blijft leeg na promotie

**Beschikbare data:**
```typescript
supplier_products.supplier_image_urls: [
  "https://supplier.com/img1.jpg",
  "https://supplier.com/img2.jpg",
  "https://supplier.com/img3.jpg"
]
```

**Oplossing:** Automatische image linking tijdens promotie
```typescript
// Voor elke color_variant:
for (const imageUrl of supplier_products[0].supplier_image_urls) {
  await supabase
    .from('color_variant_media')
    .insert({
      color_variant_id: colorVariant.id,
      media_type: 'image',
      media_url: imageUrl,
      is_primary: index === 0,  // Eerste image = primary
      sort_order: index,
      alt_text: `${product_style.style_name} - ${colorVariant.color_name_nl}`,
    });
}
```

**Groepering:** Als meerdere supplier_products dezelfde kleur hebben, neem images van eerste product (of merge alle unieke URLs)

---

### 4. DESCRIPTIONS (OPTIONEEL maar Waardevol)

**Probleem:**
- `product_styles.description` vaak leeg na promotie
- Shopify gebruikt description voor SEO en customer info
- Momenteel: gebruiker moet handmatig invullen in wizard

**Beschikbare data:**
```typescript
supplier_products.supplier_short_description: "Comfortabele polo met modern fit"
supplier_products.supplier_long_description: "Deze premium polo is gemaakt van 100% katoen..."
supplier_products.supplier_fit: "Modern Fit"
supplier_products.supplier_gender: "Unisex"
```

**Oplossing:** Automatische description generatie
```typescript
// Combine beschikbare velden
const descriptionParts = [];

if (supplier_short_description) {
  descriptionParts.push(supplier_short_description);
}

if (supplier_fit || supplier_gender) {
  descriptionParts.push(`Fit: ${supplier_fit || 'Regular'} | Voor: ${supplier_gender || 'Unisex'}`);
}

if (supplier_long_description) {
  descriptionParts.push(supplier_long_description);
}

product_style.description = descriptionParts.join('\n\n');
```

---

### 5. RAW_DATA Kolom (GOUDMIJN)

**Potentie:** `raw_data` JSONB kolom bevat vaak **ALLE originele data** van supplier Excel/CSV

**Voorbeelden van extra data:**
```json
{
  "Materiaal": "100% Katoen",
  "Wasvoorschrift": "30°C",
  "Kleurvastheid": "Goed",
  "Seizoen": "Zomer 2025",
  "Collectie": "Basic Line",
  "Certificering": "OEKO-TEX",
  "Herkomst": "Turkije",
  "Customs Code": "6109100010",
  "Minimum Order": "50",
  "Delivery Time": "3-5 dagen"
}
```

**Gebruik:**
- **Material composition:** Voor `product_styles.material_composition`
- **Care instructions:** Voor `product_styles.care_instructions`
- **Extra metadata:** Voor toekomstige uitbreidingen
- **Customs/Compliance:** Voor export features

**Implementatie:**
```typescript
// Intelligente extractie uit raw_data
const material = raw_data['Materiaal'] || raw_data['Material'] || raw_data['Composition'];
const care = raw_data['Wasvoorschrift'] || raw_data['Care'] || raw_data['Wash'];

if (material) product_style.material_composition = material;
if (care) product_style.care_instructions = care;
```

---

## 🎯 Herziene Prioriteiten (💡 Met "Prijs op Aanvraag" Strategie)

### ✅ GEEN BLOKKADES MEER! (Etalage Functie Werkt)
**💡 DOORBRAAK:** Pricing en Weight zijn NIET langer kritiek voor promotie!
- Producten kunnen als etalage zonder prijs/weight
- Shopify sync mogelijk met `price: null` (draft mode)
- Toekomstige pricing service vult data in

### 🟢 LOW PRIORITY (Nice to Have voor Etalage)
1. **Pricing (OPTIONEEL)**
   - Promotie: `cost_price = NULL`, `selling_price_excl_vat = NULL`
   - Toekomstige Pricing Service vult in op basis van business rules
   - Manual override via Admin UI

2. **Weight (OPTIONEEL voor etalage)**
   - Promotie: `weight_grams = NULL`
   - Pas verplicht bij "Activeer voor Verkoop" flow
   - Schatting: `supplier_fabric_weight_gsm + 50` OF clothing type default

### 🟡 MEDIUM (Impact op UX/Conversie)
3. **Images koppelen**
   - `supplier_image_urls` → `color_variant_media`
   - Eerste image = `is_primary: true`
   - Alt text: `{style_name} - {color_name_nl}`

4. **Description genereren**
   - Combine: `supplier_short_description` + `supplier_long_description`
   - Add: fit, gender, material info
   - Fallback: minimale placeholder

### 🟢 MEDIUM (Nice to Have)
5. **Material & Care extractie**
   - Parse `raw_data` voor material_composition
   - Parse `raw_data` voor care_instructions
   - Intelligente field mapping per supplier

6. **Category-based defaults**
   - Tabel: `category_defaults` (weight, markup, lead_time)
   - Tabel: `supplier_defaults` (learned patterns per supplier)

---

## 💡 Slimme Patronen Per Dataset

### Dataset-specifieke Patronen Detecteren

**Concept:** Elke supplier dataset (`import_supplier_dataset_jobs`) heeft unieke patterns die we kunnen leren:

```typescript
// Voorbeeld: TEE JAYS dataset
{
  import_job_id: 42,
  supplier_id: 5,
  brand_id: 12,
  patterns: {
    // Pricing pattern
    avg_advised_price: 1850,
    typical_markup_percentage: 250,
    
    // Weight pattern
    avg_fabric_weight: 180,
    uses_fabric_weight_field: true,
    
    // Image pattern
    images_per_color: 3,
    image_url_pattern: "https://teejays.com/images/{sku}/{color}/{seq}.jpg",
    
    // Description pattern
    has_short_description: true,
    has_long_description: false,
    description_language: "nl",
    
    // Category pattern
    typical_categories: ["Polo", "T-shirt", "Sweater"],
    
    // Size pattern
    size_notation: "NUMERIC",  // 46, 48, 50 vs XS, S, M
    size_range: "44-64"
  }
}
```

**Implementatie:**
```typescript
// Bij promotie: gebruik dataset patterns voor intelligente defaults
const dataset = await getDatasetPatterns(import_job_id);

// Auto-fill pricing
if (!user_provided_price && dataset.patterns.avg_advised_price) {
  cost_price = supplier_advised_price;
  selling_price_excl_vat = cost_price * (dataset.patterns.typical_markup_percentage / 100);
}

// Auto-fill weight
if (!user_provided_weight && dataset.patterns.avg_fabric_weight) {
  weight_grams = dataset.patterns.avg_fabric_weight + 50;  // +50g verpakking
}

// Auto-select size mapping template
if (dataset.patterns.size_notation === 'NUMERIC') {
  suggest_size_template = "numeric_to_letter";  // 46→S, 48→M
}
```

---

## 🎨 KRITIEK: Kleur & Maat Standardisatie (Consistency Challenge)

### Probleem: Leveranciers Chaos

**Kleur Variaties:**
```
Leverancier A: "Navy"
Leverancier B: "Marine" 
Leverancier C: "Donkerblauw"
Leverancier D: "Navy Blue"
→ VK: "Donkerblauw" (color_family_id: 5)
```

**Maat Variaties:**
```
Leverancier A: "46"
Leverancier B: "S"
Leverancier C: "Small"
Leverancier D: "SMALL"
→ VK: "S" (international_size_id: 2)
```

### Huidige Situatie (Promotion Wizard)

**✅ WAT WERKT:**
1. **Color Mapping (Step 3):**
   - Auto-match op exact `color_name_nl`
   - Handmatige mapping naar `color_families`
   - Quick add dialog voor nieuwe kleuren
   
2. **Size Mapping (Step 4):**
   - Hardcoded dictionary: `{'44': 'XS', 'Small': 'S', 'XXXL': '3XL'}`
   - Auto-match op exact match of dictionary
   - Quick add dialog voor nieuwe maten

**❌ GAPS - KRITIEKE PROBLEMEN:**

#### 1. **GEEN Hergebruik van Mappings**
```typescript
// Probleem: Elke promotie begint vanaf nul
// Supplier "Tricorp" → "Navy" = "Donkerblauw"
// 3 maanden later: Opnieuw manueel mappen!
```

#### 2. **GEEN Supplier-specifieke Patterns**
```typescript
// Probleem: Leverancier specifieke notaties niet herkend
// TEE JAYS altijd: "46" → "S", "48" → "M" (numeriek)
// GILDAN altijd: "Small" → "S", "Medium" → "M" (Engels)
// Maar: wizard weet dit niet!
```

#### 3. **GEEN Fuzzy Matching**
```typescript
// Probleem: Kleine variaties niet herkend
"Navy"        → Match ✅
"Navy Blue"   → GEEN match ❌ (moet "Navy" worden)
"Marine"      → GEEN match ❌ (moet "Navy" worden)
"Donkerblauw" → Match ✅
```

#### 4. **GEEN Validatie op Consistentie**
```typescript
// Probleem: Geen waarschuwing bij afwijkende mappings
// Import 1: "Navy" → "Donkerblauw"
// Import 2: "Navy" → "Blauw" (FOUT! Moet consistent zijn)
// → Geen waarschuwing!
```

#### 5. **Hardcoded Size Dictionary**
```typescript
// Probleem: Niet uitbreidbaar, niet leerbaar
const SIZE_MAPPING = {
  '44': 'XS', '46': 'S', '48': 'M', // ... hardcoded
};
// Nieuwe notaties vereisen code changes!
```

---

### Voorgestelde Oplossing: Smart Mapping System

#### 📊 **Database Extensie:**

```sql
-- 1. NIEUWE TABEL: Herbruikbare Color Mappings per Supplier
CREATE TABLE supplier_color_mappings (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  supplier_color_name TEXT NOT NULL,              -- "Navy", "Marine", "Navy Blue"
  vk_color_family_id INTEGER REFERENCES color_families(id),
  vk_color_name_nl TEXT NOT NULL,                 -- "Donkerblauw"
  vk_color_code TEXT NOT NULL,                    -- "NAV"
  confidence_score DECIMAL(3,2) DEFAULT 1.00,     -- 1.00 = manual, 0.95 = fuzzy match
  usage_count INTEGER DEFAULT 1,                  -- Aantal keer gebruikt
  last_used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(supplier_id, supplier_color_name)
);

-- 2. NIEUWE TABEL: Herbruikbare Size Mappings per Supplier
CREATE TABLE supplier_size_mappings (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  supplier_size_code TEXT NOT NULL,               -- "46", "Small", "SMALL"
  vk_size_code TEXT NOT NULL,                     -- "S"
  vk_international_size_id INTEGER REFERENCES international_sizes(id),
  confidence_score DECIMAL(3,2) DEFAULT 1.00,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(supplier_id, supplier_size_code)
);

-- 3. UITBREIDING: Promotion Templates opslaan kleur/maat mappings
-- promotion_templates tabel HEEFT AL: color_mappings JSONB, size_mappings JSONB
-- → Gebruik dit voor hergebruik!
```

#### 🤖 **Intelligente Auto-Mapping (3 Levels):**

```typescript
// LEVEL 1: Exact Match (supplier_color_mappings tabel)
async function autoMapColors(supplier_id: number, colors: string[]) {
  for (const color of colors) {
    // Check: Bestaat exact match in supplier_color_mappings?
    const existingMapping = await supabase
      .from('supplier_color_mappings')
      .select('*')
      .eq('supplier_id', supplier_id)
      .eq('supplier_color_name', color)
      .single();
    
    if (existingMapping) {
      return existingMapping; // ✅ Hergebruik eerdere mapping
    }
  }
}

// LEVEL 2: Fuzzy Match (Levenshtein distance)
async function fuzzyMatchColor(supplier_id: number, color: string) {
  // Haal alle mappings voor deze supplier
  const { data: allMappings } = await supabase
    .from('supplier_color_mappings')
    .select('*')
    .eq('supplier_id', supplier_id);
  
  // Bereken similarity score
  const bestMatch = allMappings
    .map(m => ({
      ...m,
      score: levenshteinSimilarity(color, m.supplier_color_name)
    }))
    .filter(m => m.score > 0.80) // 80% similarity
    .sort((a, b) => b.score - a.score)[0];
  
  if (bestMatch) {
    return {
      ...bestMatch,
      confidence_score: bestMatch.score // 0.80 - 0.99
    };
  }
}

// LEVEL 3: Global Color Family Match (over alle suppliers)
async function globalColorMatch(color: string) {
  // Match tegen color_families (cross-supplier)
  const { data: colorFamilies } = await supabase
    .from('color_families')
    .select('*')
    .eq('is_active', true);
  
  // Exact match op color_name_nl
  let match = colorFamilies.find(cf => 
    cf.color_name_nl.toLowerCase() === color.toLowerCase()
  );
  
  // Fuzzy match
  if (!match) {
    match = colorFamilies
      .map(cf => ({
        ...cf,
        score: Math.max(
          levenshteinSimilarity(color, cf.color_name_nl),
          levenshteinSimilarity(color, cf.color_name_en || '')
        )
      }))
      .filter(cf => cf.score > 0.75)
      .sort((a, b) => b.score - a.score)[0];
  }
  
  return match;
}
```

#### ✅ **Mapping Validation & Consistency Check:**

```typescript
// Check: Afwijking van eerdere mappings
async function validateColorMapping(
  supplier_id: number, 
  color: string, 
  new_color_family_id: number
) {
  const existing = await supabase
    .from('supplier_color_mappings')
    .select('*')
    .eq('supplier_id', supplier_id)
    .eq('supplier_color_name', color)
    .single();
  
  if (existing && existing.vk_color_family_id !== new_color_family_id) {
    return {
      warning: true,
      message: `⚠️ Afwijking gedetecteerd: 
        "${color}" werd ${existing.usage_count}x gemapt als "${existing.vk_color_name_nl}",
        maar nu als "${newColorFamilyName}". 
        Weet je zeker dat dit correct is?`,
      previous_mapping: existing
    };
  }
  
  return { warning: false };
}
```

#### 🎯 **Wizard UX Improvements:**

**Promotie Wizard - Step 3 (Color Mapping) VERBETERINGEN:**

1. **Auto-suggest met confidence badges:**
```tsx
<ColorMappingRow>
  <SupplierColor>Navy</SupplierColor>
  <AutoSuggestion confidence={1.00}>
    🟢 Donkerblauw (gebruikt 12x eerder)
  </AutoSuggestion>
  <FuzzySuggestion confidence={0.85}>
    🟡 Marine (85% match, gebruikt 3x)
  </FuzzySuggestion>
</ColorMappingRow>
```

2. **Bulk actions:**
```tsx
<Button onClick={acceptAllSuggestions}>
  ✅ Accepteer alle suggesties ({autoMatchedCount}/{totalColors})
</Button>
```

3. **Consistency warnings:**
```tsx
<Alert variant="warning">
  ⚠️ "Navy" werd eerder 10x gemapt als "Donkerblauw", 
  maar je selecteert nu "Blauw". Weet je dit zeker?
</Alert>
```

**Promotie Wizard - Step 4 (Size Mapping) VERBETERINGEN:**

1. **Supplier pattern detection:**
```tsx
<Alert variant="info">
  ℹ️ TEE JAYS gebruikt numerieke maten (44-64).
  Auto-mapping toegepast: 46→S, 48→M, 50→L
</Alert>
```

2. **Template suggestion:**
```tsx
<Select>
  <option>Gebruik template: "TEE JAYS Numeric (44-64)"</option>
  <option>Gebruik template: "GILDAN Letter (XS-5XL)"</option>
  <option>Handmatig mappen</option>
</Select>
```

---

### Implementatie Strategie (Kleur/Maat Standardisatie)

#### **FASE 1: Database Foundation (HIGH PRIORITY)**
```sql
-- Create supplier_color_mappings table
-- Create supplier_size_mappings table
-- Add indexes on (supplier_id, supplier_color_name)
-- Add indexes on (supplier_id, supplier_size_code)
```

#### **FASE 2: Smart Auto-Mapping (HIGH PRIORITY)**
```typescript
// Update Step3ColorMapping.tsx:
// - Query supplier_color_mappings FIRST
// - Apply fuzzy matching SECOND
// - Fall back to global color_families THIRD
// - Show confidence badges in UI

// Update Step4SizeMapping.tsx:
// - Query supplier_size_mappings FIRST
// - Apply pattern detection (numeric vs letter)
// - Fall back to hardcoded dictionary THIRD
```

#### **FASE 3: Mapping Persistence (MEDIUM PRIORITY)**
```typescript
// After successful promotion:
// 1. Save all color_mappings to supplier_color_mappings
// 2. Save all size_mappings to supplier_size_mappings
// 3. Increment usage_count for existing mappings
// 4. Update last_used_at timestamp

// Edge function: promote-products → Save mappings
await saveMappingsToDatabase(supplier_id, color_mappings, size_mappings);
```

#### **FASE 4: Validation & Warnings (MEDIUM PRIORITY)**
```typescript
// In wizard:
// - Check consistency against historical mappings
// - Show warnings voor afwijkingen
// - Allow manual override met "I'm sure" checkbox
```

#### **FASE 5: Template Library (LOW PRIORITY)**
```typescript
// Promotion Templates:
// - Load template → pre-fill color/size mappings
// - Save new template → persist mappings
// - Template versioning (v1, v2, v3)
```

---

### Success Metrics (Kleur/Maat Standardisatie)

**Voor implementatie:**
- ⏱️ Tijd per promotie: **10 min** (veel handmatig mappen)
- 🎯 Auto-match rate: **30%** (alleen exact matches)
- ⚠️ Mapping fouten: **15%** (inconsistenties)
- 🔁 Hergebruik: **0%** (geen opslag)

**Na implementatie:**
- ⏱️ Tijd per promotie: **2 min** (auto-mapping + bulk accept)
- 🎯 Auto-match rate: **90%** (exact + fuzzy + patterns)
- ⚠️ Mapping fouten: **<5%** (consistency checks)
- 🔁 Hergebruik: **95%** (supplier_mappings tabel)

---

## 🚀 Aanbevolen Implementatie Strategie (Herzien)

### Fase 1: Etalage Functie (Minimale Promotie - GEEN BLOKKADES!)
```typescript
// Update promote-products edge function
const { error: variantError } = await supabase
  .from('product_variants')
  .insert({
    // ... existing fields ...
    
    // 💡 NIEUW: Pricing OPTIONEEL (NULL blijft NULL)
    cost_price: null,                      // ⭕ Optioneel - toekomstige pricing service
    selling_price_excl_vat: null,          // ⭕ Optioneel - "Prijs op aanvraag"
    vat_rate: 21,                          // ✅ Default NL BTW
    
    // 💡 NIEUW: Weight OPTIONEEL (NULL blijft NULL voor etalage)
    weight_grams: null,                    // ⭕ Optioneel - pas verplicht bij verkoop
  });

// ✅ BLIJFT: Images koppelen (HIGH PRIORITY voor etalage!)
if (product.supplier_image_urls && product.supplier_image_urls.length > 0) {
  const imageInserts = product.supplier_image_urls.map((url, index) => ({
    color_variant_id: colorVariant.id,
    media_type: 'image',
    media_url: url,
    is_primary: index === 0,
    sort_order: index,
    alt_text: `${styleMapping.style_name} - ${colorMapping.color_name_nl}`,
  }));
  
  await supabase.from('color_variant_media').insert(imageInserts);
}
```

### Fase 2: Pricing Service (Toekomstige Feature)
- Batch processing van producten zonder prijs
- Intelligente markup op basis van:
  - Category defaults
  - Brand positioning
  - Seizoen/promotie logica
  - Concurrentie analyse
- Manual override via Admin UI
- Realtime pricing updates

### Fase 3: Activeer voor Verkoop Flow
- Validatie: Prijs + Weight verplicht voor actieve verkoop
- Weight estimation helper (fabric weight, clothing type)
- Pricing suggestion (markup calculator)
- Verzendkosten calculator

### Fase 4: Raw Data Mining (Data Enrichment)
- Intelligente extractie uit `raw_data` JSONB
- Field mapping per supplier
- Material, care, customs info

---

## ✅ Herziene Success Criteria (💡 Met Etalage Functie)

**Na implementatie moet een gepromoveerd product:**
1. ✅ **Etalage-ready zijn** (EAN, images, beschrijving)
2. ✅ **GEEN verplichte pricing** ("Prijs op aanvraag" strategie)
3. ✅ **GEEN verplichte weight** (pas bij actieve verkoop)
4. ✅ **Minimale handmatige input** (alleen style name, color/size mapping)
5. ✅ **Maximale data uit supplier_products** (images, descriptions)

**Meetbaar:**
- Tijd per promotie: **van 10 min → 1 min** (geen pricing/weight input!)
- Promotie success rate: **van 50% → 99%** (geen blokkades)
- Data compleetheid (etalage): **van 30% → 75%** (zonder pricing/weight)
- Data compleetheid (actieve verkoop): **via Pricing Service → 95%**

**Twee-fasen model:**
- **Fase 1: Promotie (Etalage)** - Snel, geen blokkades, "Prijs op aanvraag"
- **Fase 2: Activeren (Verkoop)** - Pricing Service + Weight validation

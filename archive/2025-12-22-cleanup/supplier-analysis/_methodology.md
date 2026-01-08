# Supplier Analysis Methodology

## 🎯 Doel

Gestructureerde analyse van leveranciersbestanden om:
1. AI te trainen voor automatische product enrichment
2. Mapping patterns te detecteren tussen supplier data en PIM schema
3. Data quality te meten en export readiness te bepalen
4. Cross-supplier normalisatie te faciliteren

## 🔴 CRITICAL: Hiërarchie Levels

**BELANGRIJK:** Er is een fundamenteel verschil tussen modellen/stijlen en unieke productvarianten:

### Level Definities

**LEVEL 1: Style/Model Code (`supplier_style_code`)**
- ❌ **NIET UNIEK** - Geldt voor meerdere varianten
- ✅ Zonder kleur, zonder maat
- Voorbeelden:
  - Grisport ModelID: `18904` (120 unieke modellen voor 631 varianten)
  - Tee Jays TJ_Style_no: `TJ1000` (hergebruikt voor alle kleur+maat combinaties)
  - Jobman Product no: `65103530` (zonder kleur/maat suffix)
  - Santino Model: `Alex`, `Bari` (modelnaam, niet uniek)

**LEVEL 2: Variant-Specific Codes**
- `supplier_color_code`: Kleurcode (bijv. `9999`, `AAB`, `1341`)
- `supplier_size_code`: Maatcode (bijv. `3`, `L`, `44`)

**LEVEL 3: Supplier SKU (`supplier_sku`)**
- ✅ **UNIEK per variant** (kleur + maat combinatie)
- ❌ Mag NOOIT een style-level code zijn!
- Kan composite zijn (style-color-size) of volledig apart nummer
- Voorbeelden:
  - Grisport Product Code: `11.049.057.39` (uniek per maat, 631 unieke waarden)
  - Tee Jays CSV_Code: `TJ1000:BLACK:S` (composite met style+color+size)
  - Jobman: `65103530-9999-3` (style-color-size format)
  - Havep Modelnummer: `10072889AAB---L` (bevat maat, dus variant-level)

**LEVEL 4: EAN (`ean`)**
- ✅ **ALTIJD VERPLICHT** - 13-digit barcode
- ✅ **Context-afhankelijke uniekheid** (zie hieronder)
- Hoogste betrouwbaarheid voor product identificatie

## 🔴 CRITICAL: EAN Uniekheid Context

**BELANGRIJK:** EAN hoort bij een **MERK**, niet bij een leverancier!

### Inkoop vs Verkoop Verschil

**INKOOP-ZIJDE (`supplier_products`):**
- ✅ **Composite uniqueness:** `UNIQUE(supplier_id, ean)`
- ✅ Zelfde EAN mag bij **meerdere leveranciers** (verschillende merken)
- ❌ Duplicate EAN binnen **dezelfde leverancier** = ERROR
- **Voorbeeld:** Leverancier A en B voeren beide Nike EAN `8712345678901` → TOEGESTAAN

**VERKOOP-ZIJDE (`product_variants`):**
- ✅ **Global uniqueness:** `UNIQUE(ean)`
- ❌ Duplicate EAN wordt geblokkeerd (1 Master-product per EAN)
- ✅ `supplier_id` wordt irrelevant
- **Voorbeeld:** Master catalogus bevat EAN `8712345678901` maar 1x, ongeacht bron

### Import Validatie Strategie

Bij analyse van leveranciersbestanden:

**1. EAN Kwaliteitscheck:**
```
✅ CORRECT: EAN = 13 cijfers
✅ CORRECT: Uniek binnen leverancier (geen dubbele rijen)
✅ CORRECT: Geldig checksum (modulo 10)

❌ FOUT: EAN ontbreekt (verplicht!)
❌ FOUT: EAN < 13 of > 13 cijfers
❌ FOUT: EAN duplicate binnen leverancier bestand
❌ FOUT: Ongeldig checksum (data corruptie)
```

**2. Cross-Supplier Duplicate Detection:**
```sql
-- Bij import check: bestaat deze EAN al bij een andere leverancier?
SELECT supplier_id, supplier_brand_name, mapped_brand_id
FROM supplier_products
WHERE ean = '8712345678901'
  AND supplier_id != current_supplier_id;
```

**Waarschuwingen:**
- ⚠️ **Cross-supplier duplicate:** EAN bestaat al bij andere leverancier
- ℹ️ **Brand mismatch:** Verwacht merk X, maar leverancier voert merk Y
- ✅ **Promotie conflict:** EAN al in Master catalogus → conflict resolution nodig

**3. Promotie Conflict Handling:**

Wanneer een supplier product gepromoot wordt naar Master catalogus:

```typescript
// Scenario: EAN 8712345678901 bestaat al in product_variants
if (await eanExistsInMaster(ean)) {
  // CONFLICT RESOLUTION OPTIES:
  
  // Optie 1: Negeren (behoud bestaand Master product)
  skip_promotion = true;
  
  // Optie 2: Overschrijven (vervang met nieuwe leverancier data)
  update_product_variants = true;
  
  // Optie 3: Goedkoopste kiezen (update alleen prijs)
  if (new_price < existing_price) {
    update_only_pricing = true;
  }
}
```

**UI Feedback:**
- 🔴 **CRITICAL:** "EAN bestaat al in Master catalogus bij ander product"
- ⚠️ **WARNING:** "EAN bestaat al bij andere leverancier (Merk: Nike)"
- ℹ️ **INFO:** "Duplicate EAN gedetecteerd - conflict resolution vereist"

### ⚠️ Mapping Validatie

Bij analyse ALTIJD checken:

**1. Unieke waarden tellen:**
```
Als kolom evenveel unieke waarden heeft als totaal rows:
  → Variant-level (supplier_sku of EAN)

Als kolom veel minder unieke waarden heeft:
  → Style-level (supplier_style_code)
  
Vuistregel: style_code unieke waarden << 50% van totaal rows
```

**2. Pattern herkenning:**
```
Bevat de code een maat/size component?
  → supplier_sku (LEVEL 3)

Wordt de code hergebruikt voor verschillende maten/kleuren?
  → supplier_style_code (LEVEL 1)
```

**3. Cross-check formule:**
```
supplier_style_code unieke waarden × aantal kleuren × aantal maten ≈ totaal variants

Voorbeeld Grisport:
120 styles × ~25 colors × ~18 sizes ≈ 54,000 mogelijke combinaties
Maar slechts 631 actieve varianten (niet alle combinaties bestaan)
```

**4. Naam validatie:**
```
FOUT: Kolom "ModelID" met 631 unieke waarden gemapped als supplier_sku
  → ModelID = 120 unieke waarden → Dus supplier_style_code!

CORRECT: Kolom "Product Code" met 631 unieke waarden = supplier_sku
  → Matches totaal rows → Uniek per variant
```

## 📋 Analyse Proces

### Stap 1: Kolom Inventaris

Voor elke kolom in het leveranciersbestand:

```typescript
interface ColumnAnalysis {
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'url' | 'html';
  fillRate: number;           // % rows met waarde
  uniqueValues: number;        // Aantal unieke waarden
  sampleValues: string[];      // 5 representatieve voorbeelden
  suggestedPimField: string;   // Mapping naar PIM schema
  confidence: number;          // 0-100 confidence score
}
```

**Heuristics voor PIM Field Mapping:**
- EAN: Kolommen met "EAN", "Ean", "ean" in naam + 13 digits
- SKU: "Product Code", "Artikelcode", "Art. number"
- Price: "Price", "Prijs", bevat currency symbolen
- Size: "Size", "Maat", bevat XS/S/M/L/XL patronen
- Color: "Colour", "Kleur", "Color"
- Brand: "Brand", "Merk"
- Description: "Description", "Omschrijving", HTML tags

### Stap 2: Sample Selection (200 rows)

**Strategie:**

#### A. High Quality Samples (100 rows)
```sql
SELECT * FROM staging
WHERE 
  ean IS NOT NULL 
  AND price IS NOT NULL
  AND product_name IS NOT NULL
  AND brand IS NOT NULL
ORDER BY 
  (CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN color IS NOT NULL THEN 1 ELSE 0 END) DESC
LIMIT 100
```

**Criteria:**
- Alle P0 fields aanwezig (EAN, SKU, name, price, brand)
- Bij voorkeur ook P1 fields (description, image, material)
- Geen data quality issues (bijv. geen "N/A", geen invalid formats)

#### B. Diverse Samples (75 rows)
```sql
-- Stratificatie op:
SELECT DISTINCT ON (category, color_family, size_range)
  *
FROM staging
WHERE ean IS NOT NULL
LIMIT 75
```

**Diversiteit dimensies:**
- Product categorieën (shirts, broeken, schoenen, accessoires)
- Kleurfamilies (zwart, blauw, rood, grijs, etc.)
- Size ranges (XS-XL, 39-48, S-XXL)
- Price segments (budget, mid-range, premium)
- Merken (als multi-brand leverancier)

#### C. Edge Cases (25 rows)
```sql
SELECT * FROM staging
WHERE 
  price IS NULL OR
  description IS NULL OR
  LENGTH(product_name) < 10 OR
  ean !~ '^\d{13}$'
ORDER BY RANDOM()
LIMIT 25
```

**Edge case types:**
- Missing critical fields (price, description)
- Unusual formats (12-digit EAN, non-standard sizes)
- HTML/special characters in naam
- Very long product names (>100 chars)
- Duplicate EANs
- Invalid color codes

### Stap 3: Pattern Detection

Voor elk veld type detecteren we regex patterns:

#### EAN Patterns
```regex
# Standard 13-digit
^\d{13}$

# With leading zeros that might be stripped
^0+\d{12,13}$

# Formatted with dashes
^\d{1,3}-\d{4,5}-\d{4,5}$
```

#### SKU/Artikelcode Patterns
```regex
# Havep format: 10072889AAB---L
^\d{8}[A-Z]{3}---[SMLX0-9]+$

# Grisport format: 11.049.057.39
^\d{2}\.\d{3}\.\d{3}\.\d{2}$

# Craft format: 1905560-1341-3
^\d{7}-\d{4}-\d$
```

#### Price Patterns
```regex
# Euro met symbool
€\s*\d+[.,]\d{2}

# Zonder symbool
\d+[.,]\d{2}

# Met duizendtal scheidingsteken
\d{1,3}[.,]\d{3}[.,]\d{2}
```

#### Size Patterns
```regex
# Letter sizes
^(XXS|XS|S|M|L|XL|XXL|3XL|4XL|5XL)$

# Numeric sizes (schoenen)
^(3[0-9]|4[0-9]|5[0-0])$

# Combined
^(S-XXL|XS-3XL|39-48)$
```

#### Color Code Patterns
```regex
# Numeric
^\d{3,4}$

# Alphanumeric
^[A-Z]{2,4}$

# Mixed
^\d{4}-\d{4}$
```

### Stap 4: Export Readiness Check

**P0 Critical Fields Matrix:**

| Export Target | Required P0 Fields | Validation Rules |
|---------------|-------------------|------------------|
| **Gripp ERP** | EAN, SKU, name, price, brand | EAN = 13 digits, price > 0 |
| **Shopify** | SKU, title, price, variant | SKU unique, price formatted |
| **Calculated KMS** | artikelnummer, omschrijving, kleuren[], maten[], prijs | Arrays non-empty |

**Scoring:**
```typescript
interface ExportReadiness {
  gripp: {
    score: number;  // 0-100
    missingFields: string[];
    blockingIssues: string[];
  };
  shopify: {
    score: number;
    missingFields: string[];
    blockingIssues: string[];
  };
  calculated: {
    score: number;
    missingFields: string[];
    blockingIssues: string[];
  };
}
```

**Formule:**
```
score = (aanwezigeP0Fields / totaalP0Fields) * 100
- 5 punten per validation error
- 10 punten per blocking issue
```

### Stap 5: AI Training Sample Format

**Output JSON structure:**

```json
{
  "supplier_id": 123,
  "brand_id": 45,
  "sample_date": "2025-01-05",
  "sample_strategy": "high_quality",
  "samples": [
    {
      "row_number": 1,
      "raw_data": {
        "EAN": "8718641275474",
        "Modelnummer": "10072889AAB---L",
        "Artikelomschrijving": "T-shirt HAVEP® Tricot",
        "Maat": "L",
        "Kleur omschrijving": "charcoal/rood"
      },
      "extracted_features": {
        "has_ean": true,
        "has_valid_price": true,
        "has_size": true,
        "has_color": true,
        "has_brand": true,
        "has_description": true,
        "has_image": false
      },
      "suggested_mappings": {
        "style_code": "10072889",
        "color_code": "AAB",
        "size_code": "L",
        "style_name": "T-shirt HAVEP® Tricot",
        "confidence": 0.95
      },
      "export_readiness": {
        "gripp": 100,
        "shopify": 90,
        "calculated": 100
      }
    }
  ]
}
```

## 🔄 Validation Rules

### Data Quality Checks
1. **EAN Validation** - Luhn checksum algorithm
2. **Price Validation** - Must be > 0, reasonable range (€0.50 - €500)
3. **Size Validation** - Must match known size standards (EN 13402)
4. **Color Validation** - Must be mappable to standard color families
5. **Uniqueness** - EAN + Size + Color moet uniek zijn per style

### Normalisatie Rules
1. **Kleurnamen** - Map naar GS1 color library (71 colors)
2. **Maten** - Normaliseer naar international_sizes table
3. **Prijzen** - Convert naar integer cents (avoid floating point)
4. **Merknamen** - Exact match met brands table (case-insensitive)
5. **Categorieen** - Map naar category_taxonomies

## 📊 Success Metrics

**Per Leverancier:**
- ✅ **Sample Coverage** - Minimaal 200 rows, maximaal diversiteit
- ✅ **P0 Completeness** - Gemiddeld >90% voor export readiness
- ✅ **Pattern Detection** - >85% auto-match rate voor EAN, SKU, price
- ✅ **Normalization Rate** - >80% kleuren en maten mappable naar stamdata

**Overall Corpus:**
- ✅ **Total Samples** - Target: 200 × aantal leveranciers
- ✅ **Category Coverage** - Alle major categories vertegenwoordigd
- ✅ **Edge Case Coverage** - Minimaal 10% edge cases voor robust training
- ✅ **Multi-brand Coverage** - Als applicable per leverancier

## 🛠️ Tools & Scripts

**SQL Query Templates:**
- `sample_selection_high_quality.sql`
- `sample_selection_diverse.sql`
- `sample_selection_edge_cases.sql`
- `pattern_detection.sql`
- `export_readiness_check.sql`

**TypeScript Functions:**
- `analyzeLeverancier(file: File): Promise<AnalysisResult>`
- `detectPatterns(samples: Row[]): PatternLibrary`
- `calculateExportReadiness(sample: Row): ExportReadiness`
- `generateTrainingSamples(samples: Row[]): TrainingSample[]`

---

**Version:** 1.0  
**Laatst bijgewerkt:** 2025-01-05

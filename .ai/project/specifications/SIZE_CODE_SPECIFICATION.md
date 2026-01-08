# Size Code Specificatie - Kleding Maatvoering

> **Status:** 🟡 TER REVIEW DOOR BA + ARCHITECT  
> **Locatie:** `.ai/project/specifications/`  
> **Versie:** 1.0  
> **Datum:** December 20, 2025  
> **Gerelateerd:** [DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md](../DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md)

---

## 📍 Documentatie Locatie

**Waar te vinden:**

- Specificaties in `.ai/project/specifications/`
- Code documentatie in JSDoc van de functies
- API documentatie via Fastify `/docs` endpoint (Swagger UI)

## Ubiquitous Language

Dit conversieproces werkt op **SupplierProducts** (`supplier_data_staging`) data:

- **Input**: `size_raw` veld (ruwe maat zoals leverancier aanlevert)
- **Input Context**: `category_mapped`, `gender`, `product_description` uit master product
- **Output**: `size_code` veld (gestandaardiseerde size code via `size_lookup`)
- **Doel**: Conversie voor promotie naar **Assortiment** (`product_variant`)

---

## Probleemstelling

### Uitdaging 1: Verschillende Kledingtypes = Verschillende Maatvoeringen

**Probleem:**

- Broekmaat (32, 34, 36) ≠ Jasmaat (S, M, L) ≠ Hemdmaat (38, 40, 42) ≠ Schoenmaat (42, 43, 44)
- Dezelfde numerieke waarde (bijv. "42") betekent iets anders per kledingtype
- Conversie kan niet eenvoudig plaatsvinden zonder context

**Impact:**

- Maat 42 kan betekenen: Schoen, Hemd, of Jas → Totaal verschillende afmetingen
- Kan leiden tot verkeerde variant matching
- Variant "XL" past niet bij schoenmaat "44"

### Uitdaging 2: Leverancier Format Variatie

**Bronnen van Variatie:**

- **EU Maten:** 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64
- **US Maten:** XS, S, M, L, XL, XXL, XXXL, 4XL, 5XL
- **UK Maten:** 6, 8, 10, 12, 14, 16, 18, 20
- **Schoenmaten:** 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46
- **BH Maten:** 75C, 80B, 85D, etc. (cup + band)
- **Eigen Codes:** "S-small", "M-medium", "SIZE01", etc.

**Probleem:**

- Geen gestandaardiseerd format
- Leverancier A gebruikt US (S, M, L), Leverancier B gebruikt EU (38, 40, 42)
- Conversie moet per format en kledingtype gebeuren
- Vallen terug op original size_raw als conversie niet mogelijk

### Uitdaging 3: Kledingtype Onbekend bij Import

**Timing Issue:**

- Tijdens RAW → STAGING conversie is kledingtype soms nog niet bekend
- Product moet eerst naar `product_master` worden gemapped
- Pas dan kan category → size_type relatie worden bepaald
- Maakt directe conversie moeilijk

**Handvatten die beschikbaar zijn:**

- `category_raw` (van leverancier, niet altijd accurate)
- `product_description` (bevat soms hints: "Blauwe jeans maat 32", "Sneakers maat 44")
- `gender` (Man, Vrouw, Kind, Unisex)
- `product_group_raw` (leverancier's eigen categorie)

### Uitdaging 4: Internationale Maatvoering

**Ideaal:** Één internationale standaard
**Realiteit:** Verschillende systemen per regio en kledingtype

- EU standaard: 34, 36, 38, 40, 42, 44, 46, 48
- US standaard: XS, S, M, L, XL, XXL
- UK standaard: 6, 8, 10, 12, 14, 16, 18
- IT standaard: 36, 38, 40, 42, 44, 46, 48, 50
- Conversie tussen systemen: Complex en niet altijd 1-op-1

---

## Huidige Situatie

### Database Schema

**Huidige Size Lookup Tabel:**

```sql
CREATE TABLE size_lookup (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,           -- "XS", "S", "M", "38", "42", "C44"
    name_nl VARCHAR(100),                       -- "Extra Small", "Klein", "38"
    name_en VARCHAR(100),
    description TEXT,
    size_type VARCHAR(50),                      -- "shirt", "pant", "shoe", "bra"
    gender VARCHAR(50),                         -- "male", "female", "unisex", "kid"
    numeric_value DECIMAL(5, 2),                -- Voor numerieke maten
    category_ids UUID[],                        -- Geldige categorieën voor deze size
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Huidige Data:**

- Algemene maten: XS, S, M, L, XL, XXL, XXXL, 4XL, 5XL
- Numerieke maten: 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64
- Cup maten: C44, C46, C48, C50, C52, C54, D44, D46, D48, D50, D52, D54

**Limitaties:**

- Geen expliciete size_type onderscheiding
- Geen internationale codes (US, UK, IT)
- Geen conversie tabel tussen systemen
- Geen kledingtype-specifieke regels
- Geslacht niet altijd gekoppeld

---

## Aanbevolen Aanpak: Contextuele Size Matching

### Strategie Overzicht

Bij promotie van artikel naar product_variant:

1. **Gather Context** - Verzamel alle beschikbare informatie
2. **Determine Size Type** - Bepaal welk size-type van toepassing is
3. **Match Size Code** - Vind juiste size code uit lookup
4. **Validate** - Controleer of size_code geldig voor deze category
5. **Store** - Sla size_code op in product_variant

### Stap 1: Context Gathering

**Input Data:**

```typescript
interface SizeConversionContext {
  size_raw: string; // "38", "S", "M", "44", "XL"
  category_mapped: string; // "Overhemden", "Jeans", "Sneakers", "BH"
  gender: "male" | "female" | "kid" | "unisex" | null;
  product_description: string; // "Blauwe jeans maat 32"
  product_group_raw?: string; // "Kleding", "Footwear"
  size_type_hint?: string; // "Explicit size_type hint"
}
```

### Stap 2: Size Type Determination

**Mapping: Category → Size Type**

```typescript
// Bij promotie bepalen we de size_type via category
const categorySizeTypeMapping = {
  // KLEDING
  Overhemden: "shirt",
  Hemden: "shirt",
  Blouses: "shirt",
  "T-shirts": "shirt",

  Jeans: "pant",
  Broeken: "pant",
  Shorts: "pant",
  Leggings: "pant",
  Yogabroeken: "pant",

  Truien: "shirt",
  Pullovers: "shirt",
  Vesten: "shirt",

  Jurken: "dress",
  "Ronde jurken": "dress",
  "Maxi jurken": "dress",

  // SCHOEISEL
  Sneakers: "shoe",
  Sportschoenen: "shoe",
  Laarzen: "shoe",
  Pumps: "shoe",
  Sandalen: "shoe",

  // ONDERGOED
  BH: "bra",
  Onderbroekjes: "underwear",
  Boxershorts: "underwear",

  // ACCESSOIRES
  Hoedjes: "hat",
  Mutsen: "hat",
  Handschoenen: "glove",
  Sjaal: "scarf",

  // OVERIG
  Badzorg: "swimwear",
  Badpakken: "swimwear",
  Bikini: "swimwear",
};

function determineSizeType(category: string): string | null {
  return categorySizeTypeMapping[category] || null;
}
```

**Fallback Strategie:**

- Als category niet bekend: Parse size_raw voor hints ("44" = likely shoe, "S" = likely shirt/dress)
- Als product_description bevat "schoenen" → shoe
- Als product_description bevat "jeans" → pant
- Fallback: "generic" (kan later worden verfijnd)

### Stap 3: Size Code Matching

**Proces:**

```typescript
interface SizeMatch {
  size_code: string;
  size_type: string;
  confidence: number; // 0.0 - 1.0
  formatted_name: string; // "Small", "38", "44"
  numeric_value?: number;
}

async function matchSizeCode(
  sizeRaw: string,
  sizeType: string,
  gender?: string
): Promise<SizeMatch | null> {
  /**
   * Match size_raw naar size_code uit lookup
   *
   * Stappen:
   * 1. Exact match op code (bijv. "S" → "S")
   * 2. Partial match via description
   * 3. Numeric conversion (EU 38 → US S)
   * 4. Fallback: Opslaan original size_raw
   */

  // Stap 1: Exact Match
  let match = await exactMatch(sizeRaw, sizeType, gender);
  if (match) {
    return { ...match, confidence: 1.0 };
  }

  // Stap 2: Partial Match
  match = await partialMatch(sizeRaw, sizeType, gender);
  if (match) {
    return { ...match, confidence: 0.8 };
  }

  // Stap 3: Numeric Conversion
  match = await numericConversion(sizeRaw, sizeType, gender);
  if (match) {
    return { ...match, confidence: 0.6 };
  }

  // Stap 4: Fallback
  return {
    size_code: sizeRaw,
    size_type: sizeType,
    confidence: 0.3,
    formatted_name: sizeRaw,
  };
}
```

### Stap 3a: Exact Match

```typescript
async function exactMatch(
  sizeRaw: string,
  sizeType: string,
  gender?: string
): Promise<SizeMatch | null> {
  /**
   * Probeer exacte match
   * Queries: size_lookup WHERE code = sizeRaw AND size_type = sizeType
   */
  const query = `
        SELECT code, name_nl, numeric_value, size_type
        FROM size_lookup
        WHERE code = $1
          AND size_type = $2
          AND (gender IS NULL OR gender = $3 OR gender = 'unisex')
        LIMIT 1
    `;

  const result = await db.query(query, [sizeRaw, sizeType, gender]);

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      size_code: row.code,
      size_type: row.size_type,
      formatted_name: row.name_nl,
      numeric_value: row.numeric_value,
      confidence: 1.0,
    };
  }

  return null;
}
```

**Voorbeeld:**

```
Input: size_raw = "S", size_type = "shirt", gender = "female"
Query Result:
  - code: "S"
  - name_nl: "Klein"
  - numeric_value: null
  - size_type: "shirt"
Output: { size_code: "S", confidence: 1.0 }
```

### Stap 3b: Partial Match

```typescript
async function partialMatch(
  sizeRaw: string,
  sizeType: string,
  gender?: string
): Promise<SizeMatch | null> {
  /**
   * Probeer partial match via name_nl/name_en
   */
  const searchTerm = sizeRaw.toLowerCase();

  const query = `
        SELECT code, name_nl, numeric_value, size_type
        FROM size_lookup
        WHERE (LOWER(name_nl) LIKE $1 OR LOWER(name_en) LIKE $1)
          AND size_type = $2
          AND (gender IS NULL OR gender = $3 OR gender = 'unisex')
        LIMIT 1
    `;

  const result = await db.query(query, [`%${searchTerm}%`, sizeType, gender]);

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      size_code: row.code,
      size_type: row.size_type,
      formatted_name: row.name_nl,
      numeric_value: row.numeric_value,
      confidence: 0.8,
    };
  }

  return null;
}
```

**Voorbeeld:**

```
Input: size_raw = "Small", size_type = "shirt"
Query Result:
  - name_nl: "Klein" (contains "small")
  - code: "S"
Output: { size_code: "S", confidence: 0.8 }
```

### Stap 3c: Numeric Conversion

**Conversion Tables:**

```typescript
// EU (38-64) ↔ US (XS-5XL)
const euToUsMapping = {
  "34": "XS",
  "36": "XS",
  "38": "S",
  "40": "M",
  "42": "L",
  "44": "XL",
  "46": "XXL",
  "48": "XXXL",
  "50": "4XL",
  "52": "5XL",
};

// UK (6-20) ↔ EU (34-52)
const ukToEuMapping = {
  "6": "34",
  "8": "36",
  "10": "38",
  "12": "40",
  "14": "42",
  "16": "44",
  "18": "46",
  "20": "48",
};

async function numericConversion(
  sizeRaw: string,
  sizeType: string,
  gender?: string
): Promise<SizeMatch | null> {
  /**
   * Probeer numeric conversie tussen systemen
   *
   * Logica:
   * 1. Herken input formaat (EU, US, UK, etc.)
   * 2. Converteer naar target formaat
   * 3. Match in size_lookup
   */

  let targetSize = sizeRaw;

  // Stap 1: Herken EU (38-64)
  if (/^(34|36|38|40|42|44|46|48|50|52|54|56|58|60|62|64)$/.test(sizeRaw)) {
    // EU formaat: probeer conversie naar US
    const usSize = euToUsMapping[sizeRaw];
    if (usSize) {
      targetSize = usSize;
    }
  }

  // Stap 2: Herken UK (6-20)
  else if (
    /^\d+$/.test(sizeRaw) &&
    parseInt(sizeRaw) >= 6 &&
    parseInt(sizeRaw) <= 20
  ) {
    // UK formaat: probeer conversie
    const euSize = ukToEuMapping[sizeRaw];
    if (euSize) {
      targetSize = euSize;
    }
  }

  // Stap 3: Query lookup met geconverteerde size
  const query = `
        SELECT code, name_nl, numeric_value, size_type
        FROM size_lookup
        WHERE code = $1
          AND size_type = $2
          AND (gender IS NULL OR gender = $3 OR gender = 'unisex')
        LIMIT 1
    `;

  const result = await db.query(query, [targetSize, sizeType, gender]);

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      size_code: row.code,
      size_type: row.size_type,
      formatted_name: row.name_nl,
      numeric_value: row.numeric_value,
      confidence: 0.6,
    };
  }

  return null;
}
```

**Voorbeelden:**

```
Input: size_raw = "42", size_type = "shirt"
Process: 42 (EU) → L (US)
Output: { size_code: "L", confidence: 0.6 }

Input: size_raw = "14", size_type = "dress"
Process: 14 (UK) → 42 (EU) → L (US)
Output: { size_code: "L", confidence: 0.6 }
```

### Stap 4: Validatie tegen Category

```typescript
async function validateSizeForCategory(
  sizeCode: string,
  categoryId: string
): Promise<boolean> {
  /**
   * Controleer of size_code geldig is voor deze category
   *
   * Query: size_lookup WHERE code = sizeCode AND categories[] contains categoryId
   */
  const query = `
        SELECT 1
        FROM size_lookup
        WHERE code = $1
          AND $2 = ANY(category_ids)
        LIMIT 1
    `;

  const result = await db.query(query, [sizeCode, categoryId]);
  return result.rows.length > 0;
}
```

**Logica:**

- Size "44" mag niet gebruikt worden voor "Overhemden"
- Size "XL" mag niet gebruikt worden voor "Schoenen"
- Bij validatie falen → Fallback of Manual Review

### Stap 5: Master-Level Constraint

**Regel:** Alle varianten van een product_master moeten hetzelfde size_type gebruiken

```typescript
async function validateMasterSizeType(
  productMasterId: string,
  proposedSizeType: string
): Promise<{ valid: boolean; reason?: string }> {
  /**
   * Controleer of alle varianten van master hetzelfde size_type hebben
   */
  const query = `
        SELECT DISTINCT size_type
        FROM product_variant
        WHERE product_master_id = $1
          AND size_type IS NOT NULL
    `;

  const result = await db.query(query, [productMasterId]);

  if (result.rows.length === 0) {
    // Geen bestaande varianten: OK
    return { valid: true };
  }

  const existingType = result.rows[0].size_type;

  if (existingType !== proposedSizeType) {
    return {
      valid: false,
      reason: `Master has existing size_type '${existingType}', cannot add '${proposedSizeType}'`,
    };
  }

  return { valid: true };
}
```

---

## Implementatie Locaties

### 1. Size Converter Utility

**Locatie:** `backend/src/utils/size-converter.ts` (nieuw)

**Functies:**

- `determineSizeType()` - Bepaal size_type uit category
- `matchSizeCode()` - Match size_raw naar size_code
- `exactMatch()` - Exact match in lookup
- `partialMatch()` - Partial match via descriptions
- `numericConversion()` - Numeric system conversie
- `validateSizeForCategory()` - Valideer size voor category
- `validateMasterSizeType()` - Valideer master consistency

### 2. Size Lookup Tabel

**Locatie:** `backend/src/utils/size-lookup.ts` (update)

**Structuur:**

```sql
CREATE TABLE size_lookup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_nl VARCHAR(100),
    name_en VARCHAR(100),
    description TEXT,
    size_type VARCHAR(50) NOT NULL,           -- shirt, pant, shoe, bra, etc.
    gender VARCHAR(50),                       -- male, female, kid, unisex
    numeric_value DECIMAL(5, 2),              -- Voor verordening/conversie
    eu_size VARCHAR(50),                      -- EU equivalent
    us_size VARCHAR(50),                      -- US equivalent
    uk_size VARCHAR(50),                      -- UK equivalent
    category_ids UUID[],                      -- Geldige categorieën
    ordering INT,                             -- Voor sortering
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index voor snelle lookup
CREATE INDEX idx_size_lookup_code_type ON size_lookup(code, size_type);
CREATE INDEX idx_size_lookup_categories ON size_lookup USING GIN(category_ids);
```

### 3. Category-Size Type Mapping

**Locatie:** `backend/src/data/category-size-mapping.ts` (nieuw)

**Definitie:**

```typescript
export const categorySizeTypeMapping = {
  // Hematocriet naar size_type
  Overhemden: "shirt",
  Hemden: "shirt",
  // ... etc
};

export const sizeTypeCharacteristics = {
  shirt: {
    defaultSizes: ["XS", "S", "M", "L", "XL", "XXL"],
    description: "Kleding bovenlijf (hemden, blouses, t-shirts)",
  },
  pant: {
    defaultSizes: ["24", "25", "26", "27", "28", "29", "30", "32", "34", "36"],
    description: "Broeken (jeans, chino)",
  },
  shoe: {
    defaultSizes: [
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
      "46",
    ],
    description: "Schoenen",
  },
};
```

### 4. Integratie in Promotion Proces

**Locatie:** `backend/src/routes/promotion.ts` (update)

**Waar aangeroepen:**

- Bij `promoteProductVariant()` - Conversie size_raw → size_code
- Validatie tegen master size_type
- Opslaan size_code in product_variant

---

## Database Wijzigingen

### Migratie 1: Expand size_lookup Tabel

```sql
-- Voeg velden toe voor internationalisatie
ALTER TABLE size_lookup
  ADD COLUMN IF NOT EXISTS eu_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS us_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS uk_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ordering INT DEFAULT 0;

-- Voeg index toe voor performance
CREATE INDEX IF NOT EXISTS idx_size_lookup_code_type
  ON size_lookup(code, size_type);

CREATE INDEX IF NOT EXISTS idx_size_lookup_categories
  ON size_lookup USING GIN(category_ids);

-- Update bestaande records met size_type
UPDATE size_lookup SET size_type = 'generic' WHERE size_type IS NULL;
ALTER TABLE size_lookup ALTER COLUMN size_type SET NOT NULL;
```

### Migratie 2: Add size_code to supplier_data_staging

```sql
-- Voeg size_code toe aan staging tabel
ALTER TABLE supplier_data_staging
  ADD COLUMN IF NOT EXISTS size_code VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS size_type VARCHAR(50) NULL;

-- Index voor filtering
CREATE INDEX IF NOT EXISTS idx_staging_size_code
  ON supplier_data_staging(size_code);

COMMENT ON COLUMN supplier_data_staging.size_code IS
  'Gestandaardiseerde size code gegenereerd uit size_raw';
```

### Migratie 3: Add size_type to product_variant

```sql
-- Voeg size_type toe aan product_variant (voor consistency check)
ALTER TABLE product_variant
  ADD COLUMN IF NOT EXISTS size_type VARCHAR(50) NULL;

COMMENT ON COLUMN product_variant.size_type IS
  'Size type van deze variant (shirt, pant, shoe, etc)';
```

---

## Conversie Voorbeelden

### Voorbeeld 1: Eenvoudige Shirt Maat

```
Input:
  - size_raw: "S"
  - category: "Hemden"
  - gender: "male"

Process:
  1. Determine size_type: "Hemden" → "shirt"
  2. Match size_code: Exact match "S" in lookup
  3. Validate: Size "S" is valid for "Hemden"
  4. Check master: Alle varianten in master zijn "shirt"

Output:
  - size_code: "S"
  - confidence: 1.0
```

### Voorbeeld 2: EU naar US Conversie

```
Input:
  - size_raw: "42"
  - category: "Overhemden"
  - gender: "female"

Process:
  1. Determine size_type: "Overhemden" → "shirt"
  2. Match size_code: Exact match "42" fails
  3. Numeric conversion: 42 (EU) → L (US)
  4. Validate: Size "L" is valid for "Overhemden"
  5. Check master: OK

Output:
  - size_code: "L"
  - confidence: 0.6
```

### Voorbeeld 3: Schoen Maat

```
Input:
  - size_raw: "44"
  - category: "Sneakers"
  - gender: "male"

Process:
  1. Determine size_type: "Sneakers" → "shoe"
  2. Match size_code: Exact match "44" in shoe lookup
  3. Validate: Size "44" is valid for "Sneakers"
  4. Check master: All variants are "shoe"

Output:
  - size_code: "44"
  - confidence: 1.0
```

### Voorbeeld 4: Conflict Detection

```
Input:
  - size_raw: "XL"
  - category: "Sneakers"
  - gender: "unisex"
  - Master has existing variants with size_type: "shoe"

Process:
  1. Determine size_type: "Sneakers" → "shoe"
  2. Match size_code: Exact match "XL" fails (XL is shirt, not shoe)
  3. Validate: Size "XL" is NOT valid for "Sneakers"
  4. Fallback: Use original size_raw "XL" (low confidence)

Output:
  - size_code: "XL"
  - confidence: 0.3
  - Warning: "Size type mismatch for category Sneakers"
```

---

## Error Handling

### Geen Match Gevonden

```typescript
// Als geen size kan worden gematcht
const sizeCode = sizeRaw; // Fallback to original
const confidence = 0.3;
const error = "Could not convert size";
```

### Type Mismatch

```typescript
// Als size_type niet past bij category
const error = "Size type 'shirt' not valid for category 'Sneakers'";
const fallback = sizeRaw; // Opslaan als-is
const flagForReview = true;
```

### Master Conflict

```typescript
// Als size_type niet overeenkomt met bestaande master variants
const error = "Master has variants with size_type 'shoe', cannot add 'shirt'";
const action = "Reject variant OR create new master";
```

---

## Validatie

### Pre-Conversie Validatie

```typescript
function validateSizeRaw(sizeRaw: string): {
  isValid: boolean;
  error?: string;
} {
  if (!sizeRaw || !sizeRaw.trim()) {
    return { isValid: false, error: "Size raw is leeg" };
  }

  if (sizeRaw.length > 50) {
    return { isValid: false, error: "Size raw te lang (max 50 karakters)" };
  }

  return { isValid: true };
}
```

### Post-Conversie Validatie

```typescript
async function validateSizeCode(
  sizeCode: string,
  sizeType: string,
  categoryId: string
): Promise<{ isValid: boolean; error?: string }> {
  // Controleer of size_code geldig is voor category
  const isValid = await validateSizeForCategory(sizeCode, categoryId);

  if (!isValid) {
    return {
      isValid: false,
      error: `Size code '${sizeCode}' not valid for category`,
    };
  }

  return { isValid: true };
}
```

---

## Confidence Scoring

```typescript
function calculateConfidence(
  sizeRaw: string,
  sizeCode: string,
  matchType: "exact" | "partial" | "numeric" | "fallback"
): number {
  const scores = {
    exact: 1.0,
    partial: 0.8,
    numeric: 0.6,
    fallback: 0.3,
  };

  return scores[matchType];
}
```

---

## Size Type Regels per Categorie

```typescript
const categoryToSizeType = {
  // KLEDING - BOVENLIJF
  Overhemden: "shirt",
  Hemden: "shirt",
  Blouses: "shirt",
  "T-shirts": "shirt",
  Truien: "shirt",
  Pullovers: "shirt",
  Vesten: "shirt",
  Jacks: "jacket",

  // KLEDING - ONDERLIJF
  Jeans: "pant",
  Broeken: "pant",
  Shorts: "pant",
  Leggings: "pant",

  // KLEDING - FULL BODY
  Jurken: "dress",
  Kostuums: "suit",

  // SCHOEISEL
  Sneakers: "shoe",
  Sportschoenen: "shoe",
  Laarzen: "shoe",
  Pumps: "shoe",
  Sandalen: "shoe",
  Sloffen: "shoe",

  // ONDERGOED
  BH: "bra",
  Onderbroekjes: "underwear",
  Boxershorts: "underwear",
  Beha: "bra",

  // ACCESSOIRES
  Hoedjes: "hat",
  Mutsen: "hat",
  Handschoenen: "glove",
  Sjaal: "scarf",

  // ZWEM
  Badpakken: "swimwear",
  Bikini: "swimwear",
  Zwemshorts: "swimwear",
};
```

---

## Integratie in Promotion Flow

### Huidige Flow

```
supplier_data_staging
    ↓
Validatie size_raw
    ↓
Mapping naar product_variant
    ↓
product_variant.size_code (direct copy van size_raw)
```

### Nieuwe Flow

```
supplier_data_staging (size_raw)
    ↓
Load context (category, gender, master)
    ↓
Determine size_type
    ↓
Match size_code (exact → partial → numeric → fallback)
    ↓
Validate gegen category & master
    ↓
Store size_code + size_type in product_variant
```

---

## Test Strategie

### Unit Tests

**Locatie:** `backend/tests/utils/size-converter.test.ts` (nieuw)

**Test Cases:**

- Exact match conversie (S → S)
- Numeric conversie (42 EU → L US)
- UK naar EU conversie (14 → 42)
- Size validation tegen category
- Master size_type consistency check
- Fallback handling
- Confidence scoring

### Integration Tests

**Locatie:** `backend/tests/routes/promotion-size.test.ts` (nieuw)

**Test Cases:**

- End-to-end conversie RAW → size_code
- Multiple products met verschillende size_types
- Master conflict detection
- Category validation

---

## Monitoring & Logging

```typescript
import { logger } from "../utils/logger";

async function convertSizeRawToCode(
  sizeRaw: string,
  category: string,
  gender?: string
) {
  logger.info(`Converting size_raw: ${sizeRaw} for category: ${category}`);

  const match = await matchSizeCode(sizeRaw, sizeType, gender);

  if (match.confidence < 0.8) {
    logger.warn(
      `Low confidence size conversion: ${sizeRaw} → ${match.size_code} (confidence: ${match.confidence})`
    );
  }

  if (!match) {
    logger.error(
      `Failed to convert size_raw: ${sizeRaw} for category: ${category}`
    );
  }
}
```

---

## Roadmap

### Fase 1: Basis Size Matching (Nu) ✅

- ✅ Size lookup tabel uitbreiden
- ✅ Exact & numeric matching
- ✅ Category → size_type mapping
- ✅ Size validation tegen category

### Fase 2: Conversie & Validatie (Volgende)

- 📋 Master size_type consistency enforcement
- 📋 Numeric conversie (EU ↔ US ↔ UK)
- 📋 Confidence scoring
- 📋 Manual review queue voor low-confidence conversies

### Fase 3: Advanced Features (Toekomst)

- 🔮 Machine learning voor pattern recognition
- 🔮 Fuzzy matching voor maat beschrijvingen
- 🔮 Per-leverancier size mapping configuratie
- 🔮 Automatische learning van nieuwe size formaten
- 🔮 Size chart normalisatie per product_type

---

## Best Practices

### 1. Context is Alles

- Altijd category + gender combineren voor match
- Fallback naar original size_raw bij twijfel
- Log all conversions voor audit trail

### 2. Consistency Enforcement

- Enforce één size_type per master product
- Valideer alle variants tegen master constraint
- Reject conflicting size additions

### 3. Manual Review Process

- Flag low confidence conversions (< 0.7)
- Provide admin UI voor manual correction
- Track corrections voor pattern learning

---

## Conclusie

Size conversie is complexer dan color conversie vanwege:

- Kledingtype context vereist
- Meerdere internationale systemen
- Master-level constraints

**Aanpak:**

1. **Context-first**: Category bepaalt size_type
2. **Progressive matching**: Exact → partial → numeric → fallback
3. **Validation**: Tegen category EN master
4. **Fallback**: Original size_raw bij mismatch

**Implementatie Locaties:**

- ✅ Utility: `backend/src/utils/size-converter.ts`
- ✅ Data: `backend/src/data/category-size-mapping.ts`
- 📋 Database: Migraties (nog uit te voeren)
- 📋 Tests: Unit en integration tests (nog te maken)

---

## Gerelateerde Documenten

### Specificaties

- **[COLOR_CODE_SPECIFICATION.md](./COLOR_CODE_SPECIFICATION.md)** - Kleurcode conversie strategie
- **[DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md](../DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md)** - Database schema

### Project Documenten

- **[MVP_HAPPY_PATH.md](../MVP_HAPPY_PATH.md)** - MVP implementatie roadmap
- **[DOMAIN_REGISTRY.yaml](../DOMAIN_REGISTRY.yaml)** - Feature registry

### Code Referenties

- **Backend Utils:** `backend/src/utils/size-converter.ts` (te implementeren)
- **Data Mappings:** `backend/src/data/category-size-mapping.ts` (te implementeren)
- **Models:** `backend/src/domains/imports/models.py` - Sizes tabel

---

**Document Status:** 🟡 WACHTEN OP BA + ARCHITECT REVIEW  
**Laatst Bijgewerkt:** December 20, 2025  
**Versie:** 1.0

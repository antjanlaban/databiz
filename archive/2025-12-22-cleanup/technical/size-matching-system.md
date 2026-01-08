# Size Matching System - Platte Maatcodering

**Versie:** 1.0  
**Laatst bijgewerkt:** 2025-11-13  
**Status:** ✅ Geïmplementeerd

---

## 📋 Overzicht

Het **Size Matching System** is ontworpen om ongestructureerde maatcodes van leveranciers automatisch te mappen naar gestandaardiseerde `size_codes` in de PIM database.

### Probleemstelling

Leveranciers leveren maatcodes in verschillende formaten:
- **Letter codes:** "XL", "3XL", "XXXL"
- **Numerieke codes:** "52", "48", "EU-44"
- **Jeans formaat:** "W32-L34", "32/34", "32x34"
- **One-size:** "ONE SIZE", "VRIJ", "Universeel"
- **Varianten:** "3XL" vs "XXXL", "EU48" vs "48"

### Principe: Platte Matching

In tegenstelling tot het color matching systeem gebruiken we **GEEN** clothing_type context in de eerste fase. We matchen direct op de platte `size_codes` tabel.

**Reden:** 
- Eenvoudiger implementatie
- Snellere matching (geen JOIN nodig)
- Clothing type kan in latere fase worden afgeleid via categorieën
- 58 unieke size codes zijn voldoende uniek om zonder context te matchen

---

## 🗄️ Database Structuur

### Size Codes Tabel (Plat)

```sql
TABLE: size_codes
COLUMNS:
- id                 : SERIAL PRIMARY KEY
- size_code          : VARCHAR(20) UNIQUE NOT NULL
- size_label_nl      : VARCHAR(100) NOT NULL
- size_label_en      : VARCHAR(100)
- size_category      : TEXT (LETTER, NUMERIC, JEANS, ONE_SIZE, SPECIAL)
- sort_order         : INTEGER DEFAULT 0
- is_active          : BOOLEAN DEFAULT true
- created_at         : TIMESTAMP WITH TIME ZONE
- updated_at         : TIMESTAMP WITH TIME ZONE
```

**Indexes:**
- `idx_size_codes_code` op `size_code` (voor snelle lookup)
- `idx_size_codes_category` op `size_category` (voor filtering)

**Unieke constraint:** `size_code` is UNIQUE (58 records totaal)

### Size Categories

| Category | Beschrijving | Voorbeelden |
|----------|--------------|-------------|
| `LETTER` | Letter maten | XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL |
| `NUMERIC` | Numerieke maten | 44, 46, 48, 50, 52, EU-44, EU-46 |
| `JEANS` | Jeans formaat | 30-30, 32-32, 32-34, 34-36 |
| `ONE_SIZE` | Universele maat | ONE-SIZE, VRIJ, UNIVERSEEL |
| `SPECIAL` | Overige | Handschoenmaten, schoenmaten, etc. |

---

## 🔄 Het 3-Stappen Matching Algoritme

### Stap 1: Normaliseer Input

**Normalisatie regels:**

1. **Whitespace cleanup**
   ```typescript
   "W 32 - L 34" → "W32-L34"
   " XL " → "XL"
   ```

2. **Case normalisatie**
   ```typescript
   "xl" → "XL"
   "Xl" → "XL"
   ```

3. **Letter code varianten**
   ```typescript
   "XXXL" → "3XL"
   "XXXXL" → "4XL"
   "XXXXXL" → "5XL"
   "XXL" → "2XL"
   ```

4. **Prefix verwijdering**
   ```typescript
   "EU48" → "48"
   "EU-48" → "48"
   "Size 48" → "48"
   ```

5. **Jeans formaat normalisatie**
   ```typescript
   "W32/L34" → "32-34"
   "W32L34" → "32-34"
   "32x34" → "32-34"
   "32 / 34" → "32-34"
   ```

### Stap 2: Match met Oplopende Fuzzyness

**Priority 1: Exacte match**
```sql
SELECT * FROM size_codes 
WHERE UPPER(size_code) = UPPER(:normalized_input)
AND is_active = true
LIMIT 1;
```
**Confidence:** `exact`

**Priority 2: Fuzzy match (ILIKE)**
```sql
SELECT * FROM size_codes 
WHERE size_code ILIKE '%' || :normalized_input || '%'
OR size_label_nl ILIKE '%' || :normalized_input || '%'
AND is_active = true
ORDER BY sort_order
LIMIT 1;
```
**Confidence:** `low`

**Priority 3: Numerieke extractie + match**
```typescript
// Extract "48" uit "EU-48", "Size 48", "maat 48"
const numeric = extractNumeric(input); // → 48

SELECT * FROM size_codes 
WHERE size_code = :numeric::text
AND size_category = 'NUMERIC'
AND is_active = true
LIMIT 1;
```
**Confidence:** `medium`

### Stap 3: Return Result

```typescript
interface SizeMatchResult {
  sizeCodeId: number;
  sizeCode: string;
  sizeLabel: string;
  sizeCategory: 'LETTER' | 'NUMERIC' | 'JEANS' | 'ONE_SIZE' | 'SPECIAL';
  confidence: 'exact' | 'high' | 'medium' | 'low';
  matchMethod: 'exact' | 'fuzzy' | 'numeric' | 'normalized';
}
```

---

## 📝 Test Cases

### Test Set 1: Letter Sizes

| Input | Normalized | Match Via | Expected Result | Confidence |
|-------|-----------|-----------|----------------|-----------|
| "XL" | "XL" | exact | id: X (XL) | exact |
| "xl" | "XL" | exact | id: X (XL) | exact |
| "3XL" | "3XL" | exact | id: Y (3XL) | exact |
| "XXXL" | "3XL" | normalized | id: Y (3XL) | high |
| "XXL" | "2XL" | normalized | id: Z (2XL) | high |

### Test Set 2: Numeric Sizes

| Input | Normalized | Match Via | Expected Result | Confidence |
|-------|-----------|-----------|----------------|-----------|
| "48" | "48" | exact | id: A (48) | exact |
| "EU-48" | "48" | normalized | id: A (48) | high |
| "EU48" | "48" | normalized | id: A (48) | high |
| "Size 48" | "48" | numeric extract | id: A (48) | medium |
| "Maat 48" | "48" | numeric extract | id: A (48) | medium |

### Test Set 3: Jeans Sizes

| Input | Normalized | Match Via | Expected Result | Confidence |
|-------|-----------|-----------|----------------|-----------|
| "32-34" | "32-34" | exact | id: B (32-34) | exact |
| "W32-L34" | "32-34" | normalized | id: B (32-34) | high |
| "W32/L34" | "32-34" | normalized | id: B (32-34) | high |
| "32x34" | "32-34" | normalized | id: B (32-34) | medium |
| "W32 L34" | "32-34" | normalized | id: B (32-34) | medium |

### Test Set 4: One-Size

| Input | Normalized | Match Via | Expected Result | Confidence |
|-------|-----------|-----------|----------------|-----------|
| "ONE SIZE" | "ONE-SIZE" | normalized | id: C (ONE-SIZE) | exact |
| "ONE-SIZE" | "ONE-SIZE" | exact | id: C (ONE-SIZE) | exact |
| "VRIJ" | "VRIJ" | exact | id: D (VRIJ) | exact |
| "One size fits all" | "ONE-SIZE" | fuzzy | id: C (ONE-SIZE) | low |

### Test Set 5: Edge Cases

| Input | Normalized | Match Via | Expected Result | Confidence |
|-------|-----------|-----------|----------------|-----------|
| " XL " | "XL" | exact (after trim) | id: X (XL) | exact |
| "3 XL" | "3XL" | normalized | id: Y (3XL) | high |
| "unknown" | "unknown" | - | null | - |
| "" | "" | - | null | - |

---

## 💻 Code Implementatie

### Nieuwe file: `src/lib/utils/size-matching.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

// ============================================
// INTERFACES
// ============================================

export interface SizeMatchResult {
  sizeCodeId: number;
  sizeCode: string;
  sizeLabel: string;
  sizeCategory: 'LETTER' | 'NUMERIC' | 'JEANS' | 'ONE_SIZE' | 'SPECIAL';
  confidence: 'exact' | 'high' | 'medium' | 'low';
  matchMethod: 'exact' | 'fuzzy' | 'numeric' | 'normalized';
}

// ============================================
// NORMALISATIE FUNCTIES
// ============================================

/**
 * Normaliseer maatcode input
 */
function normalizeSize(input: string): string {
  let normalized = input.trim().toUpperCase();
  
  // Whitespace cleanup
  normalized = normalized.replace(/\s+/g, '');
  
  // Letter code conversies
  const letterMap: Record<string, string> = {
    'XXXL': '3XL',
    'XXXXL': '4XL',
    'XXXXXL': '5XL',
    'XXL': '2XL',
  };
  if (letterMap[normalized]) {
    normalized = letterMap[normalized];
  }
  
  // EU prefix verwijdering
  normalized = normalized.replace(/^EU-?/, '');
  normalized = normalized.replace(/^SIZE-?/, '');
  normalized = normalized.replace(/^MAAT-?/, '');
  
  // Jeans formaat normalisatie
  const jeansMatch = normalized.match(/W?(\d+)[\/X\-]?L?(\d+)/i);
  if (jeansMatch) {
    normalized = `${jeansMatch[1]}-${jeansMatch[2]}`;
  }
  
  return normalized;
}

/**
 * Extract numerieke waarde uit maatcode
 */
function extractNumeric(input: string): string | null {
  const match = input.match(/\d+/);
  return match ? match[0] : null;
}

// ============================================
// MATCHING LOGICA
// ============================================

/**
 * Match maatcode naar size_codes tabel (plat, zonder clothing_type)
 * 
 * @param supplierSizeCode - De supplier maatcode (bijv. "XL", "52", "W32-L34")
 * @returns SizeMatchResult | null
 */
export async function matchSizeCode(
  supplierSizeCode: string
): Promise<SizeMatchResult | null> {
  
  if (!supplierSizeCode || supplierSizeCode.trim() === '') {
    return null;
  }
  
  // 1. Normaliseer input
  const normalized = normalizeSize(supplierSizeCode);
  
  // 2. Priority 1: Exacte match
  const { data: exactMatch, error: exactError } = await supabase
    .from('size_codes')
    .select('*')
    .eq('is_active', true)
    .ilike('size_code', normalized)
    .limit(1)
    .single();
  
  if (exactMatch && !exactError) {
    return {
      sizeCodeId: exactMatch.id,
      sizeCode: exactMatch.size_code,
      sizeLabel: exactMatch.size_label_nl,
      sizeCategory: exactMatch.size_category,
      confidence: 'exact',
      matchMethod: 'exact',
    };
  }
  
  // 3. Priority 2: Numerieke extractie
  const numericValue = extractNumeric(normalized);
  if (numericValue) {
    const { data: numericMatch, error: numericError } = await supabase
      .from('size_codes')
      .select('*')
      .eq('is_active', true)
      .eq('size_code', numericValue)
      .eq('size_category', 'NUMERIC')
      .limit(1)
      .single();
    
    if (numericMatch && !numericError) {
      return {
        sizeCodeId: numericMatch.id,
        sizeCode: numericMatch.size_code,
        sizeLabel: numericMatch.size_label_nl,
        sizeCategory: numericMatch.size_category,
        confidence: 'medium',
        matchMethod: 'numeric',
      };
    }
  }
  
  // 4. Priority 3: Fuzzy match
  const { data: fuzzyMatches, error: fuzzyError } = await supabase
    .from('size_codes')
    .select('*')
    .eq('is_active', true)
    .or(`size_code.ilike.%${normalized}%,size_label_nl.ilike.%${normalized}%`)
    .order('sort_order')
    .limit(1);
  
  if (fuzzyMatches && fuzzyMatches.length > 0 && !fuzzyError) {
    return {
      sizeCodeId: fuzzyMatches[0].id,
      sizeCode: fuzzyMatches[0].size_code,
      sizeLabel: fuzzyMatches[0].size_label_nl,
      sizeCategory: fuzzyMatches[0].size_category,
      confidence: 'low',
      matchMethod: 'fuzzy',
    };
  }
  
  // 5. No match found
  return null;
}

/**
 * Batch match voor meerdere maatcodes tegelijk
 */
export async function matchSizeCodesBatch(
  sizeCodes: string[]
): Promise<Map<string, SizeMatchResult | null>> {
  
  const results = new Map<string, SizeMatchResult | null>();
  
  // Process in parallel voor performance
  const promises = sizeCodes.map(async (sizeCode) => {
    const result = await matchSizeCode(sizeCode);
    results.set(sizeCode, result);
  });
  
  await Promise.all(promises);
  
  return results;
}

/**
 * Get alle beschikbare size codes (voor dropdowns)
 */
export async function getAllSizeCodes(category?: string) {
  const query = supabase
    .from('size_codes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  
  if (category) {
    query.eq('size_category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching size codes:', error);
    return [];
  }
  
  return data || [];
}
```

---

## 🔗 Integratie Punten

### 1. Promotie Wizard (Step 3: Size Mapping)

```typescript
import { matchSizeCode, matchSizeCodesBatch } from '@/lib/utils/size-matching';

// Voor elke unieke supplier_size_code:
const uniqueSizes = [...new Set(selectedProducts.map(p => p.supplier_size_code))];

// Batch match voor performance
const matchResults = await matchSizeCodesBatch(uniqueSizes);

// Auto-apply suggesties met hoge confidence
for (const [supplierSize, match] of matchResults.entries()) {
  if (match && match.confidence !== 'low') {
    setSizeMapping(supplierSize, match.sizeCodeId);
  } else {
    // User moet handmatig selecteren
    showManualSizeSelector(supplierSize);
  }
}
```

### 2. Import Mapping (AI-gestuurde suggesties)

```typescript
// Bij column mapping detectie
const sizeColumn = detectColumn('SIZE');
const sampleSizes = getColumnSamples(sizeColumn);

// Match sample sizes
const suggestions = await matchSizeCodesBatch(sampleSizes);

// Toon confidence scores aan user
showMappingSuggestions(suggestions);
```

### 3. Data Quality Validatie

```typescript
// Check of alle supplier_size_codes gemapped kunnen worden
const unmatchedSizes = [];

for (const product of products) {
  const match = await matchSizeCode(product.supplier_size_code);
  if (!match) {
    unmatchedSizes.push(product.supplier_size_code);
  }
}

if (unmatchedSizes.length > 0) {
  console.warn('Unmatched sizes requiring manual attention:', unmatchedSizes);
}
```

---

## ⚡ Performance Overwegingen

### 1. Database Indexen
```sql
-- Reeds aanwezig in migratie
CREATE INDEX idx_size_codes_code ON size_codes(size_code);
CREATE INDEX idx_size_codes_category ON size_codes(size_category);
```

### 2. Caching Strategy
```typescript
// React Query caching in frontend
const { data: sizeCodes } = useQuery({
  queryKey: ['size-codes'],
  queryFn: () => getAllSizeCodes(),
  staleTime: 10 * 60 * 1000, // 10 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});
```

### 3. Batch Processing
- Gebruik `matchSizeCodesBatch()` voor bulk imports
- Parallel processing via `Promise.all()`
- Minimaal aantal database queries

### 4. In-Memory Cache (optioneel)
```typescript
// Voor zeer frequente lookups
const sizeCodeCache = new Map<string, SizeMatchResult>();

export async function matchSizeCodeCached(code: string) {
  if (sizeCodeCache.has(code)) {
    return sizeCodeCache.get(code);
  }
  
  const result = await matchSizeCode(code);
  sizeCodeCache.set(code, result);
  return result;
}
```

---

## 🚀 Toekomstige Uitbreidingen

### Fase 2: Clothing Type Koppeling

Nadat size_code gemapped is, bepaal clothing_type via:
```typescript
// Via category → clothing_type koppeling
const clothingType = await getClothingTypeFromCategory(categoryId);

// Via size_options lookup
const sizeOption = await supabase
  .from('size_options')
  .select('*, clothing_types(*)')
  .eq('size_code', matchedSizeCode.sizeCode)
  .single();
```

### Fase 3: AI Pattern Detection

```typescript
// Automatisch detecteren van size patterns in supplier data
function detectSizePattern(sampleSizes: string[]) {
  const hasJeansFormat = sampleSizes.some(s => /W\d+.*L\d+/.test(s));
  const hasLetterSizes = sampleSizes.some(s => /^[XSML]+$/.test(s));
  const hasNumericOnly = sampleSizes.every(s => /^\d+$/.test(s));
  
  return {
    suggestedCategory: 
      hasJeansFormat ? 'JEANS' :
      hasLetterSizes ? 'LETTER' :
      hasNumericOnly ? 'NUMERIC' : 'UNKNOWN'
  };
}
```

### Fase 4: User Feedback Loop

```typescript
// Track correcte/incorrecte matches voor machine learning
interface SizeMatchFeedback {
  supplier_size_code: string;
  matched_size_code_id: number;
  was_correct: boolean;
  corrected_size_code_id: number | null;
  user_id: string;
  created_at: Date;
}

// Gebruik feedback om matching algoritme te verbeteren
```

### Fase 5: Supplier-Specifieke Mappings

```typescript
// Onthoud voorkeur per supplier
interface SupplierSizePreference {
  supplier_id: number;
  size_notation: 'LETTER' | 'NUMERIC' | 'JEANS';
  normalization_rules: Record<string, string>;
}
```

---

## 📚 Relatie met Andere Documentatie

- **`color-matching-system.md`**: Vergelijkbaar matching principe, maar voor kleuren
- **`database-schema.md`**: Schema details van size_codes tabel
- **`promotion-strategy.md`**: Hoe size matching gebruikt wordt in promotie flow
- **`import-architecture.md`**: Integratie met import mapping engine
- **`data-model/validation-rules.md`**: Validatie regels voor maatcodes

---

## 🧪 Implementatie Checklist

- [x] Database migratie voor `size_codes` tabel
- [x] Data migratie vanuit `size_options` (58 unieke codes)
- [ ] Implementeer `src/lib/utils/size-matching.ts`
- [ ] Schrijf unit tests voor alle test cases
- [ ] Implementeer React hook `use-size-matching.ts`
- [ ] Integreer in Promotie Wizard Step 3
- [ ] Integreer in Import Mapping AI
- [ ] Performance testen met echte data
- [ ] Documentatie afronding

---

## ⏱️ Tijdsinschatting

**Totaal: 3-4 uur**
- Implementatie core logica: 1.5 uur
- Testing & edge cases: 1 uur
- Integratie in Promotie Wizard: 1 uur
- React hook + UI components: 30 min
- Documentatie: ✅ Klaar

---

## 🔍 Verschil met Color Matching

| Aspect | Color Matching | Size Matching |
|--------|----------------|---------------|
| **Context nodig** | Nee (platte kleuren tabel) | Nee (platte size_codes tabel) |
| **Color type detection** | Ja (MONO/DUO/TRIO) | Nee (size_category is descriptief) |
| **Fuzzy matching** | Op part level | Op hele code |
| **Normalisatie** | Split + trim | Format conversie |
| **Aantal records** | ~100 color_family_options | 58 size_codes |

**Conclusie:** Beide systemen zijn plat en context-onafhankelijk voor maximale snelheid en eenvoud.

# Validation Rules

**Last Updated:** Januari 2025  
**Version:** 2.0 (Progressive Quality Ladder Update)

---

## Overview

Dit document specificeert alle validatieregels voor data-invoer in het Van Kruiningen PIM-systeem volgens de **Progressive Quality Ladder** methodologie.

Validatie vindt plaats op:

1. **Database level** (constraints)
2. **Application level** (Zod schemas, React Hook Form)
3. **Import level** (file processing validatie)
4. **Phase level** (converteren, promotie, verrijken)

**🔗 Zie ook:** `docs/technical/progressive-quality-ladder.md` voor volledige strategie uitleg.

---

## Progressive Quality Ladder Framework

### Priority Levels: P0/P1/P2/P3

Alle velden worden geclassificeerd volgens het Progressive Quality Ladder systeem:

| Priority | Label NL | Label EN | Quality Weight | Validatie Strengheid |
|----------|----------|----------|----------------|---------------------|
| **P0** | MVP | MVP | 50% | HARD BLOCK (import) - Minimum Viable Product |
| **P1** | Good | Good | 30% | OPTIONAL (score only) - Waardevolle metadata |
| **P2** | Better | Better | 15% | OPTIONAL (score only) - Uitgebreide metadata |
| **P3** | Best | Best | 5% | OPTIONAL (score only) - Premium metadata |

**BELANGRIJKE WIJZIGING:**  
Alleen **P0 (MVP)** velden blokkeren import. P1/P2/P3 velden beïnvloeden alleen de kwaliteitsscore.

### Field Groups & OR-Logic

**Probleem:** Leveranciers gebruiken verschillende veldnamen voor hetzelfde concept.

**Oplossing:** Field Groups met OR-logic.

**Standaard Field Groups:**

1. **Color Group (Kleur):**
   - Fields: `supplier_color_name`, `supplier_color_code`
   - Priority: Beide P0 (MVP)
   - Import: Min 1 vereist (OR-logic)
   - Promotie: Beide vereist (AND-logic)

2. **Style Group (Stijl/Model):**
   - Fields: `supplier_style_name`, `supplier_style_code`
   - Priority: Beide P0 (MVP)
   - Import: Min 1 vereist (OR-logic)
   - Promotie: Beide aanbevolen (AND-logic)

3. **Size Group (Maat):**
   - Fields: `supplier_size_code`
   - Priority: P0 (MVP)
   - OR-logic: N/A (geen alternatief)

4. **EAN Group (Barcode):**
   - Fields: `ean`
   - Priority: P0 (MVP)
   - OR-logic: N/A (geen alternatief)
   - Speciale validatie: Checksum + uniekheid context-afhankelijk

### Phase-Aware Validation

| Priority | IMPORT (Converteren) | PROMOTIE | VERRIJKEN |
|----------|---------------------|----------|-----------|
| **P0 (MVP)** | HARD BLOCK<br/>(OR-logic: min 1 per group) | HARD BLOCK<br/>(AND-logic: alle velden) | HARD BLOCK |
| **P1 (Good)** | OPTIONAL<br/>(score impact only) | OPTIONAL<br/>(score impact) | ENCOURAGED<br/>(AI actief proberen) |
| **P2 (Better)** | OPTIONAL<br/>(score impact only) | OPTIONAL<br/>(score impact) | ENCOURAGED<br/>(AI actief proberen) |
| **P3 (Best)** | IGNORED | OPTIONAL | NICE TO HAVE |

**KRITIEK:** Alleen P0 (MVP) velden blokkeren import. P1/P2/P3 zijn puur optioneel.

---

## Pantone FHI Color Standard

**Versie:** Pantone FHI TCX (Fashion/Home/Interiors)  
**Dataset:** 63 kleuren verdeeld over 12 families  
**Implementatie:** November 2025

### Color Families

De 63 Pantone FHI kleuren zijn georganiseerd in de volgende families:
- **BLACK** (2 kleuren): Zwart, Diep Zwart
- **WHITE** (4 kleuren): Wit, Gebroken Wit, Ivoor, Crème
- **GREY** (7 kleuren): Warm Grijs, Middengrijs, Lichtgrijs, Donkergrijs, Antraciet, Zilver, Parelgrijs, Leisteengrijs
- **BLUE** (6 kleuren): Marineblauw, Donkerblauw, Azuurblauw, Stoffig Blauw, Petrol, Hemelsblauw
- **GREEN** (9 kleuren): Saliegroen, Groen, Bosgroen, Donkergroen, Olijfgroen, Legergroen, Mintgroen, Limoengroen, Turquoise
- **BROWN** (8 kleuren): Kleibruin, Bruin, Donkerbruin, Chocoladebruin, Koffiebruin, Cognac, Zandbruin, Terracotta
- **BEIGE** (4 kleuren): Kameel, Beige, Zand, Kaki
- **RED** (6 kleuren): Rood, Donkerrood, Wijnrood, Koraalrood, Scarlet, Bordeaux
- **PINK** (4 kleuren): Roze, Knalroze, Lichtroze, Zalm
- **PURPLE** (5 kleuren): Paars, Aubergine, Lila, Lavendel, Magenta
- **YELLOW** (4 kleuren): Geel, Goud, Citroen, Fluorescerend Geel
- **ORANGE** (3 kleuren): Oranje, Donkeroranje, Fluorescerend Oranje

### Pantone Code Format

**Format:** `{code} {type}` (bijvoorbeeld: "19-4052 TCX")

**Code Structuur:**
- **2 cijfers:** Lightness indicator (11-19, waarbij 11 = licht, 19 = donker)
- **4 cijfers:** Hue indicator (kleurwaarde binnen family)

**Type Codes:**
- **TCX:** Cotton Extension (standaard voor textiel)
- **TPX:** Polyester Extension
- **TN:** Nylon Extension

**Voorbeelden:**
- `19-4052 TCX` - Navy (donker, family BLUE)
- `11-0601 TCX` - White (licht, family WHITE)
- `17-1394 TCX` - Fluorescent Yellow (medium-light, safety)

### Application Context

Elk Pantone kleur heeft een **application_context** die de primaire gebruikscontext aangeeft:

| Context      | Beschrijving                              | Voorbeelden                         |
|--------------|-------------------------------------------|-------------------------------------|
| `workwear`   | Werkkledingkleuren (robuust, praktisch)   | Navy, Zwart, Groen, Bruin          |
| `safety`     | Veiligheid/high-visibility kleuren        | Fluorescerend Geel, Fluorescerend Oranje |
| `neutral`    | Neutrale basis kleuren                    | Wit, Beige, Grijs                  |
| `corporate`  | Corporate/zakelijke kleuren               | Bordeaux, Leisteengrijs            |
| `casual`     | Casual/dagelijkse kleuren                 | Sky Blue, Pink, Khaki              |
| `fashion`    | Modieuze/trendy kleuren                   | Turquoise, Aubergine, Chocoladebruin |
| `accent`     | Accent/opvallende kleuren                 | Geel, Oranje, Scarlet              |
| `trend`      | Trend/seizoen kleuren                     | Terracotta, Clay                   |
| `luxury`     | Luxe/premium kleuren                      | Parelgrijs                         |

**Gebruik in AI Matching:**  
De application_context wordt gebruikt door AI keyword suggesties om:
- Workwear leveranciers → prioriteren workwear kleuren
- Safety producten → matchen met safety kleuren (fluorescerend)
- Fashion catalogi → prioriteren fashion/casual kleuren

### RGB Values

Elke kleur bevat nauwkeurige **RGB waarden** (0-255) voor:
- **Color distance calculations** (matching similarity)
- **Color space conversions** (HSL, CMYK)
- **Visual rendering accuracy**

**Database Velden:**
- `rgb_r`: Red component (0-255)
- `rgb_g`: Green component (0-255)
- `rgb_b`: Blue component (0-255)

**Voorbeeld:**
```typescript
{
  pantone_code: "19-4052 TCX",
  color_name_nl: "Marineblauw",
  hex_code: "#000080",
  rgb_r: 0,
  rgb_g: 0,
  rgb_b: 128,
  application_context: "workwear"
}
```

### Search Keywords

Elke kleur heeft een **automatisch gegenereerde** array van search keywords:

**Generatie Logica:**
1. **NL naam** (lowercase): "marineblauw"
2. **EN naam** (lowercase): "navy"
3. **Family**: "blue"
4. **Application**: "workwear"
5. **Word variations**: "marine", "blauw"
6. **Synonyms** (handmatig): "grijs", "grey", "gray"

**Voorbeeld:**
```typescript
search_keywords: ["marineblauw", "navy", "blue", "workwear", "marine", "blauw"]
```

**Gebruik:**
- AI keyword matching (supplier → Pantone)
- Search/filter functionaliteit
- Fuzzy matching voor typos

### Fluorescent & High-Visibility

**Fluorescent Colors:**  
Kleuren met speciale fluorescente eigenschappen voor hoge zichtbaarheid:
- `is_fluorescent: true`
- Application context: `safety`

**High-Visibility Colors:**  
Kleuren die voldoen aan EN ISO 20471 standaard (werkkleding safety):
- `is_high_visibility: true`
- Verplicht voor safety werkkleding

**Dataset Fluorescent Colors:**
1. **Fluorescent Yellow** (`17-1394 TCX`) - Safety geel
2. **Fluorescent Orange** (`18-1379 TCX`) - Safety oranje

### Sort Order & Priority

Kleuren hebben een **sort_order** die prioriteit aangeeft in UI weergave:

| Priority | Application Context | Sort Order Value |
|----------|---------------------|------------------|
| Hoogst   | BLACK/WHITE/GREY    | 5-25             |
| Hoog     | workwear            | 10               |
| Medium   | safety              | 20               |
| Medium   | neutral             | 30               |
| Medium   | corporate           | 40               |
| Laag     | casual              | 50               |
| Laag     | fashion             | 60               |
| Laag     | accent              | 70               |
| Laag     | trend               | 80               |
| Laagst   | luxury              | 90               |

**Gebruik in UI:**
- Kleur dropdowns (workwear eerst)
- AI suggesties (workwear prioriteit)
- Filter defaults (standaard workwear)

---

---

## Priority Classification: P0 - MVP (Minimum Viable Product)

**Definitie:** Minimum Viable Product - minimale vereisten voor opname in de catalogus. Zonder deze data kan het product NIET geïmporteerd worden.

**Criteria:**
- Product kan technisch niet bestaan zonder dit veld
- Blokkeert import naar supplier_products tabel
- Essentieel voor product identificatie en differentiatie
- Database integrity (foreign keys, unique constraints)

**Validatie:** HARD BLOCK bij import - product wordt NIET geaccepteerd zonder P0 velden

---

### VR-P0-001: supplier_id

**Priority:** P0 (MVP)  
**Type:** Integer  
**Required:** JA (ALTIJD)  
**Foreign Key:** suppliers.id  
**Default:** Auto-filled (user selection)  
**Error Message:** "Leverancier is verplicht (technische vereiste)"

**Business Rule:** Multi-tenancy isolation, elke import MOET een supplier hebben.

**Zod Schema:**

```typescript
z.number()
  .int('Supplier ID moet een integer zijn')
  .positive('Supplier ID moet positief zijn')
  .refine(async (id) => await supplierExists(id), {
    message: 'Geselecteerde leverancier bestaat niet'
  })
```

---

### VR-P0-002: brand_id

**Priority:** P0 (MVP)  
**Type:** Integer  
**Required:** JA (voor KERN products)  
**Foreign Key:** brands.id  
**Default:** Auto-filled (user selection)  
**Error Message:** "Merk is verplicht voor KERN producten"

**Business Rule:** RAND products kunnen zonder brand, KERN products moeten brand hebben.

**Zod Schema:**

```typescript
z.number()
  .int('Brand ID moet een integer zijn')
  .positive('Brand ID moet positief zijn')
  .refine(async (id) => await brandExists(id), {
    message: 'Geselecteerd merk bestaat niet'
  })
```

---

### VR-P0-003: tenant_id

**Priority:** P0 (MVP)  
**Type:** UUID  
**Required:** JA (ALTIJD)  
**Foreign Key:** auth.users → profiles.id  
**Default:** Auto-filled (auth context)  
**Error Message:** "Tenant ID is verplicht (security vereiste)"

**Business Rule:** Multi-tenancy isolation, elke rij MOET een tenant_id hebben.

**Zod Schema:**

```typescript
z.string()
  .uuid('Tenant ID moet een valid UUID zijn')
  .refine(() => auth.uid() !== null, {
    message: 'Gebruiker moet geauthenticeerd zijn'
  })
```

---

## Priority Classification: P1 - Good (Waardevolle Metadata)

**Definitie:** Waardevolle extra data die producten verrijkt maar NIET verplicht is voor import.

**Criteria:**
- Verbetert gebruikservaring of data rijkheid
- Helpt bij categorisatie, filtering of search
- Ondersteunt besluitvorming (prijzen, categorieën)
- **GEEN BLOCKER** voor import

**Validatie:**
- **Import:** OPTIONAL - Alleen impact op kwaliteitsscore
- **Promotie:** OPTIONAL - Alleen impact op kwaliteitsscore
- **Verrijken:** ENCOURAGED - AI actief proberen te verrijken

---

### FIELD GROUP: Color (Kleur)

**Group ID:** `color`  
**Group Label:** Kleur (Naam of Code)  
**Priority:** P0 (MVP) - beide velden  
**OR-Logic:** Minimaal 1 vereist (import), beide vereist (promotie)

---

#### VR-P0-COLOR-001: supplier_color_name

**Priority:** P0 (MVP - Field Group: Color)  
**Type:** String  
**Required:** MIN 1 in group (import), JA (promotie)  
**Max Length:** 100  
**Error Message:** "Kleurnaam is deel van MVP Color Group"

**Zod Schema:**

```typescript
z.string()
  .max(100, 'Kleurnaam maximaal 100 karakters')
  .trim()
  .optional() // Converteren: optional want OR-logic
```

**Field Group Warning (Converteren):**
```
⚠️ Enkel kleurcode aanwezig (geen kleurnaam)

Een kleurnaam is beter voor leesbaarheid. Kleurcode vereist conversie 
bij promotie naar master data.

Aanbeveling: Voeg kolom 'Kleurnaam' toe in volgende import.
```

---

#### VR-P0-COLOR-002: supplier_color_code

**Priority:** P0 (MVP - Field Group: Color)  
**Type:** String  
**Required:** MIN 1 in group (import), JA (promotie)  
**Max Length:** 50  
**Pattern:** `^[A-Z0-9-]+$`  
**Error Message:** "Kleurcode is deel van MVP Color Group"

**Zod Schema:**

```typescript
z.string()
  .max(50)
  .regex(/^[A-Z0-9-]+$/, 'Kleurcode alleen hoofdletters, cijfers en streepjes')
  .trim()
  .optional() // Converteren: optional want OR-logic
```

---

### FIELD GROUP: Style (Stijl/Model)

**Group ID:** `style`  
**Group Label:** Stijl (Naam of Code)  
**Priority:** P0 (MVP) - beide velden  
**OR-Logic:** Minimaal 1 vereist (import), beide aanbevolen (promotie)

---

#### VR-P0-STYLE-001: supplier_style_name

**Priority:** P0 (MVP - Field Group: Style)  
**Type:** String  
**Required:** MIN 1 in group (import), JA (promotie)  
**Min Length:** 1  
**Max Length:** 200  
**Error Message:** "Style naam is deel van MVP Style Group"

**Zod Schema:**

```typescript
z.string()
  .min(1, 'Style naam minimaal 1 karakter')
  .max(200, 'Style naam maximaal 200 karakters')
  .trim()
  .optional() // Converteren: optional want OR-logic
```

---

#### VR-P0-STYLE-002: supplier_style_code

**Priority:** P0 (MVP - Field Group: Style)  
**Type:** String  
**Required:** MIN 1 in group (import), JA (promotie)  
**Max Length:** 100  
**Pattern:** `^[A-Z0-9-]+$`  
**Error Message:** "Style code is deel van MVP Style Group"

**Zod Schema:**

```typescript
z.string()
  .max(100)
  .regex(/^[A-Z0-9-]+$/, 'Style code alleen hoofdletters, cijfers en streepjes')
  .trim()
  .optional() // Converteren: optional want OR-logic
```

---

### VR-003: product_type

**Type:** Enum  
**Required:** Ja  
**Allowed Values:** `'KERN'`, `'RAND'`  
**Default:** `'KERN'`  
**Error Message:** "Product type moet KERN of RAND zijn"

**Zod Schema:**

```typescript
z.enum(['KERN', 'RAND'], {
  errorMap: () => ({ message: 'Product type moet KERN of RAND zijn' })
})
```

---

### VR-004: brand_id

**Type:** Integer  
**Required:** Ja (voor KERN products)  
**Foreign Key:** brands.brand_id  
**Error Message:** "Merk is verplicht voor KERN producten"

**Business Rule:** RAND products kunnen zonder brand, KERN products moeten brand hebben

**Zod Schema:**

```typescript
z.number()
  .int('Brand ID moet een integer zijn')
  .positive('Brand ID moet positief zijn')
  .refine(async (id) => await brandExists(id), {
    message: 'Geselecteerd merk bestaat niet'
  })
```

---

### VR-005: supplier_id

**Type:** Integer  
**Required:** Nee  
**Foreign Key:** suppliers.supplier_id  
**Error Message:** "Geselecteerde leverancier bestaat niet"

**Zod Schema:**

```typescript
z.number()
  .int()
  .positive()
  .optional()
  .refine(async (id) => !id || await supplierExists(id), {
    message: 'Geselecteerde leverancier bestaat niet'
  })
```

---

### VR-006: material_composition

**Type:** String  
**Required:** Nee  
**Max Length:** 500  
**Error Message:** "Materiaalsamenstelling maximaal 500 karakters"

**Zod Schema:**

```typescript
z.string()
  .max(500, 'Materiaalsamenstelling maximaal 500 karakters')
  .optional()
```

---

### VR-007: fabric_weight

**Type:** Decimal  
**Required:** Nee  
**Min Value:** 0  
**Max Value:** 9999.99  
**Precision:** 6,2 (4 voor komma, 2 na komma)  
**Error Message:** "Stofgewicht moet tussen 0 en 9999.99 g/m² zijn"

**Zod Schema:**

```typescript
z.number()
  .min(0, 'Stofgewicht minimaal 0')
  .max(9999.99, 'Stofgewicht maximaal 9999.99')
  .optional()
```

---

### VR-008: gender

**Type:** Enum  
**Required:** Nee  
**Allowed Values:** `'Unisex'`, `'Heren'`, `'Dames'`, `'Kinderen'`  
**Error Message:** "Geslacht moet Unisex, Heren, Dames of Kinderen zijn"

**Zod Schema:**

```typescript
z.enum(['Unisex', 'Heren', 'Dames', 'Kinderen']).optional()
```

---

### FIELD GROUP: Size (Maat)

**Group ID:** `size`  
**Priority:** P1  
**OR-Logic:** N/A (geen alternatief veld)

---

#### VR-P1-005: supplier_size_code

**Priority:** P1 (Verplicht)  
**Type:** String  
**Required:** JA (alle fases)  
**Max Length:** 20  
**Allowed Values:** XS, S, M, L, XL, XXL, 3XL, 4XL, 5XL, 44-64 (even), ONE-SIZE, VRIJ  
**Error Message:** "Maat is verplicht. Gebruik: XS-5XL, 44-64, ONE-SIZE of VRIJ"

**Zod Schema:**

```typescript
const VALID_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL',
  '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64',
  'ONE-SIZE', 'VRIJ'
];

z.string()
  .refine((size) => VALID_SIZES.includes(size), {
    message: `Maat moet een van de volgende zijn: ${VALID_SIZES.join(', ')}`
  })
```

---

### FIELD GROUP: EAN (Barcode)

**Group ID:** `ean`  
**Priority:** P1  
**OR-Logic:** N/A (geen alternatief veld)

---

#### VR-P1-006: ean (VERPLICHT - PRIMAIRE IDENTIFIER)

**Priority:** P1 (Verplicht)  
**Type:** String  
**Required:** JA (alle fases)  
**Length:** Exact 13 cijfers  
**Pattern:** `^\d{13}$`  
**Unique:** Context-afhankelijk (zie Business Rules)  
**Checksum:** EAN-13 check digit validation  
**Error Message:** "EAN is verplicht en moet exact 13 cijfers zijn met een geldige check digit"

**Zod Schema:**

```typescript
// supplier_products: Composite uniqueness (supplier_id + ean)
z.string()
  .length(13, 'EAN moet exact 13 cijfers zijn')
  .regex(/^\d{13}$/, 'EAN mag alleen cijfers bevatten')
  .refine((ean) => validateEAN13Checksum(ean), {
    message: 'EAN check digit ongeldig'
  })
  .refine(async (ean, ctx) => {
    const { supplier_id } = ctx; // From form context
    return await eanIsUniqueForSupplier(supplier_id, ean);
  }, {
    message: 'Deze EAN bestaat al voor deze leverancier'
  });

// product_variants: Global uniqueness
z.string()
  .length(13, 'EAN moet exact 13 cijfers zijn')
  .regex(/^\d{13}$/, 'EAN mag alleen cijfers bevatten')
  .refine((ean) => validateEAN13Checksum(ean), {
    message: 'EAN check digit ongeldig'
  })
  .refine(async (ean) => await eanIsGloballyUnique(ean), {
    message: 'Deze EAN is al in gebruik in Master catalogus'
  });
```

**Business Rules:**

**🔴 CRITICAL: EAN Uniekheid Context**

EAN is **ALTIJD VERPLICHT**, maar uniekheid verschilt per context:

**1. INKOOP (supplier_products):**
- ✅ **Composite uniqueness:** `UNIQUE(supplier_id, ean)`
- ✅ Zelfde EAN mag voorkomen bij **verschillende leveranciers** (verschillende merken)
- ❌ Duplicate EAN binnen **dezelfde leverancier** wordt geblokkeerd
- **Rationale:** EAN hoort bij MERK, niet bij leverancier. Meerdere leveranciers kunnen hetzelfde Nike-product voeren.

**2. VERKOOP (product_variants):**
- ✅ **Global uniqueness:** `UNIQUE(ean)`
- ❌ Duplicate EAN wordt **geblokkeerd** (1 Master product per EAN)
- ✅ `supplier_id` wordt **irrelevant** voor uniqueness
- **Rationale:** Master catalogus verkoopt elk uniek product maar 1x, ongeacht hoeveel leveranciers het voeren.

**Import Logica:**
```typescript
// Voorbeeld: 2 leveranciers voeren Nike EAN 8712345678901
Leverancier A: (supplier_id=1, ean="8712345678901") → TOEGESTAAN ✅
Leverancier B: (supplier_id=2, ean="8712345678901") → TOEGESTAAN ✅

// Promotie naar Master catalogus:
product_variants: (ean="8712345678901") → EERSTE promoot wint ✅
product_variants: (ean="8712345678901") → TWEEDE promoot → CONFLICT ❌

// Conflict resolution opties:
1. Negeren (behoud bestaand Master product)
2. Overschrijven (vervang met nieuwe leverancier data)
3. Goedkoopste kiezen (update prijs als nieuwe lager)
```

**Validation Functions:**

**EAN-13 Checksum Algorithm:**

```typescript
function validateEAN13Checksum(ean: string): boolean {
  const digits = ean.split('').map(Number);
  const checkDigit = digits.pop()!;

  const sum = digits.reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}
```

---

## Priority Classification: P2 - Better (Uitgebreide Metadata)

**Definitie:** Uitgebreide metadata die product kwaliteit verder verbetert.

**Criteria:**
- Verbetert gebruikservaring of data rijkheid
- Vergemakkelijkt categorisatie, filtering of search
- Ondersteunt besluitvorming (prijzen, categorieën, materiaal)

**Validatie:**
- **Converteren:** OPTIONAL (geen blocker)
- **Promotie:** RECOMMENDED (waarschuwing als ontbreekt)
- **Verrijken:** ENCOURAGED (AI actief proberen te verrijken)

---

### VR-P2-001: supplier_product_group

**Priority:** P2 (Aanbevolen)  
**Type:** String  
**Required:** NEE  
**Max Length:** 255  
**Error Message:** "Product groep maximaal 255 karakters"

**Business Value:** Helpt bij automatische categorisatie.

**Zod Schema:**

```typescript
z.string()
  .max(255, 'Product groep maximaal 255 karakters')
  .optional()
```

---

### VR-P2-002: supplier_advised_price

**Priority:** P2 (Aanbevolen)  
**Type:** Decimal  
**Required:** NEE  
**Min Value:** 0.01  
**Max Value:** 99999999.99  
**Precision:** 10,2  
**Error Message:** "Adviesprijs minimaal €0,01 (indien ingevuld)"

**Business Value:** Basis voor prijsstrategie.

**Zod Schema:**

```typescript
z.number()
  .min(0.01, 'Adviesprijs minimaal €0,01')
  .max(99999999.99)
  .optional()
```

---

### VR-P2-003: material_composition

**Priority:** P2 (Aanbevolen)  
**Type:** String  
**Required:** NEE  
**Max Length:** 500  
**Error Message:** "Materiaalsamenstelling maximaal 500 karakters"

**Business Value:** Verbetert product beschrijving en SEO.

**Zod Schema:**

```typescript
z.string()
  .max(500, 'Materiaalsamenstelling maximaal 500 karakters')
  .optional()
```

---

### VR-P2-004: fabric_weight_gsm

**Priority:** P2 (Aanbevolen)  
**Type:** Decimal  
**Required:** NEE  
**Min Value:** 0  
**Max Value:** 9999.99  
**Precision:** 6,2 (4 voor komma, 2 na komma)  
**Error Message:** "Stofgewicht moet tussen 0 en 9999.99 g/m² zijn"

**Business Value:** Technische spec voor kwaliteitsbeoordeling.

**Zod Schema:**

```typescript
z.number()
  .min(0, 'Stofgewicht minimaal 0')
  .max(9999.99, 'Stofgewicht maximaal 9999.99')
  .optional()
```

---

## Priority Classification: P3 - Best (Premium Metadata)

**Definitie:** Premium metadata voor maximale data kwaliteit.

**Criteria:**
- Niche use cases (specifieke filters, advanced search)
- Marketing/SEO verrijking
- Toekomstige features die nog niet actief zijn

**Validatie:**
- **Converteren:** IGNORED (geen impact op acceptance)
- **Promotie:** IGNORED
- **Verrijken:** NICE TO HAVE (laagste prioriteit)

---

### VR-P3-001: care_instructions

**Priority:** P3 (Optioneel)  
**Type:** String  
**Required:** NEE  
**Max Length:** 1000  
**Error Message:** "Wasvoorschrift maximaal 1000 karakters"

**Business Value:** Wasvoorschrift, handig maar niet kritisch.

**Zod Schema:**

```typescript
z.string()
  .max(1000, 'Wasvoorschrift maximaal 1000 karakters')
  .optional()
```

---

### VR-P3-002: country_of_origin

**Priority:** P3 (Optioneel)  
**Type:** String  
**Required:** NEE  
**Max Length:** 100  
**Error Message:** "Land van herkomst maximaal 100 karakters"

**Business Value:** Herkomst, relevant voor duurzaamheid filters.

**Zod Schema:**

```typescript
z.string()
  .max(100, 'Land van herkomst maximaal 100 karakters')
  .optional()
```

---

### VR-P3-003: certification_marks

**Priority:** P3 (Optioneel)  
**Type:** String Array  
**Required:** NEE  
**Error Message:** "Certificaten maximaal 10 items"

**Business Value:** ISO norms, OEKO-TEX, etc.

**Zod Schema:**

```typescript
z.array(z.string().max(50))
  .max(10, 'Maximaal 10 certificaten')
  .optional()
```

---

### VR-P3-004: fit_type

**Priority:** P3 (Optioneel)  
**Type:** Enum  
**Required:** NEE  
**Allowed Values:** `'Regular'`, `'Slim'`, `'Loose'`, `'Oversized'`  
**Error Message:** "Fit type moet Regular, Slim, Loose of Oversized zijn"

**Business Value:** Fashion-specifieke metadata.

**Zod Schema:**

```typescript
z.enum(['Regular', 'Slim', 'Loose', 'Oversized']).optional()
```

---
**Unique:** Ja (globaal)  
**Format:** `MASTER-100000`, `MASTER-100001`, etc.  
**Auto-generated:** Database trigger sets sku_code on insert  
**Error Message:** "Master-code wordt automatisch gegenereerd, niet handmatig invoeren"

**Note:** Master-codes worden automatisch gegenereerd door de database als `MASTER-{id}` waar id begint bij 100000. Dit veld mag NIET handmatig worden ingevuld tijdens import of via forms.

**Zod Schema:**

```typescript
// Master-code niet valideren bij input - wordt door database gegenereerd
// Bij update: alleen valideren dat het formaat klopt
z.string()
  .regex(/^MASTER-\d+$/, 'Master-code moet formaat MASTER-{nummer} hebben')
  .optional() // Bij create niet meegeven
```

---

### VR-016: supplier_size_code (was size_code)

**Type:** String  
**Required:** Ja  
**Max Length:** 20  
**Allowed Values:** XS, S, M, L, XL, XXL, 3XL, 4XL, 5XL, 44-64 (even), ONE-SIZE, VRIJ  
**Error Message:** "Maat niet herkend. Gebruik: XS-5XL, 44-64, ONE-SIZE of VRIJ"

**Zod Schema:**

```typescript
const VALID_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL',
  '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64',
  'ONE-SIZE', 'VRIJ'
];

z.string()
  .refine((size) => VALID_SIZES.includes(size), {
    message: `Maat moet een van de volgende zijn: ${VALID_SIZES.join(', ')}`
  })
```

---

### VR-017: cost_price

**Type:** Decimal  
**Required:** Nee (OPTIONEEL voor etalage functie)  
**Min Value:** 0  
**Max Value:** 99999999.99  
**Precision:** 10,2  
**Error Message:** "Inkoopprijs moet positief zijn (max €99.999.999,99)"

**Business Context:** Alleen nodig voor marge berekening en rapportage. Niet verplicht voor etalage functie.

**Zod Schema:**

```typescript
z.number()
  .min(0, 'Inkoopprijs minimaal 0')
  .max(99999999.99)
  .optional()
  .nullable()
```

---

### VR-018: selling_price_excl_vat (💡 NIEUW: OPTIONEEL)

**Type:** Decimal  
**Required:** NEE (OPTIONEEL - "Prijs op aanvraag" strategie)  
**Min Value:** 0.01  
**Max Value:** 99999999.99  
**Precision:** 10,2  
**Error Message:** "Verkoopprijs minimaal €0,01 (indien ingevuld)"

**💡 NIEUW BELEID:**
- **NIET LANGER VERPLICHT** voor Master producten
- Producten zonder prijs tonen als **"Prijs op aanvraag"**
- Toekomstige **Pricing Service** vult prijzen in
- Pas verplicht bij **"Activeer voor Verkoop"** flow

**Business Rule (BR-007):** 
- Alleen valideren **ALS beide prijzen zijn ingevuld**
- Moet groter zijn dan cost_price (positieve marge)

**Zod Schema:**

```typescript
z.number()
  .min(0.01, 'Verkoopprijs minimaal €0,01')
  .max(99999999.99)
  .optional()
  .nullable()
  .refine((price, ctx) => {
    const costPrice = ctx.parent.cost_price;
    // Alleen valideren ALS BEIDE prijzen ingevuld zijn
    if (price && costPrice && price <= costPrice) {
      return false;
    }
    return true;
  }, {
    message: 'Verkoopprijs moet hoger zijn dan inkoopprijs (positieve marge vereist)'
  })
```

**Database Migration Nodig:** 
```sql
-- Remove NOT NULL constraint from selling_price_excl_vat
ALTER TABLE product_variants 
ALTER COLUMN selling_price_excl_vat DROP NOT NULL;
```

---

### VR-019: vat_rate

**Type:** Decimal  
**Required:** Ja  
**Default:** 21.00  
**Allowed Values:** 0, 9, 21 (Nederlandse BTW tarieven)  
**Precision:** 5,2  
**Error Message:** "BTW tarief moet 0%, 9% of 21% zijn"

**Zod Schema:**

```typescript
z.number()
  .refine((rate) => [0, 9, 21].includes(rate), {
    message: 'BTW tarief moet 0%, 9% of 21% zijn'
  })
```

---

### VR-020: sales_discount_perc

**Type:** Decimal  
**Required:** Nee  
**Min Value:** 0  
**Max Value:** 100  
**Precision:** 5,2  
**Error Message:** "Kortingspercentage moet tussen 0% en 100% zijn"

**Zod Schema:**

```typescript
z.number()
  .min(0)
  .max(100, 'Korting maximaal 100%')
  .optional()
```

---

## 4. Price Tier Validation

### VR-023: min_quantity

**Type:** Integer  
**Required:** Ja  
**Min Value:** 1  
**Error Message:** "Minimum aantal minimaal 1"

**Zod Schema:**

```typescript
z.number()
  .int()
  .min(1, 'Minimum aantal minimaal 1')
```

---

### VR-024: max_quantity

**Type:** Integer  
**Required:** Nee (NULL = onbeperkt)  
**Min Value:** min_quantity + 1  
**Error Message:** "Maximum aantal moet groter zijn dan minimum aantal"

**Zod Schema:**

```typescript
z.number()
  .int()
  .optional()
  .refine((max, ctx) => {
    if (max === null || max === undefined) return true;
    const min = ctx.parent.min_quantity;
    return max > min;
  }, {
    message: 'Maximum moet groter zijn dan minimum'
  })
```

---

### VR-025: tier_price_excl_vat

**Type:** Decimal  
**Required:** Ja  
**Min Value:** 0.01  
**Max Value:** selling_price_excl_vat (van parent SKU)  
**Error Message:** "Staffelprijs moet lager zijn dan standaard verkoopprijs"

**Zod Schema:**

```typescript
z.number()
  .min(0.01)
  .refine((tierPrice, ctx) => {
    const basePrice = ctx.parent.sku.selling_price_excl_vat;
    return tierPrice < basePrice;
  }, {
    message: 'Staffelprijs moet korting geven (lager dan standaardprijs)'
  })
```

---

## 5. Decoration Validation

### VR-026: setup_fee_eur

**Type:** Decimal  
**Required:** Nee  
**Default:** 0.00  
**Min Value:** 0  
**Max Value:** 9999.99  
**Precision:** 10,2  
**Error Message:** "Instelkosten minimaal €0"

**Zod Schema:**

```typescript
z.number()
  .min(0, 'Instelkosten minimaal €0')
  .max(9999.99)
  .default(0)
```

---

### VR-027: price_per_item_eur

**Type:** Decimal  
**Required:** Nee  
**Default:** 0.00  
**Min Value:** 0  
**Max Value:** 999.99  
**Precision:** 10,2  
**Error Message:** "Prijs per stuk minimaal €0"

**Zod Schema:**

```typescript
z.number()
  .min(0)
  .max(999.99)
  .default(0)
```

---

### VR-028: min_order_qty

**Type:** Integer  
**Required:** Nee  
**Default:** 1  
**Min Value:** 1  
**Max Value:** 10000  
**Error Message:** "Minimum order aantal tussen 1 en 10.000"

**Business Examples:**

- Borduren: min 10
- Print: min 1
- Laser: min 25

**Zod Schema:**

```typescript
z.number()
  .int()
  .min(1)
  .max(10000)
  .default(1)
```

---

### VR-029: max_colors_allowed

**Type:** Integer  
**Required:** Nee  
**Min Value:** 1  
**Max Value:** 12  
**Error Message:** "Maximum kleuren tussen 1 en 12"

**Business Examples:**

- Borduren: max 6 draadkleuren
- Zeefdruk: max 4 kleuren
- DTF Transfer: max 12 kleuren (full color)

**Zod Schema:**

```typescript
z.number()
  .int()
  .min(1)
  .max(12)
  .optional()
```

---

## 6. External Mapping Validation

### VR-030: external_system

**Type:** String  
**Required:** Ja  
**Max Length:** 100  
**Allowed Values:** 'Gripp', 'Calculated', 'Shopify', 'WooCommerce', 'Magento', etc.  
**Error Message:** "Extern systeem naam verplicht"

**Zod Schema:**

```typescript
z.string()
  .min(1, 'Extern systeem verplicht')
  .max(100)
```

---

### VR-031: external_product_code

**Type:** String  
**Required:** Ja  
**Max Length:** 100  
**Unique:** Per external_system + customer_id  
**Error Message:** "Externe productcode verplicht en uniek per systeem"

**Zod Schema:**

```typescript
z.string()
  .min(1, 'Externe productcode verplicht')
  .max(100)
  .refine(async (code, ctx) => {
    const system = ctx.parent.external_system;
    const customer = ctx.parent.customer_id;
    return await externalCodeIsUnique(system, code, customer);
  }, {
    message: 'Deze externe code bestaat al voor dit systeem'
  })
```

---

### VR-032: entity_type

**Type:** Enum  
**Required:** Ja  
**Allowed Values:** `'style'`, `'color_variant'`, `'sku'`, `'decoration_option'`  
**Error Message:** "Entity type moet style, color_variant, sku of decoration_option zijn"

**Zod Schema:**

```typescript
z.enum(['style', 'color_variant', 'sku', 'decoration_option'])
```

---

## 7. Date Validation

### VR-033: discount_valid_from

**Type:** Date  
**Required:** Conditional (als sales_discount_amount > 0)  
**Format:** YYYY-MM-DD  
**Error Message:** "Start datum verplicht voor kortingen"

**Zod Schema:**

```typescript
z.date()
  .refine((date) => date >= new Date(), {
    message: 'Startdatum kan niet in het verleden liggen'
  })
```

---

### VR-034: discount_valid_until

**Type:** Date  
**Required:** Nee  
**Min Value:** discount_valid_from + 1 dag  
**Error Message:** "Einddatum moet na startdatum liggen"

**Zod Schema:**

```typescript
z.date()
  .optional()
  .refine((end, ctx) => {
    if (!end) return true;
    const start = ctx.parent.discount_valid_from;
    return end > start;
  }, {
    message: 'Einddatum moet na startdatum liggen'
  })
```

---

## 8. Import Validation

### VR-035: File Upload Validation

**File Type:** Excel (.xlsx, .xls), CSV (.csv)  
**Max Size:** 10 MB  
**Error Message:** "Bestand moet Excel of CSV zijn, maximaal 10 MB"

**Validation:**

```typescript
z.instanceof(File)
  .refine((file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    return validTypes.includes(file.type);
  }, 'Alleen Excel (.xlsx, .xls) of CSV bestanden toegestaan')
  .refine((file) => file.size <= 10 * 1024 * 1024, {
    message: 'Bestand maximaal 10 MB'
  })
```

---

### VR-036: Required Import Columns

**Minimum Required:** sku, name, price  
**Recommended:** brand, supplier, category, color, size  
**Error Message:** "Import moet minimaal kolommen bevatten: SKU, Naam, Prijs"

**Validation:**

```typescript
const requiredColumns = ['sku', 'name', 'price'];
const missingColumns = requiredColumns.filter(col => !headers.includes(col));

if (missingColumns.length > 0) {
  throw new ValidationError(
    `Ontbrekende verplichte kolommen: ${missingColumns.join(', ')}`
  );
}
```

---

## 9. Cross-Field Validation

### VR-037: Price Hierarchy

**Rule:** RRP ≥ Selling Price ≥ Cost Price  
**Error Message:** "Prijshiërarchie ongeldig: RRP ≥ Verkoopprijs ≥ Inkoopprijs"

**Zod Schema:**

```typescript
z.object({
  cost_price: z.number().optional(),
  selling_price_excl_vat: z.number(),
  rrp_excl_vat: z.number().optional()
}).refine((prices) => {
  const { cost_price, selling_price_excl_vat, rrp_excl_vat } = prices;

  // Check cost < selling
  if (cost_price && selling_price_excl_vat < cost_price) {
    return false;
  }

  // Check selling < rrp
  if (rrp_excl_vat && selling_price_excl_vat > rrp_excl_vat) {
    return false;
  }

  return true;
}, {
  message: 'Prijshiërarchie ongeldig: RRP ≥ Verkoopprijs ≥ Inkoopprijs'
})
```

---

### VR-038: Discount Amount vs Percentage

**Rule:** Als sales_discount_amount > 0, dan mag sales_discount_perc niet > 0 (kies één)  
**Error Message:** "Geef óf een kortingsbedrag óf een kortingspercentage, niet beide"

**Zod Schema:**

```typescript
z.object({
  sales_discount_amount: z.number().default(0),
  sales_discount_perc: z.number().default(0)
}).refine((discount) => {
  return !(discount.sales_discount_amount > 0 && discount.sales_discount_perc > 0);
}, {
  message: 'Gebruik óf kortingsbedrag óf kortingspercentage, niet beide'
})
```

---

## 5. Category Validation

### VR-026: Category Assignment

**Type:** Object Array  
**Required:** Ja  
**Min Items:** 1  
**Business Rule:** Exact 1 ALG category required  
**Error Message:** "Product moet exact 1 ALG categorie hebben"

**Zod Schema:**

```typescript
const productCategorySchema = z.object({
  category_id: z.string().uuid('Ongeldige category ID'),
  taxonomy_code: z.enum(['ALG', 'GS1'])
});

const productStyleWithCategoriesSchema = z.object({
  style_name: z.string().min(1).max(200),
  brand_id: z.number().int().positive(),
  
  // Category validation
  categories: z.array(productCategorySchema)
    .refine((cats) => {
      const algCategories = cats.filter(c => c.taxonomy_code === 'ALG');
      return algCategories.length === 1;
    }, {
      message: 'Product moet exact 1 ALG categorie hebben'
    })
});
```

---

### VR-027: Import Template Validation

**Type:** Object  
**Required:** Ja voor column_mappings  
**Error Message:** "Minimaal 1 column mapping vereist"

**Zod Schema:**

```typescript
const importTemplateSchema = z.object({
  supplier_id: z.number().int().positive().optional(),
  template_name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  column_mappings: z.array(z.object({
    source_column: z.string().min(1),
    target_field: z.string().min(1),
    transformation: z.enum(['uppercase', 'lowercase', 'trim', 'parse_decimal']).optional()
  })).min(1, 'Minimaal 1 column mapping vereist'),
  category_mappings: z.array(z.object({
    source_value: z.string(),
    target_category_id: z.string().uuid(),
    taxonomy_code: z.enum(['ALG', 'GS1'])
  })).optional()
});
```

---

### VR-028: User Role Assignment

**Type:** Enum  
**Required:** Ja  
**Allowed Values:** `'admin'`, `'user'`  
**Error Message:** "Role moet admin of user zijn"

**Zod Schema:**

```typescript
const userInviteSchema = z.object({
  email: z.string().email('Ongeldig email adres').max(255),
  role: z.enum(['admin', 'user'], {
    errorMap: () => ({ message: 'Role moet admin of user zijn' })
  })
});
```

---

### VR-045: EAN Prefix Format

**Veld:** `brands.ean_prefix`  
**Type:** VARCHAR(9)  
**Status:** Optioneel  

**Validatie:**
- Formaat: `/^\d{6,9}$/` (6-9 cijfers, alleen numeriek)
- Minimaal: 6 cijfers
- Maximaal: 9 cijfers
- Geen spaties, streepjes of andere karakters

**Voorbeelden:**
- ✅ `871959` (6 cijfers - Tricorp)
- ✅ `8712412` (7 cijfers - Santino)
- ✅ `87119598` (8 cijfers - mogelijk)
- ❌ `87-1959` (bevat streepje)
- ❌ `87195` (te kort)
- ❌ `8719598774` (te lang - dit is volledig EAN)

**Error Messages:**
- Ongeldig formaat: "EAN prefix moet 6-9 cijfers zijn (zonder spaties of speciale tekens)"

**Zod Schema:**

```typescript
ean_prefix: z.string()
  .regex(/^\d{6,9}$/, 'EAN prefix moet 6-9 cijfers zijn')
  .optional()
  .nullable()
  .transform(val => val === '' ? null : val)
```

---

## Validation Summary Matrix

| Field                  | Required | Type    | Min  | Max         | Pattern        | Unique         |
| ---------------------- | -------- | ------- | ---- | ----------- | -------------- | -------------- |
| style_name             | ✓        | string  | 1    | 200         | -              | Per brand      |
| ean                    | ✓        | string  | 13   | 13          | `^\d{13}$`     | ✓              |
| sku_code               | Auto     | string  | -    | 50          | `^VK-\d+$`     | ✓ (DB trigger) |
| size_code              | ✓        | string  | 1    | 20          | enum           | -              |
| selling_price_excl_vat | ✓        | decimal | 0.01 | 99999999.99 | -              | -              |
| stock_quantity         | -        | integer | 0    | ∞           | -              | -              |
| vat_rate               | ✓        | decimal | -    | -           | enum: 0, 9, 21 | -              |

---

_Document wordt bijgewerkt bij nieuwe validatie requirements._

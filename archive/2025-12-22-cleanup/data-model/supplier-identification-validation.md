# Supplier Identification Validation Rules

**Created:** 20 oktober 2025  
**Purpose:** Validatieregels voor leverancier originele identificatie codes (traceerbaarheid)

---

## Overview

Deze validatieregels gelden voor de nieuwe supplier identificatie velden die zijn toegevoegd aan het PIM-systeem. Deze velden bewaren de originele codes van leveranciers voor volledige traceerbaarheid tussen Master interne codes en leverancier codes.

---

## VR-039: supplier_sku

**Table:** product_variants  
**Type:** VARCHAR(100)  
**Required:** Nee (optioneel)  
**Nullable:** Yes  
**Description:** Originele SKU code van de leverancier

**Examples:**
- TEE JAYS: `CSV_Code` → `1000-BLACK-M`
- Roerdink: `ArtikelID` → `245554-39`
- ELKA: `Art. number` → `70340-001-XS`

**Business Rule:** Dit veld wordt gebruikt voor:
1. **Traceerbaarheid**: Koppeling terug naar leverancier originele bestelsysteem
2. **Herordenen**: Gebruik leverancier code bij herbestellen
3. **Duplicate Detection**: Check of product al geïmporteerd is op basis van supplier_sku

**Validation Rules:**
- Max length: 100 karakters
- Geen verplichte pattern (leveranciers gebruiken verschillende formats)
- Mag leeg zijn (niet alle leveranciers geven SKU codes)

**Zod Schema:**

```typescript
z.string()
  .max(100, 'Maximaal 100 karakters')
  .nullable()
  .optional()
```

**Import Mapping Priority:**
1. Check eerst op leverancier-specifieke SKU kolom (ArtikelID, CSV_Code, etc.)
2. Map naar BOTH `supplier_sku` (origineel) EN `sku_code` (Master intern)

---

## VR-040: supplier_article_nr

**Table:** product_variants  
**Type:** VARCHAR(100)  
**Required:** Nee (optioneel)  
**Nullable:** Yes  
**Description:** Alternatief leverancier artikelnummer (secundaire identifier)

**Examples:**
- Bestex: `Artikelcode` → `AMK100-FLGROEN-44`
- ELKA: `Art. number` → `70340-001-XS`

**Business Rule:** Sommige leveranciers gebruiken meerdere codes:
- Een model/style code (bijv. `AMK100`)
- Een volledige artikelcode met kleur/maat (bijv. `AMK100-FLGROEN-44`)

Dit veld vangt de tweede identifier op voor maximale flexibiliteit.

**Use Cases:**
- **Duplicate Detection**: Tweede check naast supplier_sku
- **Alternative Ordering**: Sommige leveranciers accepteren beide codes
- **Migration**: Legacy codes van oude systemen

**Validation Rules:**
- Max length: 100 karakters
- Geen verplichte pattern
- Mag leeg zijn

**Zod Schema:**

```typescript
z.string()
  .max(100, 'Maximaal 100 karakters')
  .nullable()
  .optional()
```

**Import Logic:**
```typescript
// Prioriteit:
1. Als kolom "Artikelcode" of "Article Nr" → supplier_article_nr
2. Als anders dan supplier_sku → supplier_article_nr
3. Anders: leeglaten
```

---

## VR-041: supplier_article_code (was: supplier_style_code)

**Table:** product_styles  
**Type:** VARCHAR(100)  
**Required:** Nee (optioneel)  
**Nullable:** Yes  
**Description:** Originele artikel/model code van de leverancier (zonder kleur/maat)

**Examples:**
- TEE JAYS: `TJ_Style_no` → `1000`
- Roerdink: `ModelID` → `245554`
- ELKA: `Product code` → `70340`
- Bestex: `Modelcode` → `AMK100`

**Business Rule:** Artikel code representeert het basis model ZONDER kleur of maat varianten. Dit is het "grandparent" niveau in de product hiërarchie.

**Use Cases:**
1. **Product Family Grouping**: Groepeer alle kleur/maat varianten van zelfde artikel
2. **Supplier Catalog Matching**: Link naar leverancier productpagina's
3. **Bulk Updates**: Update alle varianten van een artikel tegelijk
4. **Reporting**: Analyseer performance per leverancier model

**Validation Rules:**
- Max length: 100 karakters
- Geen verplichte pattern (elke leverancier heeft eigen notatie)
- Mag leeg zijn (sommige leveranciers hebben alleen SKU level codes)

**Zod Schema:**

```typescript
z.string()
  .max(100, 'Maximaal 100 karakters')
  .nullable()
  .optional()
```

**Import Mapping Strategy:**
```typescript
// TEE JAYS voorbeeld:
supplier_article_code: "1000"      // TJ_Style_no

// Roerdink voorbeeld:
supplier_article_code: "245554"    // ModelID
```

---

## Import Validation Logic

### Duplicate Detection Hierarchy

Bij import wordt in deze volgorde gecheckt:

```typescript
// 1. EAN (hoogste prioriteit - uniek in database)
if (ean) {
  const exists = await checkEAN(ean);
  if (exists) return 'UPDATE';
}

// 2. Supplier SKU + Supplier ID
if (supplier_sku && supplier_id) {
  const exists = await checkSupplierSKU(supplier_sku, supplier_id);
  if (exists) return 'UPDATE';
}

// 3. Supplier Article Nr + Supplier ID
if (supplier_article_nr && supplier_id) {
  const exists = await checkSupplierArticle(supplier_article_nr, supplier_id);
  if (exists) return 'UPDATE';
}

// 4. SKU Code (Master intern - fallback)
if (sku_code) {
  const exists = await checkSKUCode(sku_code);
  if (exists) return 'UPDATE';
}

return 'INSERT'; // Nieuw product
```

### Validation Errors

**VR-039 Violation:**
```
Error: "Leverancier SKU mag maximaal 100 karakters zijn"
Quality Score: -5 punten
Severity: LOW (veld is optioneel)
```

**VR-040 Violation:**
```
Error: "Leverancier artikelnummer mag maximaal 100 karakters zijn"
Quality Score: -5 punten
Severity: LOW (veld is optioneel)
```

**VR-041 Violation:**
```
Error: "Leverancier style code mag maximaal 100 karakters zijn"
Quality Score: -5 punten
Severity: LOW (veld is optioneel)
```

**Note:** Deze validaties zijn relatief mild omdat de velden optioneel zijn en geen impact hebben op core functionaliteit als ze te lang zijn (worden gewoon getrimmed).

---

## Database Indexes

Voor efficiënte lookups zijn indexes aangemaakt:

```sql
-- Individual lookups
CREATE INDEX idx_variants_supplier_sku 
  ON product_variants(supplier_sku) 
  WHERE supplier_sku IS NOT NULL;

CREATE INDEX idx_variants_supplier_article 
  ON product_variants(supplier_article_nr) 
  WHERE supplier_article_nr IS NOT NULL;

CREATE INDEX idx_styles_supplier_code 
  ON product_styles(supplier_article_code) 
  WHERE supplier_article_code IS NOT NULL;

-- Composite lookup (voor duplicate detection)
CREATE INDEX idx_variants_color_supplier_sku 
  ON product_variants(color_variant_id, supplier_sku) 
  WHERE supplier_sku IS NOT NULL;
```

**Performance Note:** Partial indexes (WHERE NOT NULL) zijn gebruikt om index grootte te beperken aangezien deze velden optioneel zijn.

---

## Migration Impact

**Breaking Changes:** Geen - alle nieuwe velden zijn optioneel (nullable)

**Data Migration:** Niet nodig - bestaande data blijft ongewijzigd

**Future Imports:** Nieuwe imports zullen automatisch supplier codes opslaan via handmatige column mapping templates

---

## Testing Checklist

- [ ] Import TEE JAYS file → Verify `TJ_Style_no` in `supplier_article_code`
- [ ] Import ELKA file → Verify `Art. number` in `supplier_article_nr`
- [ ] Import Bestex file → Verify `Modelcode` in `supplier_article_code`
- [ ] Import Roerdink CSV → Verify `ArtikelID` in `supplier_sku`
- [ ] Test duplicate detection met `supplier_sku`
- [ ] Test database performance met partial indexes
- [ ] Verify validation errors show correct VR numbers
- [ ] Test UPDATE vs INSERT logic met supplier codes

---

**References:**
- Database Schema: `docs/technical/database-schema.md`
- Import Architecture: `docs/technical/import-architecture.md`
- Validation Rules (Main): `docs/data-model/validation-rules.md`

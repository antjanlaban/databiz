# Mapping Templates

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Dit document beschrijft de mapping templates die gebruikt worden voor het importeren van leveranciersdata naar het Van Kruiningen PIM-systeem. Elke template definieert hoe kolommen uit supplier bestanden (Excel/CSV) worden gemapped naar PIM database velden, inclusief transformatie regels en validaties.

**Purpose:**

- Herbruikbare mappings per leverancier
- Consistente data import
- Snellere verwerking van herhaalde imports
- Documentatie van transformatie logica

---

## Template Structure

### Generic Template Format

Een mapping template bestaat uit:

```json
{
  "template_id": "unique-identifier",
  "template_name": "Human readable name",
  "supplier_id": null,
  "created_at": "2025-10-17T10:00:00Z",
  "updated_at": "2025-10-17T10:00:00Z",
  "is_active": true,
  "column_mappings": [
    {
      "source_column": "Supplier column name",
      "target_field": "pim_database_field",
      "is_required": true,
      "default_value": null,
      "transformation_rules": []
    }
  ],
  "validation_rules": [],
  "import_settings": {}
}
```

---

## 1. Core Field Mappings

### 1.1 Product Style Mappings

**Target Table:** `product_styles`

| Source Column Variants                               | Target Field              | Type    | Transformation                         | Notes                       |
| ---------------------------------------------------- | ------------------------- | ------- | -------------------------------------- | --------------------------- |
| "Art.nr", "Artikelnummer", "Article No", "Code"      | supplier_article_code     | string  | UPPERCASE, trim                        | Optional                    |
| "Omschrijving", "Description", "Name", "Productnaam" | style_name                | string  | trim                                   | Required, unique per brand  |
| "Merk", "Brand", "Brandname"                         | brand_id                  | integer | Lookup via brand_name → brand_id       | Conditional required (KERN) |
| "Leverancier", "Supplier", "Vendor"                  | supplier_id               | integer | Lookup via supplier_name → supplier_id | Optional                    |
| "Type", "Producttype", "Category"                    | product_type              | enum    | Default: 'KERN'                        | Optional                    |
| "Materiaal", "Material", "Composition"               | material_composition      | string  | trim                                   | Optional                    |
| "Gewicht", "Weight", "Fabric weight"                 | fabric_weight             | decimal | Parse number, strip units              | Optional                    |
| "Pasvorm", "Fit"                                     | fit_type                  | string  | trim                                   | Optional                    |
| "Geslacht", "Gender"                                 | gender                    | enum    | Map: M→Heren, V→Dames, U→Unisex        | Optional                    |

---

### 1.2 Color Variant Mappings

**Target Table:** `color_variants`

| Source Column Variants              | Target Field        | Type    | Transformation                       | Notes       |
| ----------------------------------- | ------------------- | ------- | ------------------------------------ | ----------- |
| "Kleurcode", "Color code", "Colour" | color_code          | string  | UPPERCASE, trim                      | Required    |
| "Kleurnaam", "Color name", "Kleur"  | color_name_supplier | string  | trim, Store original                 | Required    |
| →                                   | color_family_id     | integer | Lookup via color normalization table | Auto-mapped |
| →                                   | color_name_nl       | string  | Normalize to Dutch standard          | Auto-mapped |
| "Hex", "#HEX", "Color code"         | hex_color           | string  | Ensure # prefix, validate format     | Optional    |
| "Pantone", "PMS"                    | pantone_code        | string  | Extract code, strip 'PMS'/'C' suffix | Optional    |

**Color Normalization Examples:**

| Supplier Input | Normalized (color_family_id) | Dutch Name (color_name_nl) |
| -------------- | ---------------------------- | -------------------------- |
| "Navy"         | 5 (Navy family)              | "Donkerblauw"              |
| "Navy Blue"    | 5 (Navy family)              | "Donkerblauw"              |
| "Marine"       | 5 (Navy family)              | "Donkerblauw"              |
| "Black"        | 1 (Zwart family)             | "Zwart"                    |
| "Schwarz"      | 1 (Zwart family)             | "Zwart"                    |
| "Noir"         | 1 (Zwart family)             | "Zwart"                    |
| "Gray"         | 3 (Grijs family)             | "Grijs"                    |
| "Grey"         | 3 (Grijs family)             | "Grijs"                    |
| "Grau"         | 3 (Grijs family)             | "Grijs"                    |

---

### 1.3 Product Variant Mappings

**Target Table:** `product_variants`

| Source Column Variants                        | Target Field           | Type    | Transformation                           | Notes                                  |
| --------------------------------------------- | ---------------------- | ------- | ---------------------------------------- | -------------------------------------- |
| "EAN", "Barcode", "EAN13"                     | ean                    | string  | Strip spaces/dashes, validate 13 digits  | **VERPLICHT - Primaire identifier**    |
| →                                             | sku_code               | string  | Auto-generated: `MASTER-{id}`            | Auto-generated (DO NOT map from file)  |
| "Maat", "Size", "Grootte"                     | supplier_size_code     | string  | Normalize via size mapping table         | Required                               |
| "Inkoopprijs", "Cost", "Purchase price"       | cost_price             | integer | Parse decimal → cents, handle €/currency | Optional                               |
| "Verkoopprijs", "Price", "Sales price", "RRP" | selling_price_excl_vat | integer | Parse decimal → cents, handle €/currency | Required                               |
| "BTW", "VAT", "Tax"                           | vat_rate               | number  | Map: high→21, low→9, zero→0              | Default: 21                            |

**CRITICAL:** 
- `sku_code` (Master-nummer) is automatically generated by the database trigger as `MASTER-{id}` (starting from MASTER-100000). This field should **NEVER** be mapped from import files.
- `ean` is **VERPLICHT** en is het primaire identificatieveld voor matching en deduplicatie.

**Size Normalization Examples:**

| Supplier Input | Normalized (size_code) | size_label | size_order |
| -------------- | ---------------------- | ---------- | ---------- |
| "44"           | "44"                   | "44 / XS"  | 1          |
| "XS"           | "XS"                   | "XS"       | 1          |
| "46"           | "46"                   | "46 / S"   | 2          |
| "S"            | "S"                    | "S"        | 2          |
| "Small"        | "S"                    | "S"        | 2          |
| "48"           | "48"                   | "48 / M"   | 3          |
| "M"            | "M"                    | "M"        | 3          |
| "Medium"       | "M"                    | "M"        | 3          |
| "XXXL"         | "3XL"                  | "3XL"      | 7          |
| "ONE SIZE"     | "ONE-SIZE"             | "One Size" | 99         |

**Price Transformation Examples:**

```typescript
// Handle various price formats
"€ 44,95"     → 44.95
"44.95"       → 44.95
"44,95"       → 44.95
"EUR 44.95"   → 44.95
"$44.95"      → 44.95 (assuming EUR, currency conversion needed)
"44,95 EUR"   → 44.95
```

---

## 2. Supplier-Specific Templates

### 2.1 Template: Generic Excel Import

**Template ID:** `template-generic-excel`  
**Supplier:** Generic / Unknown  
**File Format:** Excel (.xlsx)  
**Use Case:** Eerste import van nieuwe leverancier

**Expected Columns:**

- Minimum required: SKU/Article, Name, Price
- Recommended: Brand, Color, Size, EAN, Stock

**Column Mappings:**

```json
{
  "column_mappings": [
    {
      "source_column": "EAN",
      "target_field": "ean",
      "is_required": true,
      "transformation_rules": ["strip_whitespace", "validate_ean13"]
    },
    {
      "source_column": "Omschrijving",
      "target_field": "style_name",
      "is_required": true,
      "transformation_rules": ["trim"]
    },
    {
      "source_column": "Verkoopprijs",
      "target_field": "selling_price_excl_vat",
      "is_required": true,
      "transformation_rules": ["parse_price", "to_cents"]
    },
    {
      "source_column": "Merk",
      "target_field": "brand_id",
      "is_required": false,
      "transformation_rules": ["lookup_brand"]
    },
    {
      "source_column": "Kleur",
      "target_field": "color_name_supplier",
      "is_required": false,
      "transformation_rules": ["normalize_color"]
    },
    {
      "source_column": "Maat",
      "target_field": "size_code",
      "is_required": false,
      "transformation_rules": ["normalize_size"]
    },
    {
      "source_column": "EAN",
      "target_field": "ean",
      "is_required": false,
      "transformation_rules": ["strip_whitespace", "validate_ean13"]
    },
    {
      "source_column": "Voorraad",
      "target_field": "stock_quantity",
      "is_required": false,
      "default_value": 0,
      "transformation_rules": ["parse_integer"]
    }
  ]
}
```

**Validation Rules:**

- If `ean` is empty or invalid, skip row with error
- If `selling_price_excl_vat` is 0 or negative, flag as error
- If `ean` fails checksum, flag as warning (not blocking)
- `sku_code` will be auto-generated, do not validate from import

**Import Settings:**

```json
{
  "skip_header_rows": 1,
  "sheet_name": "Prijslijst",
  "batch_size": 100,
  "update_strategy": "upsert",
  "match_on": ["ean"]
}
```

---

### 2.2 Template: Tricorp Standard Format

**Template ID:** `template-tricorp-standard`  
**Supplier:** Tricorp  
**File Format:** Excel (.xlsx)  
**Sheet Name:** "Prijslijst"

**Known Column Structure:**
| Position | Column Name | PIM Field | Notes |
|----------|-------------|-----------|-------|
| A | Artikelnummer | supplier_article_code | Format: TNN.NNN |
| B | Omschrijving | style_name | - |
| C | Kleur | color_name_supplier | Dutch names |
| D | Maat | size_code | Numeric (44-64) + Letter (XS-5XL) |
| E | EAN | ean | 13 digits |
| F | Inkoopprijs | cost_price | Excl. BTW |
| G | Adviesprijs | rrp_excl_vat | Excl. BTW |
| H | Verkoopprijs | selling_price_excl_vat | Excl. BTW |
| I | Voorraad | stock_quantity | Integer |

**Special Handling:**

- Supplier article code: "T23.456" → Store as-is in `supplier_article_code`
- SKU code: Auto-generated as "MASTER-100001", "MASTER-100002", etc.
- Color names: Already in Dutch, no translation needed
- Sizes: Mix of numeric and letter, normalize to standard
- Prices: Always in euros, 2 decimals

**Column Mappings:**

```json
{
  "column_mappings": [
    {
      "source_column": "Artikelnummer",
      "target_field": "supplier_article_code",
      "is_required": false,
      "transformation_rules": ["trim", "uppercase"]
    },
    {
      "source_column": "EAN",
      "target_field": "ean",
      "is_required": true,
      "transformation_rules": ["strip_whitespace", "validate_ean13"]
    },
    {
      "source_column": "Kleur",
      "target_field": "color_name_supplier",
      "is_required": true,
      "transformation_rules": ["trim", "normalize_color_dutch"]
    },
    {
      "source_column": "Maat",
      "target_field": "size_code",
      "is_required": true,
      "transformation_rules": ["normalize_size_mixed"]
    }
  ]
}
```

**Import Settings:**

```json
{
  "skip_header_rows": 1,
  "sheet_name": "Prijslijst",
  "supplier_id": 1,
  "default_brand_id": 5,
  "default_vat_rate": 21.00,
  "update_strategy": "upsert",
  "match_on": ["ean"]
}
```

---

### 2.3 Template: Snickers International Format

**Template ID:** `template-snickers-intl`  
**Supplier:** Snickers Workwear  
**File Format:** CSV (semicolon-separated)  
**Encoding:** UTF-8

**Known Column Structure:**
| Column Name | PIM Field | Notes |
|-------------|-----------|-------|
| Article_No | supplier_article_code | Format: NNNN-NNN |
| Description_EN | style_name | English, needs translation or override |
| Color_EN | color_name_supplier | English color names |
| Size_EU | size_code | Numeric EU sizes |
| EAN_Code | ean | 13 digits |
| Price_EUR | selling_price_excl_vat | Excl. VAT |

**Special Handling:**

- CSV delimiter: Semicolon (;)
- Supplier article codes stored as-is
- SKU codes auto-generated as VK-{id}
- English descriptions: Use as-is or manual translation
- Color names: English → Dutch via mapping table
- EU numeric sizes only: 44, 46, 48, 50, etc.

**Column Mappings:**

```json
{
  "column_mappings": [
    {
      "source_column": "Article_No",
      "target_field": "supplier_article_code",
      "is_required": false,
      "transformation_rules": ["trim", "uppercase"]
    },
    {
      "source_column": "Description_EN",
      "target_field": "style_name",
      "is_required": true,
      "transformation_rules": ["trim"]
    },
    {
      "source_column": "Color_EN",
      "target_field": "color_name_supplier",
      "is_required": true,
      "transformation_rules": ["normalize_color_english_to_dutch"]
    },
    {
      "source_column": "Size_EU",
      "target_field": "size_code",
      "is_required": true,
      "transformation_rules": ["normalize_size_numeric"]
    },
    {
      "source_column": "EAN_Code",
      "target_field": "ean",
      "is_required": true,
      "transformation_rules": ["strip_whitespace", "validate_ean13"]
    },
    {
      "source_column": "Price_EUR",
      "target_field": "selling_price_excl_vat",
      "is_required": true,
      "transformation_rules": ["parse_decimal"]
    }
  ]
}
```

**Import Settings:**

```json
{
  "file_delimiter": ";",
  "skip_header_rows": 1,
  "supplier_id": 2,
  "default_brand_id": 7,
  "default_vat_rate": 21.00,
  "update_strategy": "upsert",
  "match_on": ["ean"]
}
```

---

## 3. Transformation Rules Library

### 3.1 String Transformations

**trim**

```typescript
value.trim()
```

**uppercase**

```typescript
value.toUpperCase()
```

**lowercase**

```typescript
value.toLowerCase()
```

**replace_spaces_with_dash**

```typescript
value.replace(/\s+/g, '-')
```

**strip_non_alphanumeric**

```typescript
value.replace(/[^A-Z0-9-]/g, '')
```

---

### 3.2 Number Transformations

**parse_integer**

```typescript
parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
```

**parse_decimal**

```typescript
parseFloat(value.replace(',', '.').replace(/[^0-9.]/g, '')) || 0
```

**parse_price**

```typescript
// Handle various formats: "€ 44,95", "44.95", "44,95 EUR"
const cleaned = value.replace(/[€$£]/g, '').replace(/[A-Z]/g, '').trim();
const normalized = cleaned.replace(',', '.');
return parseFloat(normalized) || 0;
```

**to_cents**

```typescript
Math.round(value * 100)
```

---

### 3.3 Lookup Transformations

**lookup_brand**

```typescript
// Input: "Tricorp"
// Output: brand_id via database lookup
const brand = await db.brands.findFirst({
  where: { brand_name: { equals: value, mode: 'insensitive' } }
});
return brand?.brand_id || null;
```

**lookup_supplier**

```typescript
const supplier = await db.suppliers.findFirst({
  where: { supplier_name: { equals: value, mode: 'insensitive' } }
});
return supplier?.supplier_id || null;
```

---

### 3.4 Normalization Transformations

**normalize_color**

```typescript
// Map supplier color name to color_family_id and standard Dutch name
const colorMapping = {
  'Navy': { family_id: 5, name_nl: 'Donkerblauw' },
  'Navy Blue': { family_id: 5, name_nl: 'Donkerblauw' },
  'Black': { family_id: 1, name_nl: 'Zwart' },
  'White': { family_id: 2, name_nl: 'Wit' },
  'Gray': { family_id: 3, name_nl: 'Grijs' },
  'Grey': { family_id: 3, name_nl: 'Grijs' },
  // ... etc
};

const mapping = colorMapping[value] || colorMapping[value.toLowerCase()];
return {
  color_family_id: mapping?.family_id || null,
  color_name_nl: mapping?.name_nl || value,
  color_name_supplier: value
};
```

**normalize_size**

```typescript
// Map various size inputs to standard codes
const sizeMapping = {
  '44': { code: '44', label: '44 / XS', order: 1 },
  'XS': { code: 'XS', label: 'XS', order: 1 },
  'Extra Small': { code: 'XS', label: 'XS', order: 1 },
  '46': { code: '46', label: '46 / S', order: 2 },
  'S': { code: 'S', label: 'S', order: 2 },
  'Small': { code: 'S', label: 'S', order: 2 },
  // ... etc
  'XXXL': { code: '3XL', label: '3XL', order: 7 },
  'ONE SIZE': { code: 'ONE-SIZE', label: 'One Size', order: 99 }
};

const mapping = sizeMapping[value] || sizeMapping[value.toUpperCase()];
return {
  size_code: mapping?.code || value,
  size_label: mapping?.label || value,
  size_order: mapping?.order || 999
};
```

---

### 3.5 Validation Transformations

**validate_ean13**

```typescript
// EAN-13 check digit validation
function validateEAN13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;

  const digits = ean.split('').map(Number);
  const checkDigit = digits.pop()!;

  const sum = digits.reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}

// Apply validation
if (!validateEAN13(value)) {
  throw new ValidationError(`Invalid EAN-13 check digit: ${value}`);
}
return value;
```

---

## 4. Import Conflict Resolution

### 4.1 Match Strategies

**match_on: ["ean"]** (Recommended)

```typescript
// Find existing record by EAN
const existing = await db.product_variants.findUnique({
  where: { ean: importRow.ean }
});
```

**Note:** Since `sku_code` (Master-nummer) is auto-generated, it cannot be used for matching during imports. Always use `ean` for matching existing records.

---

### 4.2 Update Strategies

**insert_only**

- Skip if record exists
- Only insert new records
- No updates to existing data

**update_existing**

- Update if record exists
- Skip if record doesn't exist
- No new inserts

**upsert**

- Insert if new
- Update if exists
- Default strategy

**mirror_sync**

- Full synchronization
- Insert new, update existing
- Delete records not in import (⚠️ Dangerous)

---

## 5. Error Handling

### 5.1 Error Types

**Validation Errors** (Block import)

- Missing required field
- Invalid data type
- EAN check digit failure
- Negative price
- Duplicate EAN within import file

**Warnings** (Log, continue)

- Missing optional field
- Unknown brand (uses default or NULL)
- Unknown color (uses original name)
- Price = 0 (possible free item)
- Stock = 0 (out of stock)

**Critical Errors** (Stop import)

- File not found
- File format unreadable
- Database connection failed
- Out of memory

---

### 5.2 Error Reporting Format

```json
{
  "import_id": 12345,
  "status": "completed_with_errors",
  "summary": {
    "total_rows": 1500,
    "processed": 1485,
    "inserted": 120,
    "updated": 1365,
    "skipped": 10,
    "errors": 5
  },
  "errors": [
    {
      "row_number": 42,
      "ean": "8712345678902",
      "error_type": "validation_error",
      "field": "ean",
      "message": "EAN-13 check digit invalid: 8712345678902",
      "severity": "error"
    },
    {
      "row_number": 127,
      "ean": "8712345678901",
      "error_type": "duplicate_ean",
      "field": "ean",
      "message": "EAN 8712345678901 already exists for another product",
      "severity": "error"
    },
    {
      "row_number": 284,
      "style_name": "Polo Shirt Classic",
      "error_type": "warning",
      "field": "brand_id",
      "message": "Brand 'Onbekend Merk' not found, using NULL",
      "severity": "warning"
    }
  ]
}
```

---

## 6. Template Storage

### 6.1 Database Table (Future Implementation)

```sql
CREATE TABLE import_mapping_templates (
  template_id SERIAL PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(supplier_id),
  file_format VARCHAR(20), -- 'excel', 'csv', 'json'
  is_active BOOLEAN DEFAULT TRUE,
  column_mappings JSONB NOT NULL,
  import_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Template Selection Logic

```typescript
// Auto-detect template based on file structure
function detectTemplate(file: File, headers: string[]): MappingTemplate {
  // Check if exact supplier template matches
  if (headers.includes('Article_No') && headers.includes('Color_EN')) {
    return templates.find(t => t.template_id === 'template-snickers-intl');
  }

  // Check if generic Excel format
  if (headers.includes('Artikelnummer') && headers.includes('Omschrijving')) {
    return templates.find(t => t.template_id === 'template-generic-excel');
  }

  // Fallback to manual mapping
  return templates.find(t => t.template_id === 'template-manual');
}
```

---

## 7. Best Practices

### Template Creation

1. ✅ Start with generic template
2. ✅ Test import with small sample (10-50 rows)
3. ✅ Validate all transformations produce expected output
4. ✅ Document supplier-specific quirks
5. ✅ Save template for reuse

### Template Maintenance

1. ✅ Update template when supplier changes format
2. ✅ Version control templates (include date in template_name)
3. ✅ Keep last 3 successful import templates per supplier
4. ✅ Document why transformations were added/changed

### Import Process

1. ✅ Always preview first 10 rows before full import
2. ✅ Run validation-only mode first
3. ✅ Test on staging environment with copy of production data
4. ✅ Schedule imports during low-traffic hours
5. ✅ Keep original import files for 90 days (audit trail)

---

_Dit document wordt bijgewerkt wanneer nieuwe supplier formats worden toegevoegd._

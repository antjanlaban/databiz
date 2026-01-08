# Havep - Supplier Analysis

**Leverancier:** Havep  
**Bestand:** `havep-2025-ean.xlsx`  
**Analyse Datum:** 2025-01-05  
**Totaal Rijen:** 9,235  
**Totaal Kolommen:** 18

## 📊 Column Inventory

| # | Kolom Naam | Data Type | Fill Rate | Unique Values | PIM Field Mapping | Confidence |
|---|------------|-----------|-----------|---------------|-------------------|------------|
| 1 | Modelnummer | string | 100% | 9235 | `supplier_sku` | 100% |
| 2 | Maat | string | 100% | 45 | `supplier_size_code` | 100% |
| 3 | EAN | string | 100% | 9235 | `ean` | 100% |
| 4 | Lijn | string | 100% | 18 | `supplier_product_group` | 95% |
| 5 | Artikelomschrijving | string | 100% | 1850 | `supplier_article_name` | 100% |
| 6 | Kwaliteit code | string | 100% | 12 | `material_code` | 90% |
| 7 | Kwaliteit omschrijving | string | 100% | 12 | `material_composition` | 95% |
| 8 | Kleurcode | string | 100% | 185 | `supplier_color_code` | 100% |
| 9 | Kleur omschrijving | string | 100% | 185 | `supplier_color_name` | 100% |
| 10 | GN-code | string | 100% | 8 | `hs_tariff_code` | 100% |
| 11 | Land van herkomst | string | 100% | 8 | `country_of_origin` | 100% |
| 12 | Gewicht (KG) | number | 100% | 245 | `weight_grams` | 95% |
| 13 | Lengte (Mtr) | number | 100% | 58 | `length_cm` | 80% |
| 14 | Breedte (Mtr) | number | 100% | 52 | `width_cm` | 80% |
| 15 | Hoogte (Mtr) | number | 100% | 48 | `height_cm` | 80% |
| 16 | Advies verkoopprijs | string | 95% | 890 | `supplier_advised_price` | 95% |
| 17 | Opmerking | string | 100% | 3 | `stock_status` | 70% |
| 18 | Info Uitlopende artikelen | string | 5% | 2 | `is_discontinued` | 90% |

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Code | (8-digit deel van Modelnummer) | ~1850 | 9235 | LEVEL 1 | `supplier_style_code` ✅ |
| Variant SKU | Modelnummer | 9235 | 9235 | LEVEL 3 | `supplier_sku` ✅ |
| Color Code | Kleurcode | 185 | 9235 | LEVEL 2 | `supplier_color_code` ✅ |
| Color Name | Kleur omschrijving | 185 | 9235 | LEVEL 2 | `supplier_color_name` ✅ |
| Size | Maat | 45 | 9235 | LEVEL 2 | `supplier_size_code` ✅ |
| EAN | EAN | 9235 | 9235 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ supplier_sku (Modelnummer) unieke waarden (9235) = totaal rows (9235) → PERFECT
- ✅ Modelnummer BEVAT maat suffix → Definitief variant-level, NIET style-level!
- ✅ Style code = eerste 8 digits van Modelnummer (~1850 unieke styles)

**Voorbeeld Breakdown voor Havep:**
```
Full SKU: "10072889AAB---L"
  └─ Style: "10072889" (8 digits) → Geldt voor alle kleur+maat combinaties
  └─ Color: "AAB" (3 letters) → Kleurcode
  └─ Size: "L" → Maat

Pattern breakdown:
{style:8}{color:3}---{size}
10072889 AAB      ---L

EAN: "8718641275474" → Unieke barcode voor deze exacte variant
```

**Formule check:**
```
~1850 styles × 185 colors × 45 sizes = 15,378,750 theoretische combinaties
Maar slechts 9235 actieve SKUs (0.06% van mogelijke combinaties)
→ Leverancier produceert alleen populaire combinaties
```

## 🔍 Pattern Detection

### EAN Format
```regex
Pattern: ^\d{13}$
Format: 8718641275474
Success Rate: 100%
Notes: Perfect 13-digit EAN, highly consistent
```

### SKU Format (Modelnummer)
```regex
Pattern: ^\d{8}[A-Z]{3}---[SMLX0-9]{1,3}$
Format: 10072889AAB---L
Structure: [8-digit style][3-letter color]---[size]
Success Rate: 100%
Notes: Highly structured, predictable format
```

### Price Format
```regex
Pattern: ^\d+\.\d{2}$
Format: 16.66
Success Rate: 95%
Notes: Clean decimal format, no currency symbol, 5% missing
```

### Size Format
```regex
Pattern: ^(S|M|L|XL|2XL|3XL|4XL|5XL|6XL|\d{2,3})$
Format: S, M, L, XL, 2XL, 3XL, 4XL, 5XL, 42, 44, 100
Success Rate: 100%
Notes: Mix of letter sizes (clothing) and numeric (waist/length)
```

### Color Code Format
```regex
Pattern: ^[A-Z]{3}$
Format: AAB, AAR, ATO, CDK
Success Rate: 100%
Notes: Always 3 uppercase letters
```

## 🎯 Export Readiness

### P0 Fields Coverage

| Export Target | Score | Missing Fields | Blocking Issues |
|---------------|-------|----------------|-----------------|
| **Gripp ERP** | 95% | Price (5% missing) | None |
| **Shopify** | 100% | - | None |
| **Calculated KMS** | 95% | Price (5% missing) | None |

**Details:**
- ✅ EAN: 100% present, perfect format
- ✅ SKU: 100% present, unique, highly structured
- ✅ Product Name: 100% present
- ⚠️ Price: 95% present (5% missing "Prijs op aanvraag")
- ✅ Brand: 100% present (implicit "Havep")
- ✅ Size: 100% present
- ✅ Color: 100% present (code + name)
- ✅ Material: 100% present (code + composition)
- ✅ Weight/Dimensions: 100% present
- ✅ Country of Origin: 100% present
- ✅ HS-code: 100% present

**Strengths:**
1. **Extremely structured SKU** - Easy to parse style/color/size
2. **Comprehensive metadata** - Weight, dimensions, HS-code, origin
3. **Material info** - Both code and full composition
4. **Product lines** - 18 distinct collections
5. **Clean price format** - Decimal, no currency symbol

**Minor Issues:**
1. **5% missing prices** - "Prijs op aanvraag" or empty
2. **Dimensions in meters** - Need conversion to cm for practical use

## 📦 Sample Data (200 rows)

### High Quality Samples (100 rows)
```json
{
  "strategy": "high_quality",
  "criteria": "All P0 fields + price + complete metadata",
  "samples": [
    {
      "row_number": 1,
      "raw_data": {
        "Modelnummer": "10072889AAB---L",
        "Maat": "L",
        "EAN": "8718641275474",
        "Lijn": "HAVEP® Baselayer WW",
        "Artikelomschrijving": "T-shirt HAVEP® Tricot",
        "Kwaliteit code": "889",
        "Kwaliteit omschrijving": "100% | katoen",
        "Kleurcode": "AAB",
        "Kleur omschrijving": "charcoal/rood",
        "GN-code": "61091000",
        "Land van herkomst": "TR",
        "Gewicht (KG)": 0.24,
        "Lengte (Mtr)": 0.39,
        "Breedte (Mtr)": 0.27,
        "Hoogte (Mtr)": 0.01,
        "Advies verkoopprijs": "16.66",
        "Opmerking": "Per stuk / voorraad"
      },
      "extracted_features": {
        "has_ean": true,
        "has_valid_price": true,
        "has_size": true,
        "has_color": true,
        "has_brand": true,
        "has_description": true,
        "has_material": true,
        "has_weight": true,
        "has_dimensions": true,
        "has_hs_code": true,
        "has_origin": true
      },
      "suggested_mappings": {
        "style_code": "10072889",
        "color_code": "AAB",
        "size_code": "L",
        "sku": "10072889AAB---L",
        "style_name": "T-shirt HAVEP® Tricot",
        "brand_name": "Havep",
        "color_name": "charcoal/rood",
        "ean": "8718641275474",
        "advised_price_cents": 1666,
        "material_composition": "100% katoen",
        "weight_grams": 240,
        "product_line": "HAVEP® Baselayer WW",
        "confidence": 1.0
      }
    }
  ]
}
```

### Diverse Samples (75 rows)

**Diversiteit dimensies:**
- **Product Lines (18):** Baselayer (15%), Workwear (25%), Safety (20%), Multi Protect (12%), High Visibility (10%), Other (18%)
- **Maten:** Letter sizes S-6XL (70%), Numeric waist 42-72 (20%), Length 82-122 (10%)
- **Kleuren:** 185 unique color codes - charcoal (15%), navy (12%), black (10%), hi-vis yellow/orange (8%), diverse (55%)
- **Materialen:** Cotton (30%), Polyester/Cotton blend (35%), Polyester (20%), Technical fabrics (15%)
- **Prijsklassen:** Budget €10-€25 (35%), Mid €25-€50 (40%), Premium €50+ (20%), Missing (5%)
- **Landen van herkomst:** TR (Turkey) 60%, CN (China) 25%, BD (Bangladesh) 10%, Other 5%

```json
{
  "strategy": "diverse",
  "samples": [
    {
      "row_number": 500,
      "product_line": "HAVEP® Multi Protect",
      "category": "Safety jacket",
      "size": "XL",
      "color": "navy/fluo geel",
      "price_segment": "premium",
      "material": "Polyester/Cotton flame retardant"
    },
    {
      "row_number": 1200,
      "product_line": "HAVEP® Workwear",
      "category": "Werkbroek",
      "size": "52",
      "color": "charcoal/zwart",
      "price_segment": "mid",
      "material": "65% Polyester, 35% Cotton"
    }
  ]
}
```

### Edge Cases (25 rows)

**Edge case types:**
- Missing price (5% of dataset) - "Prijs op aanvraag" or empty
- Very large sizes (6XL, waist 72, length 122)
- Combined colors with slash (charcoal/rood, navy/fluo geel)
- Discontinued items in "Info Uitlopende artikelen" field
- Very low weight items (<0.1 KG) - accessories
- Very high prices (>€150) - specialized safety gear

```json
{
  "strategy": "edge_cases",
  "samples": [
    {
      "row_number": 2340,
      "issue": "missing_price",
      "example": "Advies verkoopprijs is empty",
      "opmerking": "Prijs op aanvraag"
    },
    {
      "row_number": 4567,
      "issue": "combined_color",
      "example": "charcoal/fluo oranje",
      "note": "Two-tone color requires split or primary selection"
    },
    {
      "row_number": 6789,
      "issue": "large_size",
      "example": "Maat = 6XL",
      "note": "Verify international_sizes table has 6XL"
    },
    {
      "row_number": 8901,
      "issue": "discontinued",
      "example": "Info Uitlopende artikelen = Uitlopend assortiment",
      "note": "Should flag as discontinued in PIM"
    },
    {
      "row_number": 3456,
      "issue": "high_price",
      "example": "Advies verkoopprijs = 189.50",
      "note": "Specialized flame-retardant Multi Protect gear"
    }
  ]
}
```

## 🤖 AI Training Insights

### Successful Pattern Matches
1. **SKU Parsing:** 100% - Perfect structure extraction (style + color + size)
2. **EAN Detection:** 100% - Flawless 13-digit format
3. **Size Extraction:** 100% - Clear letter or numeric format
4. **Color Code:** 100% - Consistent 3-letter uppercase
5. **Material Parsing:** 100% - "100% | katoen" format

### Challenges for AI
1. **Price Gaps:** 5% missing - need to flag as "price on request"
2. **Combined Colors:** Many colors are two-tone (charcoal/rood) - requires primary color selection
3. **Dimension Units:** Meters instead of cm - conversion needed
4. **Product Line Taxonomy:** 18 lines - need mapping to PIM categories
5. **Material Format:** Uses pipe separator (100% | katoen) - needs parsing

### Recommended AI Approach
```python
# SKU parsing
sku = "10072889AAB---L"
style_code = sku[:8]        # "10072889"
color_code = sku[8:11]      # "AAB"
size_code = sku[14:]        # "L"

# Price handling
price_str = "16.66"
price_cents = int(float(price_str) * 100) if price_str else None

# Weight conversion
weight_kg = 0.24
weight_grams = int(weight_kg * 1000)  # 240

# Dimension conversion
length_m = 0.39
length_cm = int(length_m * 100)  # 39

# Material parsing
material = "100% | katoen"
composition, material_name = material.split(' | ')

# Combined color handling
color = "charcoal/rood"
if '/' in color:
  primary_color, accent_color = color.split('/')
else:
  primary_color = color
  accent_color = None
```

## 📈 Data Quality Score

| Metric | Score | Notes |
|--------|-------|-------|
| **Completeness** | 97% | 95% price coverage, all other fields 100% |
| **Accuracy** | 100% | Clean formats, consistent data |
| **Consistency** | 100% | Perfect SKU structure, no format variations |
| **Uniqueness** | 100% | No duplicate EANs |
| **Validity** | 100% | All EANs valid, prices reasonable |
| **Overall** | **99%** | Excellent supplier data quality |

## ✅ Recommendations

1. **Handle missing prices** - Flag as "price on request" in PIM
2. **Convert dimensions** - Meters → Centimeters for practical use
3. **Parse combined colors** - Split two-tone colors or designate primary
4. **Map product lines** - 18 Havep lines → PIM category taxonomy
5. **Parse material composition** - Extract percentage and material from pipe-separated format
6. **Flag discontinued items** - Use "Info Uitlopende artikelen" field
7. **Validate large sizes** - Ensure 6XL, 7XL in international_sizes table

---

**Status:** ✅ Ready for AI training (EXCELLENT QUALITY)  
**Priority:** High (very clean data, minimal transformation needed)  
**Next Steps:** Ingest 200 samples into `supplier_data_samples` table

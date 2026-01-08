# Grisport Safety (Roerdink Catalog) - Supplier Analysis

**Leverancier:** Grisport Safety / Roerdink  
**Bestand:** `Grisport_RoerdinkCatalog-4.csv`  
**Analyse Datum:** 2025-01-05  
**Totaal Rijen:** 631  
**Totaal Kolommen:** 20

## 📊 Column Inventory

| # | Kolom Naam | Data Type | Fill Rate | Unique Values | PIM Field Mapping | Confidence |
|---|------------|-----------|-----------|---------------|-------------------|------------|
| 1 | ModelID | string | 100% | 120 | `supplier_style_code` | 95% |
| 2 | ArtikelID | string | 100% | 631 | `supplier_sku` | 100% |
| 3 | Merk | string | 100% | 2 | `supplier_brand_name` | 100% |
| 4 | Model | string | 100% | 120 | `supplier_style_name` | 90% |
| 5 | TekstAlgemeen | html | 100% | 120 | `supplier_long_description` | 95% |
| 6 | TekstMaat | string | 85% | 45 | `size_range_text` | 70% |
| 7 | TekstAssortimentsprijsPerStuk | string | 0% | 0 | - | - |
| 8 | URL | url | 100% | 120 | `supplier_product_url` | 100% |
| 9 | Afbeelding-links | url | 100% | 120 | `supplier_image_urls` | 100% |
| 10 | Product Code | string | 100% | 631 | `supplier_article_code` | 100% |
| 11 | Ean | string | 100% | 631 | `ean` | 100% |
| 12 | Kleur | string | 100% | 25 | `supplier_color_name` | 100% |
| 13 | Maat | string | 100% | 18 | `supplier_size_code` | 100% |
| 14 | Voorraad | number | 100% | 45 | `stock_quantity` | 90% |
| 15 | BrutoPrijs excl. btw | string | 100% | 78 | `cost_price` | 85% |
| 16 | Korting | string | 100% | 42 | `purchase_discount_amount` | 80% |
| 17 | #Prijs klant excl. btw | string | 100% | 95 | `cost_price_net` | 85% |
| 18 | Adviesprijs incl. btw | string | 100% | 102 | `supplier_advised_price` | 90% |
| 19 | Outlet | string | 100% | 2 | - | - |
| 20 | Retourrecht | string | 100% | 2 | - | - |

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Code | ModelID | 120 | 631 | LEVEL 1 | `supplier_style_code` ✅ |
| Variant SKU | Product Code | 631 | 631 | LEVEL 3 | `supplier_sku` ✅ |
| Color | Kleur | 25 | 631 | LEVEL 2 | `supplier_color_name` ✅ |
| Size | Maat | 18 | 631 | LEVEL 2 | `supplier_size_code` ✅ |
| EAN | Ean | 631 | 631 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ supplier_sku unieke waarden (631) = totaal rows (631) → CORRECT
- ✅ supplier_style_code unieke waarden (120) << totaal rows (631) → CORRECT
- ⚠️ **FOUT in eerdere mapping:** ArtikelID was redundant (duplicate van Product Code)

**Voorbeeld Breakdown voor Grisport:**
```
Style: ModelID = "18904" → Geldt voor ~5-6 varianten (verschillende maten)
SKU: Product Code = "11.049.057.39" → Uniek voor deze specifieke maat (39)
Pattern: {model}.{color}.{variant}.{SIZE}
         11    .049   .057     .39
EAN: "8713458318369" → Unieke barcode voor dit specifieke product
```

**Formule check:**
```
120 styles × 25 colors × 18 sizes = 54,000 theoretische combinaties
Maar slechts 631 actieve SKUs → Niet alle combinaties bestaan
```

## 🔍 Pattern Detection

### EAN Format
```regex
Pattern: ^\d{13}$
Format: 8713458318369
Success Rate: 100%
Notes: Standard 13-digit EAN, no formatting
```

### SKU Format (Product Code)
```regex
Pattern: ^\d{2}\.\d{3}\.\d{3}\.\d{2}$
Format: 11.049.057.39
Success Rate: 100%
Notes: Dot-separated format (model.color.variant.size)
```

### Price Format
```regex
Pattern: €\s*\d+,\d{2}
Format: € 71,25
Success Rate: 100%
Notes: Euro symbol + space + decimal comma
Conversion needed: Remove €, replace comma with dot, multiply by 100 for cents
```

### Size Format
```regex
Pattern: ^\d{2}$
Format: 39, 40, 41, 42, 43, 44, 45, 46, 47, 48
Success Rate: 100%
Notes: Numeric shoe sizes (EU standard)
```

### Color Format
```regex
Pattern: ^[A-Za-z\s/]+$
Format: Zwart, Navy, Grijs, Bruin, Zwart/Grijs
Success Rate: 100%
Notes: Dutch color names, sometimes combined with slash
```

## 🎯 Export Readiness

### P0 Fields Coverage

| Export Target | Score | Missing Fields | Blocking Issues |
|---------------|-------|----------------|-----------------|
| **Gripp ERP** | 85% | - | Price parsing (euro symbols) |
| **Shopify** | 90% | - | Price format conversion needed |
| **Calculated KMS** | 85% | - | Size normalization needed |

**Details:**
- ✅ EAN: 100% present, valid format
- ✅ SKU: 100% present, unique
- ✅ Product Name: 100% present
- ⚠️ Price: 100% present maar needs parsing (€ symbool + comma)
- ✅ Brand: 100% present (Grisport Safety, Grisport)
- ✅ Size: 100% present maar numeric (39-48)
- ✅ Color: 100% present maar Dutch names
- ✅ Images: 100% present (multiple URLs)
- ✅ Description: 100% present (HTML formatted)

**Blocking Issues:**
1. Price format bevat euro symbool en gebruikt comma als decimal separator
2. Size is numeric (schoenmaten) - moet gemapped naar international_sizes
3. Color names zijn in Nederlands - moet genormaliseerd naar GS1 colors

## 📦 Sample Data (200 rows)

### High Quality Samples (100 rows)
```json
{
  "strategy": "high_quality",
  "criteria": "All P0 fields present + images + description",
  "samples": [
    {
      "row_number": 2,
      "raw_data": {
        "ModelID": "18904",
        "ArtikelID": "245554",
        "Merk": "Grisport Safety",
        "Model": "Grisport Safety 903 L | 803 L 33148  S3 Zwart (OKTOBERAANBIEDING)",
        "TekstAlgemeen": "De Grisport 903L is een echte bestseller als het om veiligheidsschoenen gaat...",
        "TekstMaat": "39 t/m 48",
        "URL": "https://www.roerdink.nl/nl/winkel/1_schoenenveiligheid/1_hoogkruipneus/18904_grisport-safety-903-l-803-l-33148-s3-zwart-oktoberaanbieding.html",
        "Afbeelding-links": "https://www.roerdink.nl/write/assets/modellen/0018904/0018904_0_Large.jpg, ...",
        "Product Code": "11.049.057.39",
        "Ean": "8713458318369",
        "Kleur": "Zwart",
        "Maat": "39",
        "Voorraad": "30",
        "BrutoPrijs excl. btw": "€ 71,25",
        "Korting": "15,80",
        "Prijs klant excl. btw": "€ 59,99",
        "Adviesprijs incl. btw": "€ 127,95"
      },
      "extracted_features": {
        "has_ean": true,
        "has_valid_price": true,
        "has_size": true,
        "has_color": true,
        "has_brand": true,
        "has_description": true,
        "has_image": true,
        "has_stock": true
      },
      "suggested_mappings": {
        "style_code": "18904",
        "sku": "11.049.057.39",
        "style_name": "Grisport Safety 903 L S3",
        "brand_name": "Grisport Safety",
        "color_name": "Zwart",
        "size_code": "39",
        "ean": "8713458318369",
        "cost_price_cents": 5999,
        "advised_price_cents": 12795,
        "confidence": 0.95
      }
    }
  ]
}
```

**Note:** Volledige 100 high quality samples beschikbaar in database export.

### Diverse Samples (75 rows)

**Diversiteit dimensies:**
- **Merken:** Grisport Safety (90%), Grisport (10%)
- **Categorieën:** Veiligheidsschoenen hoog (45%), laag (35%), laarzen (20%)
- **Kleuren:** Zwart (40%), Navy (20%), Grijs (15%), Bruin (15%), Mixed (10%)
- **Maten:** 39-48 (spread across range)
- **Prijsklassen:** Budget €40-€60 (30%), Mid €60-€90 (50%), Premium €90+ (20%)

```json
{
  "strategy": "diverse",
  "samples": [
    {
      "row_number": 150,
      "category": "Laag model",
      "color": "Navy",
      "size": "42",
      "price_segment": "mid"
    },
    {
      "row_number": 320,
      "category": "Laarzen",
      "color": "Zwart/Grijs",
      "size": "45",
      "price_segment": "premium"
    }
  ]
}
```

### Edge Cases (25 rows)

**Edge case types:**
- HTML tags in description field (embedded tables, bullet lists)
- Multiple image URLs (comma-separated, 5-6 URLs)
- Combined colors with slash (Zwart/Grijs, Navy/Rood)
- Large size ranges in TekstMaat field
- Discount calculations (BrutoPrijs - Korting = Prijs klant)

```json
{
  "strategy": "edge_cases",
  "samples": [
    {
      "row_number": 45,
      "issue": "html_in_description",
      "example": "Contains <br/>, <ul>, <li> tags"
    },
    {
      "row_number": 89,
      "issue": "multiple_images",
      "example": "6 comma-separated image URLs"
    },
    {
      "row_number": 234,
      "issue": "combined_color",
      "example": "Zwart/Grijs requires split or primary color selection"
    }
  ]
}
```

## 🤖 AI Training Insights

### Successful Pattern Matches
1. **EAN Detection:** 100% - Consistent 13-digit format
2. **SKU Pattern:** 100% - Dot-separated hierarchical structure
3. **Brand Extraction:** 100% - Always in "Merk" column
4. **Size Extraction:** 100% - Numeric EU shoe sizes

### Challenges for AI
1. **Price Parsing:** Need to strip € and convert comma to dot
2. **HTML Cleanup:** Description contains extensive HTML
3. **Color Normalization:** Dutch → English → GS1 color code
4. **Size Mapping:** Numeric (39-48) → international_sizes table
5. **Category Inference:** Extract from Model field (S3, S1P, etc.)

### Recommended AI Approach
```python
# Price conversion
price_str = "€ 71,25"
price_cents = int(float(price_str.replace('€', '').replace(',', '.').strip()) * 100)

# Color normalization
color_map = {
  'Zwart': 'Black',
  'Navy': 'Navy',
  'Grijs': 'Grey',
  'Bruin': 'Brown'
}

# Safety class extraction
import re
safety_class = re.search(r'\b(S[1-3]P?)\b', model_name)
```

## 📈 Data Quality Score

| Metric | Score | Notes |
|--------|-------|-------|
| **Completeness** | 95% | All critical fields present, TekstAssortimentsprijs empty |
| **Accuracy** | 90% | Prices need parsing, colors need translation |
| **Consistency** | 95% | Very consistent format across all rows |
| **Uniqueness** | 100% | No duplicate EANs detected |
| **Validity** | 85% | EAN valid, prices need conversion |
| **Overall** | **93%** | High quality supplier data |

## ✅ Recommendations

1. **Implement price parser** voor euro format → cents conversion
2. **Build color translation map** NL → EN → GS1
3. **Map numeric sizes** naar international_sizes table (footwear type)
4. **Extract safety certification** from model name (S3, S1P, EN ISO standards)
5. **Strip HTML from descriptions** voor plain text exports
6. **Parse multiple image URLs** into array structure

---

**Status:** ✅ Ready for AI training  
**Priority:** Medium (good quality, maar conversion needed)  
**Next Steps:** Ingest 200 samples into `supplier_data_samples` table

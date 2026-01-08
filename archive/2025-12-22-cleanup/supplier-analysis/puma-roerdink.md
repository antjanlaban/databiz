# Puma Safety (Roerdink) - Supplier Analysis

**Leverancier:** Puma Safety / Roerdink  
**Bestand:** `Puma_RoerdinkCatalog-2.csv`  
**Totaal Rijen:** 1,096  
**Totaal Kolommen:** 20

## 📊 Export Readiness: 85%

✅ **Complete P0:** EAN, SKU, Price, Brand, Size, Color  
✅ **Safety Focus:** S1P, S3 ratings in product name  
✅ **Images:** Multiple URLs, detailed product shots  
⚠️ **Price Format:** Euro symbol + comma separator needs parsing

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Code | ModelID | ~120 | 1096 | LEVEL 1 | `supplier_style_code` ✅ |
| Variant SKU | Product Code | 1096 | 1096 | LEVEL 3 | `supplier_sku` ✅ |
| Color | Kleur | ~30 | 1096 | LEVEL 2 | `supplier_color_name` ✅ |
| Size | Maat | 18 | 1096 | LEVEL 2 | `supplier_size_code` ✅ |
| EAN | Ean | 1096 | 1096 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ Product Code unieke waarden (1096) = totaal rows (1096) → PERFECT MATCH
- ✅ Product Code BEVAT maat suffix → Definitief variant-level
- ✅ ModelID unieke waarden (~120) << totaal rows (1096) → CORRECT (11% ratio)

**Voorbeeld Breakdown voor Puma:**
```
Style: ModelID = "60763" → Geldt voor meerdere kleuren en maten
Full SKU: Product Code = "00.080.021.39"
Pattern: {model}.{color}.{variant}.{SIZE}
         00.080   .021   .39

EAN: "4051428060011" → Unieke barcode voor deze maat
```

**Formule check:**
```
120 styles × ~30 kleuren × 18 maten = 64,800 theoretische combinaties
Maar slechts 1,096 actieve SKUs (1.7% van mogelijke combinaties)
→ Safety footwear heeft beperkt kleur/maat assortiment per model
```

## 🔍 Key Patterns

- **EAN:** 13-digit (4051428060011)
- **SKU Format:** Dot-separated `{Model}.{Variant}.{Size}` (00.080.021.39)
- **Price:** `€ 96,95` format (needs € removal, comma→dot)
- **Sizes:** Numeric 39-48 (EU shoe sizes)
- **Colors:** Dutch names (Blauw, Zwart, Grijs)
- **ModelID:** Numeric style code (60763, 42365, 62401)

## 📦 Sample Strategy (200 rows)

- **100 High Quality:** Complete specs + safety ratings + images
- **75 Diverse:** Laag/Hoog models, verschillende safety classes (S1P, S3)
- **25 Edge Cases:** Missing maat field (row 18-20 in sample), HTML in descriptions

**Status:** ✅ Ready for AI training (similar to Grisport)

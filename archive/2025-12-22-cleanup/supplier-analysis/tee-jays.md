# Tee Jays - Supplier Analysis

**Leverancier:** Tee Jays  
**Bestand:** `TEE_JAYS_Datafile_2025-07-01_EU-2.xlsx`  
**Totaal Rijen:** 3,319  
**Totaal Kolommen:** 43

## 📊 Export Readiness: 100%

✅ **Complete P0:** GTIN (EAN), SKU composite, Price, Brand, Size, Color  
✅ **Rich Images:** Front, Back, Left, Right, Model views (full + small)  
✅ **Features:** 8 feature bullet points per product  
✅ **Packaging:** Carton details (size, weight, quantity)

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Code | TJ_Style_no | ~450 | 3319 | LEVEL 1 | `supplier_style_code` ✅ |
| Variant SKU | CSV_Code | 3319 | 3319 | LEVEL 3 | `supplier_sku` ✅ |
| Color | Colour | ~120 | 3319 | LEVEL 2 | `supplier_color_name` ✅ |
| Size | Size | ~12 | 3319 | LEVEL 2 | `supplier_size_code` ✅ |
| EAN | Gtin_no. | 3319 | 3319 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ CSV_Code unieke waarden (3319) = totaal rows (3319) → PERFECT MATCH
- ✅ CSV_Code BEVAT color+size → Definitief variant-level (composite key)
- ✅ TJ_Style_no unieke waarden (~450) << totaal rows (3319) → CORRECT (13.6% ratio)
- ✅ TJ_Style_no zonder suffix → Pure style code

**Voorbeeld Breakdown voor Tee Jays:**
```
Style: TJ_Style_no = "TJ1000" → Geldt voor alle kleur+maat combinaties
Composite SKU: CSV_Code = "TJ1000:BLACK:S"
Pattern: {style}:{COLOR}:{SIZE}
         TJ1000 :BLACK :S

EAN: "5712540008976" → Unieke barcode voor deze exacte variant
```

**Formule check:**
```
450 styles × ~120 kleuren × ~12 maten = 648,000 theoretische combinaties
Maar slechts 3,319 actieve SKUs (0.51% van mogelijke combinaties)
→ Elke style heeft slechts subset van kleuren/maten beschikbaar
Gemiddeld ~7.4 varianten per style
```

## 🔍 Key Patterns

- **GTIN:** 13-digit (5712540008976)
- **SKU Format:** `{Style}:{Color}:{Size}` (TJ1000:BLACK:S)
- **CSV Code:** Same as SKU format
- **Price:** No direct price, only "Recommended Carton Price EUR/GBP"
- **Sizes:** Letter (S-XXL standard)
- **Colors:** UPPERCASE English (BLACK, WHITE, NAVY)

## 📦 Sample Strategy (200 rows)

- **100 High Quality:** Complete features + images + carton data
- **75 Diverse:** T-shirts, polos, sweaters, hoodies across groups
- **25 Edge Cases:** Products without individual price (only carton), very detailed feature lists

**Status:** ✅ Ready for AI training (IMAGE-RICH)

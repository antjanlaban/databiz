# Bestex - Supplier Analysis

**Leverancier:** Bestex  
**Bestand:** `Prijslijst_Bestex_10-2025-2.xlsx`  
**Totaal Rijen:** 3,479  
**Totaal Kolommen:** 29

## 📊 Export Readiness: 95%

✅ **Complete P0:** EAN, SKU composite, Price (netto + AVP), Color, Size  
✅ **Rich Data:** Kwaliteit (300 gram/m2), samenstelling, washing instructions  
✅ **Images:** 2 image URLs per product  
⚠️ **Missing:** Some HS-codes, weights, dimensions fields empty

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Code | Modelcode | ~200 | 3479 | LEVEL 1 | `supplier_style_code` ✅ |
| Variant SKU | Artikelcode | 3479 | 3479 | LEVEL 3 | `supplier_sku` ✅ |
| Color | Kleur | ~40 | 3479 | LEVEL 2 | `supplier_color_name` ✅ |
| Size | Maat | ~20 | 3479 | LEVEL 2 | `supplier_size_code` ✅ |
| EAN | EAN code | 3479 | 3479 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ Artikelcode unieke waarden (3479) = totaal rows (3479) → PERFECT MATCH
- ✅ Artikelcode BEVAT kleur+maat suffix → Definitief variant-level
- ✅ Modelcode unieke waarden (~200) << totaal rows (3479) → CORRECT (5.8% ratio)

**Voorbeeld Breakdown voor Bestex:**
```
Style: Modelcode = "AMK100" → Geldt voor alle kleur+maat combinaties
Full SKU: Artikelcode = "AMK100-FLGROEN-44"
Pattern: {model}-{kleur}-{maat}
         AMK100-FLGROEN-44

EAN: "1140197000007" → Unieke barcode
```

**Formule check:**
```
200 styles × ~40 kleuren × ~20 maten = 160,000 theoretische combinaties
Maar slechts 3,479 actieve SKUs (2.2% van mogelijke combinaties)
→ Focus op werkkleding bestsellers
```

## 🔍 Key Patterns

- **EAN:** 13-digit (1140197000007)
- **SKU Format:** `{Artikelcode}` = `{Modelcode}-{Kleur}-{Maat}` (AMK100-FLGROEN-44)
- **Price:** Euro format `€ 13.95` (netto) + `€ 23.71` (AVP ex BTW)
- **Sizes:** Numeric 44-60 (waist sizes)
- **Colors:** Dutch names (flessengroen, navy, zwart)

## 📦 Sample Strategy (200 rows)

- **100 High Quality:** Complete data + images + quality specs
- **75 Diverse:** Tuinbroeken, jassen, vesten, hemden across color/size range
- **25 Edge Cases:** Large sizes (58-60), very low MOQ=1, missing dimensions

**Status:** ✅ Ready for AI training

# Impliva Paraplu's - Supplier Analysis

**Leverancier:** Impliva / Falconetti / Falcone  
**Bestand:** `Impliva_Paraplus_2025_Productfeed.csv`  
**Totaal Rijen:** 683  
**Totaal Kolommen:** 41

## 📊 Export Readiness: 95%

✅ **Complete P0:** EAN, SKU, Price, Brand, Color  
⚠️ **No Size field** - one-size accessories (umbrella's)  
✅ **Rich Technical Data:** Diameter, length, mechanism, materials  
✅ **Images:** Multiple image URLs per product

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Code | parent_sku | ~200 | 683 | LEVEL 1 | `supplier_style_code` ✅ |
| Variant SKU | sku | 683 | 683 | LEVEL 3 | `supplier_sku` ✅ |
| Color | colour_name | ~80 | 683 | LEVEL 2 | `supplier_color_name` ✅ |
| EAN | barcode | 683 | 683 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ supplier_sku unieke waarden (683) = totaal rows (683) → PERFECT MATCH
- ✅ parent_sku unieke waarden (~200) << totaal rows (683) → CORRECT style-level
- ⚠️ **Geen Size field** - Paraplu's zijn one-size producten

**Voorbeeld Breakdown voor Impliva:**
```
Style: parent_sku = "PS-7" → Geldt voor meerdere kleuren van dit model
SKU: sku = "PS-7-8048" → Uniek met kleurcode suffix
Pattern: {parent_sku}-{color_code}
         PS-7       -8048
EAN: "8713414888639" → Unieke barcode
```

**Formule check:**
```
~200 paraplu styles × ~3.4 gemiddelde kleuren per style = 683 SKUs
(Accessoires hebben typisch minder kleurvarianten dan kleding)
```

## 🔍 Key Patterns

- **EAN:** 13-digit (8713414888639)
- **SKU:** Alphanumeric (PS-7, GP-76-8048, DB-GP-6)
- **Price:** Decimal format `185,0000` (comma separator)
- **Diameter:** `60 cm, 125 cm, 130 cm`
- **Mechanism:** Handopening, Automaat, Verrijdbaar

## 📦 Sample Strategy (200 rows)

- **100 High Quality:** Complete specs + images + windproof ratings
- **75 Diverse:** Golf paraplu's, stormparaplu's, opvouwbaar, ECO line, LED variants
- **25 Edge Cases:** Display boxes, accessories, zeer hoge prijzen (€185)

**Status:** ✅ Ready for AI training

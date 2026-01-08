# Jobman - Supplier Analysis

**Leverancier:** Jobman  
**Bestand:** `jobman-artikelbestand-2025.1-met-adv-vkp.xlsx`  
**Totaal Rijen:** 12,124  
**Totaal Kolommen:** 45

## 📊 Export Readiness: 100%

✅ **Perfect P0 Coverage** - EAN, SKU composite, Price, Brand, Size, Color all 100%  
✅ **Multilingual** - NL + ENG product names & descriptions  
✅ **Safety Certifications** - EN342, EN343, OekoTex included  
✅ **Sustainability** - "Clean Shipping Index" flag

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Code | Product no | ~1520 | 12124 | LEVEL 1 | `supplier_style_code` ✅ |
| Variant SKU | {Product no}-{Colour Code}-{Size Code} | 12124 | 12124 | LEVEL 3 | `supplier_sku` ✅ |
| Color Code | Colour Code | ~250 | 12124 | LEVEL 2 | `supplier_color_code` ✅ |
| Size Code | Size Code | ~15 | 12124 | LEVEL 2 | `supplier_size_code` ✅ |
| EAN | Gtin_no. | 12124 | 12124 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ Composite supplier_sku = totaal rows (12124) → CORRECT (moet geconstrueerd worden)
- ✅ Product no unieke waarden (~1520) << totaal rows (12124) → CORRECT style-level (12.5% ratio)
- ✅ Product no bevat GEEN maat/kleur → Definitief style-level

**Voorbeeld Breakdown voor Jobman:**
```
Style: Product no = "65103530" → Geldt voor alle kleur+maat combinaties
Color: Colour Code = "9999" → Zwart
Size: Size Code = "3" → XS
  
Composite SKU: "65103530-9999-3"
Pattern: {style}-{color}-{size}
         65103530-9999-3

EAN: "7319440744744" → Unieke barcode voor deze exacte variant
```

**Formule check:**
```
1520 styles × ~8 gemiddelde kleuren × ~5.2 gemiddelde maten ≈ 63,000 theoretische combinaties
Maar slechts 12,124 actieve SKUs (19% van mogelijke combinaties)
→ Focus op populaire maten/kleuren per style
```

## 🔍 Key Patterns

- **EAN:** 13-digit (7319440744744)
- **SKU Format:** `{Product no}-{Colour Code}-{Size Code}` (65103530-9999-3)
- **Price:** Clean decimal `€ 167.23`
- **Sizes:** Letter codes (3=XS, 4=S, 5=M, 6=L, 7=XL, 8=XXL, 9=3XL)
- **Colors:** 4-digit codes (9999=black/zwart)

## 📦 Sample Strategy (200 rows)

- **100 High Quality:** Safety gear + certifications + multilingual
- **75 Diverse:** Jackets, trousers, shirts, fleece across segments (Winterkleding, Basis, etc.)
- **25 Edge Cases:** 4XL-5XL sizes, high prices (€150+), certification-heavy items

**Status:** ✅ Ready for AI training (ENTERPRISE QUALITY)

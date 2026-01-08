# Santino - Supplier Analysis

**Leverancier:** Santino  
**Bestand:** `Santino_10-2025-3.xlsx`  
**Totaal Rijen:** 5,801  
**Totaal Kolommen:** 41

## 📊 Export Readiness: 100%

✅ **Perfect P0:** EAN, Price, Brand, Size, Color all 100%  
✅ **Rich Metadata:** Samenstelling, kwaliteit, pasvorm, bindingstype  
✅ **Sustainability:** Wasinstructie, tariefcode, land van oorsprong  
✅ **Packaging:** Complete doos/aanvullende eenheid details

## 🔴 CRITICAL: Hiërarchie Validatie

### Style vs SKU Onderscheid

| Field Type | Kolom Naam | Unieke Waarden | Total Rows | Level | Correcte Mapping |
|------------|------------|----------------|------------|-------|------------------|
| Style Name | Model | ~250 | 5801 | LEVEL 1 | `supplier_style_name` ✅ |
| Variant SKU | Product Code | 5801 | 5801 | LEVEL 3 | `supplier_sku` ✅ |
| Color | Kleur | ~60 | 5801 | LEVEL 2 | `supplier_color_name` ✅ |
| Size | Maat | ~40 | 5801 | LEVEL 2 | `supplier_size_code` ✅ |
| EAN | EAN basiseenheid | 5801 | 5801 | LEVEL 4 | `ean` ✅ |

**Validatie:**
- ✅ Product Code unieke waarden (5801) = totaal rows (5801) → PERFECT MATCH
- ✅ Product Code is numeriek zonder patroon → Opaque identifier (variant-level)
- ✅ Model unieke waarden (~250) << totaal rows (5801) → CORRECT (4.3% ratio)
- ⚠️ **Model is naam (Alex, Bari), niet numeric code** → Style name, niet style code

**Voorbeeld Breakdown voor Santino:**
```
Style Name: Model = "Alex" → Geldt voor alle kleuren en maten
Numeric Style Code: NIET aanwezig (zou afgeleid moeten worden)
Variant SKU: Product Code = "1004713" → Opaque 7-digit nummer (uniek per variant)
Color: Kleur = "Black"
Size: Maat = "L"

EAN: "8711966722135" → Unieke barcode
```

**Formule check:**
```
250 style names × ~60 kleuren × ~40 maten = 600,000 theoretische combinaties
Maar slechts 5,801 actieve SKUs (0.97% van mogelijke combinaties)
→ Niet alle kleuren beschikbaar in alle maten per style
```

## 🔍 Key Patterns

- **EAN:** 13-digit basiseenheid (8711966722135)
- **Product Code:** Numeric 7-digit (1004713, 1006849)
- **Model:** Alphanumeric (Alex, Bari, Como)
- **Price:** Clean decimal `€ 37.12`
- **Sizes:** Letter (S-5XL) + Numeric waist/length combos
- **Colors:** English names (Black, Real Navy, Royal Blue)

## 📦 Sample Strategy (200 rows)

- **100 High Quality:** Complete data + packaging + image URLs
- **75 Diverse:** Zipsweaters, polo's, T-shirts, werkbroeken across collections (Basics, Premium)
- **25 Edge Cases:** 4XL/5XL sizes, multi-EAN products (doos + aanvullende eenheid)

**Status:** ✅ Ready for AI training (EXCELLENT QUALITY)

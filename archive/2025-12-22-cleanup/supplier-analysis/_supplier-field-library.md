# Cross-Supplier Field Library (UPDATED)

## 🔴 CRITICAL RULE: Hiërarchie Niveaus

**NOOIT** een style/model code mappen als `supplier_sku`!

### Beslisboom voor Mapping

```
┌─ Kolom analyse START
│
├─ STAP 1: Unieke waarden ratio checken
│  │
│  ├─ Ratio = 100% (unieke waarden = totaal rows)?
│  │  └─ JA → Ga naar STAP 2
│  │
│  └─ Ratio < 50%?
│     └─ JA → Waarschijnlijk STYLE CODE (LEVEL 1)
│        └─ Check: Bevat kolom "Model", "Style", "Family" in naam?
│           ├─ JA → supplier_style_code ✅
│           └─ NEE → Verder checken...
│
├─ STAP 2: Pattern in waarde checken
│  │
│  ├─ Bevat maat/size component? (S, M, L, XL, 39, 42, etc.)
│  │  └─ JA → supplier_sku (LEVEL 3) ✅
│  │
│  ├─ Bevat kleur component inline? (BLACK, AAB, 9999 in string)
│  │  └─ JA → supplier_sku (LEVEL 3) ✅
│  │
│  ├─ Is het 13 digits?
│  │  └─ JA → ean (LEVEL 4) ✅
│  │
│  └─ Geen size/color markers?
│     └─ Check unieke waarden ratio opnieuw
│        ├─ 100% uniek → supplier_sku (LEVEL 3) ✅
│        └─ <50% uniek → supplier_style_code (LEVEL 1) ✅
│
├─ STAP 3: Kolom naam analyse
│  │
│  ├─ Bevat "Color", "Colour", "Kleur"?
│  │  └─ supplier_color_name of supplier_color_code (LEVEL 2)
│  │
│  ├─ Bevat "Size", "Maat"?
│  │  └─ supplier_size_code (LEVEL 2)
│  │
│  ├─ Bevat "Model", "Style", "Family" (zonder maat/kleur)?
│  │  └─ supplier_style_code (LEVEL 1)
│  │
│  └─ Bevat "SKU", "Artikel", "Product Code" (met maat/kleur)?
│     └─ supplier_sku (LEVEL 3)
│
└─ STAP 4: ALTIJD cross-checken met EAN
   └─ Als EAN kolom 100% uniek EN SKU kolom ook 100% uniek
      └─ Beide zijn variant-level ✅
```

### Validation Checklist

Voordat je een mapping finaliseert:

- [ ] **Ratio check:** Style code heeft <50% unieke waarden vs totaal rows
- [ ] **Pattern check:** SKU bevat maat OF kleur component (style code NIET)
- [ ] **Formula check:** `styles × colors × sizes ≈ total_variants` (roughly)
- [ ] **EAN check:** EAN is altijd 1:1 met SKU (beide 100% uniek)
- [ ] **Naam check:** "ModelID" met veel unieke waarden ≠ automatisch style code!

### Common Mistakes ❌

```
FOUT: "ModelID" met 631 unieke waarden → supplier_sku
  → Check: Totaal rows = 631? Als NEE, dan is het STYLE CODE!
  
FOUT: "Product no" met maat suffix → supplier_style_code  
  → Als het maat bevat, is het ALTIJD variant-level (SKU)!

FOUT: Composite key {style}-{color}-{size} → 3 aparte velden
  → NEE! Dit moet gecombineerd als supplier_sku
```

### Correct Examples ✅

```
Grisport:
  ModelID (120 unieke, 631 rows) → supplier_style_code ✅
  Product Code (631 unieke, 631 rows) → supplier_sku ✅

Tee Jays:
  TJ_Style_no "TJ1000" → supplier_style_code ✅
  CSV_Code "TJ1000:BLACK:S" → supplier_sku ✅

Havep:
  Modelnummer "10072889AAB---L" → supplier_sku ✅ (bevat maat!)
  First 8 digits "10072889" → supplier_style_code ✅ (extracted)
```

## 🎯 Extended Canonical PIM Field Mappings

| Canonical PIM Field | Grisport | Halink | Havep | C&B | Craft | ELKA | Impliva | Jobman | Bestex | Puma | Santino | Tee Jays |
|---------------------|----------|---------|-------|-----|-------|------|---------|---------|--------|------|---------|----------|
| `ean` | Ean ✅ | EAN-code ✅ | EAN ✅ | EAN ✅ | EAN ✅ | EAN ✅ | barcode ✅ | Gtin_no. ✅ | EAN code ✅ | Ean ✅ | EAN code ✅ | Gtin_no. ✅ |
| `supplier_sku` | Product Code | Artikelcode | Modelnummer | {Composite} | {Composite} | Product Code | sku | {Composite} | Artikelcode | Product Code | Product | CSV_Code |
| `supplier_style_code` | ModelID | Main-article | {8 digits} | Product no | Product no | Product Code | parent_sku | Product no | Modelcode | ModelID | Model | TJ_Style_no |
| `supplier_article_name` | Model | Description | Artikelomschrijving | Product Name | Product Name | Product name | name | Product Name NL | Omschrijving | Model | Omschrijving | Product_Name |
| `supplier_brand_name` | Merk | Brand | "Havep" | Brand | Brand | "ELKA" | manufacturer | Brand | Merk | Merk | Merk | "Tee Jays" |
| `supplier_color_name` | Kleur | Colour-name | Kleur omschrijving | Colour | Colour NL | Color | colour_name | Colour | Kleur | Kleur | Kleur | Colour |
| `supplier_color_code` | - | Colour-code | Kleurcode | Colour Code | Colour Code | Color code | pms | Colour Code | - | - | - | Colour_Code |
| `supplier_size_code` | Maat | - | Maat | Size Code | Size Code | Size | - | Size Code | Maat | Maat | Maat | Size |
| `supplier_advised_price` | Adviesprijs | Sales price | Advies verkoopprijs | Advice selling price | Advice Selling Price | Price EUR | price | Advice selling price | AVP ex BTW | Adviesprijs | Adviesverkoopprijs | Recommended Carton Price |
| `material_composition` | (in TekstAlgemeen) | (in Description) | Kwaliteit omschrijving | Mat. NL | Mat. NL | Composition | canopy_material | Mat. NL | Doeksamenstelling | (in TekstAlgemeen) | Samenstelling | Quality |
| `supplier_image_urls` | Afbeelding-links | ❌ | ❌ | Photo Low Res | Photo low res | Image 1-4 | images | ❌ | URL Afbeelding | Afbeelding-links | ImageURL | Front/Back/Left/Right URLs |
| `hs_tariff_code` | ❌ | HS-code | GN-code | Commodity code | Commodity Code | Customs Tariff | hs_code | Commodity code | Tariefcode | ❌ | Tariefcode | Comodity_Code |
| `country_of_origin` | ❌ | ❌ | Land van herkomst | Country of origin | Country of Origin | Country of origin | country_of_origin | Country of origin | Land van oorsprong | ❌ | Land van oorsprong | Country |
| `weight_grams` | ❌ | ❌ | Gewicht (KG) | Netto Weight | Netto weight | Net Weight | gross_weight_kgs | Product_Weight | Netto gewicht | ❌ | Bruto gewicht | Product_Weight |

## 📊 Extended Coverage Summary

**12 Leveranciers Totaal:**
- **100% Coverage (12/12):** EAN, SKU, Product Name, Brand, Price
- **92% Coverage (11/12):** Color name
- **75% Coverage (9/12):** Color code, HS-code, Country of origin, Weight
- **67% Coverage (8/12):** Material composition
- **58% Coverage (7/12):** Images

## 🔄 Prioriteit Normalisatie

**Top 5 normalisatie taken:**
1. **Price formats** - 6 verschillende formaten (€ symbool, comma/dot, carton vs piece)
2. **SKU construction** - 50% composite keys vs 50% single field
3. **Color normalization** - Mix van NL/EN/UPPERCASE → GS1 standaard
4. **Size mapping** - Letter (S-5XL) vs Numeric (39-60) → international_sizes
5. **Image URL handling** - Single vs multiple vs structured (Front/Back/Left/Right)

## 🏆 Best Data Quality Rankings

1. **Tee Jays** - 100%, structured images (4 views), rich features
2. **Cutter & Buck** - 100%, multilingual (4 talen), enterprise-level
3. **Jobman** - 100%, safety certifications, sustainability flags
4. **Santino** - 100%, complete packaging details
5. **Halink** - 100%, perfect consistency
6. **Craft** - 100%, multilingual
7. **ELKA** - 100%, technical excellence
8. **Havep** - 99%, 95% price coverage
9. **Bestex** - 95%, some missing metadata
10. **Impliva** - 95%, no size field (one-size products)
11. **Grisport** - 93%, price parsing needed
12. **Puma** - 85%, similar issues to Grisport

---

**Totaal training samples beschikbaar:** ~200 × 12 = 2,400 rows  
**Totaal unieke velden:** 41 kolommen  
**Normalisatie dekking:** 75% automatisch mappable

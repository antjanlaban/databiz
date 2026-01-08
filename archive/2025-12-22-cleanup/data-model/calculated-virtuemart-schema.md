# Calculated KMS - VirtueMart Product Schema

**Doel**: Volledige veldendefinitie voor export van producten naar Calculated KMS (VirtueMart systeem)

**Laatste update**: 2025-11-07

---

## Overzicht

Dit document beschrijft alle velden die beschikbaar zijn in het Calculated KMS VirtueMart systeem voor product import. Deze schema wordt gebruikt voor het exporteren van producten vanuit de Van Kruiningen PIM naar het Calculated webshop systeem.

## VirtueMart Product Structuur

### 1. Artikelinformatie (Basis)

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `artikelnaam` | text | ✅ Ja | De naam van het product |
| `artikel_unieke_code` | text | ❌ Nee | SKU of unieke productcode (bijv. EAN) |
| `fabrikant` | dropdown | ❌ Nee | Selecteer de fabrikant van het product |
| `categorieen` | multi-select | ✅ Ja | Selecteer een of meerdere categorieën |
| `voorkeurscategorie_forceren` | dropdown | ❌ Nee | Forceer een specifieke categorie als primaire categorie |
| `ingeschakeld` | checkbox | ❌ Nee | Product activeren/deactiveren |
| `als_speciaal_aanmerken` | checkbox | ❌ Nee | Markeer product als speciaal aanbod |
| `niet_meer_leverbaar` | checkbox | ❌ Nee | Geef aan dat product niet meer leverbaar is |
| `gtin_ean_isbn` | text | ❌ Nee | GTIN, EAN of ISBN nummer |
| `pagina_artikelgegevens` | dropdown | ❌ Nee | Template voor productpagina |
| `klantengroep` | multi-select | ❌ Nee | Selecteer voor welke klantengroepen dit product beschikbaar is |
| `artikel_alias` | text | ❌ Nee | SEO-vriendelijke URL alias |
| `mpn` | text | ❌ Nee | Manufacturer Part Number |
| `gegevens_url` | text | ❌ Nee | Externe URL voor meer productinformatie |
| `verkoper` | dropdown | ❌ Nee | Selecteer verkoper voor dit product |
| `interne_notitie` | textarea | ❌ Nee | Interne notities (niet zichtbaar voor klanten) |

**Fabrikant opties**:
- Clique
- Dassy
- FOTL
- Image Workwear
- PowerWorkwear
- Result
- Santino
- Stedman

**Pagina template opties**:
- default
- bs3-default
- notify
- bs3-notify
- multiadd

**Klantengroep opties**:
- Standaard klantgroep
- Gast klantgroep

---

### 2. Prijzen

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `kostprijs` | number | ❌ Nee | Inkoopprijs van het product |
| `basisprijs_punten` | number | ❌ Nee | Basisprijs in punten |
| `uiteindelijke_prijs_punten` | number | ✅ Ja | Verkoopprijs in punten |

---

### 3. Subartikel (Varianten)

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `hoofdartikel_id` | number | ❌ Nee | ID van hoofdartikel als dit een variant is |

---

### 4. Artikelomschrijving

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `korte_omschrijving` | textarea | ❌ Nee | Korte productomschrijving (zichtbaar in lijsten) |
| `artikelomschrijving` | wysiwyg | ❌ Nee | Uitgebreide productbeschrijving met opmaak |

---

### 5. Artikelstatus - Voorraad

| Veld | Type | Verplicht | Default | Beschrijving |
|------|------|-----------|---------|--------------|
| `op_voorraad` | number | ❌ Nee | 0 | Aantal stuks op voorraad |
| `minimale_voorraad` | number | ❌ Nee | 0 | Minimum voorraadniveau voor waarschuwing |
| `geboekt_besteld` | number | ❌ Nee | 0 | Aantal reeds geboekt/besteld |

---

### 6. Artikelstatus - Beschikbaarheid

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `beschikbaarheidsdatum` | date | ❌ Nee | Datum vanaf wanneer product beschikbaar is |
| `beschikbaarheid` | text | ❌ Nee | Beschikbaarheidstekst |
| `beschikbaarheidsafbeelding` | dropdown | ❌ Nee | Selecteer afbeelding voor beschikbaarheidsstatus |

---

### 7. Aankoop Hoeveelheid

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `stappen_aankoophoeveelheid` | number | ❌ Nee | In welke stappen kan product gekocht worden |
| `minimale_aankoophoeveelheid` | number | ❌ Nee | Minimum aantal per bestelling |
| `maximale_aankoophoeveelheid` | number | ❌ Nee | Maximum aantal per bestelling |

---

### 8. Email Notificatie

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `stuur_email_aan_klanten` | checkbox | ❌ Nee | Stuur email notificatie naar klanten |
| `email_onderwerp` | text | ❌ Nee | Onderwerp van de email |
| `email_inhoud` | textarea | ❌ Nee | Inhoud van de notificatie email |

---

### 9. Maten en Gewichten - Afmetingen

| Veld | Type | Verplicht | Eenheid Opties | Beschrijving |
|------|------|-----------|----------------|--------------|
| `lengte_artikel` | number | ❌ Nee | Meter, Centimeter, Millimeter | Lengte van het product |
| `artikelbreedte` | number | ❌ Nee | Meter, Centimeter, Millimeter | Breedte van het product |
| `hoogte_artikel` | number | ❌ Nee | Meter, Centimeter, Millimeter | Hoogte van het product |

---

### 10. Maten en Gewichten - Gewicht

| Veld | Type | Verplicht | Default | Eenheid Opties | Beschrijving |
|------|------|-----------|---------|----------------|--------------|
| `artikelgewicht` | number | ❌ Nee | 0.0000 | KG, G, LB | Gewicht van het product |
| `verpakking_artikel` | number | ❌ Nee | 0.0000 | kg, g, lb | Verpakkingseenheid |
| `eenheden_in_een_doos` | number | ❌ Nee | - | - | Aantal producten per doos |

---

### 11. Artikelafbeeldingen

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `afbeeldingen` | file_upload | ❌ Nee | Upload productafbeeldingen |
| `afbeeldingsinformatie` | metadata | ❌ Nee | Extra informatie per afbeelding (alt-tekst, titel, etc.) |

**Afbeelding opties**:
- Afbeelding uploaden
- Zoeken in bestaande afbeeldingen
- Afbeeldingen sorteren
- Afbeelding verwijderen

---

### 12. Speciale Velden

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `verwante_categorieen` | search_select | ❌ Nee | Koppel gerelateerde categorieën aan dit product |
| `verwante_artikelen` | search_select | ❌ Nee | Koppel gerelateerde producten (cross-sell/up-sell) |
| `soort_veld` | dropdown | ❌ Nee | Selecteer custom velden type (bijv. "Maat") |

---

### 13. Custom Fields (Dynamisch)

Custom fields worden gebruikt voor varianten zoals maat en kleur.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `punten` | number | Prijsaanpassing in punten |
| `waarde` | text | Waarde van het custom veld (bijv. S, M, L) |
| `artikelnummer` | text | Specifiek artikelnummer voor deze variant |

**Voorbeeld gebruik**:
```json
{
  "soort_veld": "Maat",
  "custom_fields": [
    { "waarde": "S", "punten": 0, "artikelnummer": "SHIRT-001-S" },
    { "waarde": "M", "punten": 0, "artikelnummer": "SHIRT-001-M" },
    { "waarde": "L", "punten": 2, "artikelnummer": "SHIRT-001-L" }
  ]
}
```

---

### 14. Algemeen

| Veld | Type | Verplicht | Default | Beschrijving |
|------|------|-----------|---------|--------------|
| `product_id` | number | ❌ Nee (readonly) | auto | Automatisch gegenereerd product ID |
| `taal` | language_selector | ❌ Nee | Nederlands (nl-NL) | Taal van productinformatie |

---

## Mapping naar PIM Velden

### Verplichte Velden Mapping

| Calculated Veld | PIM Veld | Bron |
|----------------|----------|------|
| `artikelnaam` | `style_name` + `color_name` + `size_name` | product_variants |
| `categorieen` | `primary_category_id` | product_styles |
| `uiteindelijke_prijs_punten` | `price_cents / 100` | product_variants |

### Optionele Velden Mapping

| Calculated Veld | PIM Veld | Bron |
|----------------|----------|------|
| `artikel_unieke_code` | `ean` | product_variants |
| `fabrikant` | `brand_name` | brands |
| `gtin_ean_isbn` | `ean` | product_variants |
| `artikelomschrijving` | `description` | product_styles |
| `artikelgewicht` | `weight_grams` | product_styles |
| `kostprijs` | `cost_price_cents / 100` | product_variants |
| `mpn` | `supplier_article_code` | product_styles |
| `custom_fields.waarde` (maat) | `size_name` | size_options |
| `custom_fields.waarde` (kleur) | `color_name` | color_options |

---

## Export Strategie

### Hoofdproducten vs Varianten

**Optie 1: Hoofdproduct met Custom Fields**
- Eén hoofdproduct per style
- Maten/kleuren als custom fields
- Voordeel: Overzichtelijk, minder records
- Nadeel: Complexe custom fields structuur

**Optie 2: Aparte Producten per Variant**
- Elk maat/kleur combinatie = apart product
- Gebruik `hoofdartikel_id` voor koppeling
- Voordeel: Simpele structuur, per variant voorraad
- Nadeel: Veel meer records

**Aanbevolen**: Optie 1 voor kleine catalogi (<500 producten), Optie 2 voor grote catalogi met voorraad per variant.

---

## Validatieregels

### Verplichte Velden Check
```typescript
const requiredFields = [
  'artikelnaam',
  'categorieen',
  'uiteindelijke_prijs_punten'
];
```

### Data Type Validatie
- `number` velden: Moeten numeriek zijn, geen letters
- `checkbox` velden: true/false of 1/0
- `date` velden: ISO 8601 formaat (YYYY-MM-DD)
- `dropdown` velden: Waarde moet in optielijst voorkomen

### Business Rules
- EAN moet 13 cijfers zijn (als ingevuld)
- Prijs moet > 0 zijn
- Gewicht in grammen moet >= 0 zijn
- Custom fields `waarde` moet uniek zijn binnen een product

---

## Export Bestand Formaat

**Aanbevolen formaat**: CSV met UTF-8 encoding

**Header rij**: Kolom namen exact zoals in schema  
**Data rijen**: Een rij per product/variant  
**Scheiding**: Komma (,)  
**Text delimiter**: Dubbele quotes (")  
**Multi-value velden**: Pipe-separated (|) binnen quotes

**Voorbeeld**:
```csv
artikelnaam,artikel_unieke_code,fabrikant,categorieen,uiteindelijke_prijs_punten
"Polo Shirt Blauw S","8712345678901","Santino","Polo's|Werkkleding",29.95
"Polo Shirt Blauw M","8712345678902","Santino","Polo's|Werkkleding",29.95
```

---

## Referenties

- **JSON Schema**: `docs/data-model/calculated-virtuemart-schema.json`
- **Export Formats Algemeen**: `docs/data-model/export-formats.md`
- **Gripp Integration**: `docs/data-model/gripp-integration-analysis.md`

---

## Status

📋 **Schema vastgelegd** - Klaar voor implementatie van export functionaliteit

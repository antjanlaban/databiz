# Import Proces - Troubleshooting

Veelvoorkomende problemen en oplossingen tijdens het importproces.

---

## Bestandsupload problemen

### ❌ "Bestand te groot"

**Oorzaak:** Bestand > 10MB

**Oplossing:**
1. Splits bestand in kleinere delen (< 10MB elk)
2. Import elk deel afzonderlijk
3. Of: verwijder onnodige kolommen uit Excel

---

### ❌ "Ongeldig bestandsformaat"

**Oorzaak:** Bestand is geen `.xlsx`, `.xls` of `.csv`

**Oplossing:**
1. Open bestand in Excel/LibreOffice
2. Sla op als `.xlsx` of `.csv`
3. Upload opnieuw

---

### ❌ "Encoding fout - onleesbare karakters"

**Symptomen:** Nederlandse tekens (é, ü, ñ) tonen als ���

**Oorzaak:** Verkeerde encoding (meestal Windows-1252 vs UTF-8)

**Oplossing:**
1. Open CSV in Notepad++ of VSCode
2. Convert encoding naar UTF-8
3. Sla op en upload opnieuw

**Automatisch:** Systeem probeert automatisch UTF-8, ISO-8859-1 en Windows-1252

---

## Mapping problemen

### ❌ "P0 veld niet gemapped"

**Oorzaak:** Verplicht veld (SKU, naam, categorie) niet gekoppeld

**Oplossing:**
1. Controleer welk P0 veld rood is
2. Selecteer correcte leverancierskolom
3. Of kies "Vaste waarde" indien van toepassing

**Kritisch:** Import kan **niet** doorgaan zonder complete P0 mapping

---

### ❌ "Categorie niet gevonden"

**Oorzaak:** Leveranciers categorie naam komt niet overeen met PIM categorieën

**Oplossing:**
1. Ga naar "Stamdata" → "Categorieën"
2. Check of categorie bestaat
3. Voeg ontbrekende categorieën toe
4. Of: gebruik "Vaste waarde" met bestaande categorie

---

### ❌ "Duplicate mapping"

**Oorzaak:** Dezelfde leverancierskolom gemapped naar meerdere PIM velden

**Oplossing:**
1. Review alle mappings
2. Verwijder duplicate
3. Kies correcte mapping

---

## Validatie fouten

### 🔴 P0: "SKU bevat ongeldige karakters"

**Regel:** SKU mag alleen `A-Z`, `0-9` en `-` bevatten

**Voorbeelden:**
- ❌ `POLO 001` (spatie niet toegestaan)
- ❌ `POLO_001` (underscore niet toegestaan)
- ✅ `POLO-001` (correct)

**Oplossing:**
1. Fix SKU's in bronbestand
2. Vervang spaties/underscores door `-`
3. Verwijder speciale karakters

---

### 🔴 P0: "SKU te kort/lang"

**Regel:** SKU moet 3-100 karakters zijn

**Oplossing:**
1. Verleng te korte SKU's (< 3 chars)
2. Verkort te lange SKU's (> 100 chars)

---

### 🔴 P0: "Productnaam ontbreekt"

**Regel:** Naam is verplicht, 1-255 karakters

**Oplossing:**
1. Check of `name` kolom correct gemapped is
2. Controleer brondata op lege cellen
3. Vul lege namen in bronbestand

---

### 🟡 P1: "Kleur niet gevonden"

**Oorzaak:** Kleurnaam komt niet overeen met `color_families` tabel

**Voorbeeld:**
- Leverancier: `Navyblue`
- PIM: `Navy`

**Oplossing optie 1 - Normalisatie:**
1. Ga naar "Stamdata" → "Kleuren"
2. Voeg alias toe: `Navyblue` → `Navy`

**Oplossing optie 2 - Bulk fix:**
1. Toggle "Sla ongeldige rijen over"
2. Na import: bulk update kleur via "Supplier Catalogus"

---

### 🟡 P1: "Maat niet herkend"

**Regel:** Size moet match met `international_sizes` enum

**Voorbeelden:**
- ❌ `44` (numeric size - moet geconverteerd)
- ❌ `XXXL` (moet `3XL` zijn)
- ✅ `XL` (correct)

**Oplossing:**
1. Check mapping: size mapping correct?
2. Ga naar "Stamdata" → "Maten"
3. Voeg size conversie toe (44 → XS)

---

### 🟡 P1: "Prijs ongeldig formaat"

**Regel:** Prijs moet positief getal zijn, max €100,000

**Voorbeelden:**
- ❌ `€ 12,50` (symbool en komma niet toegestaan)
- ❌ `12.5` (decimalen niet toegestaan in cents veld)
- ✅ `1250` (12.50 euro = 1250 cents)

**Oplossing:**
1. Check price parsing in mapping
2. Verwijder valutasymbolen uit brondata
3. Converteer naar cents: `12.50` → `1250`

---

## Dataset creatie problemen

### ❌ "Dataset creatie timeout"

**Oorzaak:** Te veel rijen (> 5000), Edge Function timeout

**Oplossing:**
1. Splits bestand in batches van max 2000 rijen
2. Import elk batch afzonderlijk
3. Gebruik dataset priority om volgorde te bepalen

---

### ❌ "Duplicate SKU binnen import"

**Oorzaak:** Bronbestand bevat dubbele SKU's

**Oplossing:**
1. Check brondata op duplicates
2. Verwijder duplicate rijen
3. Of: gebruik unieke SKU's per kleur/maat variant

---

### ❌ "Quality score te laag (< 50)"

**Oorzaak:** Te weinig P1/P2 velden ingevuld

**Oplossing:**
1. Review welke velden ontbreken
2. Map extra P1 velden (kleur, maat, prijzen)
3. Voeg P2 data toe waar mogelijk (materiaal, gewicht)

**Waarschuwing:** Score < 50 = **niet activeren** (data te incomplete)

---

## Activatie problemen

### ⚠️ "Conflicten gedetecteerd"

**Oorzaak:** SKU bestaat al met hogere priority dataset

**Voorbeeld:**
```
SKU "POLO-001": 
  Huidige dataset: Priority HIGH
  Nieuwe dataset:  Priority MEDIUM
  → Conflict! Nieuwe dataset verliest
```

**Oplossing optie 1 - Priority verhogen:**
1. Ga terug naar "Dataset Priority"
2. Verhoog naar HIGH
3. Activeer opnieuw

**Oplossing optie 2 - Oude dataset deactiveren:**
1. Ga naar "Supplier Catalogus"
2. Filter op SKU "POLO-001"
3. Deactiveer oude dataset
4. Activeer nieuwe dataset

---

### ❌ "Activatie failed - transaction error"

**Oorzaak:** Database constraint violation (zeldzaam)

**Oplossing:**
1. Check error logs
2. Probeer opnieuw (kan timeout zijn geweest)
3. Contact support indien blijft falen

---

## Performance problemen

### 🐌 "Validatie duurt te lang"

**Oorzaak:** Groot bestand (> 2000 rijen), veel validatieregels

**Normaal:**
- 500 rijen: ~10 seconden
- 1000 rijen: ~20 seconden
- 2000 rijen: ~40 seconden

**Abnormaal:**
- > 60 seconden voor < 1000 rijen

**Oplossing:**
1. Check internet connectie
2. Wacht tot Edge Function klaar is (max 5 min)
3. Refresh pagina om status te checken
4. Contact support indien > 5 min timeout

---

## Data kwaliteit problemen

### ⚠️ "Veel P2 waarschuwingen"

**Impact:** Lagere quality score, maar niet kritisch

**Oplossing:**
1. Review welke P2 velden ontbreken
2. Prioriteer belangrijkste velden:
   - `description` (voor webshop)
   - `material` (voor Calculated KMS)
   - `image_url` (voor visuele content)
3. Map indien data beschikbaar

**Beslisregel:** P2 waarschuwingen **niet** blokkeren import

---

### ⚠️ "Incomplete product data"

**Symptomen:**
- Producten zonder kleur/maat
- Geen prijzen
- Ontbrekende voorraad

**Oorzaak:** P1 velden niet gemapped of ontbreken in brondata

**Oplossing:**
1. Review P1 coverage in quality score
2. Map ontbrekende P1 velden
3. Of: neem contact op met leverancier voor betere data

**Impact:**
- ❌ Export naar Gripp/Calculated kan falen
- ❌ Producten niet bruikbaar in webshop
- ❌ Voorraad sync niet mogelijk

---

## Template problemen

### ❌ "Template verouderd - kolommen missen"

**Oorzaak:** Leverancier heeft Excel layout gewijzigd

**Oplossing:**
1. **Niet** template laden
2. Map handmatig
3. Update template met nieuwe mapping
4. Sla op met changelog: "Nieuwe kolommen toegevoegd: X, Y, Z"

---

### ❌ "Template not found"

**Oorzaak:** Template verwijderd of supplier/brand mismatch

**Oplossing:**
1. Check of juiste supplier/brand geselecteerd
2. Maak nieuwe template aan
3. Of: kopieer mapping van oude import job

---

## Error codes

### `IMPORT_001` - File upload failed
**Fix:** Retry upload, check file size/format

### `IMPORT_002` - Column detection failed
**Fix:** Check file corruption, try re-saving in Excel

### `IMPORT_003` - Validation timeout
**Fix:** Reduce file size, split into batches

### `IMPORT_004` - Dataset creation failed
**Fix:** Check database logs, retry operation

### `IMPORT_005` - Activation failed
**Fix:** Check for conflicts, review transaction logs

---

## Support

**Stuck?** Contact support met:
1. Import Job ID (vind in import overzicht)
2. Screenshot van error
3. Bestandsnaam
4. Stap waar probleem optreedt

**Email:** support@vankruiningen.nl  
**Response tijd:** < 4 uur (werkdagen)

---

## Debug tips

### Check import status
```sql
SELECT id, status, quality_score, validation_progress
FROM import_jobs
WHERE id = '{job_id}'
```

### View validation errors
```sql
SELECT row_number, field_name, error_type, error_message
FROM validation_errors
WHERE import_job_id = '{job_id}'
ORDER BY error_type DESC, row_number
LIMIT 50
```

### Check dataset conflicts
```sql
SELECT sku, priority_level, lifecycle_status
FROM datasets
WHERE brand_id = '{brand_id}'
  AND sku IN (SELECT sku FROM datasets WHERE import_job_id = '{job_id}')
  AND lifecycle_status = 'active'
```

---

**Laatst bijgewerkt:** November 2025

# Test Plan

## Phasing

- DEV: Unit/integration/E2E
- FAT: before go-live (dev team, scenario based)
- UAT: pre-production, key users, training en feedback[web:196]

## Roles

- QA engineer: setup, execution, regression automation
- Power users: UAT, feedback, acceptatie

## Acceptance

- All critical user flows pass: import, export, bulk, validate, search
- No blocking bugs
- Performance targets gehaald
- Audit logs volledige dekking (data changes)

## Go-live Support

- Hotfix proces: bugs < 2 uur opgelost
- Rollback procedure documentatie

## Review

- Bij elke sprint: regression + new feature E2E
- Release notes: highlights + test outcomes

## Mapping Vereenvoudiging Tests (sinds 2025-10-28)

### Test Scenario 1: Nieuwe Import Met 13 Velden
**Doel:** Verificeer dat nieuwe mapping UI correct werkt

**Setup:**
1. Upload TEE JAYS Excel bestand (500 producten)
2. Map alleen 13 velden:
   - EAN → "EAN code basiseenheid"
   - Supplier SKU → "Product"
   - Brand → Dropdown selectie "Tee Jays"
   - Article code → "Model"
   - Style name → "Model [*]"
   - Article name → "Omschrijving"
   - Color name → "Kleur"
   - Size code → "Maat"
   - Advised price → "Adviesprijs"
   - Image URLs → "Images"
   - Product group → "Categorie"

**Verwacht:**
- ✅ Mapping succesvol, 13 velden ingevuld
- ✅ Validatie slaagt (500 valid rows)
- ✅ Import succesvol (500 inserted)
- ✅ Raw data bevat alle originele kolommen (inclusief kleurcode, beschrijvingen, etc.)
- ✅ Detail drawer toont raw_data sectie

---

### Test Scenario 2: Oude Template Laden (Backward Compatibility)
**Doel:** Verificeer dat oude templates met 21 velden nog steeds laden

**Setup:**
1. Laad bestaande template uit database (created_at < 2025-10-28)
2. Template bevat deprecated mappings:
   - `supplier_color_code` → "Color Code"
   - `supplier_category_name` → "Category"
   - `supplier_short_description` → "Short Desc"
   - etc.

**Verwacht:**
- ✅ Template laadt zonder errors
- ✅ Alleen 13 geldige velden worden getoond in UI
- ✅ Deprecated velden worden gefilterd (console.warn logged)
- ✅ User ziet alleen relevante mappings
- ✅ Import met gefilterde template werkt correct

---

### Test Scenario 3: Brand Dropdown Flow
**Doel:** Verificeer dat brand selectie zonder kolom mapping werkt

**Setup:**
1. Upload Excel zonder brand kolom
2. Map EAN + SKU
3. Skip brand mapping (laat leeg)
4. Zie waarschuwing "Geen merknaam kolom gevonden"
5. Open dropdown, selecteer "Tricorp"

**Verwacht:**
- ✅ Waarschuwing zichtbaar met twee opties
- ✅ Dropdown toont alle actieve brands
- ✅ Selectie werkt, validatie slaagt
- ✅ Import past "Tricorp" toe als static value op alle rijen
- ✅ Database: `supplier_brand_name` = "Tricorp" voor alle geïmporteerde producten

---

### Test Scenario 4: Color Grouping Zonder Color Code
**Doel:** Verificeer dat grouping werkt zonder `supplier_color_code`

**Setup:**
1. Import 50 producten zonder `supplier_color_code` mapping
2. Producten hebben wel `supplier_color_name`: "Navy", "Red", "Black"
3. Open leveranciers catalogus pagina

**Verwacht:**
- ✅ Producten gegroepeerd per brand + style
- ✅ Colors gegroepeerd per color_name
- ✅ Color code auto-generated: "NAV", "RED", "BLA"
- ✅ UI toont kleurnamen correct
- ✅ Geen errors in console

---

### Test Scenario 5: Promotie Wizard Zonder Color Code
**Doel:** Verificeer dat promotie wizard werkt zonder `supplier_color_code`

**Setup:**
1. Selecteer 10 supplier producten zonder `supplier_color_code`
2. Start promotie wizard
3. Map style, color, size
4. Preview resultaat

**Verwacht:**
- ✅ Step 3 (Color Mapping) gebruikt `supplier_color_name`
- ✅ Auto-mapping suggesties gebaseerd op color_name
- ✅ Preview toont `color_code` auto-generated uit color_name
- ✅ Conversie succesvol: `color_variants` heeft `color_code` veld ingevuld
- ✅ Geen errors in promotie flow

---

### Test Scenario 6: CSV Export Met Productgroep
**Doel:** Verificeer dat CSV export correct veld gebruikt

**Setup:**
1. Import 100 producten met `supplier_product_group` = "Polo's"
2. Skip `supplier_category_name` (deprecated)
3. Ga naar Step 3 (Simulatie)
4. Export detailed changes naar CSV

**Verwacht:**
- ✅ CSV bevat "Categorie" kolom
- ✅ Waarde = "Polo's" (uit `supplier_product_group`)
- ✅ Geen lege categorie kolommen
- ✅ CSV correct formatted (geen extra quotes/escapes)

---

### Test Scenario 7: Filter Op Productgroep
**Doel:** Verificeer filtering op productgroep in catalogus

**Setup:**
1. Database heeft 200 producten:
   - 80x "Polo's"
   - 60x "Werkschoenen"
   - 40x "Fleece Jackets"
   - 20x NULL (geen productgroep)
2. Open `/supplier-catalog`

**Verwacht:**
- ✅ Filter dropdown "Groepen" toont 3 opties
- ✅ Selecteer "Polo's" → Tabel toont 80 items
- ✅ Selecteer ook "Fleece Jackets" → Tabel toont 120 items
- ✅ Clear filters → Tabel toont 200 items
- ✅ Badge toont "2 groepen geselecteerd"

---

### Test Scenario 8: Raw Data in Detail Drawer
**Doel:** Verificeer dat deprecated velden zichtbaar zijn in raw_data

**Setup:**
1. Import Excel met 30 kolommen (inclusief beschrijvingen, pasvorm, etc.)
2. Map alleen 13 velden
3. Open detail drawer voor een product

**Verwacht:**
- ✅ Raw Import Data sectie toont ALLE 30 originele kolommen
- ✅ Deprecated velden zoals `short_description`, `fit`, `gender` zichtbaar
- ✅ JSON formatting correct (pretty-printed)
- ✅ Copy-to-clipboard functie werkt
- ✅ User kan alle originele data inzien

---

## Performance Regression Tests

### Test: Import Snelheid (Before vs After)
**Doel:** Verificeer dat mapping vereenvoudiging import sneller maakt

**Setup:**
- Upload identiek bestand (1000 rijen)
- **Before**: Map 21 velden (oude flow)
- **After**: Map 13 velden (nieuwe flow)

**Verwacht:**
- ✅ Mapping tijd: -20% tot -30% (minder dropdowns, minder clicks)
- ✅ Validatie tijd: onveranderd
- ✅ Import executie tijd: onveranderd
- ✅ Totale flow tijd: -15% tot -25%

---

## Edge Cases

### Edge Case 1: Bestand Met Alleen EAN Kolom
**Input:** Excel met 1 kolom: "EAN"

**Verwacht:**
- ✅ Map EAN → validatie fout "Brand verplicht"
- ✅ Dropdown brand selection forced
- ✅ Alle andere velden NULL in database
- ✅ Raw data bevat alleen EAN kolom

---

### Edge Case 2: Template Naam Conflict
**Input:** User probeert template op te slaan met naam die al bestaat

**Verwacht:**
- ✅ Error: "Template naam bestaat al"
- ✅ Suggestie: "Template 21-10-2025 (2)"
- ✅ User kan unieke naam kiezen

---

### Edge Case 3: Geen Brands Beschikbaar
**Input:** Database heeft 0 actieve brands, user probeert brand via dropdown te selecteren

**Verwacht:**
- ✅ Dropdown disabled
- ✅ Error message: "Geen merken beschikbaar. Maak eerst een merk aan via Stamdata → Merken."
- ✅ Link naar stamdata pagina

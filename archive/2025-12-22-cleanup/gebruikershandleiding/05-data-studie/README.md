# DataStudie - Gebruikershandleiding

## Wat is DataStudie?

**DataStudie** is een leeromgeving binnen de Van Kruiningen PIM waarmee je leveranciersbestanden kunt analyseren **zonder dat je een merk of leverancier hoeft op te geven**. Het is perfect voor:

- 🎓 **Leren:** Begrijp hoe leveranciersdata gestructureerd is
- 🔍 **Analyseren:** Bekijk kolomkoppen, data types en kwaliteit
- ✅ **Valideren:** Check of EAN's aanwezig en geldig zijn voordat je importeert
- 🧪 **Testen:** Probeer verschillende bestanden uit zonder impact op productie data

**Toegang:** Navigeer naar `/data-study` of gebruik de navigatie in het hoofdmenu.

---

## Snelstart Guide (5 minuten)

### Stap 1: Ga naar DataStudie
Klik op de **DataStudie** link in het hoofdmenu of navigeer direct naar `/data-study`.

### Stap 2: Upload een Bestand
1. **Sleep** je CSV of Excel bestand naar het upload gebied, OF
2. **Klik** op het upload gebied om je file picker te openen
3. Selecteer een bestand (max 50MB)

**Ondersteunde formaten:**
- ✅ CSV bestanden (.csv)
- ✅ Excel bestanden (.xlsx, .xls)

### Stap 3: Wacht op Parsing
Je ziet een progress bar terwijl het bestand wordt verwerkt:
- 0-20%: Bestand uploaden
- 20-60%: Parsing kolomkoppen en data
- 60-100%: Data opslaan in database

Dit duurt meestal **10-30 seconden** voor bestanden tot 1000 rijen.

### Stap 4: Bekijk de Data
Na voltooiing word je automatisch doorgestuurd naar de **data weergave pagina** waar je:
- **Links:** Lijst met alle data records
- **Rechts:** Gedetailleerde JSONB weergave van geselecteerde record

### Stap 5: Verken de Data
- Klik op een record in de lijst om details te zien
- Gebruik het **zoek veld** om te filteren op EAN of waarde
- Wissel tussen **Tabel** en **Boom** view voor verschillende weergaves

---

## Upload Pagina

### Bestandsvereisten

**Formaten:**
- CSV (Comma-Separated Values)
- Excel (.xlsx, .xls)

**Maximale grootte:** 50MB per bestand

**Aanbevolen:**
- Voor eerste keer: **100-500 rijen** om snel resultaat te zien
- Voor analyse: **Volledige bestand** (tot 50MB)

### Upload Methodes

#### Methode 1: Drag & Drop 🖱️
1. Sleep je bestand naar het **upload gebied**
2. Het gebied wordt **blauw** als je het bestand erboven houdt
3. Laat los om te uploaden

#### Methode 2: File Picker 📂
1. Klik op het **upload gebied**
2. Selecteer je bestand in de file picker
3. Klik **Open** om te uploaden

### Upload Process

**Wat gebeurt er tijdens de upload?**

1. **Validatie (0-10%):**
   - Bestandstype controleren (CSV of Excel)
   - Bestandsgrootte controleren (max 50MB)
   - Temp import job aanmaken in database

2. **Upload naar Storage (10-40%):**
   - Bestand wordt geüpload naar Supabase Storage
   - Bestand wordt opgeslagen in `study/` folder

3. **Parsing (40-80%):**
   - Kolomkoppen worden gedetecteerd
   - Alle rijen worden geparsed
   - EAN velden worden automatisch gedetecteerd

4. **Database Opslag (80-100%):**
   - Alle data wordt opgeslagen in `supplier_datasets` tabel
   - Ruwe data wordt bewaard als JSONB
   - EAN wordt geëxtraheerd voor snelle toegang

5. **Klaar! (100%):**
   - Je wordt automatisch doorgestuurd naar de data weergave
   - Je kunt direct de data verkennen

### Foutmeldingen

| Foutmelding | Betekenis | Oplossing |
|------------|-----------|-----------|
| "Alleen CSV en Excel bestanden toegestaan" | Verkeerd bestandstype | Upload een .csv, .xlsx of .xls bestand |
| "Bestand mag maximaal 50MB zijn" | Bestand te groot | Comprimeer bestand of split in kleinere delen |
| "Upload mislukt" | Algemene upload error | Check console logs of probeer opnieuw |

---

## Data Weergave Pagina

Na een succesvolle upload zie je de **data weergave pagina** met twee panelen:

### Links Paneel: Records Lijst

**Wat zie je:**
- Lijst met alle data records uit het bestand
- Voor elk record:
  - **EAN nummer** (indien gevonden) of "Geen EAN"
  - **Rij nummer** in het originele bestand
  - **Aantal velden** in de ruwe data

**Interactie:**
- Klik op een record om details te zien in het rechter paneel
- Geselecteerde record wordt **blauw** gemarkeerd
- Scroll door de lijst met scrollbar

**Status indicators:**
- **Blauw:** Geselecteerde record
- **Grijs:** Niet geselecteerde record
- **Geen EAN:** Record heeft geen geldig EAN-13 nummer

### Rechts Paneel: JSONB Inspector

**Wat zie je:**
- Gedetailleerde weergave van de **ruwe data** van geselecteerde record
- Alle kolommen en hun waarden
- Twee weergave modes: **Tabel** en **Boom**

#### Tabel View (aanbevolen) 📊

**Wanneer gebruiken:**
- Voor overzichtelijk kolomnamen en waarden bekijken
- Als je snel wilt scannen welke velden gevuld zijn
- Voor simpele data structuren

**Voorbeeld:**
```
| Kolom                  | Waarde                    |
|------------------------|---------------------------|
| ean                    | 8719598774514             |
| supplier_sku           | ABC-123-M                 |
| supplier_color_name    | Navy                      |
| supplier_size_code     | M                         |
| supplier_advised_price | 45.00                     |
```

#### Boom View (advanced) 🌳

**Wanneer gebruiken:**
- Voor complexe geneste data structuren
- Als je JSON formaat wilt zien
- Voor kopiëren naar andere tools (JSON format)

**Voorbeeld:**
```json
{
  ean: "8719598774514"
  supplier_sku: "ABC-123-M"
  supplier_color_name: "Navy"
  supplier_size_code: "M"
  supplier_advised_price: 45.00
}
```

### Kopieer Functionaliteit 📋

**Hoe te gebruiken:**
1. Selecteer een record
2. Klik op **"Kopieer JSON"** knop rechtsboven
3. JSON data wordt naar klembord gekopieerd
4. Knop verandert naar **"Gekopieerd"** met vinkje (2 seconden)

**Nut:**
- Plak data in Excel of andere tools
- Share specifieke records met collega's
- Gebruik in API testing tools (Postman, etc.)

---

## Zoeken & Filteren

### Zoek Veld

**Locatie:** Boven de records lijst

**Wat kun je zoeken:**
- ✅ **EAN nummer:** Typ gedeeltelijk of volledig EAN
- ✅ **Kolomwaarde:** Zoek in alle velden van ruwe data
- ✅ **Gedeeltelijke match:** Niet hoofdlettergevoelig

**Voorbeelden:**

| Zoekterm | Vindt |
|----------|-------|
| `8719` | Alle EAN's die beginnen met 8719 |
| `Navy` | Alle records met "Navy" in een veld |
| `XL` | Alle records met size "XL" |
| `ABC-123` | Alle SKU's die "ABC-123" bevatten |

### Real-time Filtering

**Hoe werkt het:**
1. Typ in het zoek veld
2. Records worden **direct gefilterd** tijdens typen (geen Enter nodig)
3. Gefilterde lijst wordt direct bijgewerkt
4. Aantal resultaten is zichtbaar

**Tips:**
- 🔍 Begin met een **breed zoekterm** en verfijn geleidelijk
- 🔍 Gebruik **korte zoektermen** (3-4 karakters) voor snelle filtering
- 🔍 **Wis zoekterm** om alle records weer te zien

---

## Upload Geschiedenis

### Overzicht Pagina

**Toegang:** Klik op **"Bekijk eerdere uploads"** knop op de upload pagina of navigeer naar `/data-study/overview`.

**Wat zie je:**
- Lijst met alle je eerdere DataStudie uploads
- Gesorteerd op **nieuwste eerst**

**Per upload zie je:**
- 📄 **Bestandsnaam**
- 📅 **Upload datum** (bijv. "14 januari 2025")
- 📊 **Aantal rijen** (bijv. "1690 rijen")
- 💾 **Bestandsgrootte** (bijv. "2.4 MB")

### Upload Openen

**Hoe:**
1. Klik op een upload in de lijst
2. Je wordt doorgestuurd naar de data weergave pagina
3. Alle data wordt opnieuw geladen (blijft beschikbaar)

**Wanneer nuttig:**
- ✅ Vergelijk verschillende supplier bestanden
- ✅ Bekijk oudere uploads voor referentie
- ✅ Zoek specifieke data in eerdere uploads

### Geen Uploads?

Als je nog geen uploads hebt, zie je:
- 📂 "Nog geen uploads" melding
- Knop om naar upload pagina te gaan

---

## EAN Auto-detectie

### Wat is EAN?

**EAN-13** (European Article Number) is een internationale standaard barcode voor product identificatie. Het bestaat uit **exact 13 cijfers** met een ingebouwde checksum voor validatie.

**Voorbeeld:** `8719598774514`

**Structuur:**
- Cijfer 1-3: Landcode (bijv. 871 voor Nederland)
- Cijfer 4-9: Bedrijfscode (brand prefix)
- Cijfer 10-12: Productcode
- Cijfer 13: Checksum (controle cijfer)

### Hoe Werkt Auto-detectie?

DataStudie detecteert automatisch het EAN veld uit je bestand met een **3-stappen prioriteit**:

#### Stap 1: Kolomnaam Matching (hoogste prioriteit) 🎯

**Gezochte keywords in kolomnamen:**
- `ean`
- `barcode`
- `gtin`
- `ean13`
- `ean_code`
- `artikelnummer`

**Voorbeelden van herkende kolomnamen:**
- ✅ "EAN"
- ✅ "ean_code"
- ✅ "Barcode"
- ✅ "GTIN-13"
- ✅ "Artikelnummer"

**Hoe het werkt:**
1. Scan alle kolomnamen
2. Match tegen keywords (niet hoofdlettergevoelig)
3. Als match: Controleer of waarde 13 cijfers is
4. Valideer checksum
5. Als geldig: **EAN gevonden!** ✅

#### Stap 2: 13-Cijfer Patroon (medium prioriteit) 🔢

Als geen kolomnaam match is gevonden:
1. Scan **alle kolommen** in de data
2. Zoek waarden met **exact 13 cijfers**
3. Valideer checksum
4. Eerste geldige waarde wordt gebruikt als EAN

**Voorbeelden:**
- ✅ `8719598774514` (geldig EAN-13)
- ❌ `123456789012` (ongeldige checksum)
- ❌ `87195987745` (slechts 11 cijfers)

#### Stap 3: Geen EAN Gevonden ❌

Als geen EAN wordt gevonden:
- Record toont **"Geen EAN"** in lijst
- Ruwe data is nog steeds beschikbaar in JSONB inspector
- Je kunt nog steeds zoeken en filteren op andere velden

### EAN Checksum Validatie

**Wat is een checksum?**
Een mathematische berekening over de eerste 12 cijfers die het 13e cijfer (checksum) bepaalt. Dit voorkomt typefouten en valse EAN's.

**Voorbeeld berekening voor `8719598774514`:**
```
Cijfers:     8 7 1 9 5 9 8 7 7 4 5 1 [4]
Weights:     1 3 1 3 1 3 1 3 1 3 1 3
Product:     8+21+1+27+5+27+8+21+7+12+5+3 = 145
Checksum:    (10 - (145 % 10)) % 10 = 5... FOUT!

Correcte EAN: 8719598774515 (met checksum 5)
```

**Waarom belangrijk?**
- ✅ Voorkomt verwerking van ongeldige EAN's
- ✅ Detecteert typefouten in supplier data
- ✅ Garandeert data kwaliteit voor latere import

### Troubleshooting EAN Detectie

#### Probleem: "Geen EAN" terwijl EAN er wel is

**Mogelijke oorzaken:**

1. **Kolomnaam niet herkend:**
   - **Oplossing:** Hernoem kolom naar "ean", "barcode" of "gtin"
   - **Check:** Bekijk JSONB inspector om exacte kolomnaam te zien

2. **EAN heeft verkeerd format:**
   - **Voorbeeld:** "NL8719598774514" (bevat letters)
   - **Oplossing:** Verwijder niet-numerieke karakters in Excel
   - **Check:** Moet exact 13 cijfers zijn

3. **Ongeldige checksum:**
   - **Voorbeeld:** "8719598774512" (laatste cijfer fout)
   - **Oplossing:** Corrigeer EAN in bronbestand
   - **Check:** Gebruik online EAN checksum calculator

4. **EAN zit in verkeerde kolom:**
   - **Voorbeeld:** EAN zit in "Notes" kolom in plaats van "Barcode"
   - **Oplossing:** Verplaats data naar herkenbare kolomnaam

#### Probleem: Verkeerde kolom wordt als EAN herkend

**Mogelijke oorzaken:**
- Andere kolom heeft toevallig 13 cijfers met geldige checksum
- **Voorbeeld:** Order nummer "1234567890123" wordt als EAN herkend

**Oplossing:**
- Hernoem echte EAN kolom naar "ean" of "barcode" (heeft prioriteit)
- Verwijder of hernoem kolom die foutief wordt herkend

---

## Gebruik Cases & Voorbeelden

### Use Case 1: Nieuwe Leverancier Onboarding 🆕

**Scenario:**
Je krijgt voor het eerst een bestand van een nieuwe leverancier en wilt snel zien hoe de data eruit ziet.

**Workflow:**
1. Upload het bestand in DataStudie
2. Bekijk de records lijst:
   - Hoeveel records zijn er?
   - Zijn er EAN's aanwezig?
3. Selecteer 3-5 willekeurige records
4. Analyseer in JSONB Inspector:
   - Welke kolommen zijn consistent gevuld?
   - Welke data types worden gebruikt?
   - Zijn er lege velden?
5. Noteer bevindingen voor mapping configuratie

**Tijdsbesparing:** 5-10 minuten vs 30+ minuten met Excel

### Use Case 2: EAN Kwaliteit Check ✅

**Scenario:**
Je wilt controleren of alle EAN's geldig zijn voordat je een grote import doet.

**Workflow:**
1. Upload bestand in DataStudie
2. Check aantal "Geen EAN" records in lijst
3. Zoek op specifieke EAN's die je wilt valideren
4. Bekijk distributie:
   - Hoeveel records hebben EAN?
   - Hoeveel records missen EAN?
5. Besluit:
   - **<5% ontbreekt:** Ga verder met import
   - **>5% ontbreekt:** Neem contact op met leverancier

**Tijdsbesparing:** Directe feedback vs handmatige Excel checks

### Use Case 3: Kolom Mapping Preview 🗺️

**Scenario:**
Je wilt zien welke kolommen uit het leveranciersbestand je nodig hebt voor mapping.

**Workflow:**
1. Upload bestand in DataStudie
2. Selecteer meerdere records
3. Maak lijst van beschikbare kolommen in Tabel view
4. Noteer mapping:
   ```
   Leverancier Kolom → PIM Veld
   ean → EAN
   art_code → Supplier SKU
   kleur → Supplier Color Name
   maat → Supplier Size Code
   prijs → Supplier Advised Price
   ```
5. Gebruik deze mapping in de echte import wizard

**Tijdsbesparing:** Visuele preview vs giswerk

### Use Case 4: Data Kwaliteit Analyse 📊

**Scenario:**
Je wilt de algemene data kwaliteit van een leverancier beoordelen.

**Workflow:**
1. Upload bestand in DataStudie
2. Sample 10-20 willekeurige records
3. Check per record:
   - **Completeness:** Zijn alle belangrijke velden gevuld?
   - **Consistency:** Hebben size/color/EAN consistente formaten?
   - **Accuracy:** Zijn prijzen realistisch? Zijn EAN's geldig?
4. Bereken kwaliteitsscore:
   - **>90% complete:** Excellent (A)
   - **75-90% complete:** Good (B)
   - **50-75% complete:** Fair (C)
   - **<50% complete:** Poor (D)
5. Rapporteer bevindingen aan leverancier

**Tijdsbesparing:** Geautomatiseerde analyse vs handmatig werk

---

## Tips & Tricks

### Pro Tips 💡

1. **Start Klein:**
   - Upload eerst 100-500 rijen om formaat te begrijpen
   - Daarna upload volledig bestand voor volledige analyse

2. **Beschrijvende Bestandsnamen:**
   - ✅ Gebruik: `leverancier_datum_productgroep.xlsx`
   - ❌ Vermijd: `data.xlsx`, `temp.csv`
   - **Waarom:** Makkelijker terug te vinden in upload geschiedenis

3. **Gebruik Search Slim:**
   - Zoek op **SKU prefixes** om producten van specifiek merk te vinden
   - Zoek op **size codes** om size ranges te analyseren
   - Zoek op **price ranges** (bijv. "45") om prijscategorieën te vinden

4. **Copy JSON voor Analyse:**
   - Kopieer interessante records naar Excel
   - Deel specifieke voorbeelden met collega's via Slack/Teams
   - Gebruik in API testing (Postman) voor integrations

5. **Vergelijk Bestanden:**
   - Upload meerdere bestanden van dezelfde leverancier
   - Open in verschillende browser tabs
   - Vergelijk kolomstructuur en data kwaliteit

### Veelgemaakte Fouten ❌

1. **Te Grote Bestanden:**
   - ❌ Upload 100MB Excel bestanden
   - ✅ Split in kleinere delen of gebruik filters in Excel

2. **Verkeerde Encoding:**
   - ❌ Upload CSV met verkeerde encoding (soms speciale karakters)
   - ✅ Open eerst in Excel, "Save As" → CSV UTF-8

3. **Excel Formulas:**
   - ❌ Bestanden met formules kunnen fouten geven
   - ✅ Copy paste naar nieuw sheet als "Values Only"

4. **Merged Cells:**
   - ❌ Excel bestanden met merged cells parseren fout
   - ✅ Unmerge alle cells voor upload

---

## Veelgestelde Vragen (FAQ)

### Algemeen

**Q: Kan ik meerdere bestanden tegelijk uploaden?**
A: Nee, momenteel 1 bestand per keer. Upload eerst bestand 1, ga terug naar upload pagina voor bestand 2.

**Q: Wordt mijn data automatisch verwijderd?**
A: Ja, DataStudie data ouder dan 24 uur wordt automatisch opgeschoond. Dit is temp data voor analyse.

**Q: Kan ik DataStudie data gebruiken voor echte imports?**
A: Nee, DataStudie is alleen voor analyse. Voor echte imports gebruik de reguliere import wizard (`/import`).

**Q: Hoeveel bestanden kan ik uploaden?**
A: Onbeperkt, maar oude uploads (>24 uur) worden automatisch verwijderd.

### Upload & Parsing

**Q: Waarom duurt parsing zo lang?**
A: Grote bestanden (>5000 rijen) kunnen 1-2 minuten duren door:
- Alle rijen moeten geparsed worden
- EAN detectie per rij
- Database opslag in batches

**Q: Wat als parsing faalt?**
A: Check console logs voor errors. Vaak door:
- Corrupt Excel bestand → Opnieuw opslaan in Excel
- Ongeldige karakters → Check encoding
- Te grote bestanden → Split bestand

**Q: Worden lege rijen overgeslagen?**
A: Ja, volledig lege rijen worden automatisch overgeslagen tijdens parsing.

### EAN Detectie

**Q: Waarom worden mijn EAN's niet gevonden?**
A: Meest voorkomende redenen:
1. EAN kolom heeft niet-standaard naam → Hernoem naar "ean"
2. EAN heeft verkeerd format (niet 13 cijfers) → Controleer in Excel
3. Ongeldige checksum → Corrigeer EAN in bronbestand

**Q: Kan ik EAN detectie overslaan?**
A: Nee, EAN detectie gebeurt altijd automatisch. Echter, records zonder EAN zijn nog steeds toegankelijk via JSONB inspector.

**Q: Ondersteunt DataStudie ook EAN-8?**
A: Nee, alleen EAN-13 wordt gedetecteerd. EAN-8 wordt niet als geldig EAN herkend.

### Data Weergave

**Q: Kan ik data exporteren uit DataStudie?**
A: Momenteel niet via UI. Je kunt JSON kopiëren per record. Feature voor bulk export komt in toekomstige versie.

**Q: Waarom zie ik "Geen resultaten gevonden"?**
A: Check of:
1. Search query te specifiek is → Gebruik kortere zoekterm
2. Parsing nog bezig → Wacht tot status "completed"
3. Bestand echt 0 records heeft → Check origineel bestand

**Q: Kan ik data sorteren?**
A: Nee, records worden altijd gesorteerd op rij nummer (zoals in origineel bestand). Gebruik search voor filtering.

### Troubleshooting

**Q: Ik zie een "500 Error" melding**
A: Server error, vaak door:
- Edge Function timeout (>5000 rijen) → Probeer kleiner bestand
- Database connectivity issues → Wacht 5 minuten en probeer opnieuw
- Corrupt bestand → Check origineel in Excel

**Q: Upload blijft hangen op 40%**
A: Vaak door:
- Trage netwerk verbinding → Check internet snelheid
- Grote bestand (>20MB) → Wacht geduldig of split bestand
- Browser tab in background → Houd tab actief tijdens upload

**Q: Data lijkt incompleet**
A: Check of:
1. Origineel bestand incompleet is → Open in Excel ter verificatie
2. Lege rijen werden overgeslagen → Normale behavior
3. Kolommen met alleen formules werden genegeerd → Save as values

---

## Volgende Stappen

### Na DataStudie Analyse

Nu je de data hebt geanalyseerd, kun je:

1. **Ga naar Import Wizard** (`/import`):
   - Gebruik je bevindingen voor kolom mapping
   - Configureer validatie regels op basis van data kwaliteit
   - Kies juiste merk & leverancier

2. **Rapporteer aan Leverancier:**
   - Share kwaliteitsbevindingen
   - Vraag om ontbrekende velden
   - Verzoek om standaardisatie

3. **Update Reference Data:**
   - Voeg nieuwe merken/leveranciers toe indien nodig
   - Configureer size/color mappings
   - Setup import templates

4. **Test Import:**
   - Doe test import met 100 rijen eerst
   - Valideer conversie naar PIM formaat
   - Check data kwaliteit scores

### Hulp Nodig?

- 📖 **Technische Documentatie:** `/docs/features/data-study.md`
- 💬 **Support:** Neem contact op met je system administrator
- 🐛 **Bug Report:** Meld issues via het ticket systeem

---

## Changelog

### v1.0.0 (2025-01-14)
- ✅ Eerste release van DataStudie
- ✅ Upload pagina met drag & drop
- ✅ Automatische EAN detectie
- ✅ JSONB Inspector (tabel + boom view)
- ✅ Search & filter functionaliteit
- ✅ Upload geschiedenis overzicht

### Geplande Features (Toekomst)

- 🔜 **Bulk Export:** Download alle records als CSV/Excel
- 🔜 **Statistieken Dashboard:** Overzicht van data kwaliteit metrics
- 🔜 **Vergelijk Bestanden:** Side-by-side vergelijking van uploads
- 🔜 **Column Mapping Preview:** Test mapping voordat je importeert
- 🔜 **Bulk Delete:** Verwijder oude uploads in bulk
- 🔜 **Notes Field:** Voeg opmerkingen toe per upload

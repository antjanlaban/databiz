# 04. Promotion Wizard - Gebruikershandleiding

**Doel:** Converteer leveranciersproducten naar gestandaardiseerde Master/Variant structuur  
**Geschatte tijd:** 5-10 minuten per batch van 100 producten  
**Moeilijkheid:** ⭐⭐ Gemiddeld

---

## 📋 Wat is de Promotion Wizard?

De **Promotion Wizard** helpt je om ruwe leveranciersproducten om te zetten naar een professionele productstructuur die klaar is voor export naar webshops en externe systemen zoals Gripp en Calculated.

### Wat gebeurt er tijdens promotie?

**Voor promotie:**
```
Leverancier Excel:
├── Regel 1: Russell Polo Navy XS   → EAN: 5012345678901
├── Regel 2: Russell Polo Navy S    → EAN: 5012345678902
├── Regel 3: Russell Polo Black XS  → EAN: 5012345678903
└── ... (15 losse regels)
```

**Na promotie:**
```
Master Product: "Russell Premium Polo"
├── Variant 1: Russell | Premium Polo | Navy | XS   → Gekoppeld aan EAN 5012345678901
├── Variant 2: Russell | Premium Polo | Navy | S    → Gekoppeld aan EAN 5012345678902
├── Variant 3: Russell | Premium Polo | Black | XS  → Gekoppeld aan EAN 5012345678903
└── ... (15 gestructureerde variants met standaard kleuren en maten)
```

### Waarom promoveren?

✅ **Gestandaardiseerde kleuren:** "Navy", "Marine", "Donkerblauw" → Allemaal "Navy (MONO)"  
✅ **Gestandaardiseerde maten:** "XXXL", "3XL", "EU-56" → Allemaal "3XL"  
✅ **Webshop klaar:** Groepeer varianten onder één master product  
✅ **Export klaar:** Correcte data voor Gripp en Calculated  
✅ **Traceerbaarheid:** Blijf gekoppeld aan originele leverancier data

---

## 🚀 Stap-voor-Stap Handleiding

### Voorbereiding

1. **Navigeer naar Supplier Catalog**
   - Ga naar: `Supplier Data → Supplier Catalog`
   - Zorg dat je import is afgerond en data zichtbaar is

2. **Selecteer Producten**
   - Vink producten aan die je wilt promoveren
   - Tip: Selecteer producten die bij elkaar horen (zelfde style, verschillende kleuren/maten)
   - Aantal geselecteerd wordt getoond: bijv. `(15)`

3. **Start Wizard**
   - Klik op: **"Promoveer naar Master/Variant (15)"**
   - De wizard opent in een modal

---

### Step 1: Selectie Overzicht

**Wat zie je:**
- Totaal aantal geselecteerde producten
- Grouping per style → kleuren → maten
- Aantal unieke kleuren en maten

**Wat moet je doen:**
1. Controleer of de juiste producten geselecteerd zijn
2. Klik **"Volgende"** om door te gaan

**Tips:**
- Als je verkeerde producten ziet: Sluit wizard en pas selectie aan
- Let op grouping: Producten moeten bij elkaar horen voor één Master

<img src="./screenshots/step1-overview.png" alt="Step 1: Selectie Overzicht" width="800">

---

### Step 2: Style Mapping

**Wat zie je:**
- Form met velden voor Master product metadata

**Wat moet je invullen:**

#### Verplichte Velden ⚠️

1. **Master Name** (tekst, 3-255 karakters)
   - Beschrijvende naam voor het master product
   - Voorbeeld: `"Premium Polo"`, `"Softshell Jack Heritage"`
   - Tip: Gebruik geen kleur of maat in de naam (komt later)

2. **Brand** (dropdown)
   - Selecteer het merk van het product
   - Voorbeeld: `Russell`, `Tricorp`, `Fruit of the Loom`
   - Tip: Als brand ontbreekt, voeg eerst toe in Stamdata beheer

3. **Supplier** (dropdown)
   - Selecteer de leverancier
   - Wordt vaak automatisch gedetecteerd
   - Voorbeeld: `Russell Europe BV`

4. **Category** (dropdown)
   - Selecteer de productcategorie
   - Voorbeeld: `Polo's`, `T-shirts`, `Jassen`
   - Tip: Kies zo specifiek mogelijk voor betere exports

#### Optionele Velden

5. **Gender** (radio buttons)
   - Opties: `Unisex` (default), `Heren`, `Dames`
   - Voor meeste werkkleding: laat op Unisex

6. **Description** (tekstveld, meerdere regels)
   - Productbeschrijving voor webshops
   - Voorbeeld: `"Premium polo met knopen en contrasterende details. Perfect voor zakelijke gelegenheden."`

7. **Material Composition** (tekstveld)
   - Materiaal samenstelling
   - Voorbeeld: `"65% Polyester, 35% Katoen"`

8. **Care Instructions** (tekstveld)
   - Wasinstructies
   - Voorbeeld: `"Wasbaar op 40°C, niet in de droger, strijken op lage temperatuur"`

9. **Weight** (getal)
   - Gewicht in grammen
   - Voorbeeld: `250`

**Wat moet je doen:**
1. Vul alle verplichte velden in
2. Vul optionele velden in voor betere webshop data
3. Klik **"Volgende"**

**Validatie:**
- Master Name minimaal 3 karakters
- Brand, Supplier, Category verplicht
- "Volgende" button is disabled totdat alles correct is ingevuld

<img src="./screenshots/step2-style-mapping.png" alt="Step 2: Style Mapping" width="800">

---

### Step 3: AI Enrichment (Optioneel)

**Wat zie je:**
- Optie om AI te gebruiken voor automatische verrijking
- Of: Skip button om over te slaan

**Wat kan AI doen:**
- Automatisch description genereren
- Material composition suggereren op basis van productnaam
- Care instructions suggereren
- Gender detecteren

**Wat moet je doen:**
1. **Optie A:** Klik **"Skip AI Enrichment"** om over te slaan
2. **Optie B:** Klik **"Use AI"** voor automatische suggesties
   - Wacht op AI verwerking
   - Review suggesties
   - Pas aan indien nodig
   - Klik **"Accept"**

**Tips:**
- AI is nuttig als je weinig product kennis hebt
- AI kan fouten maken - altijd reviewen
- Skip AI als je zelf al alle info hebt ingevuld in Step 2

<img src="./screenshots/step3-ai-enrichment.png" alt="Step 3: AI Enrichment" width="800">

---

### Step 4: Color & Size Matching ⚡ (Belangrijk!)

Dit is de **belangrijkste stap**. Hier worden kleuren en maten gematcht naar stamdata.

#### Kleur Matching

**Wat zie je:**
- Lijst met unieke kleuren uit jouw selectie
- Voor elke kleur:
  - Oorspronkelijke leverancier naam (bijv. `"Navy"`)
  - Automatische match naar stamdata (bijv. `"Navy (MONO)"`)
  - Confidence indicator (✓, ⚠, of ✗)
  - Dropdown om handmatig te kiezen

**Confidence Indicatoren:**
- ✅ **✓ Exact** (groen): Perfecte match, geen actie nodig
- ⚠️ **⚠ Gemiddeld** (geel): Waarschijnlijk correct, controleer
- ⚠️ **⚠ Laag** (oranje): Mogelijk fout, controleer en pas aan
- ❌ **✗ Geen match** (rood): **Actie vereist!** Selecteer handmatig

**Wat moet je doen:**

1. **Controleer groene matches** (✓ Exact)
   - Deze zijn meestal correct
   - Geen actie nodig

2. **Controleer gele/oranje matches** (⚠)
   - Klik op dropdown om alternatieve opties te zien
   - Wijzig indien nodig

3. **Fix rode matches** (✗ Geen match) ⚠️
   - Klik op dropdown
   - Selecteer de juiste kleur uit de lijst
   - Gebruik search functie: type om te filteren
   - Gegroepeeerd per type: MONO, DUO, TRIO, MULTI

**Kleuren Types:**
- **MONO:** Enkele kleur (bijv. "Navy", "Black", "Wit")
- **DUO:** Twee kleuren (bijv. "Navy/Wit", "Zwart/Rood")
- **TRIO:** Drie kleuren (bijv. "Rood/Wit/Blauw")
- **MULTI:** Vier of meer kleuren (zeldzaam)

**Validatie:**
- ❌ Je kunt NIET doorgaan totdat **alle kleuren** gemapped zijn
- ✅ "Volgende" button wordt pas enabled als alles groen of handmatig geselecteerd is

#### Maat Matching

**Wat zie je:**
- Lijst met unieke maten uit jouw selectie
- Voor elke maat:
  - Oorspronkelijke leverancier code (bijv. `"XXXL"` of `"EU-52"`)
  - Automatische match naar stamdata (bijv. `"3XL - 3 Extra Large"`)
  - Confidence indicator (✓, ⚠, of ✗)
  - Dropdown om handmatig te kiezen

**Normalisatie:**
Het systeem herkent automatisch verschillende formaten:
- `"XXXL"` → `"3XL"`
- `"EU-48"` → `"48"`
- `"W32/L34"` → `"32-34"` (jeans format)
- `"Size 52"` → `"52"`

**Wat moet je doen:**
1. **Controleer groene matches** (✓ Exact) - meestal correct
2. **Fix rode matches** (✗) door handmatig te selecteren
3. **Controleer oranje/gele matches** bij twijfel

**Maat Categorieën in Dropdown:**
- Letter maten: XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL
- Numerieke maten: 44, 46, 48, 50, 52, 54, 56, 58, 60
- Jeans maten: 30-30, 32-32, 32-34, 34-36, etc.
- One-size: ONE-SIZE, VRIJ, UNIVERSEEL

**Validatie:**
- ❌ Je kunt NIET doorgaan totdat **alle maten** gemapped zijn
- ✅ "Volgende" button wordt pas enabled als alles gemapped is

<img src="./screenshots/step4-color-matching.png" alt="Step 4: Kleur Matching" width="800">
<img src="./screenshots/step4-size-matching.png" alt="Step 4: Maat Matching" width="800">

---

### Step 5: Preview & Bevestiging

**Wat zie je:**
- Complete preview van wat wordt aangemaakt
- Master product overzicht
- Variants matrix (kleuren × maten)
- Alle variant display names
- Aantal gekoppelde supplier products

#### Master Product Preview

Toont alle metadata:
- Master Code (automatisch gegenereerd)
- Master Name
- Brand
- Supplier
- Category
- Gender
- Description (als ingevuld)
- Material Composition (als ingevuld)
- Weight (als ingevuld)

#### Variants Matrix

Visuele tabel met:
- Rijen: Kleuren (Navy, Black, Grey, etc.)
- Kolommen: Maten (XS, S, M, L, XL, etc.)
- Cellen: ✓ voor elke te creëren variant

**Voorbeeld:**
```
         │ XS  │ S   │ M   │ L   │ XL  │
─────────┼─────┼─────┼─────┼─────┼─────┤
Navy     │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │
Black    │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │
Grey     │ ✓   │ ✓   │ ✓   │ ✓   │ ✓   │
```
= 15 variants (3 kleuren × 5 maten)

#### Variant Display Names

**Format:** `Brand | Master Name | Kleur | Maat`

**Voorbeelden:**
1. Russell | Premium Polo | Navy | XS
2. Russell | Premium Polo | Navy | S
3. Russell | Premium Polo | Navy | M
4. Russell | Premium Polo | Black | XS
5. ... (alle 15 combinaties)

Klik op **"Bekijk Alle X Variant Display Names"** om volledige lijst te tonen.

#### Gekoppelde Supplier Products

Informatieblok met uitleg:
- Aantal supplier products die worden gekoppeld
- Uitleg dataset_rule_link
- **Belangrijk:** Na promotie kunnen deze producten **niet meer** worden verwijderd
- Badge: `is_promoted = true` wordt gezet

**Wat moet je doen:**

1. **Review Master preview**
   - Klopt de master name?
   - Juiste brand en category?

2. **Review Variants matrix**
   - Juiste kleuren?
   - Juiste maten?
   - Correct aantal variants?

3. **Review Variant names**
   - Zien de namen er logisch uit?
   - Juiste volgorde: Brand | Master | Color | Size?

4. **Laatste controle**
   - ✅ Alles correct? Klik **"✓ Promoveer X Producten"**
   - ❌ Fout gevonden? Klik **"← Terug"** om aanpassingen te maken

**Tijdens Processing:**
- Button toont spinner: "Producten Promoveren..."
- Wacht geduldig (kan 5-30 seconden duren)
- **Sluit de wizard NIET** tijdens processing

**Na Succes:**
- ✅ Success toast: "🎉 Promotie succesvol! 15 variants aangemaakt"
- Automatische redirect naar Master Detail Page
- Wizard sluit automatisch

<img src="./screenshots/step5-preview.png" alt="Step 5: Preview" width="800">

---

## ✅ Checklist: Is Promotie Gelukt?

Na succesvolle promotie, controleer:

### In Master Detail Page
- [ ] Master product is zichtbaar
- [ ] Master name is correct
- [ ] Brand en category kloppen
- [ ] Aantal variants klopt (bijv. 15 bij 3×5 combinaties)

### In Supplier Catalog
- [ ] Gepromoveerde producten tonen badge `is_promoted = true`
- [ ] Deze producten kunnen niet meer worden geselecteerd
- [ ] "Promoveer" button verschijnt niet meer voor deze producten

### In Exports
- [ ] Master verschijnt in export selecties
- [ ] Alle variants hebben correcte display names
- [ ] Kleuren en maten zijn gestandaardiseerd

---

## 🚨 Veelgemaakte Fouten & Oplossingen

### Fout 1: "Niet alle kleuren zijn gematcht"

**Symptoom:** Kan niet naar Step 5 omdat button disabled is

**Oorzaak:** Eén of meer kleuren hebben nog ✗ (rode indicator)

**Oplossing:**
1. Scroll door kleurenlijst
2. Zoek rode ✗ indicator
3. Klik op dropdown voor die kleur
4. Selecteer handmatig de juiste kleur
5. "Volgende" button wordt nu enabled

---

### Fout 2: "Niet alle maten zijn gematcht"

**Symptoom:** Kan niet naar Step 5 omdat button disabled is

**Oorzaak:** Eén of meer maten hebben nog ✗ (rode indicator)

**Oplossing:**
1. Scroll door matenlijst
2. Zoek rode ✗ indicator
3. Klik op dropdown voor die maat
4. Selecteer handmatig de juiste maat
5. "Volgende" button wordt nu enabled

---

### Fout 3: Wizard sluit per ongeluk

**Symptoom:** Wizard gesloten zonder op te slaan

**Impact:** Alle ingevulde data is verloren

**Oplossing:**
1. Selecteer producten opnieuw
2. Open wizard opnieuw
3. Begin vanaf Step 1
4. **Tip:** Gebruik template functionaliteit (toekomstig) om mappings op te slaan

**Preventie:**
- Werk zorgvuldig door de stappen
- Sluit de wizard niet voordat je op "Promoveer" hebt geklikt

---

### Fout 4: "Edge function timeout"

**Symptoom:** Na klikken op "Promoveer" komt er na lange tijd een error

**Oorzaak:** Te veel producten tegelijk (>1000) of netwerkprobleem

**Oplossing:**
1. Splits selectie in kleinere batches (max 500 producten)
2. Probeer opnieuw
3. Check internetverbinding
4. Neem contact op met support als probleem aanhoudt

---

### Fout 5: Verkeerde kleur geselecteerd

**Symptoom:** Na promotie blijken kleuren verkeerd te zijn

**Oplossing:**
1. **Short-term:** Handmatig aanpassen in Master Detail Page
2. **Long-term:** Gebruik Bulk Undo (toekomstig) en promoveer opnieuw
3. **Preventie:** Neem altijd de tijd voor Step 4 kleur controle

---

### Fout 6: Category vergeten

**Symptoom:** Kan niet naar Step 3 omdat "Volgende" disabled is

**Oorzaak:** Category is een verplicht veld in Step 2

**Oplossing:**
1. Scroll terug naar Category dropdown
2. Selecteer een categorie
3. "Volgende" button wordt enabled

---

## 💡 Tips & Best Practices

### Planning
- **Batch Grootte:** Promoveer 50-200 producten tegelijk voor optimale snelheid
- **Grouping:** Selecteer alleen producten die bij elkaar horen (zelfde style)
- **Timing:** Doe promoties in rustige momenten (niet tijdens piek uren)

### Data Kwaliteit
- **Complete Data:** Vul zoveel mogelijk optionele velden in Step 2 voor betere webshop data
- **Controleer Matches:** Neem tijd voor Step 4 - fouten zijn lastig te herstellen
- **Preview:** Altijd volledige preview checken in Step 5 voor je submit

### Efficiency
- **Herkenbare Namen:** Gebruik consistente master names voor easy filtering later
- **Standard Formats:** Volg naming conventions: "Premium Polo" niet "polo premium"
- **Templates:** (Toekomstig) Save mappings voor herhaalde imports van zelfde leverancier

### Samenwerking
- **Communicatie:** Informeer collega's als je grote batches promoveert
- **Training:** Zorg dat nieuwe medewerkers deze handleiding lezen
- **Feedback:** Meld bugs of verbeterpunten aan product team

---

## 📞 Hulp Nodig?

### Support Contact
- **Email:** support@vankruiningen.nl
- **Telefoon:** 0123-456789
- **Werkdagen:** 09:00 - 17:00

### Handige Links
- [Technische Documentatie](../../technical/promotion-wizard-architecture.md) (voor developers)
- [Functionele Specificaties](../../functioneel/promotion-wizard-specificaties.md) (voor product owners)
- [Stamdata Beheer](../02-stamdata-beheer/README.md) (kleuren en maten configureren)
- [FAQ](./faq.md) (veelgestelde vragen)

---

## 📚 Gerelateerde Handleidingen

- [01. Supplier Data Import](../01-supplier-data-import/README.md) - Import leverancier Excel/CSV
- [02. Stamdata Beheer](../02-stamdata-beheer/README.md) - Configureer kleuren, maten, brands
- [03. Product Master Beheer](../03-product-master-beheer/README.md) - Beheer gepromoveerde producten
- [05. Export naar Externe Systemen](../05-export/README.md) - Gripp, Calculated, Shopify exports

# Mapping & Templates - Gebruikershandleiding

**Versie:** 8.0  
**Laatst bijgewerkt:** December 2024  
**Doelgroep:** Eindgebruikers (niet-technisch)

---

## 📋 Inhoudsopgave

1. [Wat zijn Import Templates?](#wat-zijn-import-templates)
2. [Automatisch Opslaan (Auto-Save)](#automatisch-opslaan-auto-save)
3. [Automatisch Laden (Auto-Load)](#automatisch-laden-auto-load)
4. [Kolom Mismatch Detectie](#kolom-mismatch-detectie)
5. [Handmatig Aanpassen](#handmatig-aanpassen)
6. [Veelgestelde Vragen (FAQ)](#veelgestelde-vragen-faq)

---

## Wat zijn Import Templates?

### Kort Gezegd
Een **import template** is een "geheugen" van je kolomkoppelingen. Het systeem onthoudt automatisch welke Excel-kolommen je hebt gekoppeld aan welke PIM-velden, zodat je dit de volgende keer niet opnieuw hoeft te doen.

### Waarom is dit Handig?
- **Tijdsbesparing:** Bij een volgende import van dezelfde leverancier worden je mappings automatisch ingevuld
- **Consistentie:** Dezelfde kolommen worden altijd op dezelfde manier gekoppeld
- **Foutpreventie:** Minder kans op vergissingen bij het handmatig koppelen

### Wat wordt er Automatisch Opgeslagen?
Na elke succesvolle import slaat het systeem automatisch op:
- ✅ **P0 veldkoppelingen** (verplichte basisvelden zoals SKU, Naam, Merk, Leverancier)
- ✅ **Kolomnamen** uit je Excel-bestand
- ✅ **Bestandsformaat** (Excel of CSV)
- ✅ **Leverancier** en **Merk** combinatie

**Let op:** P1/P2/P3 velden (optionele velden) worden NIET automatisch opgeslagen. Deze moet je elke keer handmatig invullen als je ze nodig hebt.

---

## Automatisch Opslaan (Auto-Save)

### Wanneer wordt er Automatisch Opgeslagen?
Het systeem slaat automatisch een template op **NA** een succesvolle import, wanneer:
1. ✅ Je alle P0 velden hebt gekoppeld
2. ✅ De dataset succesvol is aangemaakt
3. ✅ Er geen kritieke validatiefouten zijn

### Wat Gebeurt er bij Opslaan?
```
┌─────────────────────────────────────────┐
│  STAP 1: Import succesvol afgerond      │
│  STAP 2: Systeem slaat template op      │
│  STAP 3: Bevestigingsmelding getoond    │
└─────────────────────────────────────────┘
```

Je ziet een **groene melding** rechtsonder in beeld:
```
✓ Import template opgeslagen
  Voor volgende imports met deze leverancier+merk 
  worden je mappings automatisch geladen
```

### Unieke Template per Leverancier+Merk
Het systeem slaat **één template op per combinatie** van:
- Leverancier (bijv. "Texstar")
- Merk (bijv. "Fruit of the Loom" OF leeg als het merk uit het Excel-bestand komt)

**Voorbeeld:**
- Template 1: Texstar + Fruit of the Loom
- Template 2: Texstar + Merk uit Excel (`-`)
- Template 3: Promodoro + Russell Europe

Elke combinatie heeft zijn eigen template.

### Wat als er al een Template Bestaat?
Als er al een template bestaat voor deze leverancier+merk combinatie, wordt deze **automatisch overschreven** met je nieuwe mappings. Je hoeft hier niks voor te doen.

**Voorbeeld scenario:**
```
MAAND 1: Import Texstar + FOTL
→ Template opgeslagen met kolommen: [Artikelnummer, Omschrijving, Kleur]

MAAND 2: Import Texstar + FOTL (leverancier heeft kolommen aangepast)
→ Excel heeft nu kolommen: [SKU, Product naam, Kleur code]
→ Je past je mappings aan
→ Oude template wordt overschreven met nieuwe mappings
```

---

## Automatisch Laden (Auto-Load)

### Wanneer wordt een Template Automatisch Geladen?
Zodra je een Excel-bestand uploadt, controleert het systeem:
1. Welke **Leverancier** heb je gekozen?
2. Welk **Merk** heb je gekozen? (of komt het merk uit het Excel-bestand?)
3. Is er een **template** opgeslagen voor deze combinatie?

Als het antwoord op vraag 3 **JA** is, wordt de template automatisch geladen.

### Hoe Herken je dat een Template is Geladen?

#### 1. Blauwe Informatiemelding Bovenaan
```
ℹ Import template geladen
  We hebben je vorige mappings automatisch ingevuld 
  voor Texstar + Fruit of the Loom.
  
  ✓ 6 van 6 kolommen herkend
  Laatst gebruikt: 15 december 2024
```

#### 2. Groene Vinkjes bij Velden
Alle P0 velden die automatisch zijn gekoppeld, hebben een **groen vinkje** (✓) en zijn al ingevuld:

```
📊 P0 Velden (Verplicht)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ SKU               → Artikelnummer
✓ Naam              → Omschrijving  
✓ Merk              → [Uit Excel: Merk]
✓ Leverancier       → [Geselecteerd: Texstar]
✓ Kleur (raw)       → Kleur
✓ Maat (raw)        → Maat
```

### Perfect Match vs. Mismatch

#### ✅ Perfect Match (Alles Groen)
Je Excel-bestand heeft **exact dezelfde kolommen** als de vorige keer:
```
✓ 6 van 6 kolommen herkend
  Alle mappings automatisch ingevuld
```

➡️ **Actie:** Druk op "Bevestig mappings" en ga verder. Je hoeft niks aan te passen!

#### ⚠️ Kolom Mismatch (Aanpassing Nodig)
Je Excel-bestand heeft **andere kolommen** dan de vorige keer:
```
⚠ 4 van 6 kolommen herkend
  2 kolommen ontbreken in je nieuwe bestand
```

➡️ **Actie:** Zie sectie [Kolom Mismatch Detectie](#kolom-mismatch-detectie)

---

## Kolom Mismatch Detectie

### Wat is een Kolom Mismatch?
Een **mismatch** betekent dat je nieuwe Excel-bestand **andere kolomnamen** heeft dan het opgeslagen template. Dit kan gebeuren omdat:
- ✏️ De leverancier heeft de kolomnamen aangepast
- 📊 De leverancier heeft kolommen toegevoegd of verwijderd
- 📁 Je hebt een ander Excel-formaat ontvangen dan normaal

### Hoe Herken je een Mismatch?

#### Gele Waarschuwingsmelding
```
⚠ Template kolommen komen niet overeen
  Je Excel-bestand heeft andere kolommen dan het opgeslagen template.
  
  Ontbrekende kolommen (in template, niet in Excel):
  • "Artikelnr" 
  • "Product omschrijving"
  
  Nieuwe kolommen (in Excel, niet in template):
  • "SKU"
  • "Productnaam"
  
  Controleer en pas je mappings aan waar nodig.
```

#### Rode Uitroeptekens bij Velden
Velden die niet automatisch gekoppeld konden worden, hebben een **rood uitroepteken** (⚠️):

```
📊 P0 Velden (Verplicht)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SKU               → [Selecteer kolom]  ← Oude kolom "Artikelnr" bestaat niet meer
⚠️ Naam              → [Selecteer kolom]  ← Oude kolom "Product omschrijving" bestaat niet meer
✓ Kleur (raw)       → Kleur               ← Deze kolom bestaat nog wel
```

### Stap-voor-Stap: Mismatch Oplossen

#### Stap 1: Lees de Waarschuwing Goed Door
Welke kolommen **ontbreken** in je nieuwe bestand?  
Welke kolommen zijn **nieuw** toegevoegd?

#### Stap 2: Open de Dropdown bij Rode Velden
Klik op de dropdown bij elk veld met een ⚠️ symbool.

#### Stap 3: Selecteer de Nieuwe Kolom
Zoek in de dropdown naar de nieuwe kolomnaam die hetzelfde betekent als de oude kolom.

**Voorbeeld:**
```
Oude Excel:  "Artikelnr"  →  Nieuwe Excel:  "SKU"
Oude Excel:  "Product omschrijving"  →  Nieuwe Excel:  "Productnaam"
```

Koppel:
- `SKU` → nieuwe kolom "SKU"
- `Naam` → nieuwe kolom "Productnaam"

#### Stap 4: Controleer alle P0 Velden
Zorg dat **alle P0 velden** een groene vinkje (✓) hebben voordat je doorgaat.

#### Stap 5: Bevestig Mappings
Klik op de knop **"Bevestig mappings"** onderaan.

Het systeem slaat automatisch je **nieuwe mappings** op en overschrijft het oude template. De volgende keer worden deze nieuwe mappings automatisch geladen!

---

## Handmatig Aanpassen

### Wanneer Moet je Handmatig Aanpassen?

#### Scenario 1: Template is niet Perfect
De auto-load heeft een fout gemaakt of je wilt een andere kolom gebruiken.

**Oplossing:**
1. Klik op de dropdown van het veld dat je wilt aanpassen
2. Selecteer een andere kolom uit het Excel-bestand
3. De nieuwe koppeling wordt automatisch opgeslagen bij de volgende import

#### Scenario 2: Nieuwe Kolommen in Excel
Je Excel-bestand heeft nieuwe kolommen die je wilt gebruiken voor P1/P2 velden.

**Oplossing:**
1. Scroll naar de P1/P2 secties
2. Klik op "Veld toevoegen"
3. Selecteer het veld dat je wilt koppelen (bijv. EAN, Gewicht, Materiaal)
4. Kies de juiste kolom uit je Excel-bestand

#### Scenario 3: Leverancier heeft Excel-formaat Gewijzigd
De leverancier heeft alle kolomnamen aangepast.

**Oplossing:**
1. Lees de mismatch waarschuwing goed door
2. Koppel alle P0 velden opnieuw handmatig
3. Bij de volgende import wordt het nieuwe template automatisch geladen

### Mappings Verwijderen
Je kunt een koppeling verwijderen door:
1. Op de dropdown te klikken
2. Bovenaan te selecteren: **"[Geen mapping]"**
3. Het veld wordt nu niet meer gekoppeld

**Let op:** P0 velden MOETEN gekoppeld zijn. Je kunt ze niet op "Geen mapping" zetten.

---

## Veelgestelde Vragen (FAQ)

### 🔹 Algemeen

#### Vraag: Moet ik handmatig een template opslaan?
**Antwoord:** Nee! Het systeem slaat automatisch een template op na elke succesvolle import. Je hoeft niks te doen.

#### Vraag: Kan ik meerdere templates hebben voor dezelfde leverancier?
**Antwoord:** Ja, maar alleen als je verschillende **merken** importeert. Elke combinatie van Leverancier + Merk heeft zijn eigen template.

**Voorbeeld:**
- Texstar + Fruit of the Loom = Template 1
- Texstar + Russell Europe = Template 2
- Texstar + Merk uit Excel (`-`) = Template 3

#### Vraag: Worden P1/P2/P3 velden ook automatisch opgeslagen?
**Antwoord:** **Nee.** Alleen P0 velden (verplichte basisvelden) worden automatisch opgeslagen. P1/P2/P3 velden moet je elke keer handmatig koppelen als je ze nodig hebt.

---

### 🔹 Auto-Load

#### Vraag: Waarom wordt mijn template niet automatisch geladen?
**Antwoord:** Dit kan meerdere redenen hebben:

1. **Je hebt een andere leverancier of merk gekozen**  
   ➡️ Templates zijn uniek per Leverancier+Merk combinatie

2. **Je hebt nog nooit geïmporteerd met deze combinatie**  
   ➡️ Er is nog geen template opgeslagen

3. **De vorige import is mislukt**  
   ➡️ Templates worden alleen opgeslagen na succesvolle imports

#### Vraag: Kan ik een template handmatig laden?
**Antwoord:** Nee, het laden gebeurt volledig automatisch. Je kunt niet kiezen uit een lijst van templates. Het systeem laadt automatisch het juiste template op basis van je Leverancier+Merk keuze.

#### Vraag: Wat als ik de auto-load niet wil gebruiken?
**Antwoord:** Je kunt de voorgestelde mappings gewoon overschrijven door handmatig andere kolommen te selecteren. De nieuwe mappings worden dan opgeslagen voor de volgende keer.

---

### 🔹 Kolom Mismatch

#### Vraag: Wat betekent "4 van 6 kolommen herkend"?
**Antwoord:** Dit betekent dat:
- 4 kolommen uit het template ook in je nieuwe Excel-bestand staan → deze zijn automatisch gekoppeld ✓
- 2 kolommen uit het template NIET in je nieuwe Excel-bestand staan → deze moet je handmatig opnieuw koppelen ⚠️

#### Vraag: Moet ik alle ontbrekende kolommen opnieuw koppelen?
**Antwoord:** Ja, als het **P0 velden** betreft. P0 velden zijn verplicht. Als het P1/P2/P3 velden zijn (optioneel), kun je ze overslaan als je ze niet nodig hebt.

#### Vraag: Waarom heeft mijn leverancier andere kolomnamen?
**Antwoord:** Leveranciers passen soms hun Excel-formaten aan door:
- Kolomnamen te hernoemen (bijv. "Artikelnr" → "SKU")
- Kolommen samen te voegen (bijv. "Voornaam" + "Achternaam" → "Volledige naam")
- Nieuwe kolommen toe te voegen
- Oude kolommen te verwijderen

Dit is normaal. Het systeem detecteert dit automatisch en waarschuwt je.

#### Vraag: Overschrijft het systeem mijn oude template?
**Antwoord:** Ja, na een succesvolle import met aangepaste mappings wordt het oude template automatisch overschreven. Dit is juist handig: de volgende keer worden je nieuwe mappings automatisch geladen!

---

### 🔹 Handmatig Aanpassen

#### Vraag: Kan ik een template verwijderen?
**Antwoord:** Nee, momenteel is er geen functie om templates handmatig te verwijderen. Templates worden automatisch overschreven bij een nieuwe succesvolle import met dezelfde Leverancier+Merk combinatie.

#### Vraag: Wat als ik een verkeerde koppeling heb gemaakt?
**Antwoord:** 
1. Je kunt de koppeling aanpassen door een andere kolom te selecteren uit de dropdown
2. Bij de volgende import wordt de nieuwe (correcte) koppeling automatisch geladen
3. Als je de import al hebt afgerond, kun je opnieuw importeren met de correcte mappings

#### Vraag: Kan ik een template exporteren of delen?
**Antwoord:** Nee, templates zijn tenant-gebonden en kunnen niet geëxporteerd of gedeeld worden. Elke gebruiker/organisatie heeft zijn eigen templates.

---

### 🔹 Troubleshooting

#### Probleem: "Ik zie geen groene melding na succesvolle import"
**Mogelijke oorzaken:**
1. ✅ De template is wel opgeslagen, maar de melding is verdwenen (meldingen verdwijnen na 5 seconden)
2. ✅ Er was een probleem met het opslaan (check de browser console voor errors)
3. ✅ De import is gelukt, maar niet alle P0 velden waren gekoppeld (template wordt alleen opgeslagen als ALLE P0 velden gekoppeld zijn)

**Oplossing:**  
Bij de volgende import zie je of het template is opgeslagen (blauwe melding "Import template geladen" verschijnt).

#### Probleem: "Template laadt de verkeerde mappings"
**Mogelijke oorzaken:**
1. Je hebt per ongeluk een andere Leverancier of Merk gekozen
2. Er bestaat een oud template met verouderde mappings

**Oplossing:**
1. Controleer of je de juiste Leverancier en Merk hebt geselecteerd
2. Pas de mappings handmatig aan naar de correcte kolommen
3. Voltooi de import → het template wordt automatisch overschreven met de correcte mappings

#### Probleem: "Alle kolommen zijn rood (⚠️), geen enkele is automatisch gekoppeld"
**Mogelijke oorzaken:**
1. De leverancier heeft het HELE Excel-formaat vervangen
2. Je hebt een Excel-bestand van een andere leverancier geüpload
3. De kolomnamen zijn drastisch gewijzigd (bijv. van Nederlands naar Engels)

**Oplossing:**
1. Controleer of je het juiste Excel-bestand hebt geüpload
2. Controleer of je de juiste Leverancier hebt geselecteerd
3. Koppel alle P0 velden handmaag opnieuw
4. Voltooi de import → een nieuw template wordt opgeslagen voor toekomstige imports

#### Probleem: "Ik wil terug naar het oude template"
**Helaas:** Er is geen "undo" functie voor templates. Als een template is overschreven, kun je niet meer terug naar de vorige versie.

**Preventie:**  
Als je weet dat je leverancier meerdere Excel-formaten gebruikt (bijv. "Standaard export" en "Uitgebreide export"), sla deze dan op als **verschillende merken** in het systeem:
- Texstar + "Standaard" (gebruik een apart merk-entry)
- Texstar + "Uitgebreid" (gebruik een ander merk-entry)

Zo heb je twee aparte templates die niet worden overschreven.

---

## 💡 Best Practices

### ✅ Doe dit:
1. **Controleer altijd de mismatch waarschuwing**  
   Lees goed welke kolommen ontbreken en welke nieuw zijn voordat je doorgaat.

2. **Test je import met een klein bestand eerst**  
   Upload eerst een Excel met 10-20 rijen om te testen of de mappings kloppen, voordat je het volledige bestand (1000+ rijen) uploadt.

3. **Gebruik consistente bestandsnamen**  
   Gebruik herkenbare namen zoals "Texstar_FOTL_December2024.xlsx" zodat je later weet welk bestand je hebt geüpload.

4. **Check de Preview Data**  
   Bekijk altijd de preview data onder elke mapping om te verifiëren dat de juiste kolom is gekoppeld.

### ❌ Vermijd dit:
1. **Niet blind vertrouwen op auto-load**  
   Controleer altijd of de automatisch geladen mappings correct zijn, vooral als je leverancier recent zijn Excel-formaat heeft aangepast.

2. **Geen mismatches negeren**  
   Als je een gele waarschuwing ziet, los deze altijd op voordat je doorgaat. Anders kunnen producten met fouten worden geïmporteerd.

3. **Niet meerdere Excel-formaten door elkaar gebruiken**  
   Als je leverancier meerdere export-formaten heeft, behandel deze dan als aparte "merken" om template-conflicten te voorkomen.

---

## 📞 Hulp Nodig?

### Technische Vragen
Raadpleeg de technische documentatie:
- `docs/technical/import-templates-v8.md` - Technische implementatie details
- `docs/technical/import-architecture-v8.md` - Complete architectuur beschrijving

### Gebruikersvragen
Heb je een vraag die hier niet beantwoord wordt? Neem contact op met de systeembeheerder of stuur een e-mail naar support.

---

**Document einde** | v8.0 | December 2024
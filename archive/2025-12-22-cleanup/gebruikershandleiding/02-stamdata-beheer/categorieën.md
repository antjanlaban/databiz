# Categorieën Beheer

## Overzicht

Het categorieën beheer systeem stelt je in staat om productcategorieën te organiseren binnen verschillende taxonomieën. Dit is essentieel voor productclassificatie en export naar externe systemen.

## Taxonomieën

Het PIM systeem ondersteunt meerdere taxonomieën voor verschillende productclassificatie standaarden:

### ALG - Algemene VKR Taxonomie
- Interne Van Kruiningen categoriestructuur
- Maximaal 5 niveaus diep
- Optimaal voor interne productorganisatie
- Flexibel en aangepast aan bedrijfskleding branche

### GS1 - GS1 Global Product Classification
- Internationale standaard voor productclassificatie
- Gebruikt voor export naar externe systemen
- Breed geaccepteerde standaard in retail

## Categorieën Hiërarchie

### Structuur
Categorieën worden hiërarchisch georganiseerd met een parent-child structuur:

```
KLEDING (Level 1)
└─ WERK (Level 2)
   └─ WERK-JAS (Level 3)
      └─ WERK-JAS-WINTER (Level 4)
         └─ WERK-JAS-WINTER-GEVOERD (Level 5)
```

### Niveaus
- **Level 1:** Root categorieën (geen parent)
- **Level 2-5:** Subcategorieën (met parent)
- **Maximum:** 5 niveaus diep

## Categorieën Toevoegen

### Root Categorie Toevoegen
1. Ga naar **Stamdata → Categorieën**
2. Selecteer een taxonomie uit de dropdown
3. Klik op **"+ Root Categorie"**
4. Vul de verplichte velden in:
   - **Code:** Unieke code (HOOFDLETTERS, cijfers, -)
   - **Naam NL:** Nederlandse naam (verplicht)
   - **Naam EN:** Engelse naam (optioneel)
5. Laat **Parent Categorie** op `[Geen - Root Level]` staan
6. Klik **"Toevoegen"**

### Subcategorie Toevoegen
1. Klik op het **📁+** icoon naast een bestaande categorie
2. Of gebruik **"+ Subcategorie"** en selecteer een parent
3. Vul de velden in (code, naam)
4. De parent is automatisch geselecteerd
5. Level wordt automatisch berekend (parent level + 1)

## Velden Uitleg

### Verplichte Velden

**Categorie Code:**
- Unieke identifier binnen taxonomie
- Alleen hoofdletters, cijfers en `-`
- Voorbeeld: `KLEDING`, `WERK-JAS`, `POLO-SHIRT`
- Regex: `/^[A-Z0-9-]+$/`

**Naam (NL):**
- Nederlandse categorienaam
- Gebruikt voor weergave in systeem
- Max 255 karakters

### Optionele Velden

**Naam (EN):**
- Engelse vertaling
- Gebruikt voor internationale exports

**Parent Categorie:**
- Selecteer bovenliggende categorie
- `[Geen - Root Level]` voor top-level categorieën
- Bepaalt positie in hiërarchie

**Beschrijving:**
- Extra informatie over categorie
- Helpt bij classificatie

**Sort Order:**
- Numerieke waarde voor sortering
- Lagere getallen verschijnen eerst
- Binnen hetzelfde niveau
- Default: 0

**Actief:**
- Toggle om categorie te activeren/deactiveren
- Inactieve categorieën worden niet gebruikt voor nieuwe producten
- Bestaande koppelingen blijven bestaan

## Categorieën Bewerken

1. Klik op het **✏️** icoon naast een categorie
2. Wijzig de gewenste velden
3. Let op: Parent wijzigen kan level van alle subcategorieën beïnvloeden
4. Klik **"Bijwerken"**

## Categorieën Verwijderen

### Voorwaarden
Een categorie kan **alleen** worden verwijderd als:
- ❌ Geen subcategorieën heeft
- ❌ Geen producten zijn gekoppeld

### Proces
1. Klik op het **🗑️** icoon naast een categorie
2. Systeem controleert op dependencies
3. Als dependencies bestaan: foutmelding met details
4. Als geen dependencies: bevestig verwijdering

### Dependencies Tabel
Het systeem controleert deze koppelingen:

| Tabel | Beschrijving |
|-------|--------------|
| `categories` | Child categorieën |
| `product_categories` | Producten gekoppeld aan categorie |
| `master_category_link` | Master producten |

⚠️ **Belangrijk:** Verwijder eerst alle child categorieën en productkoppelingen voordat je een parent categorie verwijdert.

## Best Practices

### Naamgeving
✅ **Goed:**
- `KLEDING` → `WERK` → `WERK-JAS`
- `ACCESSOIRES` → `CAPS` → `CAPS-TRUCKER`

❌ **Slecht:**
- `kleding` (geen hoofdletters)
- `Werk Jassen` (spaties)
- `WERK/JAS` (geen `/` toegestaan)

### Structuur
- Houd categorieën logisch genesteld
- Gebruik consistente naamgeving per niveau
- Plan hiërarchie vooraf (max 5 niveaus!)
- Start met brede categorieën, verfijn daarna

### Sort Order Tips
- Gebruik stappen van 10 (0, 10, 20, 30)
- Geeft ruimte voor tussenvoegingen
- Alfabetische sortering: gebruik sort order 0 voor allemaal

## Voorbeelden

### Voorbeeld 1: Werkkleding Hiërarchie
```
KLEDING (sort: 0)
├─ WERK (sort: 0)
│  ├─ WERK-BROEK (sort: 10)
│  ├─ WERK-JAS (sort: 20)
│  └─ WERK-OVERALL (sort: 30)
└─ CASUAL (sort: 10)
   ├─ POLO (sort: 0)
   └─ T-SHIRT (sort: 10)
```

### Voorbeeld 2: Accessoires
```
ACCESSOIRES (sort: 0)
├─ HOOFDDEKSELS (sort: 0)
│  ├─ CAPS (sort: 0)
│  │  ├─ CAPS-TRUCKER (sort: 0)
│  │  └─ CAPS-SNAPBACK (sort: 10)
│  └─ MUTSEN (sort: 10)
└─ HANDSCHOENEN (sort: 10)
```

## Veelgestelde Vragen

### Kan ik een categorie verplaatsen naar een andere parent?
Ja, via bewerken kun je de parent wijzigen. Let op: dit herberekent automatisch het level.

### Waarom kan ik geen 6e niveau toevoegen?
Het systeem heeft een maximum van 5 niveaus om de structuur beheersbaar te houden.

### Wat gebeurt er met producten als ik een categorie verwijder?
Categorieën met producten kunnen niet worden verwijderd. Verwijder eerst de productkoppelingen.

### Kan ik meerdere primary categorieën per product hebben?
Nee, een product heeft 1 primary categorie en kan meerdere secondary categorieën hebben.

### Hoe beïnvloedt taxonomie de export?
Externe systemen kunnen specifieke taxonomieën vereisen (bijv. GS1 voor retail). Zorg dat producten correct zijn gecategoriseerd.

## Troubleshooting

### "Deze categorie kan niet worden verwijderd"
**Oorzaak:** Subcategorieën of producten zijn gekoppeld  
**Oplossing:** Verwijder eerst alle child items of koppel producten los

### "Category code moet uniek zijn"
**Oorzaak:** Code bestaat al binnen deze taxonomie  
**Oplossing:** Gebruik een andere code of voeg prefix/suffix toe

### "Maximum 5 niveaus toegestaan"
**Oorzaak:** Probeert een 6e niveau toe te voegen  
**Oplossing:** Herstructureer hiërarchie of gebruik bestaand niveau

## Zie Ook

- [Taxonomieën Beheer](./taxonomieën.md)
- [Product Categorisatie](../03-producten/categorisatie.md)
- [Import: Category Mapping](../04-import/column-mapping.md)

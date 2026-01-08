# Color Code Specificatie - Leverancier naar Product Variant

> **Status:** 🟡 TER REVIEW DOOR BA + ARCHITECT  
> **Locatie:** `.ai/project/specifications/`  
> **Versie:** 1.0  
> **Datum:** December 20, 2025  
> **Gerelateerd:** [DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md](../DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md)

---

## Overzicht

Dit document beschrijft het volledige proces van het converteren van **ruwe kleurwaarden van leveranciers** naar **gestandaardiseerde productvariant colorcode** waarden.

## Proces Flow

```
Leverancier Data
    ↓
Color Raw Extractie
    ↓
Color Lookup Matching
    ↓
Color Code Generatie (met pattern/ratio detectie)
    ↓
Product Variant Color Code
```

---

## Stap 1: RAW → STAGING (Bestaand)

### Input: Leverancier Data

- CSV/Excel bestand met producten
- Kolom met kleurinformatie (bijv. "Kleur", "Color", "Farbe")
- Ruwe waarden zoals: "Rood", "Red", "Rood-Wit", "Red/White", "Rood-Wit Gestreept"

### Edge Cases: Meerdere Color Velden

Sommige leveranciers gebruiken **aparte velden** voor primaire, secundaire en tertiaire kleuren:

- `color_primary` / `color_1` / `kleur_primary`
- `color_secondary` / `color_2` / `kleur_secondary`
- `color_tertiary` / `color_3` / `kleur_tertiary`

**Oplossing:** Deze velden worden automatisch gecombineerd tot één `color_raw` string.

### Edge Cases: `/` als Product Separator

Sommige leveranciers gebruiken `/` om **producten te scheiden** (niet kleuren):

- `"Product A / Product B"` → Twee verschillende producten
- `"Rood/Wit"` → Kan zowel "twee kleuren" als "twee producten" betekenen

**Oplossing:**

- Standaard wordt `/` behandeld als kleur separator
- Kan per leverancier worden geconfigureerd via `treat_slash_as_separator` parameter
- **Toekomstig:** Automatische detectie op basis van data patterns

### Output:

```sql
color_raw = "Rood-Wit Gestreept"
color_code = "RED-WHT-S"  -- Gestandaardiseerd
```

**Huidige Implementatie:**

- Automatische kolom detectie op basis van patronen
- Opslag in color_raw

---

## Stap 2: STAGING → Color Lookup Matching

### Doel

Probeer de `color_raw` kleur(en) middels (fuzzy) matching te koppelen aan de juiste kleurfamilie(s)

### Strategie: Multi-Stage Matching

#### Fase 1: Exact Match

```typescript
// Probeer exacte match op name_nl of name_en
"Rood" → color_lookup.code = "RED"
"Wit" → color_lookup.code = "WHT"
```

#### Fase 2: Partial Match

```typescript
// Probeer partial fuzzy match
"Donkerrood" → "RED" (bevat "rood")
"Lichtblauw" → "BLU" (bevat "blauw")
```

#### Fase 3: Multi-Color Detectie

```typescript
// Detecteer meerdere kleuren in één string
"Rood-Wit" → ["RED", "WHT"]
"Rood/Wit/Blauw" → ["RED", "WHT", "BLU"]
```

---

## Stap 3: Pattern Type Detectie

### Doel

Detecteer pattern types in de ruwe kleurstring.

### Pattern Keywords (Optioneel)

| Pattern         | Keywords NL                             | Keywords EN |
| --------------- | --------------------------------------- | ----------- |
| `S` (Striped)   | gestreept, strepen, striped, stripes    |
| `C` (Checked)   | geblokt, ruitjes, checkerboard, checked |
| `P` (Print)     | print, patroon, pattern, design         |
| `G` (Gradient)  | verloop, gradient, fade                 |
| `M` (Melange)   | melange, gemengd, mixed                 |
| `H` (Heathered) | heathered, heather                      |

### Detectie Logica

GAAN WE NOG NIET DOEN IN DEZE FASE, maar een gebruiker kan het al wel duiden en het kan dus ook al in de uiteindelijk code voorkomen. Maar herkenning doen we nog niet.

---

## Stap 4: Ratio Detectie (Optioneel)

### Doel

Detecteer verhoudingen in de kleurstring (bijv. "60% rood, 40% wit").

### Detectie Logica

GAAN WE NOG NIET DOEN IN DEZE FASE, maar een gebruiker kan het al wel duiden en het kan dus ook al in de uiteindelijk code voorkomen. Maar herkenning doen we nog niet.

---

## Stap 5: Color Code Generatie

### Doel

Genereer de finale `color_code` string met alle componenten.

### Proces

Converteer color_raw naar color_code

Process:

1. Match family colors naar color_lookup
2. Genereer code
   Returns:
   color_code string (bijv. "RED-WHT-S" of "RED") voorstel
3. a Gebruiker accepteerd
   b gebruiker past aan (klerfamiies, + patterns +ratio +felgekleurd +reflectie)

```

## Conversie Voorbeelden

### Voorbeeld 1: Eenvoudige Kleur
```

Input: color_raw = "Rood"
Process:

1. Match → RED
2. Pattern → None
3. Ratio → None
   Output: color_code = "RED"

```

### Voorbeeld 2: Twee Kleuren
```

Input: color_raw = "Rood-Wit"
Process:

1. Match → RED, WHT
2. Pattern → None
3. Ratio → None (50-50 aangenomen)
   Output: color_code = "RED-WHT"

```

### Voorbeeld 3: Met Pattern
```

Input: color_raw = "Rood-Wit Gestreept"
Process:

1. Match → RED, WHT
2. Pattern → S (gestreept gedetecteerd)
3. Ratio → None
   Output: color_code = "RED-WHT-S"

```

### Voorbeeld 4: Complex
```

Input: color_raw = "Rood-Wit-Blauw Print Patroon"
Process:

1. Match → RED, WHT, BLU
2. Pattern → P (print gedetecteerd)
3. Ratio → None
   Output: color_code = "RED-WHT-BLU-P"

```

### Voorbeeld 5: Met Ratio (Toekomstig)
```

Input: color_raw = "Rood 60% Wit 40%"
Process:

1. Match → RED, WHT
2. Pattern → None
3. Ratio → [60, 40]
   Output: color_code = "RED-WHT-60-40"

````

---

## Error Handling

### Geen Match Gevonden
```typescript
// Als geen kleur kan worden gematcht
const colorCode = null;
const validationStatus = "error";
const validationErrors = "Color 'OnbekendeKleur' kon niet worden geconverteerd";
```

---

## Gerelateerde Documenten

- **[DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md](../DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md)** - Database schema assortment
- **[SIZE_CODE_SPECIFICATION.md](./SIZE_CODE_SPECIFICATION.md)** - Size code specificatie
- **[MVP_HAPPY_PATH.md](../MVP_HAPPY_PATH.md)** - MVP implementatie roadmap

---

**Document Status:** 🟡 WACHTEN OP BA + ARCHITECT REVIEW
**Laatst Bijgewerkt:** December 20, 2025`
````

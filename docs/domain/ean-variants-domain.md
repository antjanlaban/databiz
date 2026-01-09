# EAN-Varianten Domain Model

> **Version**: 1.0.0  
> **Last Updated**: 2026-01-08  
> **Status**: ✅ Implemented

## Overview

Het EAN-Varianten domein is verantwoordelijk voor het activeren van goedgekeurde datasets en het creëren van EAN-varianten in het systeem. Dit domein handelt de volledige workflow af van data conversie tot EAN-variant creatie, inclusief MERK detectie, kolom mapping, naam generatie en duplicaat detectie.

## Domain Entities

### EANVariant

**Purpose**: Representeert een EAN variant met essentiële zoekvelden.

**Properties**:
- `id` (UUID): Unieke identifier
- `ean` (VARCHAR 14): EAN code (uniek, geïndexeerd)
- `brand_id` (UUID, FK): Referentie naar brands tabel
- `color` (TEXT): Kleur tekst (geïndexeerd)
- `size` (TEXT): Maat tekst (geïndexeerd)
- `name` (TEXT): Productnaam (geïndexeerd)
- `import_session_id` (BIGINT, FK): Referentie naar import_sessions
- `is_active` (BOOLEAN): Actieve status (geïndexeerd)
- `created_at` (TIMESTAMPTZ): Aanmaakdatum
- `updated_at` (TIMESTAMPTZ): Laatste wijziging

**Business Rules**:
- EAN is uniek: bij duplicaat wordt oude variant gedeactiveerd
- Alle velden zijn verplicht (EAN, MERK, Kleur, Maat, naam)
- `is_active = FALSE` betekent dat variant is vervangen door nieuwe dataset

**Lifecycle**:
```
created (is_active = TRUE) → deactivated (is_active = FALSE) [bij duplicaat]
```

### Brand

**Purpose**: Representeert een MERK (simpele tabel met alleen naam).

**Properties**:
- `id` (UUID): Unieke identifier
- `name` (VARCHAR 255): Merknaam (uniek)
- `created_at` (TIMESTAMPTZ): Aanmaakdatum

**Business Rules**:
- Naam is uniek (case-insensitive)
- Simpele tabel zonder extra metadata (voor nu)

### ActivationSession

**Purpose**: Wrapper rond import_session tijdens activatie workflow.

**Properties**:
- `session` (ImportSession): De import session
- `jsonData` (Record<string, any>[]): Geparsede data met alle kolommen
- `columns` (string[]): Beschikbare kolommen
- `mappings` (ColumnMapping): Kolom mappings
- `template` (NameTemplate): Naam template

**Lifecycle States**:
```
approved → activating → activated
```

## Value Objects

### NameTemplate

**Purpose**: Template voor naam generatie.

**Properties**:
- `parts` (NameTemplatePart[]): Array van template delen
- `separator` (string): Scheidingsteken tussen delen

**Format**: 
- Kolom referentie: `{columnName}`
- Statische tekst: `"Static Text"`
- Scheidingsteken: `" | "` (default)

**Example**:
```typescript
{
  parts: [
    { type: 'column', value: 'modelnr' },
    { type: 'text', value: ' | ' },
    { type: 'column', value: 'merk' },
    { type: 'text', value: ' | ' },
    { type: 'column', value: 'Kleur' },
    { type: 'text', value: ' | ' },
    { type: 'column', value: 'Maat' }
  ],
  separator: ' | '
}
```

**Generated Name**: `"TS-001 | Tricorp | Navy | M"`

### ColumnMapping

**Purpose**: Mapping van bronkolom naar veld.

**Properties**:
- `color` (string): Kolom naam voor Kleur
- `size` (string): Kolom naam voor Maat
- `ean` (string): Kolom naam voor EAN (uit EAN analysis fase)

**Business Rules**:
- Kleur en Maat zijn verplicht
- EAN kolom is al bekend uit EAN analysis fase

### BrandMatch

**Purpose**: Resultaat van fuzzy MERK matching.

**Properties**:
- `column` (string): Gevonden kolom naam
- `score` (number): Similarity score (0-1)
- `mode` ('auto' | 'manual'): Detectie modus

## Domain Services

### BrandDetector

**Purpose**: Automatische MERK kolom detectie met fuzzy search.

**Methods**:
- `detectBrandColumn(columnNames: string[]): string | null`
  - Detecteert MERK kolom op basis van kolom namen
  - Gebruikt fuzzy matching op patronen (merk, brand, fabrikant, etc.)
  - Retourneert best match of null

- `extractDistinctBrandValues(data: Record<string, any>[], columnName: string): string[]`
  - Extract alle distinct waarden uit kolom
  - Retourneert gesorteerde array van unieke waarden

- `checkBrandsExist(brandValues: string[]): Promise<{existing: Brand[], missing: string[]}>`
  - Check welke brands bestaan in database
  - Retourneert bestaande en ontbrekende brands

- `createBrand(brandName: string): Promise<Brand>`
  - Maakt nieuw brand aan in database

- `matchBrandToExisting(brandValue: string, existingBrands: Brand[]): Brand | null`
  - Match brand waarde aan bestaand brand (fuzzy search)
  - Retourneert best match of null

### NameGenerator

**Purpose**: Genereert productnamen op basis van template en kolommen.

**Methods**:
- `generateName(template: NameTemplate, row: Record<string, any>): string`
  - Genereert naam voor één rij
  - Vervangt kolom referenties met waarden
  - Combineert delen met separator

- `generateNames(template: NameTemplate, rows: Record<string, any>[]): string[]`
  - Genereert namen voor meerdere rijen
  - Batch operatie voor performance

- `validateTemplate(template: NameTemplate): {valid: boolean, errors: string[]}`
  - Valideert template structuur
  - Check op verplichte velden

- `checkNameUniqueness(names: string[]): {unique: number, duplicates: number, duplicateNames: string[], emptyNames: number}`
  - Analyseert naam uniekheid
  - Retourneert statistieken (niet blokkerend)

- `parseTemplateString(templateString: string, availableColumns: string[]): NameTemplate | null`
  - Parse template string naar NameTemplate object
  - Ondersteunt `{columnName}` syntax

- `createDefaultTemplate(availableColumns: string[]): NameTemplate | null`
  - Maakt default template op basis van beschikbare kolommen
  - Pattern: modelnr | merk | modelomschrijving | Kleur | Maat

### DuplicateDetector

**Purpose**: Detecteert duplicaten op EAN + fuzzy naam matching.

**Methods**:
- `checkEANExists(ean: string): Promise<EANVariant | null>`
  - Check of EAN al bestaat in database (actieve varianten)
  - Retourneert bestaande variant of null

- `checkEANsExist(eans: string[]): Promise<Map<string, EANVariant | null>>`
  - Batch check voor meerdere EANs
  - Retourneert map van EAN naar variant

- `detectDuplicate(ean: string, name: string): Promise<DuplicateResult>`
  - Detecteert duplicaat voor één rij
  - Fuzzy match op naam voor waarschuwing
  - Retourneert duplicate result met waarschuwing

- `detectDuplicates(rows: Array<{ean: string, name: string}>): Promise<DuplicateResult[]>`
  - Batch duplicate detectie
  - Retourneert array van duplicate results

- `deactivateVariant(variantId: string): Promise<void>`
  - Deactiveert bestaande variant (is_active = FALSE)

- `deactivateVariants(variantIds: string[]): Promise<void>`
  - Batch deactivatie

**Business Rules**:
- EAN is uniek: bij duplicaat wordt oude variant gedeactiveerd
- Fuzzy naam matching: waarschuwing als naam sterk afwijkt (< 0.5 similarity)
- Nooit EAN overschrijven: altijd oude deactiveren, nieuwe activeren

### DataValidator

**Purpose**: Valideert verplichte velden (MERK, Kleur, Maat, EAN).

**Validation Rules**:
- EAN: Verplicht, niet leeg
- MERK: Verplicht (via brand_id)
- Kleur: Verplicht, niet leeg
- Maat: Verplicht, niet leeg
- Naam: Verplicht, niet leeg (gegenereerd uit template)

## Domain Events

### DatasetActivated

**Triggered**: Wanneer dataset activatie succesvol is voltooid.

**Payload**:
- `sessionId` (number): Import session ID
- `variantsCount` (number): Aantal geactiveerde varianten
- `duplicatesCount` (number): Aantal duplicaten gevonden

### VariantDeactivated

**Triggered**: Wanneer bestaande variant wordt gedeactiveerd door duplicaat.

**Payload**:
- `variantId` (string): De gedeactiveerde variant ID
- `newVariantId` (string): Nieuwe variant ID
- `ean` (string): EAN code

## Data Storage Strategy

### Database Table (`ean_variants`)

**Essentiële zoekvelden**:
- EAN (uniek, geïndexeerd)
- MERK (brand_id, geïndexeerd)
- Kleur (geïndexeerd)
- Maat (geïndexeerd)
- Naam (geïndexeerd)
- is_active (geïndexeerd)

**Zoekmogelijkheden**:
- EAN lookup (exact match)
- MERK/Kleur/Maat filtering
- Naam zoeken (LIKE/ILIKE)
- Combinaties van filters

### JSON File (Storage)

**Locatie**: `approved/{sessionId}/data.json`

**Formaat**: Array van objecten met alle originele kolommen

**Purpose**:
- Volledige data beschikbaar (modelnr, prijs, voorraad, etc.)
- Export/rapportage mogelijkheden
- Audit trail

## Business Rules

### Duplicate Handling

1. **EAN Uniqueness**: EAN is uniek in `ean_variants` tabel
2. **No Overwrite**: Nooit EAN overschrijven, altijd oude deactiveren
3. **Fuzzy Name Matching**: Waarschuwing als naam sterk afwijkt (< 0.5 similarity)
4. **Activation**: Nieuwe variant krijgt `is_active = TRUE`, oude krijgt `is_active = FALSE`

### Brand Detection

1. **Automatic Detection**: Fuzzy search op kolomnamen (merk, brand, fabrikant, etc.)
2. **Manual Selection**: Fallback naar handmatige selectie als detectie faalt
3. **Brand Validation**: Check of alle distinct waarden bestaan in brands tabel
4. **Missing Brands**: Waarschuwing als brands ontbreken, gebruiker kan toevoegen

### Name Generation

1. **Template Required**: Template is verplicht voor naam generatie
2. **Uniqueness Check**: Check op uniekheid (niet blokkerend, wel waarschuwing)
3. **Empty Names**: Lege namen zijn blokkerend (validatie error)
4. **Default Template**: Systeem kan default template voorstellen op basis van beschikbare kolommen

### Column Mapping

1. **Required Fields**: Kleur en Maat kolommen zijn verplicht
2. **EAN Column**: EAN kolom is al bekend uit EAN analysis fase
3. **Validation**: Kolommen moeten bestaan in dataset

## Error Handling

### Validation Errors

- **Missing Required Fields**: EAN, MERK, Kleur, Maat, Naam zijn verplicht
- **Invalid Column Mapping**: Kolom bestaat niet in dataset
- **Invalid Template**: Template heeft geen delen of is ongeldig
- **Empty Names**: Gegenereerde naam is leeg

### Processing Errors

- **JSON Conversion Failed**: Bestand kan niet worden geparsed
- **Brand Creation Failed**: Brand kan niet worden aangemaakt
- **Duplicate Insert Failed**: EAN constraint violation
- **Database Error**: Algemene database fouten

## Performance Considerations

### Batch Processing

- **Batch Size**: 500 rijen per batch voor insert operaties
- **Expected Time**: 1-2 minuten voor 5.000 rijen
- **Memory**: JSON bestand wordt één keer geladen, daarna hergebruikt

### Indexing

- **EAN Index**: Voor snelle EAN lookup
- **Brand Index**: Voor MERK filtering
- **Color/Size Indexes**: Voor filtering
- **Name Index**: Voor naam zoeken
- **Composite Index**: brand_id + color + size voor common queries

## Success Criteria

✅ Dataset kan worden geactiveerd  
✅ MERK wordt automatisch gedetecteerd of handmatig geselecteerd  
✅ Kolommen kunnen worden gemapt (Kleur, Maat)  
✅ Naam template kan worden geconfigureerd  
✅ Namen worden correct gegenereerd  
✅ Duplicaten worden gedetecteerd en oude varianten worden gedeactiveerd  
✅ EAN varianten worden correct aangemaakt in database  
✅ Volledige data blijft beschikbaar in JSON bestand  


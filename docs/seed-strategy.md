# Seed Strategy

## Principe: Empty Table Only

**KRITIEK**: Seeds mogen **ALLEEN** draaien wanneer de doel-tabel **LEEG** is.

Dit voorkomt:
- Overschrijven van bestaande data
- Onbedoelde wijzigingen aan productie data
- Data verlies bij accidentele seed runs

## Strategie

### 1. Pre-flight Check

Elke seeder MOET eerst controleren of de doel-tabel leeg is:

```javascript
// Pseudo-code
const rowCount = await supabase.from('table_name').select('*', { count: 'exact', head: true });
if (rowCount > 0) {
  throw new Error('Table is not empty. Seed can only run on empty tables.');
}
```

### 2. Implementatie Vereisten

**Voor elke seeder (`scripts/seed/seeders/*.mjs`):**

1. **Check tabel leegheid** VOOR data processing
2. **Stop onmiddellijk** als tabel niet leeg is
3. **Geef duidelijke error message** met instructies
4. **Return early** met `{ skipped: true, reason: 'table_not_empty' }`

### 3. Error Handling

Als een tabel niet leeg is:
- **Stop de seed** (niet overslaan, maar stoppen)
- **Log duidelijke error**: `"❌ Table 'brands' is not empty (X rows). Seed can only run on empty tables."`
- **Exit code**: 1 (failure)
- **Geen data wijzigingen**: Geen inserts, updates, of deletes

### 4. Force Flag (Toekomstig)

Voor development/testing kan een `--force` flag worden toegevoegd:
- `npm run seed -- --force` - Bypass empty table check
- **WAARSCHUWING**: Alleen gebruiken in development/test omgevingen
- **NOOIT** gebruiken in productie

### 5. Seeder Template

Elke nieuwe seeder moet deze structuur volgen:

```javascript
export default async function seedTableName() {
  const supabase = await getSupabaseClient();
  
  // STEP 1: Check if table is empty
  const { count, error: countError } = await supabase
    .from('table_name')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new Error(`Failed to check table: ${countError.message}`);
  }
  
  if (count > 0) {
    throw new Error(
      `Table 'table_name' is not empty (${count} rows). ` +
      `Seed can only run on empty tables. ` +
      `Use --force flag to bypass this check (development only).`
    );
  }
  
  // STEP 2: Proceed with seeding
  // ... rest of seed logic
}
```

## Uitzonderingen

**Geen uitzonderingen** voor productie omgevingen.

Alleen in development/test omgevingen kan `--force` worden gebruikt, maar dit moet expliciet worden aangevraagd en gedocumenteerd.

## Compliance Checklist

Voor elke nieuwe seeder:

- [ ] Pre-flight check op lege tabel geïmplementeerd
- [ ] Error message is duidelijk en actiegericht
- [ ] Seed stopt onmiddellijk bij niet-lege tabel
- [ ] Geen data wijzigingen bij niet-lege tabel
- [ ] Documentatie bijgewerkt met tabel naam

## Voorbeelden

### ✅ Correct: Brands Seeder

```javascript
// Check if brands table is empty
const { count } = await supabase
  .from('brands')
  .select('*', { count: 'exact', head: true });

if (count > 0) {
  throw new Error(`Table 'brands' is not empty (${count} rows). Seed can only run on empty tables.`);
}

// Proceed with seeding...
```

### ❌ Incorrect: Geen Check

```javascript
// WRONG: Direct seeding without check
const brands = await parseCSV();
await supabase.from('brands').insert(brands);
```

## Toekomstige Uitbreidingen

1. **Force Flag**: `--force` voor development omgevingen
2. **Dry Run Mode**: `--dry-run` om te checken zonder te seeden
3. **Table Whitelist**: Configuratie voor welke tabellen seedbaar zijn
4. **Backup Before Seed**: Automatische backup voor force mode


# DataStudie - Technische Documentatie

## Overzicht

**DataStudie** is een leeromgeving binnen de Van Kruiningen PIM waarmee gebruikers leveranciersbestanden kunnen analyseren zonder dat een merk of leverancier hoeft te worden opgegeven. Het doel is om de structuur, kolomkoppen en data van supplier files te verkennen voor leer- en analysedoeleinden.

**Route:** `/data-study`

---

## Kernfunctionaliteit

### 1. **Bestand Upload**
- **Ondersteunde formaten:** CSV, Excel (.xlsx, .xls)
- **Maximale bestandsgrootte:** 50MB
- **Upload methode:** Drag & drop of file picker
- **Locatie:** `/data-study`

### 2. **Automatische Parsing**
- Detecteert kolomkoppen automatisch
- Parsed alle rijen en slaat deze op in `supplier_datasets` tabel
- Gebruikt bestaande Edge Function `parse-and-stage-file` met `isStudyMode` flag

### 3. **EAN Auto-detectie**
De DataStudie feature detecteert automatisch het EAN veld uit de ruwe data:

**Detectie logica (prioriteit):**
1. **Kolomnaam matching:** Zoekt kolommen met keywords zoals `ean`, `barcode`, `gtin`, `ean13`, `ean_code`, `artikelnummer`
2. **13-cijfer patroon:** Scant alle kolommen voor waarden met exact 13 cijfers
3. **Checksum validatie:** Valideert EAN-13 checksum om false positives te voorkomen

**Implementatie:**
- Helper functie: `supabase/functions/_shared/ean-detector.ts`
- Functie: `detectEANColumn(row: Record<string, any>)`
- Result: `{ eanValue: string | null, detectedColumn: string | null }`

### 4. **Data Weergave**
- **Records lijst:** Overzicht van alle rijen met EAN en aantal velden
- **JSONB Inspector:** Gestructureerde weergave van ruwe data
  - **Tabel view:** Kolom-waarde pairs in tabel format
  - **Boom view:** Hierarchische JSON tree weergave
  - **Copy functionaliteit:** Kopieer JSON naar klembord

### 5. **Search & Filter**
- Zoek op EAN of waarde in ruwe data
- Real-time filtering tijdens typen
- Highlight geselecteerde record

---

## Database Schema

### Wijzigingen aan Bestaande Tabellen

#### `import_supplier_dataset_jobs`
```sql
-- Nieuwe kolom voor DataStudie mode tracking
is_study_mode BOOLEAN NOT NULL DEFAULT FALSE
```

**Index:**
```sql
CREATE INDEX idx_import_jobs_study_mode 
ON import_supplier_dataset_jobs(is_study_mode) 
WHERE is_study_mode = true;
```

#### `supplier_datasets`
```sql
-- Nieuwe kolom voor quick EAN access
ean TEXT NULL
```

**Index:**
```sql
CREATE INDEX idx_supplier_datasets_ean 
ON supplier_datasets(ean) 
WHERE ean IS NOT NULL;
```

**Voordelen van EAN kolom:**
- Snellere queries (geen JSONB scan nodig)
- Betere index performance
- Eenvoudiger te filteren en sorteren

---

## Edge Function Aanpassingen

### `parse-and-stage-file`

**Nieuwe parameters:**
```typescript
{
  isStudyMode?: boolean;  // Optional flag voor DataStudie mode
}
```

**Gedragsveranderingen in Study Mode:**
1. **Supplier ID optioneel:** Als `isStudyMode = true`, dan is `supplier_id` niet verplicht (gebruikt 0 als fallback)
2. **EAN detectie:** Roept `detectEANColumn()` aan voor elke rij en slaat EAN op in `supplier_datasets.ean` kolom
3. **Tracking:** Zet `is_study_mode = true` op import job

**Code flow:**
```typescript
// In stageRows functie
const stagingRows = batch.map((row: any, idx: number) => {
  let detectedEAN: string | null = null;
  
  if (isStudyMode) {
    const eanResult = detectEANColumn(row);
    detectedEAN = eanResult.eanValue;
  }
  
  return {
    import_job_id: importJobId,
    supplier_id: supplierId || 0, // Fallback voor study mode
    row_number: i + idx + 1,
    raw_data: row,
    ean: detectedEAN, // ✅ Auto-detected EAN
    validation_status: 'valid',
    created_by: createdBy
  };
});
```

---

## Frontend Componenten

### Pagina's

#### 1. `/data-study` - Upload Pagina
**Component:** `src/pages/DataStudy.tsx`

**Features:**
- Drag & drop zone met visuele feedback
- Bestandsvalidatie (type & grootte)
- Progress indicator tijdens upload
- Automatische redirect naar view pagina na voltooiing

**Key Functions:**
```typescript
const uploadFile = async (file: File) => {
  // 1. Create temp import job with is_study_mode = true
  const { data: importJob } = await supabase
    .from('import_supplier_dataset_jobs')
    .insert({
      file_name: file.name,
      is_temp: true,
      is_study_mode: true, // ✅ Study mode flag
      imported_by: user.id,
    })
    .select()
    .single();

  // 2. Upload to Supabase Storage
  await supabase.storage
    .from('imports')
    .upload(filePath, file);

  // 3. Trigger Edge Function with isStudyMode flag
  await supabase.functions.invoke('parse-and-stage-file', {
    body: {
      importJobId: importJob.id,
      filePath,
      isStudyMode: true, // ✅
    },
  });

  // 4. Navigate to view page
  navigate(`/data-study/view?jobId=${importJob.id}`);
};
```

#### 2. `/data-study/view` - Data Weergave
**Component:** `src/pages/DataStudyView.tsx`

**Features:**
- Split view: Records lijst (links) + JSONB inspector (rechts)
- Search functionaliteit
- Record selectie met highlight
- Real-time filtering

**Query:**
```typescript
const { data: dataRecords } = await supabase
  .from('supplier_datasets')
  .select('id, ean, row_number, raw_data')
  .eq('import_job_id', jobId)
  .order('row_number', { ascending: true });
```

#### 3. `/data-study/overview` - Upload Geschiedenis
**Component:** `src/pages/DataStudyOverview.tsx`

**Features:**
- Lijst van alle eerdere DataStudie uploads
- Metadata: bestandsnaam, datum, aantal rijen, bestandsgrootte
- Klik om naar detail pagina te navigeren

**Query:**
```typescript
const { data: jobs } = await supabase
  .from('import_supplier_dataset_jobs')
  .select('id, file_name, started_at, total_rows, file_size_bytes')
  .eq('is_study_mode', true)
  .order('started_at', { ascending: false });
```

### Shared Componenten

#### `JsonbInspector`
**Component:** `src/components/data-study/JsonbInspector.tsx`

**Props:**
```typescript
interface JsonbInspectorProps {
  data: Record<string, any>;
}
```

**Features:**
- Tab switcher: Tabel view / Boom view
- Copy to clipboard functionaliteit
- Syntax highlighting in boom view
- Responsive scroll container

**View Modes:**

**Tabel View:**
```
| Kolom              | Waarde                |
|--------------------|----------------------|
| ean                | 8719598774514        |
| supplier_sku       | ABC-123-M            |
| supplier_color     | Navy                 |
```

**Boom View:**
```
{
  ean: "8719598774514"
  supplier_sku: "ABC-123-M"
  supplier_color: "Navy"
  supplier_size: "M"
}
```

---

## Security & RLS Policies

**DataStudie gebruikt dezelfde RLS policies als reguliere imports:**

```sql
-- Users kunnen eigen study imports bekijken
SELECT policy FROM import_supplier_dataset_jobs
WHERE imported_by = auth.uid() AND is_study_mode = true;

-- Users kunnen eigen staging data bekijken
SELECT policy FROM supplier_datasets
WHERE import_job_id IN (
  SELECT id FROM import_supplier_dataset_jobs 
  WHERE imported_by = auth.uid()
);
```

**Belangrijke beveiligingsaspecten:**
- ✅ Gebruikers kunnen alleen hun eigen uploads zien
- ✅ is_study_mode flag voorkomt verwarring met productie data
- ✅ Geen toegang tot supplier/brand data nodig
- ✅ Temp data wordt automatisch opgeschoond na 24 uur

---

## Performance Overwegingen

### 1. **Grote Bestanden (>1000 rijen)**
- Edge Function gebruikt batch processing (500 rijen per batch)
- Timeout protection (180 seconden CPU limit)
- Background processing met `EdgeRuntime.waitUntil`

### 2. **JSONB Queries**
```sql
-- ❌ SLOW: Scan door alle JSONB
SELECT * FROM supplier_datasets 
WHERE raw_data->>'ean' = '8719598774514';

-- ✅ FAST: Gebruik indexed EAN kolom
SELECT * FROM supplier_datasets 
WHERE ean = '8719598774514';
```

### 3. **Pagination**
Frontend gebruikt in-memory filtering, geschikt voor kleinere datasets (<5000 rijen).
Voor grotere datasets: implementeer server-side pagination.

---

## Gebruik Cases

### 1. **Leren van Supplier Formaten**
Nieuwe gebruikers kunnen bestanden uploaden zonder configuratie om:
- Kolomstructuur te begrijpen
- Data kwaliteit te beoordelen
- EAN formaten te valideren

### 2. **Data Kwaliteit Analyse**
Bekijk:
- Welke kolommen zijn consistent gevuld?
- Welke data types worden gebruikt?
- Zijn er EAN's aanwezig?
- Hoe ziet de data structuur eruit?

### 3. **Pre-import Validatie**
Voor je een volledige import doet:
- Check of EAN's geldig zijn
- Controleer data completeness
- Identificeer potentiële mapping problemen

---

## Toekomstige Uitbreidingen

### Mogelijke Features:
1. **Bulk delete:** Verwijder oude study uploads in bulk
2. **Export functionaliteit:** Download data als CSV/Excel
3. **Statistieken dashboard:** 
   - Aantal unieke EAN's
   - Data completeness per kolom
   - Duplicate detectie
4. **Column mapping preview:** Test mapping voordat je echte import doet
5. **Data quality score:** Automatische kwaliteitsanalyse
6. **Comparison tool:** Vergelijk meerdere bestanden

---

## Troubleshooting

### Upload Mislukt
**Symptoom:** "Upload mislukt" foutmelding

**Mogelijke oorzaken:**
1. Bestand > 50MB → Comprimeer bestand of split in kleinere delen
2. Ongeldig formaat → Controleer of het CSV of Excel is
3. Edge Function timeout → Probeer kleiner bestand (<5000 rijen)

### EAN Niet Gedetecteerd
**Symptoom:** Records tonen "Geen EAN"

**Mogelijke oorzaken:**
1. EAN kolom niet herkend → Check of kolomnaam "ean", "barcode", "gtin" bevat
2. Ongeldige EAN's → Valideer EAN-13 checksum
3. EAN in verkeerd formaat → Moet exact 13 cijfers zijn

**Oplossing:** Bekijk ruwe data in JSONB inspector om kolomnamen te controleren

### Lege Data Weergave
**Symptoom:** "Geen resultaten gevonden"

**Mogelijke oorzaken:**
1. Parsing nog bezig → Wacht tot status "completed" is
2. Alle rijen gefilterd → Check search query
3. Database error → Check console logs

---

## API Referentie

### Edge Function Endpoint
```typescript
POST /functions/v1/parse-and-stage-file

Body: {
  importJobId: number;
  filePath: string;
  isStudyMode: boolean; // ✅ Study mode flag
}
```

### Database Queries

**Fetch Study Uploads:**
```sql
SELECT 
  id, 
  file_name, 
  started_at, 
  total_rows, 
  file_size_bytes
FROM import_supplier_dataset_jobs
WHERE is_study_mode = true
ORDER BY started_at DESC;
```

**Fetch Records for Study Job:**
```sql
SELECT 
  id, 
  ean, 
  row_number, 
  raw_data
FROM supplier_datasets
WHERE import_job_id = :jobId
ORDER BY row_number ASC;
```

**Search Records:**
```sql
SELECT 
  id, 
  ean, 
  row_number, 
  raw_data
FROM supplier_datasets
WHERE import_job_id = :jobId
  AND (
    ean ILIKE '%' || :query || '%'
    OR raw_data::text ILIKE '%' || :query || '%'
  )
ORDER BY row_number ASC;
```

---

## Best Practices

### Voor Gebruikers:
1. ✅ **Upload kleinere testbestanden eerst** (100-500 rijen) om formaat te begrijpen
2. ✅ **Gebruik beschrijvende bestandsnamen** voor betere organisatie
3. ✅ **Check EAN detectie** voordat je volledige import doet
4. ✅ **Export data** als je analyses wilt bewaren

### Voor Developers:
1. ✅ **Altijd `is_study_mode` flag meegeven** bij Edge Function calls
2. ✅ **Gebruik EAN kolom** voor queries (niet JSONB scan)
3. ✅ **Implement pagination** voor grote datasets
4. ✅ **Add error boundaries** voor JSONB rendering
5. ✅ **Log EAN detectie** voor debugging

---

## Changelog

### v1.0.0 (2025-01-14)
- ✅ Initiële release DataStudie feature
- ✅ Upload pagina met drag & drop
- ✅ Automatische EAN detectie
- ✅ JSONB Inspector met tabel/boom view
- ✅ Search & filter functionaliteit
- ✅ Upload geschiedenis overzicht
- ✅ Integration met bestaande `parse-and-stage-file` Edge Function

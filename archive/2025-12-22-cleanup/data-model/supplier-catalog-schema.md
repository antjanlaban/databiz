# Supplier Catalog Schema (RAND Assortiment)

**Laatst bijgewerkt:** 2025-11-12  
**Status:** ✅ Geïmplementeerd (25 actieve kolommen)

---

## Overzicht

De `supplier_products` tabel bevat **RAW leveranciersdata** die nog **NIET** is geconverteerd naar het Master assortiment. Dit is het **RAND assortiment** - producten die beschikbaar zijn bij leveranciers maar nog niet actief aangeboden worden aan klanten.

### RAND vs KERN Filosofie

| Aspect | RAND Assortiment | KERN Assortiment |
|--------|------------------|------------------|
| **Database** | `supplier_products` | `product_variants` + `color_variants` + `product_styles` |
| **Status** | RAW leveranciersdata | Actief Master assortiment |
| **Pricing** | Alleen adviesprijs (referentie) | Echte cost + selling prices |
| **Media** | Leverancier URLs (kunnen expiren) | Master beheerde media |
| **Validatie** | Minimaal (alleen EAN verplicht) | Streng (alle business rules) |
| **Doel** | Overzicht + Conversie bron | Verkoop + Export |

---

## Database Schema

### Tabel: `supplier_products`

```sql
CREATE TABLE supplier_products (
  id SERIAL PRIMARY KEY,
  
  -- P0: Immutable Context (EAN = ENIGE verplichte veld - BR-043)
  ean VARCHAR(13) NOT NULL CHECK (ean ~ '^\d{13}$'),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  mapped_brand_id INTEGER REFERENCES brands(id),
  
  -- P1: Core Business Fields (6 velden voor promotie)
  supplier_style_name TEXT,                -- Product stijlnaam
  supplier_style_code VARCHAR(50),         -- Product stijlcode
  supplier_color_name TEXT,                -- Kleurnaam
  supplier_color_code VARCHAR(50),         -- Kleurcode
  supplier_size_code VARCHAR(20),          -- Maatcode
  supplier_product_image_url TEXT,         -- Primaire product afbeelding
  
  -- Computed Fields
  style_display_name TEXT,                 -- Auto-generated display naam (style + code)
  display_color_name TEXT,                 -- Auto-generated display naam (color + code)
  
  -- Lifecycle Management
  product_status TEXT NOT NULL DEFAULT 'INACTIVE',  -- ACTIVE | INACTIVE
  status_changed_at TIMESTAMP WITH TIME ZONE,
  status_reason TEXT,
  
  -- P1: Additional Product Info
  supplier_sku VARCHAR(100),               -- Leverancier SKU
  supplier_brand_name VARCHAR(200),        -- Merknaam zoals leverancier aanlevert
  supplier_article_code VARCHAR(100),      -- Artikel code
  supplier_article_name TEXT,              -- Artikel naam
  supplier_accent_color_name TEXT,         -- Accent kleur (voor duo kleuren)
  supplier_advised_price INTEGER,          -- Adviesprijs in centen (NULL toegestaan)
  supplier_image_urls TEXT[],              -- Array van afbeelding URLs
  
  -- Import Tracking
  import_dataset_job_id INTEGER NOT NULL REFERENCES import_supplier_dataset_jobs(id),
  source_staging_id INTEGER NOT NULL REFERENCES supplier_datasets(id),
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: één EAN per leverancier
  CONSTRAINT unique_ean_supplier UNIQUE (ean, supplier_id)
);
```

### Rationale Per Veld

#### P0 Velden (Immutable Context)

| Veld | Type | Nullable | Rationale |
|------|------|----------|-----------|
| `ean` | VARCHAR(13) | ❌ NO | **Enige verplichte veld** - EAN is de unieke identifier voor producten. Zonder EAN kunnen we niet matchen met Master catalogus. |
| `supplier_id` | INTEGER | ❌ NO | Foreign key naar leverancier - essentieel voor filtering en rapportage. |
| `mapped_brand_id` | INTEGER | ✅ YES | Mapping naar Master merk - NULL als nog niet gemapped. Wordt automatisch gevuld tijdens import. |

#### P1 Velden (Core Business Fields - voor promotie naar KERN)

| Veld | Type | Nullable | Rationale |
|------|------|----------|-----------|
| `supplier_style_name` | TEXT | ✅ YES | Productnaam/stijlnaam - primaire identificatie voor grouping. |
| `supplier_style_code` | VARCHAR(50) | ✅ YES | Stijlcode - gebruikt voor groepering en display. |
| `supplier_color_name` | TEXT | ✅ YES | Kleurnaam - essentieel voor color mapping naar Master catalogus. |
| `supplier_color_code` | VARCHAR(50) | ✅ YES | Kleurcode - leverancier-specifiek format. |
| `supplier_size_code` | VARCHAR(20) | ✅ YES | Maatcode - format verschilt (XL, 52, US-L, etc.). |
| `supplier_product_image_url` | TEXT | ✅ YES | **Primaire product afbeelding** - gebruikt voor thumbnails en promotie. |

#### Computed & Lifecycle Fields

| Veld | Type | Nullable | Rationale |
|------|------|----------|-----------|
| `style_display_name` | TEXT | ✅ YES | Auto-computed display naam met fallback logic: `"Style Name (Style Code)"` > `"Style Name"` > `"Article Name (Article Code)"` > `"Article Name"` > `"Style Code"` > `"Article Code"` > NULL. |
| `display_color_name` | TEXT | ✅ YES | Auto-computed display naam met dezelfde format: `"Color Name (Color Code)"` > `"Color Name"` > `"Color Code"` > `"Accent Color Name"` > NULL. **Gebruikt voor grouping** in /supplier-catalog. |
| `product_status` | TEXT | ❌ NO | **ACTIVE** of **INACTIVE** - controleert of producten zichtbaar zijn in catalogus. |
| `status_changed_at` | TIMESTAMP | ✅ YES | Timestamp wanneer status laatst gewijzigd is. |
| `status_reason` | TEXT | ✅ YES | Reden voor status change (bijv. "Replaced by newer import"). |

#### Additional Product Info

| Veld | Type | Nullable | Rationale |
|------|------|----------|-----------|
| `supplier_sku` | VARCHAR(100) | ✅ YES | Leverancier SKU - niet altijd aanwezig. |
| `supplier_brand_name` | VARCHAR(200) | ✅ YES | Merknaam zoals leverancier aanlevert - kan afwijken van Master merknaam. |
| `supplier_article_code` | VARCHAR(100) | ✅ YES | Artikelcode - gebruikt als fallback voor style_code. |
| `supplier_article_name` | TEXT | ✅ YES | Artikelnaam - gebruikt als fallback voor style_name. |
| `supplier_accent_color_name` | TEXT | ✅ YES | Accent kleur voor duo-kleur producten (bijv. "Navy/Wit"). |
| `supplier_advised_price` | INTEGER | ✅ YES | **Adviesprijs in centen** - NIET de echte selling price! Alleen ter referentie. |
| `supplier_image_urls` | TEXT[] | ✅ YES | **Array van afbeelding URLs** - kan meerdere product foto's bevatten. |

#### Import Tracking & Audit

| Veld | Type | Nullable | Rationale |
|------|------|----------|-----------|
| `import_dataset_job_id` | INTEGER | ❌ NO | Link naar import job - essentieel voor tracking welke dataset deze producten bevat. |
| `source_staging_id` | INTEGER | ❌ NO | Link naar staging rij - voor audit trail en troubleshooting. |
| `last_synced_at` | TIMESTAMP | ❌ NO | Laatst gesynchroniseerd - voor tracking van data freshness. |
| `created_at` | TIMESTAMP | ❌ NO | Aanmaak timestamp. |
| `updated_at` | TIMESTAMP | ❌ NO | Laatste wijziging timestamp.

---

## View: `v_supplier_product_status`

Deze view combineert leveranciersdata met conversie status (RAND vs KERN) en import job status.

```sql
CREATE OR REPLACE VIEW v_supplier_product_status AS
SELECT 
  sp.id,
  sp.ean,
  sp.supplier_id,
  sp.supplier_sku,
  sp.supplier_brand_name,
  sp.mapped_brand_id,
  sp.supplier_article_code,
  sp.supplier_article_name,
  sp.supplier_style_name,
  sp.supplier_style_code,
  sp.style_display_name,
  sp.display_color_name,
  sp.supplier_color_name,
  sp.supplier_color_code,
  sp.supplier_accent_color_name,
  sp.supplier_size_code,
  sp.supplier_advised_price,
  sp.supplier_image_urls,
  sp.product_status,
  sp.status_changed_at,
  sp.status_reason,
  sp.import_dataset_job_id,
  sp.source_staging_id,
  sp.last_synced_at,
  sp.created_at,
  sp.updated_at,
  
  -- Supplier info
  s.supplier_name,
  
  -- Brand mapping info
  b.brand_name AS mapped_brand_name,
  
  -- Import job file status
  ij.file_status AS linked_file_status,
  ij.file_name AS linked_file_name,
  ij.brand_id AS linked_brand_id,
  
  -- SKU conversion status
  EXISTS (
    SELECT 1 FROM product_variants pv 
    WHERE pv.ean = sp.ean
  ) AS is_converted_to_sku,
  
  -- SKU details (if converted)
  pv.id AS sku_id,
  pv.variant_sku AS sku_code,
  ps.style_name,
  pv.color_name AS sku_color_name
  
FROM supplier_products sp
LEFT JOIN suppliers s ON s.id = sp.supplier_id
LEFT JOIN brands b ON b.id = sp.mapped_brand_id
LEFT JOIN import_supplier_dataset_jobs ij ON ij.id = sp.import_dataset_job_id
LEFT JOIN product_variants pv ON pv.ean = sp.ean
LEFT JOIN product_styles ps ON ps.id = pv.product_style_id;
```

### Kolommen:
- **Alle velden van `supplier_products` (25 kolommen)**
- `supplier_name` - Naam van leverancier
- `mapped_brand_name` - Master merknaam (indien gemapped)
- `linked_file_status` - Status van import job (ACTIVE, INACTIVE, ARCHIVED)
- `linked_file_name` - Naam van import bestand
- `linked_brand_id` - Brand ID van import job
- `is_converted_to_sku` - Boolean: `TRUE` = KERN, `FALSE` = RAND
- `sku_id`, `sku_code`, `style_name`, `sku_color_name` - Master catalogus data (NULL als RAND)

---

## Unique Constraint: `(ean, supplier_id)`

### Waarom deze combinatie?

1. **Meerdere leveranciers kunnen hetzelfde EAN aanbieden**:
   - Leverancier A verkoopt TEE JAYS TJ8000 (EAN: 5700000000123)
   - Leverancier B verkoopt ook TEE JAYS TJ8000 (zelfde EAN)
   - Beide entries zijn valide omdat prijs/voorraad per leverancier kan verschillen

2. **Één leverancier kan EAN NIET dupliceren**:
   - Dezelfde leverancier kan niet hetzelfde EAN twee keer importeren
   - Bij re-import wordt bestaande entry geüpdatet (UPSERT)

3. **EAN is leidend voor conversie naar Master catalogus**:
   - Bij promotie naar KERN assortiment: match op EAN
   - Resultaat: één Master SKU kan meerdere leverancier entries hebben

### Voorbeeld:

```
supplier_products:
| id | ean           | supplier_id | supplier_article_code | supplier_advised_price |
|----|---------------|-------------|-----------------------|------------------------|
| 1  | 5700000000123 | 10 (A)      | TJ8000-RED-XL        | 12.50                  |
| 2  | 5700000000123 | 20 (B)      | T-SHIRT-8000-XL      | 11.80                  |

product_variants:
| id | ean           | sku_code      | selling_price_excl_vat |
|----|---------------|---------------|------------------------|
| 50 | 5700000000123 | MASTER-100050 | 1950 (€19.50 in cents) |
```

Status:
- Row 1 & 2: `is_converted_to_sku = TRUE` (beide mappen naar SKU 50)
- Master catalogus bepaalt eigen prijs (€19.50), niet gebonden aan supplier adviesprijs

---

## Import Flow

### Stap 1: Upload & Parse
Gebruiker uploadt leverancier Excel/CSV → Edge Function `parse-and-stage`

### Stap 2: Validatie
Edge Function `validate-import-data` met `validate_supplier_product_batch`:
- **Hard fail**: Alleen bij ontbrekende of ongeldige EAN
- **Soft warnings**: Ontbrekende artikel code, kleur, maat (blijft valid)

### Stap 3: Import naar `supplier_products`
Edge Function `create-dataset-atomic`:
- INSERT producten als **INACTIVE** (default status)
- Parse `supplier_advised_price` als integer centen
- Parse `supplier_image_urls` array van URLs
- Auto-generate `style_display_name` met fallback logic
- Link via `import_dataset_job_id` en `source_staging_id`

### Stap 4: Activatie via UI Dialog
Na succesvolle import krijgt gebruiker een dialog:
- **Optie A**: "Dataset Nu Activeren" → Check duplicaten → Set `product_status = 'ACTIVE'`
- **Optie B**: "Later Activeren" → Blijft `INACTIVE`, ga naar Datasets pagina

### Stap 5: Conversie naar Master Catalogus (toekomstig)
Gebruiker selecteert ACTIVE producten → Promote naar KERN:
- Maak `product_styles` entry
- Maak `product_variants` entry met echte pricing
- Link via EAN match
- Set `is_converted_to_sku = TRUE`

---

## Business Rules

### BR-042: Import Doel
Import naar `supplier_products`, **NIET** direct naar Master assortiment.

### BR-043: Minimale Validatie
**Alleen EAN is verplicht** voor import naar `supplier_products`. Alle andere velden zijn optioneel.

### BR-044: Adviesprijs vs Echte Prijs
`supplier_advised_price` is **GEEN** echte selling price. Het is een referentieprijs van de leverancier.

### BR-045: Pricing Bepaald Bij Promotie
Echte `cost_price` en `selling_price_excl_vat` worden **pas** bepaald bij conversie naar `product_variants`.

### BR-046: Media Opslag
`supplier_image_urls` = TEXT[] array van URLs. `supplier_product_image_url` = primaire afbeelding voor thumbnails. Master catalogus kan later eigen media uploaden/beheren.

### BR-048: Product Status Lifecycle
Nieuwe imports worden als **INACTIVE** aangemaakt. Gebruiker moet expliciet activeren via UI dialog na duplicaatcheck.

### BR-047: RAND vs KERN Onderscheid
- **RAND** = `supplier_products` (leveranciersdata, nog niet actief)
- **KERN** = `product_variants` (Master assortiment, actief voor verkoop)

---

## UI: Leverancier Catalogus Pagina

**Route:** `/supplier-catalog` (Admin-only)

### Features:
1. **Statistics Cards**: 
   - Totaal producten
   - Totaal modellen (unieke style_name + brand combinaties)
   - RAND count / KERN count
2. **Filters**: 
   - Leverancier (multi-select)
   - Merk (multi-select)
   - VK-nummer status (alle / met VK / zonder VK)
   - Search: EAN, style_name, supplier_name, SKU
3. **Grouping Display**:
   - Producten gegroepeerd per style (brand + style_name)
   - Per style: toon kleuren → per kleur: toon maten
   - Thumbnail via `supplier_product_image_url`
4. **Tabel Kolommen**:
   - Status badge (RAND oranje / KERN groen)
   - Style code + name (`style_display_name`)
   - Leverancier + Merk
   - Kleurvarianten count
   - VK percentage (hoeveel % heeft al VK-nummer)
   - Laatste sync datum
   - Acties: Expand/collapse, bulk select

### Status Badges:
- 🟠 **RAND**: `is_converted_to_sku = FALSE` (nog niet in Master catalogus)
- 🟢 **KERN**: `is_converted_to_sku = TRUE` (al geconverteerd)
- ⚪ **INACTIVE**: `product_status = 'INACTIVE'` (nog niet geactiveerd)
- 🟢 **ACTIVE**: `product_status = 'ACTIVE'` (zichtbaar in catalogus)

---

## Toekomstige Uitbreidingen

### Conversie Wizard (Promote naar KERN)
1. Selecteer RAND producten in tabel (checkboxes)
2. Klik "Promoveer naar Master Catalogus"
3. Wizard:
   - Controleer/bevestig merk mapping
   - Controleer/bevestig categorie mapping
   - Stel echte pricing in (cost + selling)
   - Optioneel: Upload Master media (overschrijft supplier URLs)
4. Creëer product hierarchy: style → color_variant → SKU
5. Update `is_converted_to_sku = TRUE`

### Bulk Operations
- Bulk delete RAND producten
- Bulk brand/category mapping
- Bulk pricing suggestion (gebaseerd op advised price + margin)

### Sync Monitor
- Toon verouderde data (last_synced_at > 30 dagen)
- Notificatie bij nieuwe leverancier data

---

---

## Schema Cleanup (2025-11-12)

**Verwijderde kolommen** (11 stuks - niet meer in database):
1. `supplier_product_group` - Te generiek voor core matching
2. `supplier_product_subgroup` - Te generiek voor core matching
3. `supplier_short_description` - Niet gebruikt in P0/P1 matching, toegankelijk via RAW data
4. `supplier_long_description` - Niet gebruikt in P0/P1 matching, toegankelijk via RAW data
5. `supplier_product_url` - Niet gebruikt in P0/P1 matching, toegankelijk via RAW data
6. `supplier_gender` - Later via AI enrichment
7. `supplier_country_of_origin` - Later via AI enrichment
8. `supplier_fit` - Later via AI enrichment
9. `supplier_fabric_weight_gsm` - Later via AI enrichment
10. `mapped_category_id` - Deprecated mapping veld (categorieën via AI pattern matching)
11. `supplier_category_name` - Niet gebruikt in core matching logic

**Resultaat**: Schema verkleind van 35 → 24 actieve kolommen. Later uitgebreid naar 25 met `display_color_name` voor consistente color grouping. Focus op P0/P1 velden voor promotie naar KERN assortiment.

---

## Conclusie

De `supplier_products` tabel fungeert als **RAW data reservoir** voor leveranciersdata met **25 actieve kolommen**. Het lage validatie niveau (alleen EAN verplicht) zorgt ervoor dat **maximaal veel leveranciersdata** wordt opgeslagen. 

**Belangrijkste kenmerken:**
- **Lifecycle management**: INACTIVE by default, expliciet activeren na duplicaatcheck
- **Grouping logic**: Producten worden gegroepeerd via `style_display_name` (auto-computed) en `display_color_name` (auto-computed)
- **Minimale mapping**: Alleen EAN + brand_id verplicht voor import
- **Future-proof**: Conversie naar KERN assortiment gebeurt **bewust en gecontroleerd** via aparte flow

Master catalogus houdt volledige controle over actieve assortiment en pricing.

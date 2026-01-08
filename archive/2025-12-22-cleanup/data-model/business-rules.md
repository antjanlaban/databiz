# Business Rules

**Last Updated:** 21 oktober 2025  
**Version:** 1.1

---

## Supplier Products (RAND Assortiment)

### BR-042: Import Doel
Import naar `supplier_products`, **NIET** direct naar Master catalogus (`product_variants`).

### BR-043: Minimale Validatie
**Alleen EAN is verplicht** voor import naar `supplier_products`. Alle andere velden zijn optioneel.

### BR-044: Adviesprijs vs Echte Prijs
`supplier_advised_price` is **GEEN** echte selling price. Het is een referentieprijs van de leverancier.

### BR-045: Pricing Bepaald Bij Promotie
Echte `cost_price` en `selling_price_excl_vat` worden **pas** bepaald bij conversie naar `product_variants`.

### BR-046: Media Opslag
`supplier_image_urls` = TEXT[] array van URLs. Master catalogus kan later eigen media uploaden/beheren.

### BR-047: Leverancier vs Master Catalogus Onderscheid
- **Leverancier Catalogus** = `supplier_products` (leveranciersdata, nog niet actief voor verkoop)
- **Master Catalogus** = `product_skus` (VK catalogus, actief voor verkoop en export)

### BR-048: Productgroep Classificatie (Optioneel)
**Trigger:** Import naar `supplier_products`  
**Rule:** `supplier_product_group` en `supplier_product_subgroup` zijn optioneel  
**Validation:** Geen - Alles toegestaan, ook NULL  
**Purpose:** Behoud leverancier taxonomie voor AI-conversie naar ALG

**Voorbeelden:**
- `supplier_product_group = "Veiligheidsschoenen"` (hoofdgroep)
- `supplier_product_subgroup = "S3 Normering"` (specificatie)
- Beide NULL = Ook OK (veel leveranciers leveren dit niet)

### BR-049: Groep vs Categorie Onderscheid
**Context:** `supplier_product_group` ≠ `supplier_category_name`  

**Verschil:**
- `supplier_category_name`: Vrije tekst uit Excel kolom "Categorie" (bijv. "Workwear > Polo's > Lange mouw")
- `supplier_product_group`: Genormaliseerde hoofdgroep (bijv. "Polo's")
- `supplier_product_subgroup`: Genormaliseerde subgroep (bijv. "Lange mouw")

**Doel:** AI kan betere match maken met ALG categorieën via gestructureerde velden

---

---

## Overview

Dit document definieert alle business logica en regels die gelden binnen het Van Kruiningen PIM-systeem. Deze regels worden afgedwongen op database-niveau (constraints, triggers), applicatie-niveau (validatie), en in integraties met externe systemen.

---

## 1. Product Hierarchy Rules

### BR-001: Style → Color → Size Hiërarchie

**Regel:** Elk product volgt de hiërarchie: Style (grandparent) → Color Variant (parent) → Variant (child)

**Implementatie:**

- Een `product_style` kan bestaan zonder color variants (draft status)
- Een `color_variant` MOET gekoppeld zijn aan een `product_style`
- Een `product_variant` MOET gekoppeld zijn aan zowel `color_variant` als `product_style`
- Bij verwijderen van `product_style` worden alle onderliggende records CASCADE verwijderd

**Rationale:** Uniforme structuur voor productbeheer en data integriteit

---

### BR-003: Active Status Cascade

**Regel:** Status van parent beïnvloedt child records

**Business Logic:**

- Als `product_style.is_active = FALSE` → alle onderliggende color variants en variants zijn niet meer beschikbaar voor verkoop
- Als `color_variant.is_active = FALSE` → alle onderliggende variants zijn niet meer beschikbaar
- Variant kan individueel `is_active = FALSE` hebben zonder parent te beïnvloeden

**Implementatie:**

- Database: geen automatische cascade (zou data verliezen)
- Applicatie: queries filteren op `is_active = TRUE` op alle niveaus
- UI: waarschuwing bij deactiveren van parent ("X child records worden ook onbeschikbaar")

**Rationale:** Flexibele controle over beschikbaarheid zonder data te verliezen

---

## 2. Variant & Identifier Rules

### BR-004: EAN Verplicht & Uniek

**Regel:** EAN (European Article Number) is VERPLICHT en moet uniek zijn binnen gehele database

**Business Logic:**

- EAN is VERPLICHT voor elk product variant (voorkomt duplicate producten)
- EAN is exact 13 cijfers
- EAN moet uniek zijn in hele database
- EAN wordt gebruikt voor barcodes, externe systemen en duplicate detectie

**Implementatie:**

- Database: `ean VARCHAR(13) UNIQUE NOT NULL`
- Validatie: alleen numerieke karakters, exact 13 cijfers
- Check digit validatie volgens EAN-13 standaard
- Import: EAN is verplicht veld, import faalt zonder EAN

**Error Handling:**

- Bij ontbrekende EAN: foutmelding "EAN is verplicht voor elk product"
- Bij duplicate EAN: foutmelding "EAN {ean} is al in gebruik bij variant {existing_sku_code}"
- Bij ongeldige check digit: foutmelding "EAN check digit ongeldig"

**Rationale:** 
- EAN is externe identifier die uniek moet zijn voor supply chain
- Voorkomt duplicate producten bij import
- Essentieel voor barcode scanning en externe integraties

---

### BR-005: SKU Code Format

**Regel:** SKU code wordt automatisch gegenereerd door database

**Format:** `MASTER-{id}` (waar id = database auto-increment)

**Voorbeeld:** `MASTER-100001`, `MASTER-100002`, `MASTER-100003`

**Business Logic:**

- SKU code is automatisch uniek (database generated)
- Start bij MASTER-100000
- Oplopende nummers zonder herkenbaarheid
- Eenvoudig te communiceren en op te zoeken

**Implementatie:**

- Database: `sku_code VARCHAR(100) UNIQUE NOT NULL`
- Database trigger: genereert automatisch `MASTER-` + `id` bij insert
- Validatie: uniek in database via constraint

**Rationale:** 
- Eenvoudige, unieke identificatie zonder complexe structuur
- Geen afhankelijkheid van product hiërarchie (style/color/size)
- Ideaal voor zoekveld en externe communicatie

---

### BR-006: Size Code Normalisatie

**Regel:** Maten worden genormaliseerd naar standaard sizing

**Supported Sizes:**

- Numeriek: 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64
- Letter: XS, S, M, L, XL, XXL, 3XL, 4XL, 5XL
- Special: ONE-SIZE, VRIJ (custom)

**Conversion Mapping:**

```
44 → XS
46 → S
48 → M
50 → L
52 → XL
54 → XXL
56 → 3XL
58 → 4XL
60 → 5XL
```

**Implementatie:**

- Import: converteer supplier size notations naar standaard
- Database: `size_code VARCHAR(20)` (accepteert beide formaten)
- Display: gebruik `size_label` voor user-friendly weergave
- Sort: gebruik `size_order` voor correcte sortering

**Rationale:** Uniforme maten voor filtering en rapportage

---

## 3. Pricing Rules

### BR-007: Prijs Hiërarchie

**Regel:** Prijzen volgen vaste hiërarchie: Cost → RRP → Selling → Discount → Final

**Price Cascade:**

1. `cost_price`: Inkoopprijs van leverancier
2. `purchase_discount_amount`: Korting van leverancier
3. `cost_price_net`: Netto inkoopprijs (berekend: cost_price - purchase_discount_amount)
4. `rrp_excl_vat`: Recommended Retail Price (optioneel)
5. `selling_price_excl_vat`: Standaard verkoopprijs (REQUIRED)
6. `sales_discount_amount`: Actiekorting
7. `final_price_excl_vat`: Uiteindelijke prijs na korting (berekend)
8. `selling_price_incl_vat`: Inclusief BTW (berekend)

**Business Logic:**

- `cost_price_net` moet altijd ≤ `selling_price_excl_vat` (positieve marge)
- `rrp_excl_vat` moet altijd ≥ `selling_price_excl_vat` (RRP is maximaal)
- `sales_discount_amount` mag niet groter zijn dan `selling_price_excl_vat`

**Implementatie:**

```sql
cost_price_net NUMERIC(10,2) GENERATED ALWAYS AS (cost_price - purchase_discount_amount) STORED

final_price_excl_vat NUMERIC(10,2) GENERATED ALWAYS AS (selling_price_excl_vat - sales_discount_amount) STORED

selling_price_incl_vat NUMERIC(10,2) GENERATED ALWAYS AS (selling_price_excl_vat * (1 + vat_rate/100)) STORED
```

**Rationale:** Automatische berekeningen voorkomen fouten en inconsistenties

---

### BR-008: Marge Berekening

**Regel:** Marge wordt automatisch berekend op basis van cost en selling price

**Formulas:**

```
margin_amount = selling_price_excl_vat - cost_price_net
margin_percentage = ((selling_price_excl_vat - cost_price_net) / cost_price_net) * 100
```

**Business Logic:**

- Marge kan negatief zijn (verliesgevend product)
- Bij cost_price_net = 0: margin_percentage = 0
- Marge wordt niet opgeslagen maar real-time berekend

**Implementatie:**

```sql
margin_amount NUMERIC(10,2) GENERATED ALWAYS AS (selling_price_excl_vat - cost_price_net) STORED

margin_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
        WHEN cost_price_net > 0 THEN ((selling_price_excl_vat - cost_price_net) / cost_price_net) * 100
        ELSE 0
    END
) STORED
```

**Alerts:**

- Marge < 10%: waarschuwing "Lage marge"
- Marge < 0%: foutmelding "Verliesgevend product"

**Rationale:** Transparante marges voor pricing decisions

---

### BR-009: Price History Tracking

**Regel:** Alle prijswijzigingen worden gelogd in price_history

**Tracked Changes:**

- `cost_price`
- `selling_price`
- `rrp`
- `purchase_discount`
- `sales_discount`

**Required Fields:**

- `price_type`: welke prijs is gewijzigd
- `old_value`, `new_value`: wat was/is de prijs
- `valid_from`: vanaf wanneer geldig
- `change_source`: bron van wijziging (supplier_import, manual, bulk_update, automatic, promotion)
- `change_reason`: tekstuele toelichting (optioneel)

**Business Logic:**

- ELKE prijswijziging triggert een price_history record
- Oude prijzen blijven bewaard (NEVER delete)
- `valid_until` van vorige record wordt gezet op `valid_from` van nieuwe record

**Implementatie:**

- Trigger: `AFTER UPDATE ON product_variants` wanneer prijs velden wijzigen
- Applicatie: expliciete INSERT in price_history bij imports

**Rationale:** Audit trail voor compliance en analyse

---

### BR-010: Tiered Pricing (Staffelprijzen)

**Regel:** Volume-based pricing is optioneel per SKU

**Business Logic:**

- Als `product_variants.has_tiered_pricing = TRUE` → check `price_tiers` tabel
- Tier definitions via `min_quantity` en `max_quantity`
- Laatste tier heeft `max_quantity = NULL` (onbeperkt)
- Tiers mogen niet overlappen
- `tier_price_excl_vat` moet altijd < `selling_price_excl_vat` (korting)

**Implementatie:**

```sql
CONSTRAINT check_min_quantity CHECK (min_quantity >= 1)
CONSTRAINT check_max_quantity CHECK (max_quantity IS NULL OR max_quantity > min_quantity)
CONSTRAINT check_tier_price CHECK (tier_price_excl_vat > 0)
```

**Example:**
| Tier | Min Qty | Max Qty | Price |
|------|---------|---------|-------|
| 1 | 1 | 9 | €44.95|
| 2 | 10 | 49 | €41.95|
| 3 | 50 | 99 | €39.95|
| 4 | 100 | NULL | €37.95|

**Rationale:** Bulk discounts voor B2B klanten

---

### BR-011: Discount Validity

**Regel:** Kortingen hebben begin- en einddatum

**Business Logic:**

- `discount_valid_from` en `discount_valid_until` bepalen wanneer korting actief is
- Op huidige datum: `CURRENT_DATE BETWEEN discount_valid_from AND discount_valid_until`
- Verlopen kortingen: `sales_discount_amount` blijft in database maar wordt niet toegepast

**Implementatie:**

- Applicatie: filter actieve kortingen in queries
- Scheduled job: daily check voor verlopen kortingen (set `sales_discount_amount = 0`)

**Rationale:** Automatische promoties zonder manual intervention

---

## 4. Availability Rules

### BR-012: Orderable Status (Zonder Voorraad)

**Regel:** Product is bestelbaar als aan alle voorwaarden voldaan

**Conditions:**

- `is_active = TRUE`
- `is_orderable = TRUE`
- `is_published = TRUE`
- Parent `color_variant.is_active = TRUE`
- Parent `product_style.is_active = TRUE`

**Business Logic:**

- PIM beheert GEEN voorraad (dit gebeurt in Gripp ERP)
- UI toont alleen products die aan alle status conditions voldoen
- API filtering: `WHERE is_active AND is_orderable AND is_published`
- Voorraadcontrole bij bestelling gebeurt in Gripp, niet in PIM

**Rationale:** 
- PIM is data hub, geen voorraadsysteem
- Single source of truth voor voorraad = Gripp ERP
- Voorkomt data synchronisatie problemen

---

## 5. Color Rules

### BR-014: 3-Layer Color Model

**Regel:** Kleuren hebben 3 lagen: Family → Name → Supplier Name

**Layer 1: Color Family** (top-level categorisatie)

- Gestandaardiseerde families: Zwart, Wit, Grijs, Blauw, Navy, Rood, etc.
- Gebruikt voor filters en grouping
- Link via `color_family_id`

**Layer 2: Color Name** (specifieke kleur)

- `color_name_nl`: Nederlandse naam (bijv. "Donkerblauw")
- `color_name_en`: Engelse naam (optioneel)
- Meest specifieke beschrijving

**Layer 3: Supplier Color Name** (originele supplier naam)

- `color_name_supplier`: Exacte naam van leverancier (bijv. "Navy Blue")
- Gebruikt voor import mapping
- Helpt bij reconciliatie

**Business Logic:**

- Import: map `color_name_supplier` → `color_family_id`
- Display: toon `color_name_nl` aan gebruikers
- Filter: groepeer op `color_family_id`

**Rationale:** Uniforme kleur filtering ondanks verschillende supplier naming

---

### BR-015: Accent Color Support

**Regel:** Producten kunnen een accent kleur hebben (twee-kleurig)

**Business Logic:**

- Primary color: `color_family_id` + `color_name_nl` (REQUIRED)
- Accent color: `accent_color_family_id` + `accent_color_name_nl` (OPTIONAL)
- Als `accent_color_family_id IS NOT NULL`: product is twee-kleurig
- Markeer als `is_multicolor = TRUE` bij >2 kleuren

**Use Cases:**

- Polo met Navy body + Grijze kraag
- Jas met Zwart basis + Oranje reflecterende strepen

**Display:**

- Toon beide kleuren in UI: "Navy met Grijs accent"
- Filter: vindt product bij zowel "Navy" als "Grijs" filter

**Rationale:** Support voor bedrijfskleding met meerdere kleuren

---

## 6. Decoration Rules

### BR-016: Decoration Option Restrictions

**Regel:** Decoratie-opties zijn product-specifiek met constraints

**Business Logic:**

- Niet alle decoratie methodes zijn beschikbaar voor alle producten
- Niet alle posities zijn beschikbaar voor alle methodes
- Restrictions worden gedefinieerd in `decoration_options`

**Required Validation:**

- `min_order_qty`: minimum aantal stuks voor deze decoratie (bijv. borduren min 10)
- `max_colors_allowed`: maximum aantal kleuren in logo (bijv. borduren max 6)
- `max_stitches_allowed`: maximum aantal steken voor borduren

**Implementatie:**

- Database: `decoration_options` table met foreign keys
- Validation: check constraints tijdens order placement
- UI: toon alleen geldige combinaties van method + position

**Rationale:** Technische beperkingen van decoratie processen

---

### BR-017: Decoration Pricing

**Regel:** Decoratie heeft setup fee + per-item pricing

**Price Components:**

- `setup_fee_eur`: Eenmalige kosten (bijv. scherm maken voor zeefdruk)
- `price_per_item_eur`: Prijs per besteld item

**Total Calculation:**

```
decoration_total = setup_fee_eur + (price_per_item_eur * quantity)
```

**Business Logic:**

- Setup fee wordt slechts 1x berekend per order
- Bij herbestelling (repeat order): setup fee kan vervallen
- Minimum order quantity bepaalt break-even point

**Rationale:** Realistische decoratie kostprijzen

---

## 7. External System Integration Rules

### BR-018: Active Products Export

**Regel:** Alleen actieve en gepubliceerde producten worden geëxporteerd naar externe systemen

**Export Filter:**

```sql
WHERE is_active = TRUE
  AND is_published = TRUE
```

**Business Logic:**

- Gripp export: alleen actieve products
- Calculated export: alleen actieve products (per organisatie selectie)
- Webshop export: alleen actieve en gepubliceerde products

**Rationale:** Alleen producten die gereed en goedgekeurd zijn, worden geëxporteerd

---

### BR-019: External Mapping Uniqueness

**Regel:** Externe product codes zijn uniek per systeem en optioneel per klant

**Business Logic:**

- Een PIM SKU kan meerdere externe mappings hebben (1 per systeem)
- Binnen 1 systeem is `external_product_code` uniek
- Voor Calculated: `external_product_code` is uniek per `customer_id`

**Implementatie:**

```sql
UNIQUE(external_system, external_product_code, customer_id)
```

**Use Cases:**

- Gripp mapping: `external_system='Gripp'`, `external_product_code='G-001'`, `customer_id=NULL`
- Calculated mapping: `external_system='Calculated'`, `external_product_code='C-001'`, `customer_id=42`

**Rationale:** Flexibele koppelingen naar meerdere systemen en klanten

---

### BR-020: Polymorphic Entity Mapping

**Regel:** External mappings kunnen verwijzen naar verschillende entity types

**Supported Entity Types:**

- `'style'`: Mapping op style niveau (hele productlijn)
- `'color_variant'`: Mapping op kleur niveau
- `'sku'`: Mapping op SKU niveau (specifieke maat+kleur)
- `'decoration_option'`: Mapping voor decoratie configuraties

**Business Logic:**

- `entity_type` + `entity_id` verwijst naar record in betreffende tabel
- Geen database foreign key (polymorphic pattern)
- Applicatie valideert dat entity_id bestaat in juiste tabel

**Implementatie:**

```sql
entity_type VARCHAR(30) CHECK (entity_type IN ('style', 'color_variant', 'sku', 'decoration_option'))
entity_id INTEGER NOT NULL
```

**Rationale:** Flexibiliteit voor verschillende mapping granulariteit

---

## 8. Data Quality Rules

### BR-021: Mandatory Fields Validation

**Regel:** Bepaalde velden zijn verplicht per context

**Product Style (KERN):**

- `style_name` ✓ (uniek per brand)
- `brand_id` ✓
- `supplier_id` ✓
- `description_short_nl` (warning als leeg)

**Product Style (RAND):**

- `style_name` ✓ (uniek per brand)
- Andere velden optioneel

**Product SKU:**

- `ean` ✓
- `sku_code` ✓
- `size_code` ✓
- `selling_price_excl_vat` ✓

**Rationale:** Data kwaliteit voor externe publicatie

---

### BR-022: Size Ordering

**Regel:** Maten worden gesorteerd op logische volgorde, niet alfabetisch

**Implementatie:**

- Gebruik `size_order` field voor sortering
- Kleiner nummer = kleinere maat
- Applicatie: `ORDER BY size_order ASC`

**Example Mapping:**

```
XS  → size_order = 1
S   → size_order = 2
M   → size_order = 3
L   → size_order = 4
XL  → size_order = 5
XXL → size_order = 6
3XL → size_order = 7
```

**Rationale:** User-friendly display van maten

---

## 9. Import Rules

### BR-023: Supplier Data Normalization

**Regel:** Import data wordt genormaliseerd naar PIM standaarden

**Normalization Steps:**

1. Size codes → standaard size codes (BR-006)
2. Color names → colors (BR-014)
3. Price formats → cents (integers)
4. Boolean values → TRUE/FALSE
5. Dates → ISO format (YYYY-MM-DD)

**Business Logic:**

- Import mapping templates slaan conversie regels op
- Validation errors worden gelogd maar blokkeren import niet (warning)
- Critical errors (duplicate EAN) blokkeren wel import

**Rationale:** Data consistentie ondanks diverse leveranciers

---

### BR-024: Import Conflict Resolution

**Regel:** Bij duplicate SKU/EAN tijdens import: update existing record

**Strategies:**

- **Insert Only**: Skip duplicates, alleen nieuwe records
- **Update Existing**: Update bestaande records met nieuwe data
- **Upsert**: Insert nieuwe, update bestaande
- **Mirror Sync**: Full sync (delete records niet in import)

**Default:** Upsert

**Business Logic:**

- Match op EAN of SKU code
- Bij match: update price fields en stock_quantity
- Bij mismatch: insert new record

**Rationale:** Flexibiliteit per import scenario

---

## 10. Audit & Compliance Rules

### BR-025: Audit Trail Requirements

**Regel:** Kritieke wijzigingen worden gelogd

**Tracked Changes:**

- Alle prijswijzigingen → `price_history`
- Product deactivatie → audit log
- Bulk imports → import_batch_id tracking
- Export naar externe systemen → sync log

**Required Fields:**

- `created_at`: wanneer
- `created_by`: door wie (optioneel voor imports)
- `change_source`: waarom/hoe
- `change_reason`: textual explanation

**Retention:**

- Price history: permanent
- Audit logs: minimum 7 jaar

**Rationale:** Compliance en troubleshooting

---

## 11. Category Management Rules

### BR-026: Category Assignment Rules

**Regel:** Elk product_style MOET exact 1 ALG categorie hebben

**Business Logic:**

- ALG taxonomy is verplicht (is_required = true)
- Product kan NIET opgeslagen worden zonder ALG categorie
- GS1 categorieën zijn optioneel
- Categorieën worden gekoppeld op STYLE niveau (niet op SKU niveau)

**Implementatie:**

- Validatie in product form: check product_categories heeft 1 ALG entry
- Database constraint via trigger (optioneel)
- Import wizard: category mapping stap is verplicht

**Rationale:** Uniforme categorisatie voor exports en filtering

---

### BR-026-EXTENDED: Category Deletion with Product Impact

**Regel:** Categorieën kunnen alleen verwijderd worden na validatie van gekoppelde producten

**Business Logic:**

**Situatie 1: Algemene Categorieën (niet-ALG)**
- Controleer of er `product_styles` gekoppeld zijn via `product_categories`
- Als ja: **BLOKKEER** delete met melding: "Kan niet verwijderen: X producten gebruiken deze categorie"
- Als nee: delete toegestaan

**Situatie 2: ALG Categorie met Producten**
- ALG categorieën zijn **verplicht** voor elk product (BR-026)
- Delete is **alleen toegestaan na herkoppeling** van alle producten naar andere ALG categorie
- Fallback categorie "UNCATEGORIZED" is altijd beschikbaar
- Admin moet expliciet kiezen waar producten naartoe verhuizen

**Situatie 3: Fallback Categorie "UNCATEGORIZED"**
- Speciale categorie in ALG taxonomy: `category_code = 'UNCATEGORIZED'`
- Naam: "Uncategorized" (Engels, niet "Geen_categorie")
- **UI disabled**: kan niet verwijderd of inactief gemaakt worden
- Gebruikt als vangnet voor producten zonder logische categorie
- `sort_order = 999` (altijd onderaan)

**Situatie 4: GS1 Categorieën met Producten**
- GS1 categorieën zijn optioneel (niet verplicht per BR-026)
- Bij delete: optie om producten te herkoppelen OF link te verbreken
- Admin kiest: "Koppel over naar andere GS1 categorie" of "Verwijder GS1 koppeling"
- Product blijft geldig (heeft ALG categorie)

**Implementatie:**

**Client-Side (UI):**
```typescript
// Check impact voor delete actie
const { canDelete, blockedReason, productStyleCount, isAlgCategory, requiresReplacement, availableReplacements } = getCategoryDeleteImpact(categoryId);

if (!canDelete && !requiresReplacement) {
  // Blokkeer delete
  toast.error(blockedReason);
  return;
}

if (requiresReplacement) {
  // Open replacement dialog
  showCategoryReplacementDialog({
    category,
    productStyleCount,
    availableReplacements: isAlgCategory ? algCategories : gs1Categories,
    isAlgCategory
  });
}
```

**Server-Side (Database):**
```sql
-- Query om impact te checken
SELECT 
  COUNT(DISTINCT pc.product_style_id) as affected_products,
  c.taxonomy_id,
  ct.code as taxonomy_code
FROM categories c
JOIN product_categories pc ON pc.category_id = c.category_id
JOIN category_taxonomies ct ON ct.taxonomy_id = c.taxonomy_id
WHERE c.category_id = $1
GROUP BY c.taxonomy_id, ct.code;
```

**Replacement Flow:**
1. Admin klikt delete op ALG categorie met 25 producten
2. UI toont CategoryReplacementDialog met impact details
3. Admin selecteert vervangende categorie
4. Klik "Bevestig verplaatsing"
5. Bulk update: `UPDATE product_categories SET category_id = $new WHERE category_id = $old`
6. Delete originele categorie
7. Toast: "25 producten verplaatst en categorie verwijderd"
8. Audit log entries voor beide acties

**Validation Rules:**

- **Pre-delete check:** Verplicht impact analysis uitvoeren
- **ALG categorie met producten:** Replacement VERPLICHT
- **GS1 categorie met producten:** Replacement OPTIONEEL (mag ontkoppeld)
- **UNCATEGORIZED categorie:** Delete knop disabled in UI
- **Leaf categories zonder producten:** Direct delete toegestaan
- **Parent categories:** Alleen delete als geen kinderen EN geen producten

**Error Messages:**

| Scenario | Message |
|----------|---------|
| ALG categorie met producten zonder replacement | "Kan niet verwijderen: Deze ALG categorie is gekoppeld aan {count} producten. Selecteer eerst een vervangende categorie." |
| GS1 categorie met producten | "Deze GS1 categorie is gekoppeld aan {count} producten. Wilt u de producten herkoppelen of de koppeling verwijderen?" |
| UNCATEGORIZED delete poging | "De 'Uncategorized' categorie kan niet worden verwijderd. Dit is een verplichte fallback categorie." |
| Parent category met kinderen | "Kan niet verwijderen: Deze categorie heeft {count} subcategorieën. Verwijder eerst de subcategorieën." |
| Circulaire replacement | "Ongeldige vervanging: Kan een categorie niet vervangen door zichzelf of een subcategorie." |

**Rationale:** 
- Voorkomt data verlies (producten zonder categorie)
- Dwingt bewuste keuze af bij impactvolle wijzigingen
- ALG categorieën zijn business-critical (verplicht voor exports)
- GS1 categorieën zijn optioneel (flexibele afhandeling)
- UNCATEGORIZED is vangnet voor edge cases

---

### BR-027: Category Mapping tijdens Import

**Regel:** Import wizard moet supplier waarden mappen naar ALG categorieën

**Business Logic:**

- Suppliers leveren NIET de juiste categorieën aan
- Gebruiker moet handmatig mapping doen tijdens import
- Mapping wordt opgeslagen in import_templates voor hergebruik
- Template kan supplier-specifiek zijn

**Flow:**

1. Upload Excel met kolom "Product Type": "Veiligheidsschoen laag"
2. Category Mapping stap: map "Veiligheidsschoen laag" → ALG > Werkschoen > Lage schoen
3. Mapping opslaan in template
4. Volgende import: mapping automatisch toegepast

**Rationale:** Supplier data is inconsistent, conversie cruciaal voor data quality

---

### BR-028: Template Hergebruik

**Regel:** Import templates worden hergebruikt voor snellere imports

**Business Logic:**

- Template bevat column mappings + category mappings
- Template kan gekoppeld zijn aan supplier (optioneel)
- Bij nieuwe import: systeem suggereert matching templates
- Gebruiker kan template aanpassen als supplier formaat verandert

**Metadata:**

- last_used_at: timestamp van laatste gebruik
- import_count: hoe vaak template gebruikt

**Rationale:** Efficiëntie - zelfde supplier = zelfde mapping patroon

---

## 12. Authorization Rules

### BR-029: User Role Authorization

**Regel:** Admin vs User rechten binnen organisatie

**Roles:**

- **admin**: Volledige toegang (CRUD alle data, invite users, manage templates)
- **user**: Read-only toegang (view products, use existing templates)

**Implementatie:**

- user_roles table (NIET op profiles!)
- RLS policies gebruiken has_role() function
- UI elementen conditional rendering op basis van role

**Security:**

- NEVER check role client-side only (manipuleerbaar)
- ALWAYS server-side validation via RLS + Edge Functions

**Rationale:** Niet iedereen hoeft alles te kunnen wijzigen

---

### BR-030: Supplier vs Brand Relationship

**Regel:** Suppliers kunnen meerdere brands voeren

**Business Logic:**

- Supplier: Leverancier die data aanlevert (bijv. "Tricorp Groothandel")
- Brand: Merk op het product (bijv. "Tricorp")
- 1 supplier kan meerdere brands hebben
- Scheiding belangrijk voor import attribution vs product branding

**Example:**

- Supplier: "Corporate Fashion Group"
  → Brands: "Santino", "Havep", "Projob"

**Rationale:** Import tracking vs product display scheiding

---

### BR-037: EAN Prefix Matching (Optioneel)

**Regel:** Brands kunnen optioneel een GS1 Company Prefix hebben voor EAN validatie

**Context:**
- GS1 Company Prefix = unieke cijferreeks (6-9 cijfers) toegekend door GS1
- Onderdeel van EAN-13: [Landcode][Company Prefix][Artikelnummer][Check digit]
- Nederlandse merken hebben meestal prefix beginnend met 87

**Implementatie:**
- Database: `brands.ean_prefix VARCHAR(9) NULL`
- Validatie: `/^\d{6,9}$/`
- AI kan prefix suggereren op basis van bestaande EANs

**Business Logic:**
- EAN prefix is **optioneel** (niet elk merk heeft eigen prefix)
- Tijdens import: check of EAN matcht met brand prefix → **WARNING** indien niet
- Niet-matchende EAN blokkeert import NIET (white label/re-sellers zijn toegestaan)

**AI Suggesties:**
- High confidence (>0.8): Alle EANs hebben zelfde prefix → automatisch invullen
- Medium confidence (0.5-0.8): Patronen zichtbaar → handmatige verificatie
- Low confidence (<0.5): Onvoldoende data → handmatige input vereist

**Use Cases:**
1. **Brand met eigen productie:** Heeft eigen GS1 prefix (bijv. Tricorp: 871959)
2. **Reseller/Import:** Geen eigen prefix → veld blijft leeg
3. **White label:** Producten onder verschillende brands → geen vaste prefix

---

## Rule Status Matrix

| Rule ID | Status    | Priority | Automated   | Category     |
| ------- | --------- | -------- | ----------- | ------------ |
| BR-001  | ✅ Active | Critical | Database    | Hierarchy    |
| BR-002  | ✅ Active | High     | Application | Classification |
| BR-003  | ✅ Active | High     | Application | Status       |
| BR-004  | ✅ Active | Critical | Database    | Identifiers  |
| BR-005  | ✅ Active | High     | Database    | Identifiers  |
| BR-006  | ✅ Active | Medium   | Application | Normalization |
| BR-007  | ✅ Active | Critical | Database    | Pricing      |
| BR-008  | ✅ Active | High     | Database    | Pricing      |
| BR-009  | ✅ Active | High     | Trigger     | Pricing      |
| BR-010  | ✅ Active | Medium   | Database    | Pricing      |
| BR-011  | ✅ Active | Medium   | Application | Pricing      |
| BR-012  | ✅ Active | Critical | Database    | Stock        |
| BR-013  | ✅ Active | High     | Application | Stock        |
| BR-014  | ✅ Active | High     | Application | Colors       |
| BR-015  | ✅ Active | Low      | Database    | Colors       |
| BR-016  | ✅ Active | Medium   | Application | Decoration   |
| BR-017  | ✅ Active | Medium   | Application | Decoration   |
| BR-018  | ✅ Active | Critical | Application | Integration  |
| BR-019  | ✅ Active | High     | Database    | Integration  |
| BR-020  | ✅ Active | Medium   | Application | Integration  |
| BR-021  | ✅ Active | High     | Application | Quality      |
| BR-022  | ✅ Active | Low      | Application | Quality      |
| BR-023  | ✅ Active | High     | Application | Import       |
| BR-024  | ✅ Active | Medium   | Application | Import       |
| BR-025  | ✅ Active | High     | Application | Audit        |
| BR-026  | ✅ Active | Critical | Application | Categories   |
| BR-026-EXT | ✅ Active | Critical | Application | Categories   |
| BR-027  | ✅ Active | High     | Application | Categories   |
| BR-028  | ✅ Active | Medium   | Application | Templates    |
| BR-029  | ✅ Active | Critical | RLS/Edge    | Authorization|
| BR-030  | ✅ Active | Low      | Application | Relationships|
| BR-037  | ✅ Active | Medium   | Application | EAN Validation|

---

_Document wordt bijgewerkt wanneer nieuwe business rules worden geïdentificeerd._

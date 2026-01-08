# Export Formats

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Dit document specificeert alle export formaten voor externe systemen waarmee het Van Kruiningen PIM integreert. Per systeem worden exacte veldmappings, data transformaties en bestandsformaten gedocumenteerd.

---

## 1. Gripp ERP Export

**System:** Gripp.com  
**Purpose:** ERP voor order management, facturatie, voorraad  
**Integration Type:** REST API + CSV fallback  
**Frequency:** Real-time via webhooks (orders) + daily batch (products/prices)  
**Direction:** Bidirectioneel (PIM → Gripp voor products, Gripp → PIM voor orders)

### 1.1 Product Export Format

**Endpoint:** `POST https://{company}.gripp.com/api/v2/products`  
**Authentication:** API Key in header  
**Content-Type:** `application/json`

**JSON Structure:**

```json
{
  "productcode": "PRO-WB-001-NAV-48",
  "productomschrijving": "Werkbroek Professional - Navy - Maat 48",
  "verkoopprijs": 44.95,
  "inkoopprijs": 32.50,
  "voorraad": 25,
  "productgroep": "Werkbroeken",
  "leverancier": "Leverancier BV",
  "eenheid": "stuk",
  "btw_code": "H",
  "actief": true
}
```

**Field Mapping:**

| PIM Field                                                   | Gripp Field         | Type    | Transform                          | Required |
| ----------------------------------------------------------- | ------------------- | ------- | ---------------------------------- | -------- |
| product_variants.sku_code                                       | productcode         | string  | -                                  | ✓        |
| CONCAT(style_name, ' - ', color_name_nl, ' - ', size_label) | productomschrijving | string  | Concatenate                        | ✓        |
| product_variants.selling_price_excl_vat                         | verkoopprijs        | decimal | -                                  | ✓        |
| product_variants.cost_price                                 | inkoopprijs         | decimal | -                                  | ✓        |
| product_variants.stock_quantity                                 | voorraad            | integer | -                                  | ✓        |
| categories.name                                             | productgroep        | string  | -                                  | ✓        |
| suppliers.supplier_name                                     | leverancier         | string  | -                                  | -        |
| 'stuk'                                                      | eenheid             | string  | hardcoded                          | ✓        |
| vat_rate → btw_code                                         | btw_code            | string  | Map: 21% → 'H', 9% → 'L', 0% → 'V' | ✓        |
| product_variants.is_active                                      | actief              | boolean | -                                  | ✓        |

**Transformation Rules:**

```typescript
// BTW code mapping
const vatCodeMapping = {
  21: 'H', // Hoog tarief
  9: 'L',  // Laag tarief
  0: 'V'   // Vrijgesteld/verlegd
};

// Price conversion (PIM stores in cents, Gripp expects euros)
grippPrice = pimPriceCents / 100;

// Product description
productDescription = `${styleName} - ${colorNameNL} - ${sizeLabel}`;
```

**Filter Criteria:**

```sql
WHERE product_styles.product_type = 'KERN'
  AND product_styles.is_active = TRUE
  AND product_variants.is_active = TRUE
  AND product_variants.is_orderable = TRUE
```

**CSV Fallback Format:**

```csv
productcode,productomschrijving,verkoopprijs,inkoopprijs,voorraad,productgroep,leverancier,eenheid,btw_code,actief
PRO-WB-001-NAV-48,"Werkbroek Professional - Navy - Maat 48",44.95,32.50,25,Werkbroeken,Leverancier BV,stuk,H,true
```

**Error Handling:**

- Duplicate productcode: Update existing product
- Missing required field: Skip record, log error
- API rate limit (1000 req/hour): Implement exponential backoff

---

### 1.2 Order Import Format (Gripp → PIM)

**Endpoint:** `GET https://{company}.gripp.com/api/v2/orders`  
**Purpose:** Import orders om voorraad te reserveren

**JSON Structure:**

```json
{
  "ordernummer": "ORD-2025-001",
  "orderdatum": "2025-10-17",
  "klant_naam": "Bedrijf XYZ",
  "orderregels": [
    {
      "productcode": "PRO-WB-001-NAV-48",
      "aantal": 10,
      "prijs_per_stuk": 44.95
    }
  ],
  "status": "Geplaatst"
}
```

**Action:** Reserve stock in PIM (`stock_reserved += aantal`)

---

## 2. Calculated KMS Export

**System:** Calculated Kleding Management Systeem  
**Purpose:** Online portaal waar medewerkers werkkleding kunnen bestellen  
**Integration Type:** File-based (XML/JSON) + optional REST API  
**Frequency:** Weekly full sync + on-demand  
**Direction:** Unidirectioneel (PIM → Calculated)

### 2.1 Assortiment Export Format

**File Format:** JSON  
**Encoding:** UTF-8  
**Structure:** Per organisatie custom assortiment

**JSON Structure:**

```json
{
  "organisatie_id": 42,
  "organisatie_naam": "Bedrijf ABC",
  "export_datum": "2025-10-17T10:00:00Z",
  "producten": [
    {
      "artikelnummer": "PRO-POLO-001",
      "omschrijving": "Tricorp Polo Premium",
      "categorie": "Polo's",
      "merk": "Tricorp",
      "kleuren": [
        {
          "kleur_code": "NAV",
          "kleur_naam": "Navy",
          "afbeelding_url": "https://cdn.vankruiningen.nl/products/polo-001-navy.jpg"
        },
        {
          "kleur_code": "BLK",
          "kleur_naam": "Zwart",
          "afbeelding_url": "https://cdn.vankruiningen.nl/products/polo-001-zwart.jpg"
        }
      ],
      "maten": ["S", "M", "L", "XL", "XXL"],
      "prijs_per_stuk": 34.95,
      "staffelprijzen": [
        {"vanaf": 1, "tot": 9, "prijs": 34.95},
        {"vanaf": 10, "tot": 49, "prijs": 31.95},
        {"vanaf": 50, "tot": null, "prijs": 29.95}
      ],
      "decoratie_mogelijk": true,
      "decoratie_opties": [
        {
          "methode": "Borduren",
          "posities": ["Borst links", "Rug"],
          "min_aantal": 10,
          "prijs_per_stuk": 4.50,
          "instelkosten": 35.00
        },
        {
          "methode": "Zeefdruk",
          "posities": ["Borst", "Rug"],
          "min_aantal": 1,
          "prijs_per_stuk": 3.25,
          "instelkosten": 45.00
        }
      ],
      "beschikbaarheid": "Op voorraad",
      "levertijd_dagen": 3
    }
  ]
}
```

**Field Mapping:**

| PIM Field                           | Calculated Field   | Type    | Transform                                       |
| ----------------------------------- | ------------------ | ------- | ----------------------------------------------- |
| product_styles.style_name           | artikelnummer      | string  | Use style_name as unique identifier            |
| product_styles.style_name           | omschrijving       | string  | -                                               |
| categories.name                     | categorie          | string  | -                                               |
| brands.brand_name                   | merk               | string  | -                                               |
| GROUP(color_variants)               | kleuren            | array   | Aggregate distinct colors                       |
| GROUP(product_variants.supplier_size_code) | maten              | array   | Aggregate distinct sizes, sort by size_order    |
| product_variants.selling_price_excl_vat | prijs_per_stuk     | decimal | Take lowest price of all variants               |
| price_tiers                         | staffelprijzen     | array   | Group by SKU, format tiers                      |
| decoration_options EXISTS           | decoratie_mogelijk | boolean | -                                               |
| decoration_options                  | decoratie_opties   | array   | Format decoration options                       |
| stock_available > 0                 | beschikbaarheid    | string  | Map: >0 → "Op voorraad", 0 → "Niet op voorraad" |
| fixed                               | levertijd_dagen    | integer | Hardcoded per organisatie                       |

**Transformation Rules:**

```typescript
// Aggregate kleuren per style
const kleuren = color_variants
  .map(cv => ({
    kleur_code: cv.color_code,
    kleur_naam: cv.color_name_nl,
    afbeelding_url: cv.media.find(m => m.is_primary)?.file_url
  }));

// Aggregate maten per style
const maten = product_variants
  .map(variant => variant.supplier_size_code)
  .filter((v, i, a) => a.indexOf(v) === i) // Unique
  .sort((a, b) => sizeOrder[a] - sizeOrder[b]);

// Staffelprijzen formatting
const staffelprijzen = price_tiers
  .map(tier => ({
    vanaf: tier.min_quantity,
    tot: tier.max_quantity,
    prijs: tier.tier_price_excl_vat
  }))
  .sort((a, b) => a.vanaf - b.vanaf);
```

**Filter Criteria:**

```sql
WHERE product_styles.product_type = 'KERN'
  AND product_styles.is_active = TRUE
  AND organization_assortments.organization_id = {org_id}
```

**Organisatie-Specifieke Filtering:**
Calculated vereist per organisatie custom assortiment selectie. Mapping via `organization_assortments` join table (not in current schema - requires future implementation).

---

## 3. Webshop Product Feeds

### 3.1 WooCommerce CSV Export

**File Format:** CSV  
**Encoding:** UTF-8  
**Delimiter:** Comma (,)  
**Quote:** Double quotes (")

**CSV Structure:**

```csv
SKU,Name,Type,Published,Categories,Tags,Description,Short description,Regular price,Sale price,Stock,Backorders allowed,Images,Attributes
PRO-POLO-001-NAV-S,"Tricorp Polo Premium - Navy - S",variable,1,"Polo's",Tricorp,"<p>Premium polo shirt...</p>","Hoogwaardig polo shirt",34.95,29.95,50,0,"https://cdn.example.com/1.jpg|https://cdn.example.com/2.jpg","Merk:Tricorp|Kleur:Navy|Maat:S"
```

**Field Mapping:**

| PIM Field                                                   | WooCommerce Field  | Transform                               |
| ----------------------------------------------------------- | ------------------ | --------------------------------------- |
| product_variants.sku_code                                       | SKU                | -                                       |
| CONCAT(style_name, ' - ', color_name_nl, ' - ', size_label) | Name               | Concatenate                             |
| 'variable'                                                  | Type               | Hardcoded (parent), 'simple' (variants) |
| product_variants.is_orderable                                   | Published          | Boolean → 1/0                           |
| categories.name                                             | Categories         | Pipe-separated if multiple              |
| brands.brand_name                                           | Tags               | -                                       |
| product_styles.description                          | Description        | HTML-encode                             |
| product_styles.description                         | Short description  | HTML-encode (truncated)                             |
| product_variants.selling_price_excl_vat                         | Regular price      | Include VAT if needed                   |
| product_variants.selling_price_excl_vat (with discount)                           | Sale price         | Only if discount active                 |
| product_variants.stock_quantity                                | Stock              | -                                       |
| 0                                                           | Backorders allowed | Hardcoded                               |
| color_variant_media.file_url                                | Images             | Pipe-separated multiple URLs            |
| Dynamic                                                     | Attributes         | Format: "Key:Value\|Key:Value"          |

**Transformation Rules:**

```typescript
// Attributes formatting
const attributes = [
  `Merk:${brand_name}`,
  `Kleur:${color_name_nl}`,
  `Maat:${size_label}`,
  `Materiaal:${material_composition}`,
  `Gewicht:${fabric_weight}g/m²`
].join('|');

// Images
const images = color_variant_media
  .filter(m => m.is_active)
  .sort((a, b) => a.display_order - b.display_order)
  .map(m => m.file_url)
  .join('|');

// Sale price (only if discount active)
const salePrice = (discount_valid_until >= today && sales_discount_amount > 0)
  ? final_price_excl_vat
  : '';
```

---

### 3.2 Shopify JSON Export

**API Endpoint:** `POST https://{store}.myshopify.com/admin/api/2024-10/products.json`  
**Authentication:** `X-Shopify-Access-Token` header  
**Content-Type:** `application/json`

**JSON Structure:**

```json
{
  "product": {
    "title": "Tricorp Polo Premium",
    "body_html": "<p>Premium kwaliteit polo shirt...</p>",
    "vendor": "Tricorp",
    "product_type": "Polo's",
    "tags": ["Werkkleding", "Polo", "Tricorp"],
    "variants": [
      {
        "option1": "Navy",
        "option2": "S",
        "price": "34.95",
        "compare_at_price": "39.95",
        "sku": "PRO-POLO-001-NAV-S",
        "barcode": "8712345678901",
        "inventory_quantity": 50,
        "inventory_management": "shopify",
        "weight": 200,
        "weight_unit": "g"
      }
    ],
    "options": [
      {
        "name": "Kleur",
        "values": ["Navy", "Zwart", "Wit"]
      },
      {
        "name": "Maat",
        "values": ["S", "M", "L", "XL", "XXL"]
      }
    ],
    "images": [
      {
        "src": "https://cdn.vankruiningen.nl/products/polo-001-navy-front.jpg",
        "alt": "Tricorp Polo Premium Navy voorkant"
      }
    ],
    "status": "active"
  }
}
```

**Field Mapping:**

| PIM Field                          | Shopify Field      | Path                          | Transform                  |
| ---------------------------------- | ------------------ | ----------------------------- | -------------------------- |
| product_styles.style_name          | title              | product.title                 | -                          |
| product_styles.description_long_nl | body_html          | product.body_html             | HTML format                |
| brands.brand_name                  | vendor             | product.vendor                | -                          |
| categories.name                    | product_type       | product.product_type          | Primary category only      |
| Dynamic                            | tags               | product.tags                  | Array of strings           |
| color_name_nl                      | option1            | variants[].option1            | -                          |
| size_label                         | option2            | variants[].option2            | -                          |
| selling_price_excl_vat             | price              | variants[].price              | String format              |
| rrp_excl_vat                       | compare_at_price   | variants[].compare_at_price   | Optional                   |
| sku_code                           | sku                | variants[].sku                | -                          |
| ean                                | barcode            | variants[].barcode            | -                          |
| stock_available                    | inventory_quantity | variants[].inventory_quantity | -                          |
| fabric_weight                      | weight             | variants[].weight             | Grams                      |
| color_variant_media                | images             | product.images[]              | Array                      |
| is_published                       | status             | product.status                | Boolean → 'active'/'draft' |

---

## 4. Export Transformation Matrix

### Price Transformations

| Source Format   | Target System | Transformation   | Example        |
| --------------- | ------------- | ---------------- | -------------- |
| Cents (integer) | Gripp         | / 100            | 4495 → 44.95   |
| Cents (integer) | Calculated    | / 100            | 4495 → 44.95   |
| Cents (integer) | WooCommerce   | / 100            | 4495 → 44.95   |
| Cents (integer) | Shopify       | / 100 + toString | 4495 → "44.95" |

### Size Transformations

| PIM Size | Gripp    | Calculated | WooCommerce | Shopify  |
| -------- | -------- | ---------- | ----------- | -------- |
| XS       | XS       | XS         | XS          | XS       |
| 44       | 44       | XS         | XS (44)     | XS       |
| ONE-SIZE | ONE SIZE | ONE SIZE   | One Size    | One Size |

### Boolean Transformations

| PIM Value | Gripp (JSON) | CSV | Shopify  |
| --------- | ------------ | --- | -------- |
| TRUE      | true         | 1   | "active" |
| FALSE     | false        | 0   | "draft"  |

### Date/Time Transformations

| PIM Format  | Target System | Format         | Example              |
| ----------- | ------------- | -------------- | -------------------- |
| TIMESTAMPTZ | Gripp         | ISO 8601       | 2025-10-17T10:00:00Z |
| DATE        | Calculated    | ISO 8601 date  | 2025-10-17           |
| TIMESTAMPTZ | WooCommerce   | MySQL datetime | 2025-10-17 10:00:00  |

---

## 5. Export Validation Rules

### Pre-Export Checks

**Mandatory Fields per System:**

**Gripp:**

- ✓ productcode (sku_code)
- ✓ productomschrijving (generated)
- ✓ verkoopprijs (selling_price_excl_vat)
- ✓ btw_code (vat_rate mapped)

**Calculated:**

- ✓ artikelnummer (style_name used as identifier)
- ✓ omschrijving (style_name)
- ✓ kleuren (at least 1)
- ✓ maten (at least 1)
- ✓ prijs_per_stuk

**WooCommerce:**

- ✓ SKU
- ✓ Name
- ✓ Regular price

**Shopify:**

- ✓ title
- ✓ variants (at least 1)
- ✓ variants[].sku
- ✓ variants[].price

### Data Quality Checks

```typescript
// Check for complete data before export
const validateForExport = (sku: ProductSKU): boolean => {
  // Required fields present
  if (!sku.sku_code || !sku.selling_price_excl_vat) return false;

  // Parent data complete
  if (!sku.color_variant?.color_name_nl) return false;
  if (!sku.style?.style_name) return false;

  // Price logic valid
  if (sku.selling_price_excl_vat <= 0) return false;
  if (sku.cost_price_net && sku.selling_price_excl_vat < sku.cost_price_net) {
    console.warn(`Negative margin for SKU ${sku.sku_code}`);
  }

  // Status valid
  if (!sku.is_active || !sku.is_published) return false;
  if (sku.style.product_type !== 'KERN') return false;

  return true;
};
```

---

## 6. Export Scheduling

| System           | Frequency           | Method     | Trigger          |
| ---------------- | ------------------- | ---------- | ---------------- |
| Gripp - Products | Daily 06:00         | Full sync  | Cron job         |
| Gripp - Prices   | On change           | Delta sync | Database trigger |
| Gripp - Stock    | Hourly              | Delta sync | Cron job         |
| Calculated       | Weekly Monday 00:00 | Full sync  | Manual + Cron    |
| Calculated       | On-demand           | Full sync  | Manual button    |
| WooCommerce      | Daily 02:00         | Full sync  | Cron job         |
| Shopify          | On product change   | Delta sync | Webhook          |

---

## 7. Error Handling & Logging

**Export Job Structure:**

```typescript
interface ExportJob {
  job_id: number;
  export_type: 'gripp' | 'calculated' | 'woocommerce' | 'shopify';
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed' | 'partial';
  total_records: number;
  success_count: number;
  error_count: number;
  warnings_count: number;
  errors: ExportError[];
}

interface ExportError {
  record_id: string; // SKU code
  error_type: 'validation' | 'api_error' | 'timeout';
  error_message: string;
  field_name?: string;
}
```

**Logging Examples:**

```
[2025-10-17 10:00:00] Export Job #1234 started: Gripp Products
[2025-10-17 10:00:15] Processing 1,247 KERN products
[2025-10-17 10:01:20] Success: 1,245 products exported
[2025-10-17 10:01:20] Errors: 2 products failed
  - PRO-WB-001-NAV-48: Missing brand_id (validation)
  - PRO-SH-042-BLK-L: API rate limit exceeded (api_error)
[2025-10-17 10:01:20] Export Job #1234 completed with warnings
```

---

_Dit document wordt bijgewerkt bij nieuwe integraties of format wijzigingen._

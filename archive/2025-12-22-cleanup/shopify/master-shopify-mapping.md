# Master PIM → Shopify Product Variant Mapping

**Last Updated:** 2025-11-02  
**Purpose:** Concrete mapping strategie tussen Master PIM datamodel en Shopify Product Variant structuur  
**Status:** 🎯 **Design Approved - Ready for Implementation**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Conceptual Alignment](#conceptual-alignment)
3. [Option Layer Mapping](#option-layer-mapping)
4. [Database Schema Compatibility](#database-schema-compatibility)
5. [Field-Level Mapping](#field-level-mapping)
6. [Sync Strategy](#sync-strategy)
7. [Variant Generation Logic](#variant-generation-logic)
8. [Implementation Checklist](#implementation-checklist)

---

## Overview

Het Master PIM systeem is **nu al Shopify-compatible** door de bestaande 3-laagse productstructuur:

```
product_styles (style)
  └── color_variants (color + metadata)
        └── product_variants (color × size combinatie)
```

Deze structuur mapt **perfect** op Shopify's option-based variant model:

```
Shopify Product
  └── ProductOption[0]: "Color" (values: ["Navy", "Black", "White"])
        └── ProductOption[1]: "Size" (values: ["S", "M", "L", "XL"])
              └── ProductVariants[] (alle combinaties van Color × Size)
```

---

## Conceptual Alignment

### Master PIM Structure (Current)

| **Master Laag** | **Purpose** | **Shopify Equivalent** |
|---|---|---|
| `product_styles` | Base product model (bijv. "Tricorp Polo Premium") | `Shopify Product` |
| `color_variants` | Color variations per style | `Shopify ProductOption[0]` met `name: "Color"` |
| `international_sizes` | Standardized size system (XS-5XL, 44-64) | `Shopify ProductOption[1]` met `name: "Size"` |
| `product_variants` | Concrete sellable variant (color × size) | `Shopify ProductVariant` |

### Key Insight: **No Database Changes Needed!**

De huidige Master PIM structuur is **al** Shopify-compatible. We hoeven alleen:
1. De **sync logic** te implementeren die Master PIM data naar Shopify format transformeert
2. Metadata velden toe te voegen voor **Shopify sync tracking** (optioneel)

---

## Option Layer Mapping

### Option 1: Color (from `color_variants`)

**Shopify Structure:**
```graphql
{
  name: "Color",
  position: 1,
  optionValues: [
    { name: "Navy" },
    { name: "Black" },
    { name: "White" }
  ]
}
```

**Master PIM Data Source:**
```sql
SELECT DISTINCT color_name_nl AS color_value
FROM color_variants
WHERE product_style_id = :style_id
  AND is_active = TRUE
ORDER BY display_order, color_name_nl;
```

**Mapping Logic:**
- `color_variants.color_name_nl` → `OptionValue.name`
- Gebruik **Nederlandse naam** (color_name_nl) als primaire waarde
- Display order bepaalt volgorde in Shopify dropdown

**Example:**
```typescript
// Master PIM
color_variant {
  color_name_nl: "Donkerblauw",
  color_code: "NAVY",
  hex_code: "#000080"
}

// Shopify Option
{
  name: "Color",
  position: 1,
  optionValues: [{ name: "Donkerblauw" }]
}
```

---

### Option 2: Size (from `product_variants` + `international_sizes`)

**Shopify Structure:**
```graphql
{
  name: "Size",
  position: 2,
  optionValues: [
    { name: "S" },
    { name: "M" },
    { name: "L" },
    { name: "XL" }
  ]
}
```

**Master PIM Data Source:**
```sql
SELECT DISTINCT
  COALESCE(isize.size_label_nl, variant.supplier_size_code) AS size_value,
  COALESCE(isize.sort_order, variant.size_order, 999) AS sort_order
FROM product_variants variant
LEFT JOIN international_sizes isize ON variant.international_size_id = isize.id
WHERE variant.color_variant_id IN (
  SELECT id FROM color_variants WHERE product_style_id = :style_id
)
  AND variant.is_active = TRUE
ORDER BY sort_order;
```

**Mapping Logic:**
- **Preferred:** `international_sizes.size_label_nl` → `OptionValue.name`
- **Fallback:** `product_variants.supplier_size_code` → `OptionValue.name` (als international_size_id NULL)
- `international_sizes.sort_order` bepaalt volgorde in Shopify

**Example:**
```typescript
// Master PIM
product_variant {
  international_size_id: 5,
  supplier_size_code: "M",
  
  // Via JOIN met international_sizes:
  international_size: {
    size_label_nl: "M",
    size_code: "M",
    sort_order: 3
  }
}

// Shopify Option
{
  name: "Size",
  position: 2,
  optionValues: [{ name: "M" }]
}
```

---

## Database Schema Compatibility

### Current Master PIM Schema (Shopify-Ready!)

```sql
-- Product (Parent)
CREATE TABLE product_styles (
  id SERIAL PRIMARY KEY,
  style_code TEXT NOT NULL UNIQUE,        -- Maps to: Product.handle
  style_name TEXT NOT NULL,               -- Maps to: Product.title
  description TEXT,                       -- Maps to: Product.descriptionHtml
  brand_id INTEGER REFERENCES brands,     -- Maps to: Product.vendor
  supplier_id INTEGER REFERENCES suppliers,
  product_type TEXT CHECK (product_type IN ('KERN', 'RAND')),
  is_active BOOLEAN DEFAULT TRUE,
  -- Shopify sync metadata (OPTIONAL)
  shopify_product_id TEXT,                -- "gid://shopify/Product/123"
  last_synced_to_shopify TIMESTAMPTZ
);

-- Option 1: Color
CREATE TABLE color_variants (
  id SERIAL PRIMARY KEY,
  product_style_id INTEGER REFERENCES product_styles(id) ON DELETE CASCADE,
  color_code TEXT NOT NULL,               -- Internal code
  color_name_nl TEXT NOT NULL,            -- Maps to: OptionValue.name
  color_name_en TEXT,
  hex_code TEXT,
  display_order INTEGER,                  -- Determines option value order
  is_active BOOLEAN DEFAULT TRUE,
  -- Shopify sync metadata (OPTIONAL)
  shopify_option_value_id TEXT,           -- Track sync per color
  UNIQUE(product_style_id, color_code)
);

-- Media per color
CREATE TABLE color_variant_media (
  id SERIAL PRIMARY KEY,
  color_variant_id INTEGER REFERENCES color_variants(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,                -- Maps to: Variant.image.url
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- Option 2: Size (reference table)
CREATE TABLE international_sizes (
  id SERIAL PRIMARY KEY,
  clothing_type_id INTEGER REFERENCES clothing_types(id),
  size_code TEXT NOT NULL,                -- "M", "XL", "50"
  size_label_nl TEXT NOT NULL,            -- Maps to: OptionValue.name
  size_label_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,  -- Determines option value order
  is_active BOOLEAN DEFAULT TRUE
);

-- ProductVariant (concrete sellable product)
CREATE TABLE product_variants (
  id SERIAL PRIMARY KEY,
  color_variant_id INTEGER REFERENCES color_variants(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL UNIQUE,          -- Maps to: Variant.sku
  ean TEXT UNIQUE,                        -- Maps to: Variant.barcode
  
  -- Size info (maps to Option 2)
  international_size_id INTEGER REFERENCES international_sizes(id),
  supplier_size_code TEXT,                -- Fallback if no international_size
  size_order INTEGER DEFAULT 0,           -- Fallback sort order
  
  -- Pricing
  cost_price INTEGER,                     -- Cents
  selling_price_excl_vat INTEGER NOT NULL,-- Maps to: Variant.price (cents → euros)
  vat_rate NUMERIC(5,2) DEFAULT 21.00,
  
  -- Stock (optional - can sync from Gripp instead)
  stock_quantity INTEGER DEFAULT 0,       -- Maps to: Variant.inventoryQuantity
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_orderable BOOLEAN DEFAULT TRUE,
  
  -- Shopify sync metadata (OPTIONAL)
  shopify_variant_id TEXT,                -- "gid://shopify/ProductVariant/456"
  last_synced_to_shopify TIMESTAMPTZ
);
```

### Optional: Shopify Sync Metadata Columns

Als je sync status wilt tracken (NIET verplicht):

```sql
-- Track welke producten al in Shopify staan
ALTER TABLE product_styles 
  ADD COLUMN shopify_product_id TEXT,
  ADD COLUMN last_synced_to_shopify TIMESTAMPTZ;

-- Track welke variants al in Shopify staan
ALTER TABLE product_variants
  ADD COLUMN shopify_variant_id TEXT,
  ADD COLUMN last_synced_to_shopify TIMESTAMPTZ;

-- Optional: Track sync errors
CREATE TABLE shopify_sync_log (
  id SERIAL PRIMARY KEY,
  entity_type TEXT, -- 'product' | 'variant'
  entity_id INTEGER,
  sync_status TEXT, -- 'success' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Field-Level Mapping

### Product-Level Fields

| **Master PIM Field** | **Shopify Field** | **Transformation** |
|---|---|---|
| `product_styles.style_code` | `Product.handle` | Lowercase + slugify: `"MASTER-POL-001"` → `"master-pol-001"` |
| `product_styles.style_name` | `Product.title` | Direct copy |
| `product_styles.description` | `Product.descriptionHtml` | Markdown → HTML (optional) |
| `brands.brand_name` | `Product.vendor` | Direct copy via JOIN |
| `product_styles.product_type` | `Product.productType` | Map: `"KERN"` → `"Bedrijfskleding"` |
| `product_categories.category.name` | `Product.tags[]` | Array van categorienamen |

### Variant-Level Fields

| **Master PIM Field** | **Shopify Field** | **Transformation** |
|---|---|---|
| `product_variants.sku_code` | `ProductVariant.sku` | Direct copy: `"MASTER-100042"` |
| `product_variants.ean` | `ProductVariant.barcode` | Direct copy: `"8712345678901"` |
| `product_variants.selling_price_excl_vat` | `ProductVariant.price` | **Cents → Euros:** `2999` → `"29.99"` |
| `product_variants.cost_price` | `ProductVariant.compareAtPrice` | Cents → Euros (optional) |
| `product_variants.stock_quantity` | `ProductVariant.inventoryQuantity` | Direct copy (of sync van Gripp) |
| `color_variant_media.media_url` | `ProductVariant.image.url` | Use `is_primary = TRUE` image |
| `color_variants.color_name_nl` | `ProductVariant.option1` | Via ProductOption position 1 |
| `international_sizes.size_label_nl` | `ProductVariant.option2` | Via ProductOption position 2 |

---

## Sync Strategy

### Initial Bulk Sync (One-Time Setup)

**Goal:** Sync alle KERN producten naar Shopify

**Query:**
```sql
-- Haal alle actieve KERN product styles op
SELECT 
  ps.id AS style_id,
  ps.style_code,
  ps.style_name,
  ps.description,
  b.brand_name,
  -- Count variants to create
  COUNT(DISTINCT cv.id) AS color_count,
  COUNT(DISTINCT variant.id) AS variant_count
FROM product_styles ps
LEFT JOIN brands b ON ps.brand_id = b.id
LEFT JOIN color_variants cv ON cv.product_style_id = ps.id AND cv.is_active = TRUE
LEFT JOIN product_variants variant ON variant.color_variant_id = cv.id AND variant.is_active = TRUE
WHERE ps.product_type = 'KERN'
  AND ps.is_active = TRUE
GROUP BY ps.id, b.brand_name
HAVING COUNT(DISTINCT variant.id) > 0; -- Alleen producten met variants
```

**Process:**
1. Voor elk `product_style`:
   - Create Shopify Product met 2 options: Color, Size
   - Haal distinct `color_name_nl` values op → Create OptionValues voor Color
   - Haal distinct `size_label_nl` values op → Create OptionValues voor Size
   - Voor elk `product_variant`: Create Shopify ProductVariant

2. GraphQL Mutation Example:
```graphql
mutation createProduct($input: ProductCreateInput!) {
  productCreate(input: $input) {
    product {
      id
      handle
      title
      options {
        id
        name
        position
        optionValues {
          id
          name
        }
      }
      variants(first: 250) {
        edges {
          node {
            id
            sku
            barcode
            price
            inventoryQuantity
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

**Payload Construction (TypeScript):**
```typescript
interface ShopifyProductInput {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  handle: string;
  status: 'ACTIVE' | 'DRAFT';
  options: Array<{
    name: string;
    position: number;
    values: string[]; // e.g., ["Navy", "Black"] voor Color
  }>;
  variants: Array<{
    sku: string;
    barcode?: string;
    price: string; // Euro format: "29.99"
    inventoryQuantity?: number;
    optionValues: Array<{
      optionName: string;
      name: string; // e.g., { optionName: "Color", name: "Navy" }
    }>;
    imageSrc?: string;
  }>;
}

// Mapping logic
async function mapProductToShopify(styleId: number): Promise<ShopifyProductInput> {
  // 1. Fetch product style
  const style = await supabase
    .from('product_styles')
    .select('*, brand:brands(brand_name)')
    .eq('id', styleId)
    .single();

  // 2. Fetch all color variants
  const colors = await supabase
    .from('color_variants')
    .select('id, color_name_nl, display_order')
    .eq('product_style_id', styleId)
    .eq('is_active', true)
    .order('display_order');

  // 3. Fetch all variants with size info
  const variants = await supabase
    .from('product_variants')
    .select(`
      *,
      color_variant:color_variants(color_name_nl),
      international_size:international_sizes(size_label_nl, sort_order)
    `)
    .in('color_variant_id', colors.map(c => c.id))
    .eq('is_active', true);

  // 4. Extract unique sizes (ordered)
  const sizes = [...new Set(
    variants
      .map(v => ({
        label: v.international_size?.size_label_nl || v.supplier_size_code,
        order: v.international_size?.sort_order || v.size_order || 999
      }))
      .sort((a, b) => a.order - b.order)
      .map(v => v.label)
  )];

  // 5. Build Shopify product
  return {
    title: style.style_name,
    descriptionHtml: style.description || '',
    vendor: style.brand?.brand_name || '',
    productType: style.product_type === 'KERN' ? 'Bedrijfskleding' : 'Rand',
    handle: style.style_code.toLowerCase(),
    status: 'ACTIVE',
    
    // Option 1: Color
    options: [
      {
        name: 'Color',
        position: 1,
        values: colors.map(c => c.color_name_nl)
      },
      // Option 2: Size
      {
        name: 'Size',
        position: 2,
        values: sizes
      }
    ],
    
    // Variants (all Color × Size combinations)
    variants: variants.map(variant => ({
      sku: variant.sku_code,
      barcode: variant.ean || undefined,
      price: (variant.selling_price_excl_vat / 100).toFixed(2), // Cents → Euro
      inventoryQuantity: variant.stock_quantity,
      optionValues: [
        { optionName: 'Color', name: variant.color_variant.color_name_nl },
        { optionName: 'Size', name: variant.international_size?.size_label_nl || variant.supplier_size_code }
      ],
      imageSrc: await getPrimaryImage(variant.color_variant_id)
    }))
  };
}
```

---

### Incremental Sync (Daily Updates)

**Triggers for Sync:**
- New product created with `product_type = 'KERN'`
- Existing product updated (price change, stock change)
- Product activated/deactivated
- New color variant added
- New product variant added

**Implementation Options:**

**Option A: Scheduled Job (Recommended)**
```typescript
// Supabase Edge Function: sync-to-shopify (cron: daily at 3 AM)
async function syncModifiedProducts() {
  // Find products modified since last sync
  const modifiedProducts = await supabase
    .from('product_styles')
    .select('id')
    .eq('product_type', 'KERN')
    .or('last_synced_to_shopify.is.null,updated_at.gt.last_synced_to_shopify');

  for (const product of modifiedProducts) {
    await syncProductToShopify(product.id);
  }
}
```

**Option B: Real-Time Trigger (Advanced)**
```sql
-- Database trigger fires on product_styles UPDATE
CREATE OR REPLACE FUNCTION notify_shopify_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_type = 'KERN' AND NEW.is_active = TRUE THEN
    -- Add to sync queue
    INSERT INTO shopify_sync_queue (entity_type, entity_id)
    VALUES ('product', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_styles_shopify_sync
AFTER INSERT OR UPDATE ON product_styles
FOR EACH ROW EXECUTE FUNCTION notify_shopify_sync();
```

---

## Variant Generation Logic

### Automatic Variant Creation (Cartesian Product)

Shopify verwacht **alle mogelijke combinaties** van Option1 × Option2.

**Master PIM Query:**
```sql
-- Generate all expected combinations
WITH colors AS (
  SELECT color_name_nl, display_order
  FROM color_variants
  WHERE product_style_id = :style_id AND is_active = TRUE
),
sizes AS (
  SELECT DISTINCT 
    COALESCE(isize.size_label_nl, variant.supplier_size_code) AS size_label,
    COALESCE(isize.sort_order, variant.size_order, 999) AS sort_order
  FROM product_variants variant
  LEFT JOIN international_sizes isize ON variant.international_size_id = isize.id
  WHERE variant.color_variant_id IN (SELECT id FROM color_variants WHERE product_style_id = :style_id)
    AND variant.is_active = TRUE
)
SELECT 
  c.color_name_nl,
  s.size_label,
  -- Check if SKU exists
  sku.sku_code,
  sku.ean,
  sku.selling_price_excl_vat
FROM colors c
CROSS JOIN sizes s
LEFT JOIN color_variants cv ON cv.color_name_nl = c.color_name_nl
LEFT JOIN product_variants variant ON variant.color_variant_id = cv.id 
  AND (variant.international_size.size_label_nl = s.size_label 
       OR variant.supplier_size_code = s.size_label)
ORDER BY c.display_order, s.sort_order;
```

**Problem: Missing Combinations**

Als Master PIM niet alle kleur × maat combinaties heeft (bijvoorbeeld Navy beschikbaar in S/M/L maar niet XL), heeft Shopify een **incomplete product**.

**Solution 1: Only Sync Existing Variants** ✅ Recommended
- Sync alleen bestaande `product_variants` records
- Shopify krijgt incomplete matrix (acceptabel voor B2B)
- Voordeel: Geen dummy data, reality-based

**Solution 2: Generate Placeholder Variants**
- Create Shopify variants voor alle combinaties
- Ontbrekende variants krijgen `inventoryQuantity: 0` + `inventoryPolicy: DENY`
- Nadeel: Verwarrend voor klanten ("Waarom staat M wel en XL niet?")

---

## Implementation Checklist

### Phase 1: Database Preparation
- [ ] Add `shopify_product_id` column to `product_styles` (optional)
- [ ] Add `shopify_variant_id` column to `product_variants` (optional)
- [ ] Create `shopify_sync_log` table (optional)
- [ ] Index `product_type` column for fast KERN product queries

### Phase 2: Shopify API Integration
- [ ] Setup Shopify GraphQL client
- [ ] Implement `createProduct` mutation wrapper
- [ ] Implement `updateProduct` mutation wrapper
- [ ] Implement `createVariant` / `updateVariant` mutations
- [ ] Handle rate limiting (Shopify: 2 requests/sec)
- [ ] Error handling + retry logic

### Phase 3: Sync Logic Implementation
- [ ] Build `mapProductToShopify()` function
- [ ] Build `syncProductToShopify()` function
- [ ] Implement batch sync for initial load
- [ ] Implement incremental sync (daily cron job)
- [ ] Add sync status tracking (success/failure logs)

### Phase 4: Testing
- [ ] Test single product sync
- [ ] Test bulk sync (10 products)
- [ ] Test variant updates (price change, stock change)
- [ ] Test edge cases (product zonder SKUs, alleen 1 kleur, etc.)
- [ ] Verify Shopify option order (Color = option1, Size = option2)

### Phase 5: Monitoring & Maintenance
- [ ] Setup sync monitoring dashboard
- [ ] Alert on sync failures
- [ ] Weekly manual verification: Master PIM data === Shopify data
- [ ] Quarterly audit: check for orphaned Shopify products

---

## Summary

### ✅ What We Have (Perfect for Shopify!)

De huidige Master PIM structuur is **al Shopify-compatible**:
- ✅ 3-layer hierarchy (Style → Color → Variant)
- ✅ Option 1 (Color) via `color_variants`
- ✅ Option 2 (Size) via `international_sizes` + `product_variants`
- ✅ All required fields: Master-nummer, EAN (VERPLICHT), price, images

### 🎯 What We Need to Build

Alleen de **sync layer**:
- GraphQL mutations naar Shopify API
- Data transformation logic (Master PIM format → Shopify format)
- Cron job voor daily sync
- Error handling + logging

### 🚀 Next Steps

1. **Enable Shopify Integration in Lovable** (voeg Shopify secrets toe)
2. **Build Sync Edge Function** (`sync-to-shopify`)
3. **Initial Bulk Sync** (test met 5 producten)
4. **Setup Daily Cron Job** (3 AM sync)
5. **Monitor & Iterate** (fix edge cases as they appear)

---

**Conclusie:** Master PIM is **ready for Shopify** zonder database wijzigingen. We moeten alleen de sync logic implementeren! 🎉

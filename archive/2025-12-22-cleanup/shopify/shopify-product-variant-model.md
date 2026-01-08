# Shopify Product Variant Data Model

**Last Updated:** 2025-11-02  
**Purpose:** Documentatie van Shopify's product variant structuur als basis voor Master PIM → Shopify integratie

---

## 📊 Shopify's Product Hiërarchie

Shopify gebruikt een drie-laags model voor product variant beheer:

```
Product (parent)
├── ProductOption[] (e.g., "Color", "Size", "Material")
│   └── OptionValue[] (e.g., "Red", "Blue" | "S", "M", "L")
└── ProductVariant[] (unique combinations van option values)
```

### Voorbeeld: T-shirt met kleur en maat varianten

```graphql
Product {
  id: "gid://shopify/Product/123"
  title: "Classic T-Shirt"
  options: [
    {
      name: "Color"
      optionValues: [
        { name: "Black" },
        { name: "White" },
        { name: "Navy" }
      ]
    },
    {
      name: "Size"
      optionValues: [
        { name: "S" },
        { name: "M" },
        { name: "L" },
        { name: "XL" }
      ]
    }
  ]
  variants: [
    {
      id: "gid://shopify/ProductVariant/1001"
      title: "Black / S"
      selectedOptions: [
        { name: "Color", value: "Black" },
        { name: "Size", value: "S" }
      ]
      option1: "Black"    # Correspondeert met eerste option (Color)
      option2: "S"        # Correspondeert met tweede option (Size)
      option3: null       # Niet gebruikt
      price: "29.99"
      sku: "TSHIRT-BLK-S"
      inventoryQuantity: 50
    },
    {
      id: "gid://shopify/ProductVariant/1002"
      title: "Black / M"
      selectedOptions: [
        { name: "Color", value: "Black" },
        { name: "Size", value: "M" }
      ]
      option1: "Black"
      option2: "M"
      option3: null
      price: "29.99"
      sku: "TSHIRT-BLK-M"
      inventoryQuantity: 75
    }
    # ... tot maximaal 2048 variants per product
  ]
}
```

---

## 🔑 Core Concepten

### 1. Product (Parent Entity)

**Kenmerken:**
- **title**: Product naam (e.g., "Classic T-Shirt")
- **description**: Product omschrijving (HTML)
- **vendor**: Leverancier/merk naam
- **productType**: Productcategorie (e.g., "Apparel")
- **options[]**: Array van ProductOption objecten (max 3)
- **variants[]**: Array van ProductVariant objecten (max 2048 sinds 2025)
- **media[]**: Afbeeldingen, video's, 3D modellen
- **status**: ACTIVE | ARCHIVED | DRAFT

**GraphQL Fields:**
```graphql
product {
  id
  title
  handle              # URL-friendly slug (e.g., "classic-t-shirt")
  descriptionHtml
  vendor
  productType
  options { ... }
  variants { ... }
  media { ... }
  status
  createdAt
  updatedAt
}
```

---

### 2. ProductOption (Option Definitie)

**Kenmerken:**
- **name**: Optie naam (e.g., "Color", "Size", "Material")
- **position**: Volgorde (1, 2, of 3) - belangrijk voor `option1`, `option2`, `option3` mapping
- **optionValues[]**: Array van beschikbare waarden voor deze optie

**Constraints:**
- Maximaal **3 options** per product
- Elke option heeft unieke naam binnen product
- Position bepaalt mapping naar `option1`/`option2`/`option3` in variants

**Voorbeeld:**
```graphql
options: [
  {
    id: "gid://shopify/ProductOption/1"
    name: "Color"
    position: 1
    optionValues: [
      { id: "...", name: "Black" },
      { id: "...", name: "White" },
      { id: "...", name: "Navy" }
    ]
  },
  {
    id: "gid://shopify/ProductOption/2"
    name: "Size"
    position: 2
    optionValues: [
      { id: "...", name: "S" },
      { id: "...", name: "M" },
      { id: "...", name: "L" },
      { id: "...", name: "XL" }
    ]
  }
]
```

---

### 3. ProductVariant (Concrete Variant)

**Kenmerken:**
- **title**: Automatisch gegenereerd (e.g., "Black / M")
- **selectedOptions[]**: Array van gekozen option values voor deze variant
- **option1**, **option2**, **option3**: Directe referenties naar option values (deprecated maar nog steeds gebruikt)
- **price**: Verkoopprijs
- **compareAtPrice**: Oorspronkelijke prijs (voor kortingen)
- **sku**: Stock Keeping Unit code
- **barcode**: EAN/UPC code
- **inventoryQuantity**: Voorraad aantal
- **weight**: Gewicht (voor verzendkosten)
- **taxable**: Of BTW van toepassing is
- **requiresShipping**: Of verzending nodig is

**GraphQL Fields:**
```graphql
variant {
  id
  title
  displayName             # NEW in 2024: vervanger voor title
  selectedOptions {
    name
    value
  }
  option1                 # LEGACY: gebruik selectedOptions
  option2
  option3
  price
  compareAtPrice
  sku
  barcode
  inventoryQuantity
  inventoryItem {
    id
    tracked
  }
  weight
  weightUnit
  taxable
  requiresShipping
  availableForSale
  image {
    url
  }
}
```

---

## 🔄 Relaties en Mapping

### Option Position → Variant Fields

Shopify's `option1`, `option2`, `option3` velden in ProductVariant zijn **positie-gebaseerd**:

```
ProductOption (position: 1) → ProductVariant.option1
ProductOption (position: 2) → ProductVariant.option2
ProductOption (position: 3) → ProductVariant.option3
```

**Voorbeeld:**
```
Product Options:
  1. Color (position 1) → ["Black", "White", "Navy"]
  2. Size (position 2) → ["S", "M", "L", "XL"]

Variant: "Black / M"
  option1: "Black"    (= Color waarde)
  option2: "M"        (= Size waarde)
  option3: null       (niet gebruikt)
  
  selectedOptions: [
    { name: "Color", value: "Black" },
    { name: "Size", value: "M" }
  ]
```

### Nieuwe Product Model (2024+)

Shopify migreert naar `optionValues` i.p.v. `selectedOptions`:

```graphql
# OLD (deprecated maar nog steeds werkend)
variant {
  selectedOptions {
    name
    value
  }
}

# NEW (aanbevolen sinds 2024)
variant {
  optionValues {
    id
    name              # Value name (e.g., "Black")
    optionName        # Parent option name (e.g., "Color")
  }
}
```

---

## 📏 Limitaties en Constraints

### Product Limitaties
- **Max options per product:** 3
- **Max variants per product:** 2048 (verhoogd in 2025, was 100)
- **Max option values per option:** Geen harde limiet, maar praktisch max ~50

### Variant Limitaties
- **SKU:** Uniek binnen shop (niet verplicht)
- **Barcode:** Uniek binnen shop (niet verplicht)
- **Title/DisplayName:** Automatisch gegenereerd uit `option1 / option2 / option3`

### Best Practices
- **Option volgorde:** Belangrijkste variatie eerst (e.g., Color voor kleding)
- **Option namen:** Consistent gebruik (e.g., altijd "Color" i.p.v. "Colour" of "Kleur")
- **SKU pattern:** Gebruik consistente naming convention (e.g., `{PRODUCT}-{COLOR}-{SIZE}`)
- **Images:** Koppel variant-specifieke afbeeldingen aan relevante variants

---

## 🏗️ Database Schema (Conceptueel)

### Shopify's interne structuur (vereenvoudigd):

```sql
-- Product (parent)
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  description_html TEXT,
  vendor TEXT,
  product_type TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ProductOption (max 3 per product)
CREATE TABLE product_options (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,  -- 1, 2, or 3
  UNIQUE(product_id, position),
  UNIQUE(product_id, name)
);

-- OptionValue (values for each option)
CREATE TABLE option_values (
  id BIGSERIAL PRIMARY KEY,
  option_id BIGINT REFERENCES product_options(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(option_id, name)
);

-- ProductVariant (concrete combinations)
CREATE TABLE product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  title TEXT,  -- Auto-generated: "{option1} / {option2} / {option3}"
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  inventory_quantity INTEGER DEFAULT 0,
  weight_grams INTEGER,
  taxable BOOLEAN DEFAULT true,
  requires_shipping BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- VariantOptionValue (junction table - moderne benadering)
CREATE TABLE variant_option_values (
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
  option_value_id BIGINT REFERENCES option_values(id) ON DELETE CASCADE,
  PRIMARY KEY (variant_id, option_value_id)
);
```

---

## 🔗 Vergelijking: Shopify vs Master PIM

### Huidige Master Structuur:

```
product_styles (parent)
  ├── brand_id, style_code, style_name, description
  └── color_variants[]
        ├── color_code, color_name_nl, hex_code
        ├── color_family_id
        └── product_variants[]
              ├── sku_code (Master-nummer), ean (VERPLICHT), supplier_sku
              ├── international_size_id
              └── pricing, stock, etc.
```

### Mapping naar Shopify Model:

| **Master Concept** | **Shopify Equivalent** | **Notes** |
|---|---|---|
| `product_styles` | `Product` | Parent entity |
| `product_styles.style_code` | `Product.handle` (slug) | URL-friendly identifier |
| `product_styles.style_name` | `Product.title` | Display name |
| `product_styles.brand_id` | `Product.vendor` | Merk naam |
| `product_styles.description` | `Product.descriptionHtml` | Product beschrijving |
| `color_variants` | `ProductOption` (name: "Color") | 1e optie laag |
| `color_variants.color_name_nl` | `OptionValue.name` | Kleur waarde |
| `product_variants` | `ProductVariant` | Concrete variant |
| `product_variants.sku_code` | `ProductVariant.sku` | Master-nummer |
| `product_variants.ean` | `ProductVariant.barcode` | **EAN-13 code (VERPLICHT)** |
| `international_sizes` | `ProductOption` (name: "Size") | 2e optie laag |
| `international_sizes.size_label_nl` | `OptionValue.name` | Maat waarde |

### Voorbeeld Mapping:

**Master:**
```
product_style: "Polo Shirt Classic" (MASTER-POL-001)
  ├── color_variant: "Navy" (hex: #000080)
  │     ├── sku: MASTER-POL-001-NAVY-S (EAN: 8712345678901)
  │     ├── sku: MASTER-POL-001-NAVY-M (EAN: 8712345678902)
  │     └── sku: MASTER-POL-001-NAVY-L (EAN: 8712345678903)
  └── color_variant: "White" (hex: #FFFFFF)
        ├── sku: MASTER-POL-001-WHT-S (EAN: 8712345678904)
        ├── sku: MASTER-POL-001-WHT-M (EAN: 8712345678905)
        └── sku: MASTER-POL-001-WHT-L (EAN: 8712345678906)
```

**Shopify:**
```graphql
Product {
  title: "Polo Shirt Classic"
  handle: "polo-shirt-classic"
  vendor: "Van Kruiningen"
  options: [
    {
      name: "Color"
      position: 1
      optionValues: ["Navy", "White"]
    },
    {
      name: "Size"
      position: 2
      optionValues: ["S", "M", "L"]
    }
  ]
  variants: [
    { title: "Navy / S", option1: "Navy", option2: "S", sku: "MASTER-POL-001-NAVY-S", barcode: "8712345678901", price: "29.99" },
    { title: "Navy / M", option1: "Navy", option2: "M", sku: "MASTER-POL-001-NAVY-M", barcode: "8712345678902", price: "29.99" },
    { title: "Navy / L", option1: "Navy", option2: "L", sku: "MASTER-POL-001-NAVY-L", barcode: "8712345678903", price: "29.99" },
    { title: "White / S", option1: "White", option2: "S", sku: "MASTER-POL-001-WHT-S", barcode: "8712345678904", price: "29.99" },
    { title: "White / M", option1: "White", option2: "M", sku: "MASTER-POL-001-WHT-M", barcode: "8712345678905", price: "29.99" },
    { title: "White / L", option1: "White", option2: "L", sku: "MASTER-POL-001-WHT-L", barcode: "8712345678906", price: "29.99" }
  ]
}
```

---

## 💡 Belangrijke Inzichten

### 1. Option Position is Cruciaal
Shopify's `option1`/`option2`/`option3` mapping is gebaseerd op **position**, niet op naam. Bij sync moeten we:
- Consistent Color als position 1 gebruiken
- Consistent Size als position 2 gebruiken
- Position 3 mogelijk gebruiken voor Material/Fit (toekomstig)

### 2. Variant Title is Auto-Generated
Shopify genereert automatisch variant titles als `"{option1} / {option2} / {option3}"`. We kunnen dit niet overschrijven, maar wel via `displayName` (nieuw) aanpassen.

### 3. 2048 Variant Limiet
Sinds 2025 ondersteunt Shopify 2048 variants per product (was 100). Dit is ruim voldoende voor:
- 10 kleuren × 10 maten = 100 variants ✅
- 20 kleuren × 15 maten = 300 variants ✅
- 50 kleuren × 20 maten = 1000 variants ✅

### 4. SKU als Unieke Identifier
Shopify gebruikt SKU als **optionele** unique identifier. Voor Master is SKU (Master-nummer) **verplicht** en uniek. Bij sync:
- Master `sku_code` → Shopify `variant.sku`
- Master `ean` → Shopify `variant.barcode`

### 5. Inventory Management
Shopify heeft apart `InventoryItem` object voor voorraad tracking. Bij sync moet dit ook mee:
```graphql
variant {
  inventoryQuantity
  inventoryItem {
    tracked: true
    requiresShipping: true
  }
}
```

---

## 🚀 Aanbevelingen voor Master PIM

### Structurele Aanpassingen Overwegen:

1. **Product Options Layer Toevoegen:**
   - Nieuwe tabel: `product_options` (name, position)
   - Nieuwe tabel: `option_values` (option_id, value)
   - Links naar `color_variants` en `international_sizes`

2. **Variant Metadata Uitbreiden:**
   - Add `variant_title` (voor Shopify display)
   - Add `option1_value`, `option2_value`, `option3_value` (voor snelle lookup)
   - Add `shopify_variant_id` (voor sync tracking)

3. **Flexible Options Support:**
   - Huidige structuur is 2-optie (Color + Size)
   - Toekomst: mogelijk 3e optie (Material, Fit, Style)
   - Shopify-compatible design voorbereiden

4. **Sync Strategie:**
   - **1 product_style** = **1 Shopify Product**
   - **1 color_variant** × **N sizes** = **N Shopify ProductVariants**
   - **Option 1:** Color (van `color_variants`)
   - **Option 2:** Size (van `international_sizes`)
   - **Option 3:** (reserved voor toekomstig gebruik)

---

## 📚 Bronnen

- [Shopify GraphQL Admin API - Product](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product)
- [Shopify GraphQL Admin API - ProductVariant](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant)
- [Shopify Product Model Components](https://shopify.dev/docs/apps/build/graphql/migrate/new-product-model/product-model-components)
- [Shopify 2048 Variants Announcement](https://www.shopify.com/blog/2048-variants)
- [Migrate to New Product Model](https://shopify.dev/docs/apps/build/graphql/migrate/new-product-model)

---

**Next Steps:**
1. Review huidige Master data model constraints
2. Design nieuwe product_options structuur (backward compatible)
3. Build Shopify sync service met GraphQL mutations
4. Test met kleine dataset (10 products, 50 variants)
5. Implement bulk sync voor volledige catalogus

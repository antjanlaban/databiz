# Data Dictionary

**Last Updated:** 2 november 2025  
**Version:** 2.0 (Shopify-Compatible)

---

## Overview

Complete woordenboek van alle database tabellen, velden, types, betekenissen en relaties in het Van Kruiningen PIM-systeem.

**🎯 Shopify Integration:** Dit data model is ontworpen om direct te mappen naar Shopify's Product Variant structuur. Zie `docs/shopify/master-shopify-mapping.md` voor details.

---

## Table Reference

| Table Name                | Purpose                       | Record Type   | Parent Tables                                            |
| ------------------------- | ----------------------------- | ------------- | -------------------------------------------------------- |
| brands                    | Merken/labels                 | Reference     | -                                                        |
| suppliers                 | Leveranciers                  | Reference     | -                                                        |
| color_families            | Kleur categorieën             | Reference     | -                                                        |
| user_roles                | User authorization (RBAC)     | Authorization | auth.users                                               |
| user_invites              | User invite systeem           | Authorization | auth.users                                               |
| category_taxonomies       | Taxonomy types (ALG, GS1)     | Reference     | -                                                        |
| categories                | Hierarchische categorieën     | Reference     | category_taxonomies, categories (recursive)              |
| import_templates          | Herbruikbare import mappings  | Configuration | suppliers (optional)                                     |
| product_styles            | Product basis (grandparent)   | Core          | brands, suppliers                                        |
| color_variants            | Kleurvarianten (parent)       | Core          | product_styles, color_families                           |
| color_variant_media       | Media bestanden per kleur     | Asset         | color_variants                                           |
| product_variants          | Verkoopbare producten (child) | Core          | color_variants, international_sizes                      |
| product_categories        | Product-Category junction     | Junction      | product_styles, categories                               |
| price_history             | Prijswijzigingen audit        | Audit         | product_variants                                         |
| price_tiers               | Staffelprijzen                | Pricing       | product_variants                                         |
| decoration_methods        | Decoratie technieken          | Reference     | -                                                        |
| decoration_positions      | Decoratie locaties            | Reference     | -                                                        |
| decoration_options        | Product × Methode × Positie   | Config        | product_styles, decoration_methods, decoration_positions |
| external_product_mappings | Externe systeem koppelingen   | Integration   | polymorphic                                              |

---

## 1. Authorization Tables

### user_roles

**Purpose:** User role assignment voor RBAC (NIET op profiles table!)

| Column     | Type        | Nullable | Default | Description                          |
| ---------- | ----------- | -------- | ------- | ------------------------------------ |
| id         | UUID        | No       | auto    | Primary key                          |
| user_id    | UUID        | No       | -       | FK naar auth.users (CASCADE DELETE)  |
| role       | app_role    | No       | 'user'  | ENUM: 'admin', 'user'                |
| created_at | TIMESTAMPTZ | No       | NOW()   | Aanmaakdatum                         |
| updated_at | TIMESTAMPTZ | No       | NOW()   | Laatste wijziging                    |

**Constraints:**

- UNIQUE: user_id (1 role per user)
- CHECK: role IN ('admin', 'user')

**Indexes:**

- PRIMARY KEY: id
- UNIQUE: user_id
- INDEX: role

**Security Note:** CRITICAL - Separate table prevents privilege escalation attacks!

---

### user_invites

**Purpose:** User invite systeem (admin kan collega's uitnodigen)

| Column      | Type        | Nullable | Default                        | Description                           |
| ----------- | ----------- | -------- | ------------------------------ | ------------------------------------- |
| id          | UUID        | No       | auto                           | Primary key                           |
| email       | TEXT        | No       | -                              | Email adres (UNIQUE)                  |
| role        | app_role    | No       | 'user'                         | Toegewezen role                       |
| invited_by  | UUID        | Yes      | NULL                           | FK naar auth.users (wie nodigde uit?) |
| status      | TEXT        | No       | 'pending'                      | Status: pending, accepted, expired    |
| invite_token| UUID        | No       | auto                           | Unieke token voor invite link         |
| expires_at  | TIMESTAMPTZ | No       | NOW() + INTERVAL '7 days'      | Vervaldatum                           |
| created_at  | TIMESTAMPTZ | No       | NOW()                          | Aanmaakdatum                          |

**Constraints:**

- CHECK: status IN ('pending', 'accepted', 'expired')
- CHECK: role IN ('admin', 'user')

**Indexes:**

- PRIMARY KEY: id
- UNIQUE: email
- UNIQUE: invite_token
- INDEX: status, expires_at

---

## 2. Category Tables

### category_taxonomies

**Purpose:** Taxonomy types (ALG = eigen indeling, GS1 = standaard)

| Column      | Type        | Nullable | Default | Description                           |
| ----------- | ----------- | -------- | ------- | ------------------------------------- |
| id          | UUID        | No       | auto    | Primary key                           |
| code        | TEXT        | No       | -       | Code (UNIQUE): 'ALG', 'GS1'           |
| name        | TEXT        | No       | -       | Display naam                          |
| description | TEXT        | Yes      | NULL    | Beschrijving                          |
| is_required | BOOLEAN     | No       | FALSE   | Is verplicht? (ALG = true)            |
| is_active   | BOOLEAN     | No       | TRUE    | Is actief? (GS1 = false initially)    |
| sort_order  | INTEGER     | Yes      | NULL    | Display volgorde                      |
| created_at  | TIMESTAMPTZ | No       | NOW()   | Aanmaakdatum                          |

**Indexes:**

- PRIMARY KEY: id
- UNIQUE: code
- INDEX: is_active, sort_order

**Standard Data:**

```sql
INSERT INTO category_taxonomies (code, name, is_required, is_active) VALUES
('ALG', 'Algemeen (Eigen Indeling)', true, true),
('GS1', 'GS1 Global Product Classification', false, false);
```

---

### categories

**Purpose:** Hierarchische categorieën binnen taxonomies (recursive)

| Column             | Type        | Nullable | Default | Description                                    |
| ------------------ | ----------- | -------- | ------- | ---------------------------------------------- |
| id                 | UUID        | No       | auto    | Primary key                                    |
| taxonomy_id        | UUID        | No       | -       | FK naar category_taxonomies (CASCADE DELETE)   |
| name               | TEXT        | No       | -       | Category naam                                  |
| parent_category_id | UUID        | Yes      | NULL    | FK naar categories (NULL = top-level)          |
| full_path          | TEXT        | Yes      | NULL    | Auto-generated: "Werkschoen > Stalen neus"     |
| level              | INTEGER     | Yes      | NULL    | Diepte in hiërarchie (1, 2, 3, ...)            |
| sort_order         | INTEGER     | Yes      | NULL    | Display volgorde binnen parent                 |
| is_active          | BOOLEAN     | No       | TRUE    | Actief                                         |
| created_at         | TIMESTAMPTZ | No       | NOW()   | Aanmaakdatum                                   |
| updated_at         | TIMESTAMPTZ | No       | NOW()   | Laatste wijziging                              |

**Constraints:**

- UNIQUE: (taxonomy_id, parent_category_id, name) - Geen duplicaten binnen parent

**Indexes:**

- PRIMARY KEY: id
- FK INDEX: taxonomy_id, parent_category_id
- INDEX: level, is_active
- INDEX: full_path (for search)

**Recursive Relationship:** Self-referencing voor onbeperkte diepte

**Example Data:**

```sql
-- Top-level ALG categories
INSERT INTO categories (taxonomy_id, name, level) VALUES
((SELECT id FROM category_taxonomies WHERE code = 'ALG'), 'Werkschoen', 1),
((SELECT id FROM category_taxonomies WHERE code = 'ALG'), 'Kleding', 1);

-- Sub-categories
INSERT INTO categories (taxonomy_id, parent_category_id, name, level) VALUES
(..., (SELECT id FROM categories WHERE name = 'Werkschoen'), 'Lage schoen', 2),
(..., (SELECT id FROM categories WHERE name = 'Werkschoen'), 'Hoge schoen', 2);
```

---

### product_categories

**Purpose:** Junction table - koppelt styles aan categorieën (M:N)

| Column           | Type        | Nullable | Default | Description                               |
| ---------------- | ----------- | -------- | ------- | ----------------------------------------- |
| id               | UUID        | No       | auto    | Primary key                               |
| product_style_id | INTEGER     | No       | -       | FK naar product_styles (CASCADE DELETE)   |
| category_id      | UUID        | No       | -       | FK naar categories (CASCADE DELETE)       |
| is_primary       | BOOLEAN     | No       | FALSE   | Is primaire categorie?                    |
| created_at       | TIMESTAMPTZ | No       | NOW()   | Aanmaakdatum                              |

**Constraints:**

- UNIQUE: (product_style_id, category_id) - Geen duplicaten

**Indexes:**

- PRIMARY KEY: id
- UNIQUE COMPOSITE: (product_style_id, category_id)
- FK INDEX: product_style_id, category_id
- INDEX: is_primary

**Business Rule:** Elke product_style moet EXACT 1 ALG categorie hebben!

---

## 3. Import Configuration Tables

### import_templates

**Purpose:** Herbruikbare import mappings per supplier (template-driven imports)

| Column           | Type        | Nullable | Default | Description                                      |
| ---------------- | ----------- | -------- | ------- | ------------------------------------------------ |
| id               | UUID        | No       | auto    | Primary key                                      |
| supplier_id      | INTEGER     | Yes      | NULL    | FK naar suppliers (optioneel - kan shared zijn)  |
| template_name    | TEXT        | No       | -       | Template naam (bijv. "Tricorp Standard")         |
| description      | TEXT        | Yes      | NULL    | Beschrijving                                     |
| column_mappings  | JSONB       | No       | -       | Source → target field mappings                   |
| category_mappings| JSONB       | Yes      | NULL    | Source value → category mappings                 |
| created_at       | TIMESTAMPTZ | No       | NOW()   | Aanmaakdatum                                     |
| updated_at       | TIMESTAMPTZ | No       | NOW()   | Laatste wijziging                                |
| last_used_at     | TIMESTAMPTZ | Yes      | NULL    | Laatste gebruik timestamp                        |
| import_count     | INTEGER     | No       | 0       | Aantal keer gebruikt                             |

**JSONB Structure:**

```json
{
  "column_mappings": [
    {
      "source_column": "Artikelnummer",
      "target_field": "sku_code",
      "transformation": ["uppercase", "trim"]
    }
  ],
  "category_mappings": [
    {
      "source_value": "Veiligheidsschoen laag",
      "target_category_id": "uuid",
      "taxonomy_code": "ALG"
    }
  ]
}
```

**Indexes:**

- PRIMARY KEY: id
- FK INDEX: supplier_id
- INDEX: last_used_at (voor "recent gebruikt" lijst)

**Use Case:** Supplier X uploads monthly → template auto-applies → 90% sneller!

---

## 4. Reference Tables

### brands

**Purpose:** Master tabel voor kledingmerken (Tricorp, Snickers, Mascot, etc.)

| Column         | Type         | Nullable | Default | Description              |
| -------------- | ------------ | -------- | ------- | ------------------------ |
| brand_id       | SERIAL       | No       | auto    | Primary key              |
| brand_name     | VARCHAR(100) | No       | -       | Merknaam (UNIQUE)        |
| brand_logo_url | TEXT         | Yes      | NULL    | URL naar logo afbeelding |
| is_active      | BOOLEAN      | No       | TRUE    | Actief in systeem        |
| created_at     | TIMESTAMPTZ  | No       | NOW()   | Aanmaakdatum             |

**Indexes:**

- PRIMARY KEY: brand_id
- UNIQUE: brand_name
- INDEX: is_active

**Example Data:**

```sql
INSERT INTO brands (brand_name) VALUES
('Tricorp'), ('Snickers'), ('Mascot'), ('Santino');
```

---

### suppliers

**Purpose:** Master tabel voor leveranciers/fabrikanten

| Column        | Type         | Nullable | Default | Description           |
| ------------- | ------------ | -------- | ------- | --------------------- |
| supplier_id   | SERIAL       | No       | auto    | Primary key           |
| supplier_name | VARCHAR(200) | No       | -       | Naam leverancier      |
| supplier_code | VARCHAR(50)  | Yes      | NULL    | Interne code (UNIQUE) |
| contact_email | VARCHAR(200) | Yes      | NULL    | Email contactpersoon  |
| contact_phone | VARCHAR(50)  | Yes      | NULL    | Telefoonnummer        |
| address       | TEXT         | Yes      | NULL    | Adres                 |
| country       | VARCHAR(50)  | Yes      | NULL    | Land                  |
| is_active     | BOOLEAN      | No       | TRUE    | Actief                |
| created_at    | TIMESTAMPTZ  | No       | NOW()   | Aanmaakdatum          |

**Indexes:**

- PRIMARY KEY: supplier_id
- UNIQUE: supplier_code
- INDEX: is_active

---

### color_families

**Purpose:** Gestandaardiseerde kleur categorieën (top-level kleur model)

| Column          | Type        | Nullable | Default | Description               |
| --------------- | ----------- | -------- | ------- | ------------------------- |
| color_family_id | SERIAL      | No       | auto    | Primary key               |
| family_name_nl  | VARCHAR(50) | No       | -       | Nederlandse naam (UNIQUE) |
| family_name_en  | VARCHAR(50) | Yes      | NULL    | Engelse naam              |
| hex_color       | VARCHAR(7)  | Yes      | NULL    | Hex color code (#RRGGBB)  |
| sort_order      | INTEGER     | Yes      | NULL    | Display volgorde          |
| is_active       | BOOLEAN     | No       | TRUE    | Actief                    |
| created_at      | TIMESTAMPTZ | No       | NOW()   | Aanmaakdatum              |

**Indexes:**

- PRIMARY KEY: color_family_id
- UNIQUE: family_name_nl
- INDEX: sort_order

**Standard Values:** Zwart, Wit, Grijs, Blauw, Navy, Rood, Groen, Geel, Oranje, Bruin, Beige, Roze, Paars, Multicolor

---

## 5. Core Product Tables

### product_styles

**Purpose:** Grandparent niveau - basis productmodel/design (bijv. "Tricorp Polo Premium")

**🔗 Shopify Equivalent:** `Shopify Product` (parent entity)
- `style_code` → `Product.handle` (URL-friendly identifier)
- `style_name` → `Product.title` (display name)
- `description` → `Product.descriptionHtml`
- `brand.brand_name` → `Product.vendor`

| Column                  | Type         | Nullable | Default | Description                                                |
| ----------------------- | ------------ | -------- | ------- | ---------------------------------------------------------- |
| style_id                | SERIAL       | No       | auto    | Primary key                                                |
| style_code              | TEXT         | No       | -       | URL-friendly identifier (UNIQUE)                           |
| style_name              | TEXT         | No       | -       | Product naam                                               |
| brand_id                | INTEGER      | Yes      | NULL    | FK naar brands                                             |
| supplier_id             | INTEGER      | Yes      | NULL    | FK naar suppliers                                          |
| supplier_article_code   | VARCHAR(100) | Yes      | NULL    | Originele artikel code van leverancier                     |
| product_type            | TEXT         | No       | -       | KERN of RAND classificatie                                 |
| description             | TEXT         | Yes      | NULL    | Product beschrijving                                       |
| material_composition    | TEXT         | Yes      | NULL    | Materiaalsamenstelling                                     |
| care_instructions       | TEXT         | Yes      | NULL    | Onderhoudsinstructies                                      |
| gender                  | TEXT         | Yes      | NULL    | Geslacht: Unisex, Heren, Dames, Kinderen                   |
| weight_grams            | INTEGER      | Yes      | NULL    | Gewicht in grammen                                         |
| normering               | TEXT         | Yes      | NULL    | Shopify metafield: normering/certificering                 |
| branche                 | TEXT[]       | Yes      | NULL    | Shopify metafield: branches array                          |
| is_active               | BOOLEAN      | No       | TRUE    | Actief in systeem                                          |
| created_at              | TIMESTAMPTZ  | No       | NOW()   | Aanmaakdatum                                               |
| updated_at              | TIMESTAMPTZ  | No       | NOW()   | Laatste wijziging                                          |

**Constraints:**

- CHECK: product_type IN ('KERN', 'RAND')
- CHECK: gender IN ('Unisex', 'Heren', 'Dames', 'Kinderen')

**Indexes:**

- PRIMARY KEY: style_id
- UNIQUE: (style_name, brand_id) - voorkomt duplicate producten per merk
- FK INDEX: brand_id, supplier_id
- INDEX: product_type, is_active

**Relationships:**

- belongs_to: brands (brand_id)
- belongs_to: suppliers (supplier_id)
- has_many: color_variants
- has_many: decoration_options
- has_many: product_categories (junction)
- has_many: categories (through product_categories)

---

### color_variants

**Purpose:** Parent niveau - kleurvarianten van een style (bijv. "Tricorp Polo Premium - Navy")

**🔗 Shopify Equivalent:** `Shopify ProductOption[0]` (Option 1: "Color")
- **Option Name:** Fixed as `"Color"` in Shopify
- **Option Values:** `color_name_nl` → `OptionValue.name`
- **Value Examples:** "Navy", "Zwart", "Wit", "Donkerblauw"
- **Sort Order:** `display_order` determines option value order in Shopify dropdown

| Column                 | Type         | Nullable | Default | Description                             |
| ---------------------- | ------------ | -------- | ------- | --------------------------------------- |
| color_variant_id       | SERIAL       | No       | auto    | Primary key                             |
| style_id               | INTEGER      | No       | -       | FK naar product_styles (CASCADE DELETE) |
| color_code             | VARCHAR(50)  | No       | -       | Kleurcode (UNIQUE per style)            |
| color_family_id        | INTEGER      | No       | -       | FK naar color_families (primaire kleur) |
| color_name_nl          | VARCHAR(100) | No       | -       | Nederlandse kleurnaam                   |
| color_name_en          | VARCHAR(100) | Yes      | NULL    | Engelse kleurnaam                       |
| color_name_supplier    | VARCHAR(100) | Yes      | NULL    | Originele leveranciers naam             |
| accent_color_family_id | INTEGER      | Yes      | NULL    | FK naar color_families (accent kleur)   |
| accent_color_name_nl   | VARCHAR(100) | Yes      | NULL    | Accent kleur naam                       |
| hex_color              | VARCHAR(7)   | Yes      | NULL    | Hex color code                          |
| pantone_code           | VARCHAR(20)  | Yes      | NULL    | Pantone kleur code                      |
| color_pattern          | VARCHAR(50)  | Yes      | NULL    | Patroon (solid, striped, checked)       |
| is_multicolor          | BOOLEAN      | No       | FALSE   | Meer dan 2 kleuren                      |
| display_order          | INTEGER      | Yes      | NULL    | Display volgorde                        |
| is_active              | BOOLEAN      | No       | TRUE    | Actief                                  |
| created_at             | TIMESTAMPTZ  | No       | NOW()   | Aanmaakdatum                            |
| updated_at             | TIMESTAMPTZ  | No       | NOW()   | Laatste wijziging                       |

**Constraints:**

- UNIQUE: (style_id, color_code)

**Indexes:**

- PRIMARY KEY: color_variant_id
- UNIQUE COMPOSITE: (style_id, color_code)
- FK INDEX: style_id, color_family_id, accent_color_family_id
- INDEX: is_active

**Relationships:**

- belongs_to: product_styles (style_id)
- belongs_to: color_families (color_family_id) - primary color
- belongs_to: color_families (accent_color_family_id) - accent color
- has_many: product_variants

---

### product_variants

**Purpose:** Child niveau - verkoopbare producten (kleur + maat combinatie)

**⚠️ KRITIEK: EAN is VERPLICHT** - EAN-13 is het primaire identificatieveld voor productvarianten en externe integraties.

**🔗 Shopify Equivalent:** `Shopify ProductVariant` (concrete sellable item)
- `sku_code` → `ProductVariant.sku` (Master-nummer zoals "MASTER-100042")
- `ean` → `ProductVariant.barcode` (**EAN-13 code - VERPLICHT**)
- `selling_price_excl_vat` → `ProductVariant.price` (cents → euros: 2999 → "29.99")
- `color_variant.color_name_nl` → `ProductVariant.option1` (Color value)
- `international_size.size_label_nl` → `ProductVariant.option2` (Size value)
- `stock_quantity` → `ProductVariant.inventoryQuantity`

**Size Option (ProductOption[1]):**
- **Option Name:** Fixed as `"Size"` in Shopify
- **Option Values:** Derived from `international_sizes.size_label_nl` (via `international_size_id` JOIN)
- **Fallback:** If `international_size_id` is NULL, use `supplier_size_code`
- **Sort Order:** `international_sizes.sort_order` determines Shopify dropdown order

| Column              | Type         | Nullable | Default | Description                             |
| ------------------- | ------------ | -------- | ------- | --------------------------------------- |
| id                  | SERIAL       | No       | auto    | Primary key                             |
| color_variant_id    | INTEGER      | No       | -       | FK naar color_variants (CASCADE DELETE) |
| ean                 | VARCHAR(13)  | No       | -       | **EAN-13 barcode (UNIQUE) - VERPLICHT** |
| sku_code            | VARCHAR(100) | No       | -       | Master-code (UNIQUE, auto-generated)    |
| supplier_size_code  | VARCHAR(20)  | No       | -       | Maat code van leverancier               |
| size_order          | INTEGER      | No       | 0       | Sorteervolgorde                         |
| international_size_id | INTEGER    | Yes      | NULL    | FK naar international_sizes             |
| supplier_sku        | VARCHAR(100) | Yes      | NULL    | Leveranciers SKU                        |
| supplier_article_nr | VARCHAR(100) | Yes      | NULL    | Leveranciers artikelnummer              |

**Price Fields:**

| Column                   | Type          | Nullable | Default | Description                                |
| ------------------------ | ------------- | -------- | ------- | ------------------------------------------ |
| cost_price               | NUMERIC(10,2) | Yes      | NULL    | Inkoopprijs                                |
| cost_price_currency      | VARCHAR(3)    | No       | 'EUR'   | Valuta                                     |
| purchase_discount_perc   | NUMERIC(5,2)  | No       | 0       | Inkoopkorting %                            |
| purchase_discount_amount | NUMERIC(10,2) | No       | 0       | Inkoopkorting bedrag                       |
| cost_price_net           | NUMERIC(10,2) | COMPUTED | -       | Netto inkoopprijs (GENERATED)              |
| rrp_excl_vat             | NUMERIC(10,2) | Yes      | NULL    | Recommended Retail Price                   |
| selling_price_excl_vat   | NUMERIC(10,2) | No       | -       | Standaard verkoopprijs excl. BTW           |
| vat_rate                 | NUMERIC(5,2)  | No       | 21.00   | BTW percentage                             |
| selling_price_incl_vat   | NUMERIC(10,2) | COMPUTED | -       | Verkoopprijs incl. BTW (GENERATED)         |
| sales_discount_perc      | NUMERIC(5,2)  | No       | 0       | Actiekorting %                             |
| sales_discount_amount    | NUMERIC(10,2) | No       | 0       | Actiekorting bedrag                        |
| discount_valid_from      | DATE          | Yes      | NULL    | Korting geldig vanaf                       |
| discount_valid_until     | DATE          | Yes      | NULL    | Korting geldig tot                         |
| final_price_excl_vat     | NUMERIC(10,2) | COMPUTED | -       | Uiteindelijke prijs na korting (GENERATED) |
| margin_amount            | NUMERIC(10,2) | COMPUTED | -       | Marge in euros (GENERATED)                 |
| margin_percentage        | NUMERIC(5,2)  | COMPUTED | -       | Marge in % (GENERATED)                     |

**Stock Fields:**

| Column          | Type    | Nullable | Default | Description                      |
| --------------- | ------- | -------- | ------- | -------------------------------- |
| stock_quantity  | INTEGER | No       | 0       | Fysieke voorraad                 |
| stock_reserved  | INTEGER | No       | 0       | Gereserveerde voorraad           |
| stock_available | INTEGER | COMPUTED | -       | Beschikbare voorraad (GENERATED) |

**Additional Fields:**

| Column              | Type        | Nullable | Default | Description                        |
| ------------------- | ----------- | -------- | ------- | ---------------------------------- |
| has_tiered_pricing  | BOOLEAN     | No       | FALSE   | Staffelprijzen actief              |
| price_last_updated  | TIMESTAMPTZ | Yes      | NULL    | Laatste prijswijziging             |
| price_update_source | VARCHAR(50) | Yes      | NULL    | Bron prijswijziging                |
| is_active           | BOOLEAN     | No       | TRUE    | Actief                             |
| is_orderable        | BOOLEAN     | No       | TRUE    | Bestelbaar                         |
| is_published        | BOOLEAN     | No       | FALSE   | Gepubliceerd naar externe systemen |
| created_at          | TIMESTAMPTZ | No       | NOW()   | Aanmaakdatum                       |
| updated_at          | TIMESTAMPTZ | No       | NOW()   | Laatste wijziging                  |

**Generated Columns:**

```sql
cost_price_net = cost_price - purchase_discount_amount
final_price_excl_vat = selling_price_excl_vat - sales_discount_amount
selling_price_incl_vat = selling_price_excl_vat * (1 + vat_rate/100)
margin_amount = selling_price_excl_vat - cost_price_net
margin_percentage = ((selling_price_excl_vat - cost_price_net) / cost_price_net) * 100
stock_available = stock_quantity - stock_reserved
```

**Constraints:**

- CHECK: stock_quantity >= 0
- CHECK: stock_reserved >= 0
- CHECK: selling_price_excl_vat >= 0

**Indexes:**

- PRIMARY KEY: sku_id
- UNIQUE: ean
- UNIQUE: sku_code
- FK INDEX: color_variant_id, style_id
- INDEX: supplier_sku, is_active, is_published, selling_price_excl_vat

**Relationships:**

- belongs_to: color_variants (color_variant_id)
- belongs_to: product_styles (style_id)
- has_many: price_history
- has_many: price_tiers

---

## 6. Media Tables

### color_variant_media

**Purpose:** Afbeeldingen, video's per kleurvariant

| Column           | Type         | Nullable | Default | Description                             |
| ---------------- | ------------ | -------- | ------- | --------------------------------------- |
| media_id         | SERIAL       | No       | auto    | Primary key                             |
| color_variant_id | INTEGER      | No       | -       | FK naar color_variants (CASCADE DELETE) |
| file_name        | VARCHAR(255) | No       | -       | Bestandsnaam                            |
| file_path        | VARCHAR(500) | Yes      | NULL    | Relatief pad                            |
| file_url         | TEXT         | Yes      | NULL    | Volledige URL (CDN)                     |
| file_size        | INTEGER      | Yes      | NULL    | Bestandsgrootte in bytes                |
| media_type       | VARCHAR(20)  | No       | 'image' | Type: image, video, 360, pdf            |
| mime_type        | VARCHAR(100) | Yes      | NULL    | MIME type                               |
| width            | INTEGER      | Yes      | NULL    | Breedte in pixels                       |
| height           | INTEGER      | Yes      | NULL    | Hoogte in pixels                        |
| view_type        | VARCHAR(50)  | Yes      | NULL    | Aanzicht: front, back, side, detail     |
| is_primary       | BOOLEAN      | No       | FALSE   | Primaire afbeelding                     |
| display_order    | INTEGER      | No       | 0       | Sorteervolgorde                         |
| alt_text_nl      | VARCHAR(255) | Yes      | NULL    | Alt text voor SEO/accessibility         |
| is_active        | BOOLEAN      | No       | TRUE    | Actief                                  |
| created_at       | TIMESTAMPTZ  | No       | NOW()   | Aanmaakdatum                            |
| updated_at       | TIMESTAMPTZ  | No       | NOW()   | Laatste wijziging                       |

**Constraints:**

- CHECK: media_type IN ('image', 'video', '360', 'pdf')

**Indexes:**

- PRIMARY KEY: media_id
- FK INDEX: color_variant_id
- INDEX: is_primary, display_order

---

## 7. Pricing Tables

### price_history

**Purpose:** Audit trail van alle prijswijzigingen

| Column            | Type          | Nullable | Default | Description                                                                   |
| ----------------- | ------------- | -------- | ------- | ----------------------------------------------------------------------------- |
| price_history_id  | SERIAL        | No       | auto    | Primary key                                                                   |
| variant_id            | INTEGER       | No       | -       | FK naar product_variants (CASCADE DELETE)                                         |
| price_type        | VARCHAR(30)   | No       | -       | Type prijs: cost_price, selling_price, rrp, purchase_discount, sales_discount |
| old_value         | NUMERIC(10,2) | Yes      | NULL    | Oude waarde                                                                   |
| new_value         | NUMERIC(10,2) | No       | -       | Nieuwe waarde                                                                 |
| change_amount     | NUMERIC(10,2) | COMPUTED | -       | Verschil (GENERATED)                                                          |
| change_percentage | NUMERIC(5,2)  | COMPUTED | -       | Verschil % (GENERATED)                                                        |
| valid_from        | DATE          | No       | -       | Geldig vanaf                                                                  |
| valid_until       | DATE          | Yes      | NULL    | Geldig tot                                                                    |
| change_reason     | VARCHAR(200)  | Yes      | NULL    | Reden wijziging                                                               |
| change_source     | VARCHAR(30)   | No       | -       | Bron: supplier_import, manual, bulk_update, automatic, promotion              |
| import_batch_id   | INTEGER       | Yes      | NULL    | Import batch referentie                                                       |
| created_at        | TIMESTAMPTZ   | No       | NOW()   | Wijzigingsdatum                                                               |
| created_by        | INTEGER       | Yes      | NULL    | User ID die wijziging deed                                                    |

**Constraints:**

- CHECK: price_type IN ('cost_price', 'selling_price', 'rrp', 'purchase_discount', 'sales_discount')
- CHECK: change_source IN ('supplier_import', 'manual', 'bulk_update', 'automatic', 'promotion')

**Generated Columns:**

```sql
change_amount = new_value - old_value
change_percentage = ((new_value - old_value) / old_value) * 100
```

**Indexes:**

- PRIMARY KEY: price_history_id
- FK INDEX: sku_id
- INDEX: price_type, valid_from, change_source, created_at

---

### price_tiers

**Purpose:** Staffelprijzen (volume discounts)

| Column              | Type          | Nullable | Default | Description                           |
| ------------------- | ------------- | -------- | ------- | ------------------------------------- |
| price_tier_id       | SERIAL        | No       | auto    | Primary key                           |
| variant_id              | INTEGER       | No       | -       | FK naar product_variants (CASCADE DELETE) |
| tier_name           | VARCHAR(100)  | Yes      | NULL    | Staffel naam (bijv. "Groothandel")    |
| min_quantity        | INTEGER       | No       | -       | Minimum aantal                        |
| max_quantity        | INTEGER       | Yes      | NULL    | Maximum aantal (NULL = onbeperkt)     |
| tier_price_excl_vat | NUMERIC(10,2) | No       | -       | Prijs voor deze staffel               |
| tier_discount_perc  | NUMERIC(5,2)  | Yes      | NULL    | Korting % t.o.v. standaardprijs       |
| customer_group_id   | INTEGER       | Yes      | NULL    | Specifieke klantgroep                 |
| valid_from          | DATE          | Yes      | NULL    | Geldig vanaf                          |
| valid_until         | DATE          | Yes      | NULL    | Geldig tot                            |
| display_order       | INTEGER       | Yes      | NULL    | Sorteervolgorde                       |
| is_active           | BOOLEAN       | No       | TRUE    | Actief                                |
| created_at          | TIMESTAMPTZ   | No       | NOW()   | Aanmaakdatum                          |
| updated_at          | TIMESTAMPTZ   | No       | NOW()   | Laatste wijziging                     |

**Constraints:**

- CHECK: min_quantity >= 1
- CHECK: max_quantity IS NULL OR max_quantity > min_quantity
- CHECK: tier_price_excl_vat > 0

**Indexes:**

- PRIMARY KEY: price_tier_id
- FK INDEX: sku_id
- INDEX: (min_quantity, max_quantity), is_active

---

## 8. Decoration Tables

### decoration_methods

**Purpose:** Beschikbare decoratie technieken

| Column               | Type         | Nullable | Default | Description                                 |
| -------------------- | ------------ | -------- | ------- | ------------------------------------------- |
| decoration_method_id | SERIAL       | No       | auto    | Primary key                                 |
| method_code          | VARCHAR(50)  | No       | -       | Code (UNIQUE)                               |
| method_name_nl       | VARCHAR(100) | No       | -       | Nederlandse naam                            |
| method_type          | VARCHAR(20)  | No       | -       | Type: printing, embroidery, transfer, laser |
| description_nl       | TEXT         | Yes      | NULL    | Beschrijving techniek                       |
| is_active            | BOOLEAN      | No       | TRUE    | Actief                                      |
| created_at           | TIMESTAMPTZ  | No       | NOW()   | Aanmaakdatum                                |

**Constraints:**

- CHECK: method_type IN ('printing', 'embroidery', 'transfer', 'laser')

**Standard Values:** PRINT-SCREEN (Zeefdruk), PRINT-TRANSFER, PRINT-DTF, EMBROIDERY (Borduren), LASER

---

### decoration_positions

**Purpose:** Waar decoratie aangebracht kan worden

| Column            | Type         | Nullable | Default | Description        |
| ----------------- | ------------ | -------- | ------- | ------------------ |
| position_id       | SERIAL       | No       | auto    | Primary key        |
| position_code     | VARCHAR(50)  | No       | -       | Code (UNIQUE)      |
| position_name_nl  | VARCHAR(100) | No       | -       | Nederlandse naam   |
| position_area_mm2 | INTEGER      | Yes      | NULL    | Oppervlakte in mm² |
| is_active         | BOOLEAN      | No       | TRUE    | Actief             |
| created_at        | TIMESTAMPTZ  | No       | NOW()   | Aanmaakdatum       |

**Standard Values:** FRONT-LEFT (Borst links), FRONT-CENTER, BACK (Rug), SLEEVE-LEFT, SLEEVE-RIGHT

---

### decoration_options

**Purpose:** Welke combinaties product × methode × positie mogelijk zijn

| Column               | Type          | Nullable | Default | Description                             |
| -------------------- | ------------- | -------- | ------- | --------------------------------------- |
| decoration_option_id | SERIAL        | No       | auto    | Primary key                             |
| style_id             | INTEGER       | No       | -       | FK naar product_styles (CASCADE DELETE) |
| decoration_method_id | INTEGER       | No       | -       | FK naar decoration_methods              |
| position_id          | INTEGER       | No       | -       | FK naar decoration_positions            |
| setup_fee_eur        | NUMERIC(10,2) | No       | 0.00    | Instelkosten                            |
| price_per_item_eur   | NUMERIC(10,2) | No       | 0.00    | Prijs per stuk                          |
| min_order_qty        | INTEGER       | No       | 1       | Minimum order aantal                    |
| max_colors_allowed   | INTEGER       | Yes      | NULL    | Maximum aantal kleuren                  |
| max_stitches_allowed | INTEGER       | Yes      | NULL    | Maximum aantal steken (borduren)        |
| available_from       | DATE          | Yes      | NULL    | Beschikbaar vanaf                       |
| available_until      | DATE          | Yes      | NULL    | Beschikbaar tot                         |
| is_active            | BOOLEAN       | No       | TRUE    | Actief                                  |
| created_at           | TIMESTAMPTZ   | No       | NOW()   | Aanmaakdatum                            |
| updated_at           | TIMESTAMPTZ   | No       | NOW()   | Laatste wijziging                       |

**Constraints:**

- UNIQUE: (style_id, decoration_method_id, position_id)

**Indexes:**

- PRIMARY KEY: decoration_option_id
- UNIQUE COMPOSITE: (style_id, decoration_method_id, position_id)
- FK INDEX: style_id, decoration_method_id, position_id
- INDEX: is_active

---

## 9. Integration Tables

### external_product_mappings

**Purpose:** Koppeling PIM producten naar externe systemen (Gripp, Calculated, webshops)

| Column                | Type         | Nullable | Default   | Description                                            |
| --------------------- | ------------ | -------- | --------- | ------------------------------------------------------ |
| external_mapping_id   | SERIAL       | No       | auto      | Primary key                                            |
| entity_type           | VARCHAR(30)  | No       | -         | Type: style, color_variant, sku, decoration_option     |
| entity_id             | INTEGER      | No       | -         | ID van entiteit (polymorphic)                          |
| external_system       | VARCHAR(100) | No       | -         | Naam extern systeem (Gripp, Calculated, Shopify, etc.) |
| external_product_code | VARCHAR(100) | No       | -         | Product code in extern systeem                         |
| external_description  | VARCHAR(255) | Yes      | NULL      | Beschrijving in extern systeem                         |
| link_type             | VARCHAR(20)  | No       | 'primary' | Type: primary, alias                                   |
| customer_id           | INTEGER      | Yes      | NULL      | Klant-specifiek (voor Calculated)                      |
| is_active             | BOOLEAN      | No       | TRUE      | Actief                                                 |
| created_at            | TIMESTAMPTZ  | No       | NOW()     | Aanmaakdatum                                           |
| updated_at            | TIMESTAMPTZ  | No       | NOW()     | Laatste wijziging                                      |

**Constraints:**

- CHECK: entity_type IN ('style', 'color_variant', 'sku', 'decoration_option')
- CHECK: link_type IN ('primary', 'alias')
- UNIQUE: (external_system, external_product_code, customer_id)

**Indexes:**

- PRIMARY KEY: external_mapping_id
- UNIQUE COMPOSITE: (external_system, external_product_code, customer_id)
- INDEX: (entity_type, entity_id)
- INDEX: external_system
- INDEX: customer_id

---

## Glossary

| Term              | Definition                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Style**         | Grandparent niveau - basis productmodel (bijv. "Polo Premium")                     |
| **Color Variant** | Parent niveau - kleurvariant van style (bijv. "Polo Premium - Navy")               |
| **SKU**           | Child niveau - verkoopbaar product (kleur + maat, bijv. "Polo Premium - Navy - L") |
| **EAN**           | European Article Number - 13-cijferige barcode                                     |
| **KERN**          | Core assortiment - wordt geëxporteerd naar alle externe systemen                   |
| **RAND**          | Range assortiment - blijft in PIM, niet geëxporteerd                               |
| **RRP**           | Recommended Retail Price - adviesprijs                                             |
| **Color Family**  | Top-level kleur categorisatie voor filtering (Zwart, Blauw, etc.)                  |
| **Staffelprijs**  | Volume discount - lagere prijs bij grotere afname                                  |
| **Decoratie**     | Bedrukking/borduring op kledingstuk                                                |

---

_Dit document dient als complete referentie voor alle database structuren._

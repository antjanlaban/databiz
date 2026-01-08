# Van Kruiningen Reclame - Complete Database Schema

**Project**: Bedrijfskleding Product Information Management (PIM)  
**Database**: Supabase PostgreSQL  
**Version**: 4.1 (Security Hardened)  
**Last Updated**: 4 november 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Naming Conventions](#naming-conventions)
3. [User Authorization](#user-authorization)
4. [Database Tables](#database-tables)
5. [Table Relationships](#table-relationships)
6. [Supabase Setup Instructions](#supabase-setup-instructions)
7. [Example Data](#example-data)
8. [Best Practices](#best-practices)

---

## Overview

This database schema supports a **single-tenant** Product Information Management (PIM) system for Van Kruiningen Reclame with:

✅ **Hierarchical Product Structure** (Style → Color → Size)  
✅ **Shopify-Compatible Options Layer** (Color as Option 1, Size as Option 2)  
✅ **Advanced Pricing** (Cost, Retail, Discounts, Tier pricing, Price history)  
✅ **Color Normalization** (3-layer color model with accent colors)  
✅ **International Size System** (Standardized XS-5XL, numeric sizes 44-64)  
✅ **Category Management** (ALG taxonomy + optional GS1)  
✅ **Import Templates** (Supplier-specific column + category mappings)  
✅ **Decoration Management** (Embroidery, printing, transfers)  
✅ **External System Integration** (Gripp.com, Calculated, Shopify)  
✅ **Core vs. Range Classification** (KERN/RAND products)  
✅ **Multi-supplier Support**  
✅ **User Role Authorization** (Admin vs User access control)

**🎯 Shopify Integration Ready:** The product structure is designed to map directly to Shopify's Product Variant model without database changes. See `docs/shopify/master-shopify-mapping.md` for implementation details.

---

## Naming Conventions

Following Supabase/PostgreSQL best practices:

- **Tables**: `snake_case`, plural (e.g., `product_styles`, `color_variants`)
- **Columns**: `snake_case`, singular (e.g., `style_id`, `color_name_nl`)
- **Primary Keys**: `{table_singular}_id` (e.g., `style_id`, `color_variant_id`)
- **Foreign Keys**: `{referenced_table_singular}_id` (e.g., `brand_id`, `supplier_id`)
- **Booleans**: prefix with `is_` or `has_` (e.g., `is_active`, `has_tiered_pricing`)
- **Dates**: suffix with `_at` for timestamps, `_date` for dates (e.g., `created_at`, `valid_from_date`)
- **Enums**: SCREAMING_SNAKE_CASE values (e.g., `'KERN'`, `'RAND'`)

---

## User Authorization

**Pattern:** Single-tenant with role-based access control  
**Roles:** `admin` (full access) and `user` (read-only)  
**Implementation:** Separate `user_roles` table + RLS policies

### user_roles

Role assignment for employees.

```sql
CREATE TYPE app_role AS ENUM ('admin', 'user');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

### user_invites

Invite system for new employees.

```sql
CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  invited_by UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  invite_token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invites_token ON user_invites(invite_token);
CREATE INDEX idx_invites_status ON user_invites(status);
CREATE INDEX idx_invites_email ON user_invites(email);
```

### Security Definer Function

Prevents RLS recursion issues.

```sql
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

---

## Database Tables

### 1. Reference Tables

#### 1.1 brands

Master table for clothing brands.

```sql
CREATE TABLE brands (
    brand_id SERIAL PRIMARY KEY,
    brand_name VARCHAR(100) UNIQUE NOT NULL,
    brand_logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brands_active ON brands(is_active);
```

#### 1.2 suppliers

Master table for suppliers/manufacturers.

```sql
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    supplier_code VARCHAR(50) UNIQUE,
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    address TEXT,
    country VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
```

#### 1.3 color_families

Standardized color categories for filtering (3-layer color model).

```sql
CREATE TABLE color_families (
    color_family_id SERIAL PRIMARY KEY,
    family_name_nl VARCHAR(50) UNIQUE NOT NULL,
    family_name_en VARCHAR(50),
    hex_color VARCHAR(7),
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_color_families_sort ON color_families(sort_order);
```

**Initial Data**:

```sql
INSERT INTO color_families (family_name_nl, family_name_en, hex_color, sort_order) VALUES
('Zwart', 'Black', '#000000', 1),
('Wit', 'White', '#FFFFFF', 2),
('Grijs', 'Gray', '#808080', 3),
('Blauw', 'Blue', '#0000FF', 4),
('Navy', 'Navy', '#000080', 5),
('Rood', 'Red', '#FF0000', 6),
('Groen', 'Green', '#008000', 7),
('Geel', 'Yellow', '#FFFF00', 8),
('Oranje', 'Orange', '#FFA500', 9),
('Bruin', 'Brown', '#8B4513', 10),
('Beige', 'Beige', '#F5F5DC', 11),
('Roze', 'Pink', '#FFC0CB', 12),
('Paars', 'Purple', '#800080', 13),
('Multicolor', 'Multicolor', NULL, 99);
```

#### 1.4 category_taxonomies

Taxonomy types for product categorization (ALG, GS1).

```sql
CREATE TABLE category_taxonomies (
    taxonomy_id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_taxonomies_code ON category_taxonomies(code);
CREATE INDEX idx_taxonomies_active ON category_taxonomies(is_active);
```

**Initial Data**:

```sql
INSERT INTO category_taxonomies (code, name, is_required, is_active, sort_order) VALUES
('ALG', 'Algemeen (Interne Indeling)', TRUE, TRUE, 1),
('GS1', 'GS1 Global Product Classification', FALSE, FALSE, 2);
```

#### 1.5 categories

Hierarchical product categories within taxonomies.

```sql
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    taxonomy_id INTEGER NOT NULL REFERENCES category_taxonomies(taxonomy_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    parent_category_id INTEGER REFERENCES categories(category_id),
    full_path TEXT,
    level INTEGER DEFAULT 1,
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_taxonomy ON categories(taxonomy_id);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_full_path ON categories(full_path);
```

**Example Data (ALG Taxonomy)**:

```sql
-- Top level
INSERT INTO categories (taxonomy_id, name, level, sort_order) VALUES
((SELECT taxonomy_id FROM category_taxonomies WHERE code = 'ALG'), 'Werkschoenen', 1, 1),
((SELECT taxonomy_id FROM category_taxonomies WHERE code = 'ALG'), 'Kleding', 1, 2),
((SELECT taxonomy_id FROM category_taxonomies WHERE code = 'ALG'), 'Accessoires', 1, 3);

-- Second level (example)
INSERT INTO categories (taxonomy_id, name, parent_category_id, level, sort_order) VALUES
((SELECT taxonomy_id FROM category_taxonomies WHERE code = 'ALG'), 
 'Lage werkschoenen', 
 (SELECT category_id FROM categories WHERE name = 'Werkschoenen' AND level = 1),
 2, 1);
```

**Protected Categories:**

```sql
-- UNCATEGORIZED fallback categorie (Engels)
INSERT INTO categories (
  taxonomy_id, 
  category_code,
  name, 
  description,
  level, 
  sort_order,
  is_active
) VALUES (
  (SELECT taxonomy_id FROM category_taxonomies WHERE code = 'ALG'), 
  'UNCATEGORIZED',
  'Uncategorized',
  'Fallback category for products without a specific category',
  1, 
  999,
  TRUE
) ON CONFLICT (taxonomy_id, category_code) DO NOTHING;
```

**Business Rules:**
- `UNCATEGORIZED` categorie mag NIET verwijderd worden (UI disabled)
- `sort_order = 999` zorgt dat deze altijd onderaan staat
- Gebruikt als vangnet bij import of tijdens herstructurering
- Producten hier zijn "work in progress" - moeten later gecategoriseerd worden

#### 1.6 product_categories

Junction table linking styles to categories.

```sql
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    product_style_id INTEGER NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_style_id, category_id)
);

CREATE INDEX idx_product_categories_style ON product_categories(product_style_id);
CREATE INDEX idx_product_categories_category ON product_categories(category_id);
CREATE INDEX idx_product_categories_primary ON product_categories(is_primary);
```

**Business Rule**: Each product_style MUST have exactly 1 ALG category.

**Delete Cascade Rules:**

```sql
-- Bij verwijderen van categorie MET producten:
-- SITUATIE 1 (ALG): Verplichte herkoppeling via replacement dialog
-- SITUATIE 2 (GS1): Optionele herkoppeling of link verbreken
-- SITUATIE 3 (UNCATEGORIZED): UI blokkeert delete

-- Implementatie: ON DELETE CASCADE is disabled
-- Application-level handling via CategoryReplacementDialog
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_category_id_fkey;
ALTER TABLE product_categories ADD CONSTRAINT product_categories_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT;
```

**Business Rule BR-026-EXTENDED:** Zie `docs/data-model/business-rules.md` voor volledige delete impact handling.

#### 1.7 import_templates

Reusable import mappings for supplier data.

```sql
CREATE TABLE import_templates (
    template_id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(supplier_id),
    template_name VARCHAR(200) NOT NULL,
    description TEXT,
    column_mappings JSONB NOT NULL,
    category_mappings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    import_count INTEGER DEFAULT 0
);

CREATE INDEX idx_templates_supplier ON import_templates(supplier_id);
CREATE INDEX idx_templates_last_used ON import_templates(last_used_at DESC);
```

**Example Data**:

```sql
INSERT INTO import_templates (supplier_id, template_name, column_mappings, category_mappings) VALUES
(1, 'Tricorp Standard Format', 
 '[{"source_column":"Artikelnr","target_field":"sku_code","transformation":"uppercase"},{"source_column":"Omschrijving","target_field":"style_name"}]'::jsonb,
 '[{"source_value":"Veiligheidsschoen laag","target_category_id":"uuid","taxonomy_code":"ALG"}]'::jsonb
);
```

---

### 2. Product Hierarchy (Core)

#### 2.1 product_styles

Grandparent level - base product design/model.

**🔗 Shopify Mapping:** `product_styles` → `Shopify Product` (parent entity)  
**Handle:** `style_code` → `Product.handle` (URL slug)  
**Title:** `style_name` → `Product.title`

```sql
CREATE TABLE product_styles (
    style_id SERIAL PRIMARY KEY,
    style_code TEXT NOT NULL UNIQUE,
    style_name TEXT NOT NULL,

    -- Relations
    brand_id INTEGER REFERENCES brands(id),
    supplier_id INTEGER REFERENCES suppliers(id),

    -- Classification
    product_type TEXT NOT NULL CHECK (product_type IN ('KERN', 'RAND')),

    -- Descriptions
    description TEXT,
    material_composition TEXT,
    care_instructions TEXT,

    -- Product properties
    gender TEXT CHECK (gender IN ('Unisex', 'Heren', 'Dames', 'Kinderen')),
    weight_grams INTEGER,

    -- Supplier identification
    supplier_article_code VARCHAR(100),

    -- Shopify Metafields
    normering TEXT,
    branche TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_styles_brand ON product_styles(brand_id);
CREATE INDEX idx_product_styles_supplier ON product_styles(supplier_id);
CREATE INDEX idx_product_styles_type ON product_styles(product_type);
CREATE INDEX idx_product_styles_active ON product_styles(is_active);
CREATE INDEX idx_product_styles_branche ON product_styles USING GIN(branche);
```

**Key Fields**:

- `product_type`: `KERN` = core assortment (synced to all systems), `RAND` = range products (database only)
- `supplier_article_code`: Original article/model code from supplier (was: `supplier_style_code`)

#### 2.2 color_variants

Parent level - color variations of a product style.

**🔗 Shopify Mapping:** `color_variants` → `Shopify ProductOption[0]` (Option 1: "Color")  
**Option Name:** `"Color"` (hardcoded in Shopify)  
**Option Values:** `color_name_nl` → `OptionValue.name` (e.g., "Navy", "Zwart", "Wit")  
**Sort Order:** `display_order` determines Shopify dropdown order

```sql
CREATE TABLE color_variants (
    color_variant_id SERIAL PRIMARY KEY,
    style_id INTEGER NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,

    -- Color identification
    color_code VARCHAR(50) UNIQUE NOT NULL,

    -- 3-layer color model
    color_family_id INTEGER NOT NULL REFERENCES color_families(color_family_id),
    color_name_nl VARCHAR(100) NOT NULL,
    color_name_en VARCHAR(100),
    color_name_supplier VARCHAR(100),

    -- Accent color support
    accent_color_family_id INTEGER REFERENCES color_families(color_family_id),
    accent_color_name_nl VARCHAR(100),

    -- Color standardization
    hex_color VARCHAR(7),
    pantone_code VARCHAR(20),

    -- Properties
    color_pattern VARCHAR(50),
    is_multicolor BOOLEAN DEFAULT FALSE,

    -- Display
    display_order INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(style_id, color_code)
);

CREATE INDEX idx_color_variants_style ON color_variants(style_id);
CREATE INDEX idx_color_variants_family ON color_variants(color_family_id);
CREATE INDEX idx_color_variants_accent ON color_variants(accent_color_family_id);
CREATE INDEX idx_color_variants_active ON color_variants(is_active);
```

#### 2.3 color_variant_media

Media files (images, videos) per color variant.

```sql
CREATE TABLE color_variant_media (
    media_id SERIAL PRIMARY KEY,
    color_variant_id INTEGER NOT NULL REFERENCES color_variants(color_variant_id) ON DELETE CASCADE,

    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_url TEXT,
    file_size INTEGER,

    -- Media type
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', '360', 'pdf')) DEFAULT 'image',
    mime_type VARCHAR(100),

    -- Image specs
    width INTEGER,
    height INTEGER,

    -- Classification
    view_type VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    -- Metadata
    alt_text_nl VARCHAR(255),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_color_variant ON color_variant_media(color_variant_id);
CREATE INDEX idx_media_primary ON color_variant_media(is_primary);
CREATE INDEX idx_media_display ON color_variant_media(display_order);
```

#### 2.4 product_skus

Child level - actual sellable products (color + size).

**🔗 Shopify Mapping:** `product_skus` → `Shopify ProductVariant` (concrete SKU)  
**Variant SKU:** `sku_code` → `ProductVariant.sku` (VK-number)  
**Barcode:** `ean` → `ProductVariant.barcode` (EAN-13)  
**Price:** `selling_price_excl_vat` → `ProductVariant.price` (cents → euros)  
**Option 1 Value:** `color_variant.color_name_nl` → `ProductVariant.option1`  
**Option 2 Value:** `international_size.size_label_nl` → `ProductVariant.option2`

**Size Option Mapping:**  
- **Option Name:** `"Size"` (hardcoded in Shopify as ProductOption[1])
- **Option Values:** Derived from `international_sizes.size_label_nl` (via JOIN) or fallback to `supplier_size_code`
- **Sort Order:** `international_sizes.sort_order` determines Shopify dropdown order

```sql
CREATE TABLE product_skus (
    sku_id SERIAL PRIMARY KEY,
    color_variant_id INTEGER NOT NULL REFERENCES color_variants(color_variant_id) ON DELETE CASCADE,
    style_id INTEGER NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,

    -- Unique identifiers
    ean VARCHAR(13) UNIQUE NOT NULL,
    sku_code VARCHAR(100) UNIQUE NOT NULL,

    -- Size info
    size_code VARCHAR(20) NOT NULL,
    size_label VARCHAR(50),
    size_order INTEGER,

    -- Supplier info
    supplier_sku VARCHAR(100),
    supplier_article_nr VARCHAR(100),

    -- Purchase prices
    cost_price NUMERIC(10,2),
    cost_price_currency VARCHAR(3) DEFAULT 'EUR',
    purchase_discount_perc NUMERIC(5,2) DEFAULT 0,
    purchase_discount_amount NUMERIC(10,2) DEFAULT 0,
    cost_price_net NUMERIC(10,2) GENERATED ALWAYS AS (cost_price - purchase_discount_amount) STORED,

    -- Selling prices
    rrp_excl_vat NUMERIC(10,2),
    selling_price_excl_vat NUMERIC(10,2) NOT NULL,
    vat_rate NUMERIC(5,2) DEFAULT 21.00,
    selling_price_incl_vat NUMERIC(10,2) GENERATED ALWAYS AS (selling_price_excl_vat * (1 + vat_rate/100)) STORED,

    -- Discounts
    sales_discount_perc NUMERIC(5,2) DEFAULT 0,
    sales_discount_amount NUMERIC(10,2) DEFAULT 0,
    discount_valid_from DATE,
    discount_valid_until DATE,
    final_price_excl_vat NUMERIC(10,2) GENERATED ALWAYS AS (selling_price_excl_vat - sales_discount_amount) STORED,

    -- Margins (auto-calculated)
    margin_amount NUMERIC(10,2) GENERATED ALWAYS AS (selling_price_excl_vat - cost_price_net) STORED,
    margin_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN cost_price_net > 0 THEN ((selling_price_excl_vat - cost_price_net) / cost_price_net) * 100
            ELSE 0
        END
    ) STORED,

    -- Stock management removed: voorraadcontrole gebeurt in Gripp ERP, niet in PIM

    -- Tier pricing
    has_tiered_pricing BOOLEAN DEFAULT FALSE,

    -- Metadata
    price_last_updated TIMESTAMPTZ,
    price_update_source VARCHAR(50),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_orderable BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_selling_price CHECK (selling_price_excl_vat >= 0),
    CONSTRAINT check_ean_format CHECK (ean ~ '^\d{13}$')
);

CREATE INDEX idx_skus_color_variant ON product_skus(color_variant_id);
CREATE INDEX idx_skus_style ON product_skus(style_id);
CREATE INDEX idx_skus_ean ON product_skus(ean);
CREATE INDEX idx_skus_code ON product_skus(sku_code);
CREATE INDEX idx_skus_supplier_sku ON product_skus(supplier_sku);
CREATE INDEX idx_skus_active ON product_skus(is_active);
CREATE INDEX idx_skus_published ON product_skus(is_published);
CREATE INDEX idx_skus_price ON product_skus(selling_price_excl_vat);
```

---

### 3. Pricing Tables

#### 3.1 price_history

Audit trail of all price changes.

```sql
CREATE TABLE price_history (
    price_history_id SERIAL PRIMARY KEY,
    sku_id INTEGER NOT NULL REFERENCES product_skus(sku_id) ON DELETE CASCADE,

    -- Price type
    price_type VARCHAR(30) CHECK (price_type IN ('cost_price', 'selling_price', 'rrp', 'purchase_discount', 'sales_discount')) NOT NULL,

    -- Values
    old_value NUMERIC(10,2),
    new_value NUMERIC(10,2) NOT NULL,
    change_amount NUMERIC(10,2) GENERATED ALWAYS AS (new_value - old_value) STORED,
    change_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN old_value > 0 THEN ((new_value - old_value) / old_value) * 100
            ELSE 0
        END
    ) STORED,

    -- Validity
    valid_from DATE NOT NULL,
    valid_until DATE,

    -- Change metadata
    change_reason VARCHAR(200),
    change_source VARCHAR(30) CHECK (change_source IN ('supplier_import', 'manual', 'bulk_update', 'automatic', 'promotion')) NOT NULL,
    import_batch_id INTEGER,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER
);

CREATE INDEX idx_price_history_sku ON price_history(sku_id);
CREATE INDEX idx_price_history_type ON price_history(price_type);
CREATE INDEX idx_price_history_valid_from ON price_history(valid_from);
CREATE INDEX idx_price_history_source ON price_history(change_source);
CREATE INDEX idx_price_history_created ON price_history(created_at);
```

#### 3.2 price_tiers

Volume-based pricing (staffelprijzen).

```sql
CREATE TABLE price_tiers (
    price_tier_id SERIAL PRIMARY KEY,
    sku_id INTEGER NOT NULL REFERENCES product_skus(sku_id) ON DELETE CASCADE,

    -- Tier definition
    tier_name VARCHAR(100),
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,

    -- Pricing
    tier_price_excl_vat NUMERIC(10,2) NOT NULL,
    tier_discount_perc NUMERIC(5,2),

    -- Applicability
    customer_group_id INTEGER,
    valid_from DATE,
    valid_until DATE,

    -- Display
    display_order INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_min_quantity CHECK (min_quantity >= 1),
    CONSTRAINT check_max_quantity CHECK (max_quantity IS NULL OR max_quantity > min_quantity),
    CONSTRAINT check_tier_price CHECK (tier_price_excl_vat > 0)
);

CREATE INDEX idx_price_tiers_sku ON price_tiers(sku_id);
CREATE INDEX idx_price_tiers_quantity ON price_tiers(min_quantity, max_quantity);
CREATE INDEX idx_price_tiers_active ON price_tiers(is_active);
```

---

### 4. Import & Dataset Tables

#### 4.1 import_supplier_dataset_jobs

Import jobs tracking for supplier dataset uploads.

**🔄 FASE 5 UPDATE:** Added `is_temp` column to support 3-phase import flow (IMPORT → CONVERTEREN → ACTIVEREN).

```sql
CREATE TABLE import_supplier_dataset_jobs (
    id SERIAL PRIMARY KEY,
    
    -- Relations
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    brand_id INTEGER NOT NULL REFERENCES brands(id),
    
    -- File info
    file_name TEXT NOT NULL,
    file_path TEXT,
    original_filename TEXT,
    original_file_extension TEXT,
    file_size_bytes BIGINT,
    
    -- Parsing
    file_columns TEXT[] DEFAULT '{}',
    column_count INTEGER,
    original_row_count INTEGER,
    parsed_row_count INTEGER,
    skipped_row_count INTEGER,
    
    -- Mapping
    mapping_template_id INTEGER REFERENCES import_templates(id),
    current_mapping_template_id INTEGER REFERENCES import_templates(id),
    mapping_completed_at TIMESTAMPTZ,
    
    -- Staging
    staging_completed_at TIMESTAMPTZ,
    data_available BOOLEAN DEFAULT FALSE,
    
    -- 🆕 3-Phase Flow Support
    is_temp BOOLEAN DEFAULT TRUE,  -- TRUE: in IMPORT fase, FALSE: na CONVERTEREN
    
    -- Dataset creation
    creation_step TEXT,
    creation_message TEXT,
    creation_progress INTEGER DEFAULT 0,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'in_progress',
    file_status TEXT NOT NULL DEFAULT 'ACTIVE',
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    notes TEXT,
    
    -- Counts
    total_rows INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    json_path TEXT,
    file_deleted_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    imported_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT check_status CHECK (status IN ('in_progress', 'completed', 'failed', 'archived')),
    CONSTRAINT check_file_status CHECK (file_status IN ('ACTIVE', 'INACTIVE', 'STAGED', 'IMPORT_PENDING', 'ARCHIVED'))
);

CREATE INDEX idx_import_jobs_supplier ON import_supplier_dataset_jobs(supplier_id);
CREATE INDEX idx_import_jobs_brand ON import_supplier_dataset_jobs(brand_id);
CREATE INDEX idx_import_jobs_status ON import_supplier_dataset_jobs(status);
CREATE INDEX idx_import_jobs_file_status ON import_supplier_dataset_jobs(file_status);
CREATE INDEX idx_import_jobs_is_temp ON import_supplier_dataset_jobs(is_temp);
CREATE INDEX idx_import_jobs_created_by ON import_supplier_dataset_jobs(created_by);
```

**Business Logic:**
- `is_temp=TRUE`: Dataset in IMPORT fase (alleen file upload + parsing)
- `is_temp=FALSE`: Dataset in CONVERT fase (mapping uitgevoerd, products created)

#### 4.2 supplier_products

Supplier product catalog (after conversion from raw data).

**🔄 FASE 5 UPDATE:** Added `product_status` enum to support INACTIVE/ACTIVE lifecycle.

```sql
CREATE TYPE product_status_enum AS ENUM ('INACTIVE', 'ACTIVE', 'PROMOTED');

CREATE TABLE supplier_products (
    id SERIAL PRIMARY KEY,
    
    -- Relations
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    brand_id INTEGER NOT NULL REFERENCES brands(id),
    dataset_id INTEGER REFERENCES import_supplier_dataset_jobs(id),
    
    -- Identifiers
    sku TEXT NOT NULL,
    supplier_article_code TEXT,
    ean TEXT,
    
    -- Basic info
    product_name TEXT NOT NULL,
    description TEXT,
    
    -- Classification
    category_id INTEGER REFERENCES categories(id),
    clothing_type_id INTEGER REFERENCES clothing_types(id),
    
    -- Color & Size
    color_name TEXT,
    color_family_id INTEGER REFERENCES color_families(id),
    size_label TEXT,
    international_size_id INTEGER REFERENCES international_sizes(id),
    
    -- Pricing (in cents)
    price_cost_cents INTEGER,
    price_retail_cents INTEGER,
    
    -- Stock
    stock_quantity INTEGER DEFAULT 0,
    
    -- 🆕 Lifecycle Status
    product_status product_status_enum NOT NULL DEFAULT 'INACTIVE',
    
    -- Additional attributes (JSON)
    raw_attributes JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    promoted_at TIMESTAMPTZ,
    
    UNIQUE(supplier_id, sku)
);

CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_brand ON supplier_products(brand_id);
CREATE INDEX idx_supplier_products_dataset ON supplier_products(dataset_id);
CREATE INDEX idx_supplier_products_status ON supplier_products(product_status);
CREATE INDEX idx_supplier_products_tenant_status ON supplier_products(supplier_id, product_status);
CREATE INDEX idx_supplier_products_sku ON supplier_products(sku);
CREATE INDEX idx_supplier_products_ean ON supplier_products(ean);
```

**Status Flow:**
1. **INACTIVE**: After CONVERTEREN (AI mapping + validation) - NOT visible in catalog
2. **ACTIVE**: After ACTIVEREN (quality check passed) - visible in Leveranciers Catalogus
3. **PROMOTED**: After PROMOVEREN (converted to product_styles + variants) - visible in Mijn Assortiment

**Catalog Query:**
```sql
-- ✅ CORRECT: Only show ACTIVE products in Leveranciers Catalogus
SELECT * FROM supplier_products 
WHERE supplier_id = {id} 
  AND product_status = 'ACTIVE';

-- ❌ WRONG: Shows INACTIVE products (not ready for use)
SELECT * FROM supplier_products 
WHERE supplier_id = {id};
```

#### 4.3 export_channels

Generic export destination configuration.

**🆕 FASE 5 NEW:** Replaces hardcoded Gripp/Calculated exports with configurable system.

```sql
CREATE TABLE export_channels (
    id SERIAL PRIMARY KEY,
    
    -- Channel info
    name TEXT NOT NULL,
    channel_code TEXT UNIQUE NOT NULL,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('api', 'sftp', 'file', 'webhook')),
    
    -- Connection details
    endpoint_url TEXT,
    api_key_secret TEXT,  -- Reference to secrets table
    username TEXT,
    password_secret TEXT,  -- Reference to secrets table
    
    -- Configuration
    export_format TEXT CHECK (export_format IN ('json', 'xml', 'csv', 'excel')),
    field_mapping JSONB DEFAULT '{}',
    
    -- Scheduling
    auto_export_enabled BOOLEAN DEFAULT FALSE,
    export_schedule TEXT,  -- Cron expression
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_export_at TIMESTAMPTZ,
    last_export_status TEXT,
    
    -- Metadata
    description TEXT,
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_export_channels_type ON export_channels(channel_type);
CREATE INDEX idx_export_channels_active ON export_channels(is_active);
CREATE INDEX idx_export_channels_code ON export_channels(channel_code);
```

**Initial Data (Migration from hardcoded exports):**
```sql
-- Gripp ERP
INSERT INTO export_channels (name, channel_code, channel_type, endpoint_url, export_format, is_active)
VALUES ('Gripp ERP', 'GRIPP', 'api', 'https://api.gripp.com/v1/products', 'json', true);

-- Calculated KMS  
INSERT INTO export_channels (name, channel_code, channel_type, endpoint_url, export_format, is_active)
VALUES ('Calculated KMS', 'CALCULATED', 'api', 'https://api.calculated.nl/products', 'json', true);
```

#### 4.4 export_channel_requirements

Required PIM fields per export channel.

```sql
CREATE TABLE export_channel_requirements (
    id SERIAL PRIMARY KEY,
    
    -- Relations
    channel_id INTEGER NOT NULL REFERENCES export_channels(id) ON DELETE CASCADE,
    
    -- Field requirements
    pim_field_name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    
    -- Validation
    validation_rule TEXT,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(channel_id, pim_field_name)
);

CREATE INDEX idx_channel_requirements_channel ON export_channel_requirements(channel_id);
CREATE INDEX idx_channel_requirements_required ON export_channel_requirements(is_required);
```

**Example: Gripp ERP Requirements**
```sql
INSERT INTO export_channel_requirements (channel_id, pim_field_name, is_required)
SELECT 
  (SELECT id FROM export_channels WHERE channel_code = 'GRIPP'),
  field_name,
  true
FROM (VALUES
  ('sku'),
  ('name'),
  ('price_retail_cents'),
  ('price_cost_cents'),
  ('stock_quantity'),
  ('category_id'),
  ('supplier_id')
) AS required_fields(field_name);
```

#### 4.5 export_jobs

Export job history and tracking.

```sql
CREATE TABLE export_jobs (
    id SERIAL PRIMARY KEY,
    
    -- Relations
    channel_id INTEGER NOT NULL REFERENCES export_channels(id),
    
    -- Job info
    job_type TEXT NOT NULL CHECK (job_type IN ('manual', 'scheduled', 'triggered')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Filters
    export_filters JSONB DEFAULT '{}',  -- {"brand_id": 123, "category_id": 456}
    
    -- Results
    total_products INTEGER,
    exported_products INTEGER,
    failed_products INTEGER,
    skipped_products INTEGER,
    
    -- Errors
    error_message TEXT,
    error_details JSONB,
    
    -- Performance
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Output
    output_file_path TEXT,
    output_file_url TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT check_counts CHECK (
        exported_products + failed_products + skipped_products <= total_products
    )
);

CREATE INDEX idx_export_jobs_channel ON export_jobs(channel_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at DESC);
CREATE INDEX idx_export_jobs_created_by ON export_jobs(created_by);
```

---

### 5. Decoration Tables

#### 5.1 decoration_methods

Available decoration techniques (printing, embroidery, transfer, etc.).

```sql
CREATE TABLE decoration_methods (
    decoration_method_id SERIAL PRIMARY KEY,
    method_code VARCHAR(50) UNIQUE NOT NULL,
    method_name_nl VARCHAR(100) NOT NULL,
    method_type VARCHAR(20) CHECK (method_type IN ('printing', 'embroidery', 'transfer', 'laser')) NOT NULL,
    description_nl TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decoration_methods_type ON decoration_methods(method_type);
```

**Initial Data**:

```sql
INSERT INTO decoration_methods (method_code, method_name_nl, method_type) VALUES
('PRINT-SCREEN', 'Zeefdruk', 'printing'),
('PRINT-TRANSFER', 'Transferdruk', 'transfer'),
('PRINT-DTF', 'DTF-transfer', 'transfer'),
('EMBROIDERY', 'Borduring', 'embroidery'),
('LASER', 'Laser gravure', 'laser');
```

#### 4.2 decoration_positions

Where decoration can be applied on garments.

```sql
CREATE TABLE decoration_positions (
    position_id SERIAL PRIMARY KEY,
    position_code VARCHAR(50) UNIQUE NOT NULL,
    position_name_nl VARCHAR(100) NOT NULL,
    position_area_mm2 INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:

```sql
INSERT INTO decoration_positions (position_code, position_name_nl, position_area_mm2) VALUES
('FRONT-LEFT', 'Borst links', 10000),
('FRONT-CENTER', 'Borst midden', 15000),
('BACK', 'Rug', 30000),
('SLEEVE-LEFT', 'Linker mouw', 5000),
('SLEEVE-RIGHT', 'Rechter mouw', 5000);
```

#### 4.3 decoration_options

Which combinations of product × method × position are allowed.

```sql
CREATE TABLE decoration_options (
    decoration_option_id SERIAL PRIMARY KEY,
    style_id INTEGER NOT NULL REFERENCES product_styles(style_id) ON DELETE CASCADE,
    decoration_method_id INTEGER NOT NULL REFERENCES decoration_methods(decoration_method_id),
    position_id INTEGER NOT NULL REFERENCES decoration_positions(position_id),

    -- Pricing
    setup_fee_eur NUMERIC(10,2) DEFAULT 0.00,
    price_per_item_eur NUMERIC(10,2) DEFAULT 0.00,

    -- Constraints
    min_order_qty INTEGER DEFAULT 1,
    max_colors_allowed INTEGER,
    max_stitches_allowed INTEGER,

    -- Validity
    available_from DATE,
    available_until DATE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decoration_options_style ON decoration_options(style_id);
CREATE INDEX idx_decoration_options_method ON decoration_options(decoration_method_id);
CREATE INDEX idx_decoration_options_position ON decoration_options(position_id);
CREATE INDEX idx_decoration_options_active ON decoration_options(is_active);
CREATE UNIQUE INDEX idx_decoration_options_unique ON decoration_options(style_id, decoration_method_id, position_id);
```

---

### 5. External System Integration

#### 5.1 external_product_mappings

Map internal products to external system codes (Gripp, Calculated, future systems).

```sql
CREATE TABLE external_product_mappings (
    external_mapping_id SERIAL PRIMARY KEY,

    -- Polymorphic reference
    entity_type VARCHAR(30) CHECK (entity_type IN ('style', 'color_variant', 'sku', 'decoration_option')) NOT NULL,
    entity_id INTEGER NOT NULL,

    -- External system info
    external_system VARCHAR(100) NOT NULL,
    external_product_code VARCHAR(100) NOT NULL,
    external_description VARCHAR(255),

    -- Link type
    link_type VARCHAR(20) CHECK (link_type IN ('primary', 'alias')) DEFAULT 'primary',

    -- Customer-specific (for Calculated)
    customer_id INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(external_system, external_product_code, customer_id)
);

CREATE INDEX idx_external_mappings_entity ON external_product_mappings(entity_type, entity_id);
CREATE INDEX idx_external_mappings_system ON external_product_mappings(external_system, external_product_code);
CREATE INDEX idx_external_mappings_customer ON external_product_mappings(customer_id);
```

**Usage Examples**:

```sql
-- Map SKU to Gripp.com code
INSERT INTO external_product_mappings (entity_type, entity_id, external_system, external_product_code)
VALUES ('sku', 12345, 'Gripp', 'G10040-XLL-BLACK');

-- Map decoration option to Calculated code (customer-specific)
INSERT INTO external_product_mappings (entity_type, entity_id, external_system, external_product_code, customer_id)
VALUES ('decoration_option', 402, 'Calculated', 'CALC-PR-BORD-PL-L', 203);
```

---

## Table Relationships

```
brands ──┬──< product_styles ──┬──< color_variants ──┬──< product_skus ──┬──< price_history
         │                     │                     │                   └──< price_tiers
         │                     │                     └──< color_variant_media
         │                     ├──< decoration_options ──< decoration_methods
         │                     │                       └──< decoration_positions
         │                     └──< product_categories
         │
suppliers ┤──< import_templates
          └──< product_styles

color_families ──┬──< color_variants (main color)
                 └──< color_variants (accent color)

category_taxonomies ──< categories (recursive parent-child)
                      └──< product_categories

user_roles ──< auth.users
user_invites (pending invitations)

external_product_mappings ──> polymorphic reference to:
    - product_styles
    - color_variants
    - product_skus
    - decoration_options
```

---

## Supabase Setup Instructions

### Step 1: Create Tables

Copy and paste the SQL from each table section above into the Supabase SQL Editor and execute in this order:

1. Authorization: `user_roles`, `user_invites`, `has_role()` function
2. Reference tables: `brands`, `suppliers`, `color_families`
3. Categories: `category_taxonomies`, `categories`
4. Product hierarchy: `product_styles`, `color_variants`, `color_variant_media`, `product_skus`
5. Product categories junction: `product_categories`
6. Import templates: `import_templates`
7. Pricing: `price_history`, `price_tiers`
8. Decoration: `decoration_methods`, `decoration_positions`, `decoration_options`
9. Integration: `external_product_mappings`

### Step 2: Enable Row Level Security (RLS)

**Important**: Single-tenant with role-based access control.

```sql
-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_variant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoration_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoration_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoration_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_product_mappings ENABLE ROW LEVEL SECURITY;

-- User Roles Policies (Security Critical!)
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can modify roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- User Invites Policies
CREATE POLICY "Admins can manage invites"
  ON user_invites FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Reference Tables Policies (Read: all, Write: admin only)
CREATE POLICY "Anyone authenticated can read brands"
  ON brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify brands"
  ON brands FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Apply same pattern to all reference tables
CREATE POLICY "Anyone authenticated can read suppliers"
  ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify suppliers"
  ON suppliers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can read color_families"
  ON color_families FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify color_families"
  ON color_families FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can read category_taxonomies"
  ON category_taxonomies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify category_taxonomies"
  ON category_taxonomies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Categories Policies
CREATE POLICY "Anyone authenticated can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify categories"
  ON categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Product Tables Policies
CREATE POLICY "Anyone authenticated can read product_styles"
  ON product_styles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify product_styles"
  ON product_styles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Apply same pattern to all product tables
CREATE POLICY "Anyone authenticated can read color_variants"
  ON color_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify color_variants"
  ON color_variants FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can read product_skus"
  ON product_skus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify product_skus"
  ON product_skus FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can read product_categories"
  ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can modify product_categories"
  ON product_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Import Templates Policies
CREATE POLICY "Anyone authenticated can read import_templates"
  ON import_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify import_templates"
  ON import_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Continue for remaining tables...
```

**Pattern Summary:**
- **Read access**: All authenticated users
- **Write access**: Admin role only (via has_role() function)
- **No tenant filtering**: Single organization (Van Kruiningen)


### Step 3: Set up Realtime (Optional)

Enable realtime for tables that need live updates:

```sql
-- Enable realtime for stock updates
ALTER PUBLICATION supabase_realtime ADD TABLE product_skus;
```

### Step 4: Create Helpful Views

```sql
-- View: Current prices with margins
CREATE VIEW v_current_prices AS
SELECT
    ps.sku_id,
    ps.sku_code,
    s.style_name,
    cv.color_name_nl,
    ps.size_code,
    ps.cost_price_net,
    ps.selling_price_excl_vat,
    ps.margin_amount,
    ps.margin_percentage,
    ps.has_tiered_pricing
FROM product_skus ps
JOIN color_variants cv ON ps.color_variant_id = cv.color_variant_id
JOIN product_styles s ON ps.style_id = s.style_id
WHERE ps.is_active = TRUE;

-- View: Active promotions
CREATE VIEW v_active_promotions AS
SELECT
    ps.sku_code,
    s.style_name,
    cv.color_name_nl,
    ps.selling_price_excl_vat,
    ps.sales_discount_amount,
    ps.final_price_excl_vat,
    ps.discount_valid_until
FROM product_skus ps
JOIN color_variants cv ON ps.color_variant_id = cv.color_variant_id
JOIN product_styles s ON ps.style_id = s.style_id
WHERE ps.sales_discount_amount > 0
  AND CURRENT_DATE BETWEEN ps.discount_valid_from AND ps.discount_valid_until
  AND ps.is_active = TRUE;
```

---

## Example Data

### Insert Test Brand and Supplier

```sql
INSERT INTO brands (brand_name) VALUES ('Van Kruiningen');
INSERT INTO suppliers (supplier_name, supplier_code) VALUES ('Test Leverancier BV', 'TEST-001');
```

### Insert Test Product

```sql
-- 1. Product Style
INSERT INTO product_styles (style_name, brand_id, supplier_id, supplier_article_code, product_type, material_composition)
VALUES ('Werkbroek Professional', 1, 1, 'PRO-WB-001', 'KERN', '65% Polyester, 35% Katoen')
RETURNING style_id;

-- 2. Color Variant (assume style_id = 1)
INSERT INTO color_variants (style_id, color_code, color_family_id, color_name_nl, hex_color)
VALUES (1, 'NAV', 5, 'Navy', '#000080')
RETURNING color_variant_id;

-- 3. Product SKUs (assume color_variant_id = 1, sku_code auto-generated as VK-100000, VK-100001, etc.)
INSERT INTO product_skus (
    color_variant_id, style_id, ean, sku_code, size_code, size_label, size_order,
    cost_price, selling_price_excl_vat, stock_quantity
) VALUES
(1, 1, '8712345678901', 'PRO-WB-001-NAV-48', '48', 'Maat 48', 1, 32.50, 44.95, 25),
(1, 1, '8712345678918', 'PRO-WB-001-NAV-50', '50', 'Maat 50', 2, 32.50, 44.95, 45),
(1, 1, '8712345678925', 'PRO-WB-001-NAV-52', '52', 'Maat 52', 3, 32.50, 44.95, 30);

-- 4. Price Tiers
INSERT INTO price_tiers (sku_id, tier_name, min_quantity, max_quantity, tier_price_excl_vat) VALUES
(1, 'Retail', 1, 9, 44.95),
(1, 'Klein bedrijf', 10, 49, 41.95),
(1, 'Groothandel', 50, 99, 39.95),
(1, 'Bulk', 100, NULL, 37.95);

-- 5. External Mapping (Gripp)
INSERT INTO external_product_mappings (entity_type, entity_id, external_system, external_product_code)
VALUES ('sku', 1, 'Gripp', 'G-PRO-WB-001-NAV-48');
```

---

## Best Practices

### ✅ DO

1. **Use snake_case** for all table and column names
2. **Use SERIAL** for auto-incrementing primary keys
3. **Add indexes** on foreign keys and frequently queried columns
4. **Enable RLS** for security (especially in production)
5. **Use GENERATED columns** for calculated fields (margins, totals)
6. **Use CHECK constraints** for data validation
7. **Use CASCADE** carefully - only where appropriate (e.g., color_variants → product_skus)
8. **Add timestamps** (created_at, updated_at) to all tables
9. **Use TIMESTAMPTZ** instead of TIMESTAMP for timezone support
10. **Document complex logic** with comments in SQL

### ❌ DON'T

1. **Don't use camelCase** - requires double quotes in SQL
2. **Don't skip indexes** on foreign keys
3. **Don't store calculated values** in regular columns (use GENERATED)
4. **Don't use TEXT** when VARCHAR with limit is sufficient
5. **Don't forget CHECK constraints** for enums and ranges
6. **Don't expose tables publicly** without RLS policies
7. **Don't use SELECT \*** in production queries
8. **Don't store sensitive data** without encryption
9. **Don't create too many indexes** (impacts write performance)
10. **Don't skip database migrations** - always version your schema

---

## Database Migrations

When making changes, create migration files:

```bash
# Generate migration
supabase migration new add_new_feature

# Apply migration
supabase db push
```

---

## Lovable Integration Tips

1. **Describe features clearly**: "Add a feedback form and save responses with user_id, message, and rating"
2. **Copy SQL from Lovable**: AI will generate schema - paste into Supabase SQL Editor
3. **Verify in Table Editor**: Always check the created tables
4. **Use TypeScript types**: Generate types from Supabase for type-safe queries
5. **Test RLS policies**: Ensure data access is properly restricted

---

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Lovable Docs**: https://docs.lovable.dev
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

_End of Database Schema Documentation_

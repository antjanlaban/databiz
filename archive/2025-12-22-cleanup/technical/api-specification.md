# API Specification

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Het Van Kruiningen PIM gebruikt **Supabase auto-generated REST API** (PostgREST) voor alle database operaties. Single-tenant architectuur voor Van Kruiningen intern gebruik.

**Base URL:** `https://[project-ref].supabase.co/rest/v1/`  
**Authentication:** JWT Bearer token in header (admin/user roles)  
**Content-Type:** `application/json`  
**Authorization:** Admin role required voor write operations

---

## Authentication

### Headers

```http
Authorization: Bearer [JWT_TOKEN]
apikey: [SUPABASE_ANON_KEY]
Content-Type: application/json
Prefer: return=representation
```

### Token Source

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Standard Endpoints (PostgREST)

### Pattern

```
GET    /[table_name]                 // List records
GET    /[table_name]?id=eq.[value]   // Get by ID
POST   /[table_name]                 // Create
PATCH  /[table_name]?id=eq.[value]   // Update
DELETE /[table_name]?id=eq.[value]   // Delete
```

---

## Core Resources

### 1. Product Styles

**List Styles**

```http
GET /product_styles?select=*,brand:brands(brand_name),supplier:suppliers(supplier_name)
  &product_type=eq.KERN
  &is_active=eq.true
  &order=style_name.asc
  &limit=20
  &offset=0
```

**Create Style**

```http
POST /product_styles
{
  "style_name": "Professional Werkbroek",
  "brand_id": 1,
  "supplier_article_code": "PRO-WB-001",
  "product_type": "KERN",
  "material_composition": "65% Polyester, 35% Katoen",
  "is_active": true
}
```

**Response:** 201 Created

```json
{
  "style_id": 123,
  "style_name": "Professional Werkbroek",
  "brand_id": 1,
  "supplier_article_code": "PRO-WB-001",
  "created_at": "2025-10-17T10:00:00Z"
}
```

---

### 2. Color Variants

**List Variants for Style**

```http
GET /color_variants?select=*,color_family:color_families(family_name_nl)
  &style_id=eq.123
  &is_active=eq.true
```

**Create Variant**

```http
POST /color_variants
{
  "style_id": 123,
  "color_code": "NAV",
  "color_family_id": 5,
  "color_name_nl": "Donkerblauw",
  "color_name_supplier": "Navy",
  "hex_color": "#000080",
  "is_active": true
}
```

---

### 3. Product SKUs

**List SKUs with Stock**

```http
GET /product_skus?select=*,color_variant:color_variants(color_name_nl),style:product_styles(style_name)
  &is_active=eq.true
  &is_published=eq.true
  &stock_available=gt.0
  &order=sku_code.asc
```

**Create SKU**

```http
POST /product_skus
{
  "color_variant_id": 456,
  "style_id": 123,
  "ean": "8712345678901",
  "sku_code": "PRO-WB-001-NAV-48",
  "size_code": "48",
  "selling_price_excl_vat": 44.95,
  "vat_rate": 21.00,
  "stock_quantity": 50,
  "is_active": true,
  "is_published": true
}
```

**Update Price**

```http
PATCH /product_skus?sku_id=eq.789
{
  "selling_price_excl_vat": 39.95,
  "sales_discount_amount": 5.00,
  "discount_valid_until": "2025-12-31"
}
```

---

### 4. Search & Filtering

**Search Products**

```http
GET /product_skus?select=*,color_variant(*),style(*)
  &or=(sku_code.ilike.*POLO*,style.style_name.ilike.*POLO*)
  &is_active=eq.true
```

**Filter by Price Range**

```http
GET /product_skus
  &selling_price_excl_vat=gte.20
  &selling_price_excl_vat=lte.50
```

**Filter by Multiple Values**

```http
GET /product_skus
  &size_code=in.(S,M,L,XL)
  &color_variant.color_family_id=in.(1,2,3)
```

---

## Query Operators

| Operator | Example                | Description                      |
| -------- | ---------------------- | -------------------------------- |
| `eq`     | `?id=eq.5`             | Equals                           |
| `neq`    | `?id=neq.5`            | Not equals                       |
| `gt`     | `?price=gt.50`         | Greater than                     |
| `gte`    | `?price=gte.50`        | Greater than or equal            |
| `lt`     | `?price=lt.100`        | Less than                        |
| `lte`    | `?price=lte.100`       | Less than or equal               |
| `like`   | `?name=like.*polo*`    | Pattern match (case-sensitive)   |
| `ilike`  | `?name=ilike.*POLO*`   | Pattern match (case-insensitive) |
| `in`     | `?size=in.(S,M,L)`     | In list                          |
| `is`     | `?field=is.null`       | Is null/not null                 |
| `or`     | `?or=(a.eq.1,b.eq.2)`  | OR condition                     |
| `and`    | `?and=(a.eq.1,b.eq.2)` | AND condition (default)          |

---

## Pagination

```http
GET /product_skus
  ?limit=20
  &offset=40
  &order=created_at.desc
```

**Response Headers:**

```
Content-Range: 40-59/150
```

---

## Relationships (Joins)

**Embed Related Data**

```http
GET /product_skus?select=
  sku_code,
  selling_price_excl_vat,
  color_variant:color_variants(color_name_nl),
  style:product_styles(style_name,brand:brands(brand_name))
```

**Response:**

```json
[
  {
    "sku_code": "PRO-WB-001-NAV-48",
    "selling_price_excl_vat": 44.95,
    "color_variant": {
      "color_name_nl": "Donkerblauw"
    },
    "style": {
      "style_name": "Professional Werkbroek",
      "brand": {
        "brand_name": "Tricorp"
      }
    }
  }
]
```

---

## Bulk Operations

**Bulk Insert**

```http
POST /product_skus
[
  {"sku_code": "SKU-001", "selling_price_excl_vat": 10},
  {"sku_code": "SKU-002", "selling_price_excl_vat": 20},
  {"sku_code": "SKU-003", "selling_price_excl_vat": 30}
]
```

**Bulk Update**

```http
PATCH /product_skus?style_id=eq.123
{
  "is_active": false
}
```

---

## Edge Functions (Custom Logic)

### Authentication - Invite User (Admin Only)

```http
POST https://[project-ref].supabase.co/functions/v1/auth-invite
Authorization: Bearer [JWT_TOKEN]
Require-Admin: true

{
  "email": "collega@vankruiningen.nl",
  "role": "user"
}
```

**Response:**

```json
{
  "invite_id": "uuid",
  "email": "collega@vankruiningen.nl",
  "invite_token": "uuid",
  "expires_at": "2025-10-24T10:00:00Z"
}
```

### Authentication - Accept Invite

```http
POST https://[project-ref].supabase.co/functions/v1/auth-accept-invite

{
  "invite_token": "uuid",
  "password": "secure-password"
}
```

**Response:**

```json
{
  "user_id": "uuid",
  "email": "collega@vankruiningen.nl",
  "role": "user",
  "access_token": "jwt-token"
}
```

### Import Products (Admin Only)

```http
POST https://[project-ref].supabase.co/functions/v1/import-products
Authorization: Bearer [JWT_TOKEN]
Require-Admin: true

{
  "file_path": "imports/upload-123.xlsx",
  "template_id": "uuid"
}
```

**Response:**

```json
{
  "job_id": 456,
  "status": "processing",
  "estimated_rows": 1500
}
```

### Export to Gripp

```http
POST https://[project-ref].supabase.co/functions/v1/export-gripp
Authorization: Bearer [JWT_TOKEN]

{
  "export_type": "full_sync"
}
```

**Response:**

```json
{
  "job_id": 789,
  "status": "completed",
  "exported_count": 1245,
  "errors": []
}
```

---

## Real-time Subscriptions

**Subscribe to Import Progress**

```typescript
const subscription = supabase
  .channel('import-progress')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'import_jobs',
      filter: `job_id=eq.${jobId}`
    },
    (payload) => {
      console.log('Progress:', payload.new.progress_percentage);
    }
  )
  .subscribe();
```

---

## Error Responses

**400 Bad Request**

```json
{
  "code": "PGRST116",
  "details": "Results contain 0 rows, unexpected for count=eq.1",
  "hint": null,
  "message": "The result contains 0 rows"
}
```

**401 Unauthorized**

```json
{
  "message": "JWT expired"
}
```

**409 Conflict**

```json
{
  "code": "23505",
  "details": "Key (sku_code)=(PRO-WB-001-NAV-48) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"product_skus_sku_code_key\""
}
```

---

## Rate Limits

**Supabase Limits:**

- Free tier: 500 req/sec
- Pro tier: 10K req/sec
- No per-user limits

**Best Practices:**

- Batch operations waar mogelijk
- Gebruik pagination
- Cache met TanStack Query (5 min stale time)

---

## Client Examples

### TypeScript (Supabase Client)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Query
const { data, error } = await supabase
  .from('product_skus')
  .select('*, color_variant(*), style(*)')
  .eq('is_active', true)
  .limit(20);
```

### cURL

```bash
curl -X GET 'https://[project].supabase.co/rest/v1/product_skus?select=*&limit=10' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

_API evolves with PostgREST updates. Check Supabase docs for latest features._

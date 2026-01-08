# Catalog Domain - Product Browsing & Search

**Domain Code**: `CAT`  
**Status**: Planning  
**Created**: December 18, 2025  
**Author**: AI-DIRECTOR

---

## 1. Domain Overview

The **Catalog** domain provides lightning-fast product browsing and search across active supplier datasets. It is specifically designed for hierarchical Master → Variant navigation with diverse display options.

### Core Philosophy
> "A user should find any product in under 500ms, whether searching by master, color, size, or EAN."

### Key Characteristics
- **Read-optimized**: No writes through this domain
- **Hierarchical**: Master → Colors → Sizes navigation
- **Cross-supplier**: View all products or filter by supplier/brand
- **Image-aware**: Configurable image inclusion with "first image" fallback to master
- **Blazing fast**: Cursor-based pagination, indexed queries, denormalized views

---

## 2. Business Context

### User Scenarios

1. **Supplier Sales Rep**: "I want to quickly show a customer our Puma collection, filtered by size XL"
2. **Buyer**: "I need to find all products from FHB brand across all suppliers"
3. **Product Manager**: "I want to browse Tricorp masters and drill into each color/size combination"
4. **Quick Lookup**: "Find product by EAN 8714231234567 and show me the master it belongs to"

### Navigation Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│  CATALOG VIEW                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  [All Suppliers ▼]  [All Brands ▼]  [🔍 Search...]                 │
│                                                                     │
│  Tabs: │ All │ FHB │ Tricorp │ Puma │ Sixton │                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FILTERS                      PRODUCTS                              │
│  ┌──────────────┐            ┌──────────────────────────────────┐  │
│  │ Colors       │            │ ┌────┐ Master Product A          │  │
│  │ ☑ Black (45) │            │ │IMG │ Brand: FHB                │  │
│  │ ☑ Blue  (32) │            │ └────┘ Colors: 5 | Sizes: 8      │  │
│  │ ☐ Red   (18) │            │        Variants: 40              │  │
│  │              │            ├──────────────────────────────────┤  │
│  │ Sizes        │            │ ┌────┐ Master Product B          │  │
│  │ ☐ S (20)     │            │ │IMG │ Brand: Tricorp            │  │
│  │ ☑ M (35)     │            │ └────┘ Colors: 3 | Sizes: 6      │  │
│  │ ☑ L (40)     │            │        Variants: 18              │  │
│  │ ☑ XL(25)     │            └──────────────────────────────────┘  │
│  └──────────────┘                                                   │
│                               [Load More...] or [Page 1/50]         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model Understanding

### Source Tables (from Imports domain)
```
suppliers
    └── datasets (status='active')
            └── supplier_products (master level)
                    ├── brand_raw
                    ├── productgroup_raw
                    └── supplier_variants (variant level)
                            ├── ean
                            ├── color_raw
                            ├── size_raw
                            └── image_url
```

### Key Relationships
- **Supplier** → has many **Datasets** (only ACTIVE ones visible in catalog)
- **Dataset** → has many **SupplierProducts** (master level)
- **SupplierProduct** → has many **SupplierVariants** (color/size combinations)
- Each **SupplierVariant** has a unique EAN

### Image Strategy
1. **Variant-level image**: `supplier_variants.image_url`
2. **Master-level fallback**: First non-null `image_url` from variants
3. **No image placeholder**: Return null, frontend handles placeholder

---

## 4. API Design Principles

### Speed Requirements
| Operation | Target | Strategy |
|-----------|--------|----------|
| Search query | <200ms | Full-text index + LIMIT |
| List masters | <100ms | Cursor pagination |
| Get master + variants | <150ms | Single query with JOINs |
| Filter by color/size | <150ms | GIN indexes on arrays |
| Count aggregations | <300ms | Materialized view (optional) |

### Pagination Strategies

1. **Cursor-based (default)**: For infinite scroll
   ```json
   {
     "items": [...],
     "next_cursor": "eyJpZCI6IjEyMzQ1In0=",
     "has_more": true
   }
   ```

2. **Offset-based (optional)**: For paged navigation
   ```json
   {
     "items": [...],
     "page": 1,
     "page_size": 20,
     "total_count": 1234,
     "total_pages": 62
   }
   ```

### Response Shaping Options
```
?include_images=true|false        # Include image_url fields
?include_variants=true|false      # Include full variant list
?include_variant_counts=true      # Include color/size counts only
?first_image_only=true            # Only first image per master
```

---

## 5. Epic & Feature Breakdown

### Epic: Product Search (`CAT-SEARCH`)
Fast full-text search across product data.

### Epic: Product Browsing (`CAT-BROWSE`)
Hierarchical navigation with filters.

### Epic: Master-Variant Navigation (`CAT-MASTER`)
Drill-down from master to variants.

### Epic: Cross-Supplier Views (`CAT-CROSS`)
Aggregate views across suppliers/brands.

---

## 6. Technical Architecture

### Backend Structure
```
backend/src/domains/catalog/
├── __init__.py
├── models.py              # Views/denormalized tables if needed
├── search/
│   ├── router.py          # Search endpoints
│   ├── service.py         # Search logic
│   └── schemas.py         # Request/response models
├── browse/
│   ├── router.py          # Browse endpoints
│   ├── service.py         # Browse logic
│   └── schemas.py         # Pagination, filters
├── master_detail/
│   ├── router.py          # Master + variants endpoints
│   ├── service.py         # Aggregation logic
│   └── schemas.py         # Master with variants response
└── shared/
    ├── filters.py         # Color, size, brand filters
    ├── pagination.py      # Cursor & offset pagination
    └── image_resolver.py  # Image URL resolution
```

### Frontend Structure
```
frontend/src/
├── pages/
│   └── CatalogPage.tsx           # Main catalog page (routing only)
└── features/
    └── catalog/
        ├── CatalogLayout.tsx      # Layout with sidebar + main
        ├── ProductGrid.tsx        # Grid view component
        ├── ProductList.tsx        # List view component
        ├── ProductCard.tsx        # Single product card
        ├── MasterDetail.tsx       # Master + variants expansion
        ├── FilterSidebar.tsx      # Color/size/brand filters
        ├── SearchBar.tsx          # Search input with debounce
        ├── InfiniteScroll.tsx     # Infinite scroll wrapper
        ├── Pagination.tsx         # Traditional pagination
        ├── BrandTabs.tsx          # Brand tab navigation
        ├── hooks/
        │   ├── useCatalogSearch.ts
        │   ├── useMasterDetail.ts
        │   └── useFilters.ts
        └── api/
            └── catalog-api.ts     # API client
```

---

## 7. Index Strategy

### Required Database Indexes
```sql
-- Full-text search (PostgreSQL)
CREATE INDEX idx_supplier_products_search 
ON supplier_products 
USING GIN(to_tsvector('simple', 
    COALESCE(brand_raw, '') || ' ' || 
    COALESCE(productgroup_raw, '')
));

-- Fast variant lookups
CREATE INDEX idx_supplier_variants_ean ON supplier_variants(ean);
CREATE INDEX idx_supplier_variants_product ON supplier_variants(supplier_product_id);
CREATE INDEX idx_supplier_variants_color ON supplier_variants(color_raw);
CREATE INDEX idx_supplier_variants_size ON supplier_variants(size_raw);

-- Active dataset filtering
CREATE INDEX idx_datasets_active ON datasets(status) WHERE status = 'active';
CREATE INDEX idx_supplier_products_dataset ON supplier_products(dataset_id);
```

---

## 8. Performance Considerations

### Query Optimization
1. **Eager load variants**: Use `joinedload` for master+variants
2. **Limit variant count**: Return first N variants with `has_more` flag
3. **Aggregate in DB**: Use `COUNT`, `ARRAY_AGG` for color/size lists
4. **Avoid N+1**: Never load variants in a loop

### Caching Strategy (Future)
- Redis cache for filter counts (colors, sizes per dataset)
- Cache popular search terms
- Invalidate on dataset activation

---

## 9. Frontend Display Variants

### View Modes
1. **Grid View**: Cards with image, name, variant counts
2. **List View**: Compact rows with more detail
3. **Table View**: Spreadsheet-like for power users
4. **Compact View**: Thumbnails only with hover details

### Master Expansion Modes
1. **Inline expand**: Click master to show variants below
2. **Side panel**: Click master to show variants in right panel
3. **Modal**: Full variant details in modal
4. **New page**: Navigate to master detail page

---

## 10. Related Documents

- [CAT-001 to CAT-015 User Stories](./CAT_USER_STORIES.md)
- [Imports Domain Registry](../../DOMAIN_REGISTRY.yaml)
- [Frontend Architecture Guide](../../../.ai/company/FRONTEND_GUIDE.md)

---

## 11. Open Questions

1. **Denormalized View**: Create materialized view for catalog? (Performance vs. complexity)
2. **Image Proxy**: Should we proxy external images for security/caching?
3. **Search Provider**: Start with PostgreSQL FTS, migrate to Elasticsearch later?
4. **Real-time Updates**: Websocket updates when dataset activates?

---

**Next Step**: Generate detailed User Stories in `CAT_USER_STORIES.md`

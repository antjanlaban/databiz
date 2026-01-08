# Catalog Domain - User Stories

**Domain**: Catalog (CAT)  
**Epic Coverage**: Search, Browse, Master-Variant Navigation, Cross-Supplier Views  
**Total Stories**: 15  
**Status**: Planning  
**Created**: December 18, 2025

---

## Epic: Product Search (`CAT-SEARCH`)

### CAT-SEARCH-FULL-001: Full-Text Product Search
**Story**: As a User, I want to search for products by name, brand, or product group, so that I can quickly find specific products.

**Acceptance Criteria**:
- AC1: Search input with debounce (300ms)
- AC2: Searches across `brand_raw` and `productgroup_raw` fields
- AC3: Results show master products with variant counts
- AC4: Case-insensitive, matches partial words
- AC5: Response time <200ms for typical queries
- AC6: Returns max 100 results per query

**API Design**:
```
GET /api/v1/catalog/search?q={query}&limit={n}&cursor={token}

Response:
{
  "items": [
    {
      "master_id": "uuid",
      "brand": "FHB",
      "product_group": "T-Shirt",
      "supplier_name": "FHB Supplier",
      "dataset_id": "uuid",
      "variant_count": 24,
      "color_count": 4,
      "size_count": 6,
      "first_image_url": "https://...",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ],
  "next_cursor": "eyJpZCI6IjEyMzQ1In0=",
  "has_more": true
}
```

**Performance**:
- PostgreSQL full-text search index
- LIMIT 100 on queries
- Cursor-based pagination

**Frontend**:
- `SearchBar.tsx` with debounce
- `useCatalogSearch.ts` hook

---

### CAT-SEARCH-EAN-002: Search by EAN
**Story**: As a User, I want to search by EAN barcode, so that I can find a specific variant and its master product.

**Acceptance Criteria**:
- AC1: Accepts 8-13 digit EAN input
- AC2: Returns variant + parent master product
- AC3: Shows "belongs to master X" link
- AC4: Exact match only (no fuzzy)
- AC5: Response time <50ms

**API Design**:
```
GET /api/v1/catalog/search/ean/{ean}

Response:
{
  "variant": {
    "ean": "8714231234567",
    "color": "Blue",
    "size": "XL",
    "image_url": "https://...",
    "is_active": true
  },
  "master": {
    "master_id": "uuid",
    "brand": "Tricorp",
    "product_group": "Polo Shirt",
    "supplier_name": "Tricorp",
    "total_variants": 18
  }
}
```

**Index**: `CREATE INDEX idx_supplier_variants_ean ON supplier_variants(ean);`

---

### CAT-SEARCH-ADV-003: Advanced Search with Filters
**Story**: As a User, I want to combine search with filters (color, size, brand), so that I can narrow down results precisely.

**Acceptance Criteria**:
- AC1: Search query + color filter
- AC2: Search query + size filter
- AC3: Search query + brand filter
- AC4: Multiple filters can be combined (AND logic)
- AC5: Filter counts show available options

**API Design**:
```
GET /api/v1/catalog/search?q={query}&colors={blue,black}&sizes={M,L}&brand={FHB}

Response:
{
  "items": [...],
  "filters_applied": {
    "colors": ["blue", "black"],
    "sizes": ["M", "L"],
    "brand": "FHB"
  },
  "available_filters": {
    "colors": [
      {"name": "blue", "count": 12},
      {"name": "black", "count": 8}
    ],
    "sizes": [
      {"name": "M", "count": 15},
      {"name": "L", "count": 10}
    ]
  }
}
```

---

## Epic: Product Browsing (`CAT-BROWSE`)

### CAT-BROWSE-LIST-001: List All Master Products
**Story**: As a User, I want to see all master products from active datasets, so that I can browse the complete catalog.

**Acceptance Criteria**:
- AC1: Shows only products from datasets with `status='active'`
- AC2: Paginated (cursor or offset)
- AC3: Sorted by `created_at DESC` (newest first)
- AC4: Includes variant counts (colors, sizes)
- AC5: Response time <100ms

**API Design**:
```
GET /api/v1/catalog/products?limit={n}&cursor={token}

Response:
{
  "items": [
    {
      "master_id": "uuid",
      "brand": "Puma",
      "product_group": "Sneakers",
      "supplier_name": "Puma Supplier",
      "variant_count": 48,
      "color_count": 8,
      "size_count": 12,
      "first_image_url": "https://..."
    }
  ],
  "next_cursor": "...",
  "has_more": true
}
```

**Frontend**:
- `ProductGrid.tsx` or `ProductList.tsx`
- `InfiniteScroll.tsx` wrapper

---

### CAT-BROWSE-SUPP-002: Browse by Supplier
**Story**: As a User, I want to view products from a specific supplier, so that I can focus on one supplier's catalog.

**Acceptance Criteria**:
- AC1: Filter by supplier_id
- AC2: Shows supplier name in breadcrumb
- AC3: Only active datasets from that supplier
- AC4: Paginated like CAT-BROWSE-LIST-001

**API Design**:
```
GET /api/v1/catalog/suppliers/{supplier_id}/products?limit={n}&cursor={token}
```

---

### CAT-BROWSE-BRAND-003: Browse by Brand (Cross-Supplier)
**Story**: As a User, I want to view all products from a specific brand across all suppliers, so that I can see the complete brand catalog.

**Acceptance Criteria**:
- AC1: Filter by brand name (e.g., "FHB")
- AC2: Aggregates across all active datasets
- AC3: Groups by supplier (shows which supplier has this brand)
- AC4: Paginated

**API Design**:
```
GET /api/v1/catalog/brands/{brand_name}/products?limit={n}&cursor={token}

Response:
{
  "brand": "FHB",
  "items": [
    {
      "master_id": "uuid",
      "product_group": "Work Pants",
      "supplier_name": "FHB Direct",
      "dataset_id": "uuid",
      "variant_count": 30
    }
  ],
  "suppliers_count": 2  // FHB available from 2 suppliers
}
```

---

### CAT-BROWSE-TABS-004: Brand Tabs Navigation
**Story**: As a User, I want to see brand tabs at the top of the catalog, so that I can quickly switch between brands.

**Acceptance Criteria**:
- AC1: Tabs show top 10 brands by product count
- AC2: "All" tab shows all products
- AC3: Tab includes product count badge
- AC4: Active tab is highlighted
- AC5: Tab order: alphabetical

**Frontend**:
- `BrandTabs.tsx`
- Dynamic tab generation from API

**API Design**:
```
GET /api/v1/catalog/brands/summary

Response:
{
  "brands": [
    {"name": "FHB", "product_count": 123},
    {"name": "Tricorp", "product_count": 89},
    {"name": "Puma", "product_count": 67}
  ]
}
```

---

## Epic: Master-Variant Navigation (`CAT-MASTER`)

### CAT-MASTER-DETAIL-001: Get Master Product with Variants
**Story**: As a User, I want to view a master product and all its variants, so that I can see all available colors and sizes.

**Acceptance Criteria**:
- AC1: Single API call returns master + all variants
- AC2: Variants grouped by color, then size
- AC3: Shows image for each variant (if available)
- AC4: EAN visible for each variant
- AC5: Response time <150ms

**API Design**:
```
GET /api/v1/catalog/products/{master_id}

Response:
{
  "master": {
    "id": "uuid",
    "brand": "Tricorp",
    "product_group": "T-Shirt Premium",
    "supplier_name": "Tricorp",
    "dataset_id": "uuid"
  },
  "variants": [
    {
      "ean": "8714231111111",
      "color": "Blue",
      "size": "M",
      "image_url": "https://...",
      "is_active": true
    },
    {
      "ean": "8714231111112",
      "color": "Blue",
      "size": "L",
      "image_url": "https://...",
      "is_active": true
    }
  ],
  "variant_counts": {
    "total": 24,
    "colors": 4,
    "sizes": 6
  }
}
```

**Query Optimization**:
- Use `joinedload(SupplierProduct.variants)`
- Single SQL query with JOIN

---

### CAT-MASTER-COLLAPSE-002: Expandable Master Product Cards
**Story**: As a User, I want to expand a master product card to see variants inline, so that I don't need to navigate to a new page.

**Acceptance Criteria**:
- AC1: Click on card shows expand/collapse icon
- AC2: Variants appear below the master card
- AC3: Variants grouped by color with size list
- AC4: Smooth animation (CSS transition)
- AC5: Only one expanded card at a time

**Frontend**:
- `ProductCard.tsx` with expand state
- `MasterDetail.tsx` for variant display

---

### CAT-MASTER-GROUP-003: Group Variants by Color → Size
**Story**: As a User, I want to see variants grouped first by color, then by size, so that I can easily navigate color-size combinations.

**Acceptance Criteria**:
- AC1: Variants grouped: Color → Sizes
- AC2: Color swatch or name shown
- AC3: Size list horizontal (S M L XL XXL)
- AC4: Click size to see EAN + image
- AC5: "Out of stock" shown for inactive variants

**Frontend Structure**:
```tsx
<VariantGroup>
  <ColorRow color="Blue">
    <SizeButton size="M" ean="..." />
    <SizeButton size="L" ean="..." />
    <SizeButton size="XL" ean="..." disabled />
  </ColorRow>
  <ColorRow color="Black">
    <SizeButton size="M" ean="..." />
    <SizeButton size="L" ean="..." />
  </ColorRow>
</VariantGroup>
```

---

## Epic: Filtering & Sorting (`CAT-FILTER`)

### CAT-FILTER-COLOR-001: Filter by Color
**Story**: As a User, I want to filter products by color, so that I only see products available in my desired color.

**Acceptance Criteria**:
- AC1: Checkbox list of available colors
- AC2: Shows product count per color
- AC3: Multiple colors can be selected (OR logic)
- AC4: Filters only master products that have variants in selected colors
- AC5: Filter persists during navigation

**API Design**:
```
GET /api/v1/catalog/products?colors={blue,black}

# Backend logic:
# WHERE EXISTS (
#   SELECT 1 FROM supplier_variants sv
#   WHERE sv.supplier_product_id = sp.id
#   AND sv.color_raw IN ('blue', 'black')
# )
```

**Frontend**:
- `FilterSidebar.tsx` with color checkboxes
- `useFilters.ts` hook for state management

---

### CAT-FILTER-SIZE-002: Filter by Size
**Story**: As a User, I want to filter products by size, so that I only see products available in my size.

**Acceptance Criteria**:
- AC1: Checkbox list of available sizes
- AC2: Shows product count per size
- AC3: Multiple sizes can be selected (OR logic)
- AC4: Size order: XS, S, M, L, XL, XXL, XXXL
- AC5: Custom sizes shown alphabetically after standard sizes

**API Design**:
```
GET /api/v1/catalog/products?sizes={M,L,XL}
```

---

### CAT-FILTER-CLEAR-003: Clear All Filters
**Story**: As a User, I want to clear all active filters with one click, so that I can reset my search.

**Acceptance Criteria**:
- AC1: "Clear all" button visible when filters active
- AC2: Resets to default view (all products)
- AC3: URL params are cleared
- AC4: Smooth transition (no flash)

**Frontend**:
- Button in `FilterSidebar.tsx`
- `useFilters.ts` clearAll() function

---

### CAT-FILTER-COUNTS-004: Dynamic Filter Counts
**Story**: As a User, I want to see how many products match each filter option, so that I can make informed filter choices.

**Acceptance Criteria**:
- AC1: Each filter option shows count (e.g., "Blue (23)")
- AC2: Counts update when other filters are applied
- AC3: Zero-count options are shown but disabled
- AC4: Counts recalculated on backend (not cached)

**Performance**:
- Use subqueries with COUNT DISTINCT
- Consider Redis cache for popular filter combinations

---

## Epic: Pagination & Views (`CAT-PAGE`)

### CAT-PAGE-INFINITE-001: Infinite Scroll
**Story**: As a User, I want products to load automatically as I scroll, so that I don't need to click "Next page".

**Acceptance Criteria**:
- AC1: Detects scroll position near bottom (200px threshold)
- AC2: Loads next batch of products (20-50 items)
- AC3: Shows loading spinner while fetching
- AC4: Prevents duplicate requests
- AC5: Works with filters and search

**Frontend**:
- `InfiniteScroll.tsx` component
- Intersection Observer API
- Cursor-based pagination from API

**API Design**:
```
GET /api/v1/catalog/products?cursor={token}&limit=20

Response includes:
{
  "next_cursor": "eyJpZCI6IjEyMzQ1In0=",
  "has_more": true
}
```

---

### CAT-PAGE-OFFSET-002: Traditional Pagination
**Story**: As a User, I want to navigate by page numbers, so that I can jump to specific pages.

**Acceptance Criteria**:
- AC1: Shows current page and total pages
- AC2: "Previous" and "Next" buttons
- AC3: Jump to page input (e.g., "Go to page 5")
- AC4: URL includes page number for bookmarking
- AC5: Page size options: 20, 50, 100

**API Design**:
```
GET /api/v1/catalog/products?page={n}&page_size={size}

Response:
{
  "items": [...],
  "page": 1,
  "page_size": 20,
  "total_count": 1234,
  "total_pages": 62
}
```

**Frontend**:
- `Pagination.tsx` component
- Query params: `?page=1&page_size=20`

---

### CAT-PAGE-VIEW-003: Toggle View Mode (Grid/List)
**Story**: As a User, I want to switch between grid and list views, so that I can choose my preferred display format.

**Acceptance Criteria**:
- AC1: Toggle button in toolbar (Grid icon / List icon)
- AC2: Grid view: 3-4 cards per row with images
- AC3: List view: Compact rows with more details
- AC4: View preference saved in localStorage
- AC5: Smooth transition between views

**Frontend**:
- `ProductGrid.tsx` for grid view
- `ProductList.tsx` for list view
- `useCatalogView.ts` hook for state

---

## Implementation Priority

### Phase 1 (MVP - Week 1)
1. CAT-BROWSE-LIST-001: List all master products ✅
2. CAT-MASTER-DETAIL-001: Get master with variants ✅
3. CAT-SEARCH-FULL-001: Full-text search ✅
4. CAT-PAGE-INFINITE-001: Infinite scroll ✅

### Phase 2 (Filters - Week 2)
5. CAT-FILTER-COLOR-001: Filter by color ✅
6. CAT-FILTER-SIZE-002: Filter by size ✅
7. CAT-BROWSE-SUPP-002: Browse by supplier ✅
8. CAT-FILTER-CLEAR-003: Clear filters ✅

### Phase 3 (Advanced - Week 3)
9. CAT-BROWSE-BRAND-003: Cross-supplier brand view ✅
10. CAT-BROWSE-TABS-004: Brand tabs ✅
11. CAT-MASTER-COLLAPSE-002: Expandable cards ✅
12. CAT-MASTER-GROUP-003: Group by color/size ✅

### Phase 4 (Polish - Week 4)
13. CAT-SEARCH-EAN-002: EAN search ✅
14. CAT-SEARCH-ADV-003: Advanced search ✅
15. CAT-PAGE-VIEW-003: Grid/List toggle ✅

---

## Related Documents
- [Catalog Domain Overview](./CATALOG_DOMAIN.md)
- [Domain Registry](../../DOMAIN_REGISTRY.yaml)
- [Frontend Architecture](../../../.ai/company/FRONTEND_GUIDE.md)

---

**Status**: Ready for registry insertion and backend implementation

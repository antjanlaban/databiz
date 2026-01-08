# Catalog Domain - Backend Implementation Status

**Created**: December 18, 2025  
**Status**: Phase 1 Complete (Browse + Master Detail)  
**Performance**: Optimized for <150ms response times  

---

## ✅ Completed Features

### 1. Browse Products (CAT-BROWSE)

**Endpoints**:
```
GET /api/v1/catalog/products
  - Pagination: Cursor (infinite scroll) OR Offset (page numbers)
  - Filters: supplier_id, brand, colors[], sizes[]
  - Options: include_images
  - Response: MasterProductSummary[]

GET /api/v1/catalog/suppliers/{id}/products
  - Cursor pagination only
  - Auto-filtered by supplier_id

GET /api/v1/catalog/brands/{name}/products
  - Cross-supplier brand view
  - Cursor pagination

GET /api/v1/catalog/brands/summary
  - Top 10 brands with counts
  - For brand tabs UI
```

**User Stories Completed**:
- ✅ CAT-BROWSE-LIST-001: List all master products
- ✅ CAT-BROWSE-SUPP-002: Browse by supplier
- ✅ CAT-BROWSE-BRAND-003: Browse by brand (cross-supplier)
- ✅ CAT-BROWSE-TABS-004: Brand tabs navigation

**Performance Optimizations**:
- Eager loading with `joinedload` (single SQL query)
- Cursor-based pagination (no COUNT needed)
- Indexed queries on `dataset.status`, `supplier_product.dataset_id`
- Color/size filters use subqueries with IN clause
- Image resolution: first non-null variant image

---

### 2. Master Detail (CAT-MASTER)

**Endpoints**:
```
GET /api/v1/catalog/products/{master_id}
  - Single query with eager loading
  - Returns all variants with EAN, color, size, image
  - Includes variant counts

GET /api/v1/catalog/products/{master_id}/grouped
  - Variants grouped by color → sizes
  - Sizes sorted (XS, S, M, L, XL, XXL, XXXL, custom)
  - Optimized for UI display
```

**User Stories Completed**:
- ✅ CAT-MASTER-DETAIL-001: Get master with all variants
- ✅ CAT-MASTER-GROUP-003: Group variants by color/size

**Performance Optimizations**:
- Single query with `joinedload(variants, supplier, dataset)`
- In-memory grouping (fast for typical variant counts <100)
- Size sorting with standard order + custom alphabetical

---

## 📁 File Structure

```
backend/src/domains/catalog/
├── __init__.py
├── browse/
│   ├── __init__.py
│   ├── router.py          ✅ 4 endpoints
│   ├── service.py         ✅ cursor + offset pagination
│   └── schemas.py         ✅ request/response models
├── master_detail/
│   ├── __init__.py
│   ├── router.py          ✅ 2 endpoints
│   ├── service.py         ✅ master detail + grouped
│   └── schemas.py         ✅ variant models
└── shared/
    ├── __init__.py
    ├── pagination.py      ✅ cursor/offset utilities
    ├── filters.py         ✅ filter models + size sorting
    └── image_resolver.py  ✅ image URL resolution
```

**Router Registration**: ✅ Registered in `backend/src/main.py`

---

## 🔍 Query Performance Analysis

### Browse Query (No Filters)
```sql
-- Cursor pagination
SELECT sp.*, s.name as supplier_name
FROM supplier_products sp
JOIN datasets d ON d.id = sp.dataset_id
JOIN suppliers s ON s.id = d.supplier_id
WHERE d.status = 'active'
  AND sp.id < {cursor_id}  -- cursor filter
ORDER BY sp.created_at DESC
LIMIT 21  -- +1 for has_more check

-- Indexes used:
-- - idx_datasets_active (WHERE d.status = 'active')
-- - idx_supplier_products_dataset (JOIN)
-- - primary key on sp.id (cursor filter)
```

**Estimated time**: 50-100ms (with 10K products)

---

### Browse Query (With Color/Size Filters)
```sql
SELECT sp.*, s.name as supplier_name
FROM supplier_products sp
JOIN datasets d ON d.id = sp.dataset_id
JOIN suppliers s ON s.id = d.supplier_id
WHERE d.status = 'active'
  AND sp.id IN (
    SELECT supplier_product_id FROM supplier_variants
    WHERE LOWER(color_raw) IN ('blue', 'black')
  )
  AND sp.id IN (
    SELECT supplier_product_id FROM supplier_variants
    WHERE LOWER(size_raw) IN ('m', 'l', 'xl')
  )
ORDER BY sp.created_at DESC
LIMIT 21

-- Indexes used:
-- - idx_supplier_variants_color (color filter)
-- - idx_supplier_variants_size (size filter)
-- - idx_supplier_variants_product (JOIN back to master)
```

**Estimated time**: 100-150ms (with filters)

---

### Master Detail Query
```sql
SELECT sp.*, s.name, d.id as dataset_id, sv.*
FROM supplier_products sp
LEFT JOIN supplier_variants sv ON sv.supplier_product_id = sp.id
JOIN suppliers s ON s.id = sp.supplier_id
JOIN datasets d ON d.id = sp.dataset_id
WHERE sp.id = {master_id}

-- Eager loading with joinedload:
-- - Single query, no N+1
-- - Typically returns 10-100 variants
```

**Estimated time**: 50-150ms (depends on variant count)

---

## 🚀 Next Phase: Search & Advanced Features

### Phase 2: Search (Not Yet Implemented)

**Planned Endpoints**:
```
GET /api/v1/catalog/search?q={query}
  - Full-text search on brand_raw + productgroup_raw
  - PostgreSQL ts_vector index
  - Target: <200ms

GET /api/v1/catalog/search/ean/{ean}
  - Exact EAN match
  - Returns variant + master
  - Target: <50ms
```

**Required Indexes**:
```sql
CREATE INDEX idx_supplier_products_search
ON supplier_products
USING GIN(to_tsvector('simple',
    COALESCE(brand_raw, '') || ' ' ||
    COALESCE(productgroup_raw, '')
));

CREATE INDEX idx_supplier_variants_ean
ON supplier_variants(ean);
```

**User Stories Pending**:
- ⏳ CAT-SEARCH-FULL-001: Full-text product search
- ⏳ CAT-SEARCH-EAN-002: Search by EAN
- ⏳ CAT-SEARCH-ADV-003: Advanced search with filters

---

### Phase 3: Filter Enhancements

**Planned Features**:
- ⏳ CAT-FILTER-COLOR-001: Dedicated filter endpoint
- ⏳ CAT-FILTER-SIZE-002: Size filter endpoint
- ⏳ CAT-FILTER-COUNTS-004: Dynamic filter counts

**Endpoint Idea**:
```
GET /api/v1/catalog/filters?supplier_id={id}&brand={name}
  Response: {
    "colors": [{"name": "Blue", "count": 23}, ...],
    "sizes": [{"name": "M", "count": 45}, ...],
    "brands": [{"name": "FHB", "count": 12}, ...]
  }
```

---

## 🎨 Frontend Implementation Suggestions

### Component Structure (React)
```tsx
frontend/src/
├── pages/
│   └── CatalogPage.tsx              // Route only
└── features/
    └── catalog/
        ├── CatalogLayout.tsx         // Layout with filters
        ├── ProductGrid.tsx           // Grid view
        ├── ProductList.tsx           // List view
        ├── ProductCard.tsx           // Single card
        ├── MasterDetailPanel.tsx     // Expansion panel
        ├── FilterSidebar.tsx         // Color/size filters
        ├── BrandTabs.tsx             // Brand tabs
        ├── SearchBar.tsx             // Search input
        ├── InfiniteScroll.tsx        // Infinite scroll wrapper
        ├── hooks/
        │   ├── useCatalogProducts.ts // Main products hook
        │   ├── useMasterDetail.ts    // Master expansion
        │   └── useFilters.ts         // Filter state
        └── api/
            └── catalog-api.ts        // API client
```

### API Client Example
```typescript
// catalog-api.ts
export async function listProducts(params: {
  cursor?: string;
  limit?: number;
  supplier_id?: string;
  brand?: string;
  colors?: string[];
  sizes?: string[];
}) {
  const url = new URL('/api/v1/catalog/products', API_BASE);
  if (params.cursor) url.searchParams.set('cursor', params.cursor);
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.supplier_id) url.searchParams.set('supplier_id', params.supplier_id);
  if (params.brand) url.searchParams.set('brand', params.brand);
  if (params.colors) {
    params.colors.forEach(c => url.searchParams.append('colors', c));
  }
  if (params.sizes) {
    params.sizes.forEach(s => url.searchParams.append('sizes', s));
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
}
```

### Infinite Scroll Hook Example
```typescript
// useCatalogProducts.ts
export function useCatalogProducts(filters: FilterState) {
  const [products, setProducts] = useState<MasterProductSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const result = await listProducts({
      cursor: cursor || undefined,
      limit: 20,
      ...filters
    });

    setProducts(prev => [...prev, ...result.items]);
    setCursor(result.next_cursor);
    setHasMore(result.has_more);
    setLoading(false);
  };

  // Reset on filter change
  useEffect(() => {
    setProducts([]);
    setCursor(null);
    setHasMore(true);
    loadMore();
  }, [JSON.stringify(filters)]);

  return { products, loadMore, loading, hasMore };
}
```

---

## 🧪 Testing Recommendations

### Backend Tests (pytest)
```python
# tests/domains/catalog/test_browse_service.py
async def test_list_products_cursor_pagination(db_session):
    service = BrowseService(db_session)
    result = await service.list_products_cursor(limit=10)
    assert len(result.items) <= 10
    assert result.has_more is not None

async def test_list_products_color_filter(db_session):
    service = BrowseService(db_session)
    result = await service.list_products_cursor(colors=["Blue", "Black"])
    # Verify all returned products have variants with blue or black

async def test_master_detail_not_found(db_session):
    service = MasterDetailService(db_session)
    with pytest.raises(HTTPException) as exc:
        await service.get_master_detail(uuid4())
    assert exc.value.status_code == 404
```

### Frontend Tests (Vitest)
```typescript
// catalog-api.test.ts
describe('listProducts', () => {
  it('should fetch products with cursor', async () => {
    const result = await listProducts({ limit: 20 });
    expect(result.items).toBeInstanceOf(Array);
    expect(result.has_more).toBeDefined();
  });

  it('should apply color filter', async () => {
    const result = await listProducts({ colors: ['Blue'] });
    // Verify response structure
  });
});
```

---

## 📊 Database Index Requirements

**Already Exist** (from Imports domain):
- `datasets.status` index (for active filtering)
- `supplier_products.dataset_id` index
- `supplier_variants.supplier_product_id` index

**Need to Add** (for Catalog performance):
```sql
-- Full-text search (Phase 2)
CREATE INDEX idx_supplier_products_search
ON supplier_products
USING GIN(to_tsvector('simple',
    COALESCE(brand_raw, '') || ' ' ||
    COALESCE(productgroup_raw, '')
));

-- Color/size filters
CREATE INDEX idx_supplier_variants_color
ON supplier_variants(LOWER(color_raw));

CREATE INDEX idx_supplier_variants_size
ON supplier_variants(LOWER(size_raw));

-- EAN lookup (Phase 2)
CREATE INDEX idx_supplier_variants_ean
ON supplier_variants(ean);
```

**Migration File**: `backend/migrations/versions/{hash}_add_catalog_indexes.py`

---

## 🔐 Security Notes

- All catalog endpoints require authentication (`get_current_user`)
- No role-based restrictions (all users can view catalog)
- Active datasets only (status='active')
- No data modification through catalog domain

---

## 📖 Related Documents

- [Catalog Domain Overview](.ai/project/user-stories/catalog/CATALOG_DOMAIN.md)
- [All User Stories](.ai/project/user-stories/catalog/CAT_USER_STORIES.md)
- [Domain Registry](.ai/project/DOMAIN_REGISTRY.yaml)
- [Frontend Architecture](.ai/company/FRONTEND_GUIDE.md)

---

**Ready for**: Frontend implementation + Phase 2 (Search) planning

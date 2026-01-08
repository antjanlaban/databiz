# Category Management - Implementation Roadmap

**Domain**: Catalog  
**Epic**: Category Management  
**Created**: December 18, 2025  
**Status**: Ready for Implementation

---

## QUICK SUMMARY

We gaan het **Onderhoud menu** bouwen met focus op **Productcategorieën**.

**What's needed**:
1. **Maintenance Landing Page** - Tile dashboard met links naar Suppliers, Brands, **Categories**
2. **Categories CRUD Page** - Hiërarchische tree view + create/edit/delete
3. **Backend API** - 6 endpoints voor category CRUD + tree building
4. **Database** - New `categories` table with self-referential FK

---

## CATEGORY HIERARCHY MODEL

```
Level 1 (Root - No Parent):
└── ALG-KLEDING (Werkkleding)
    Level 2 (Subgroups):
    ├── ALG-KLD-ACC (Kledingaccessoires)
    │   Level 3 (Details):
    │   ├── ALG-KLD-ACC-KNIE (Kniebeschermers)
    │   ├── ALG-KLD-ACC-MUTS (Werkmutsen)
    │   └── ...
    ├── ALG-KLD-BRK (Werkbroeken)
    │   ├── ALG-KLD-BRK-JEANS (Jeans werkbroeken)
    │   └── ...
    └── ...
```

**Key properties**:
- Infinite depth (not limited to 3 levels)
- Each category has `parent_id` (NULL for root)
- Each category has `sort_order` within siblings
- `category_code` is unique and immutable

---

## IMPLEMENTATION PHASES

### Phase 1: CRUD + Tree View (MVP) ✅ PRIORITY
**Slices**: 6 (CAT-CAT-LIST-001 to CAT-CAT-DEL-001 + REORDER-001)

**Backend**:
- [ ] Create `Category` model (SQLAlchemy)
- [ ] Create migration for `categories` table
- [ ] Implement router with 6 endpoints:
  - `GET /api/v1/catalog/categories` (list with tree structure)
  - `GET /api/v1/catalog/categories/{id}` (get single)
  - `POST /api/v1/catalog/categories` (create)
  - `PATCH /api/v1/catalog/categories/{id}` (update)
  - `DELETE /api/v1/catalog/categories/{id}` (soft/hard delete)
  - `POST /api/v1/catalog/categories/reorder` (drag-and-drop)
- [ ] Create `CategoryService` (business logic)
- [ ] Create `tree_builder.py` utility (flat list → nested tree)
- [ ] Write tests

**Frontend**:
- [ ] Create `MaintenancePage.tsx` (tile dashboard)
- [ ] Create `CategoriesPage.tsx` (split view: tree + details)
- [ ] Create `CategoryTree.tsx` (recursive tree component)
- [ ] Create `CategoryForm.tsx` (create/edit modal)
- [ ] Create `useCategories.ts` hook (API calls)
- [ ] Add "Onderhoud" to navigation menu

**Data**:
- [ ] Create CSV seed script (load provided 78 categories)
- [ ] Test tree rendering with full dataset

**Time Estimate**: 2-3 days

---

### Phase 2: Bulk Operations (Optional)
**Slices**: 3 (CAT-CAT-BULK-001, MOVE-001, SEARCH-001)

**Endpoints**:
- `POST /api/v1/catalog/categories/import` (CSV upload)
- `POST /api/v1/catalog/categories/{id}/move` (move subtree)
- `GET /api/v1/catalog/categories/search` (search by name/code)

**Time Estimate**: 1-2 days

---

## DATABASE SCHEMA

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(50) UNIQUE NOT NULL,
    name_nl VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    sort_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_code ON categories(category_code);
CREATE INDEX idx_categories_active ON categories(is_active);
```

**Indexes**:
- `parent_id` - Fast child lookups
- `category_code` - Unique constraint + fast search
- `is_active` - Filter inactive categories

---

## API ENDPOINTS

### 1. List Categories (Tree Structure)
```
GET /api/v1/catalog/categories?include_inactive=false

Response:
{
  "categories": [
    {
      "id": "uuid",
      "category_code": "ALG-KLEDING",
      "name_nl": "Werkkleding",
      "level": 1,
      "parent_id": null,
      "sort_order": 1,
      "is_active": true,
      "children": [
        {
          "id": "uuid",
          "category_code": "ALG-KLD-ACC",
          "name_nl": "Kledingaccessoires",
          "level": 2,
          "parent_id": "parent-uuid",
          "sort_order": 1,
          "is_active": true,
          "children": [...]
        }
      ]
    }
  ]
}
```

### 2. Get Single Category
```
GET /api/v1/catalog/categories/{id}

Response:
{
  "id": "uuid",
  "category_code": "ALG-KLD-ACC",
  "name_nl": "Kledingaccessoires",
  "level": 2,
  "parent_id": "parent-uuid",
  "sort_order": 1,
  "is_active": true,
  "parent": {
    "id": "parent-uuid",
    "category_code": "ALG-KLEDING",
    "name_nl": "Werkkleding"
  },
  "children": [
    {"id": "child1-uuid", "name_nl": "Kniebeschermers"},
    {"id": "child2-uuid", "name_nl": "Werkmutsen"}
  ]
}
```

### 3. Create Category
```
POST /api/v1/catalog/categories

Request:
{
  "category_code": "ALG-KLD-ACC-HAND",
  "name_nl": "Handschoenen",
  "parent_id": "parent-uuid",  // Optional (NULL for root)
  "sort_order": 7  // Optional (auto-calculated if omitted)
}

Response: 201 Created
{
  "id": "new-uuid",
  "category_code": "ALG-KLD-ACC-HAND",
  "name_nl": "Handschoenen",
  "level": 3,  // Auto-calculated
  "parent_id": "parent-uuid",
  "sort_order": 7,
  "is_active": true
}
```

### 4. Update Category
```
PATCH /api/v1/catalog/categories/{id}

Request:
{
  "name_nl": "Updated Name",
  "parent_id": "new-parent-uuid",  // Optional
  "sort_order": 3,  // Optional
  "is_active": false  // Optional (soft delete)
}

Response: 200 OK
{...updated category...}
```

### 5. Delete Category
```
DELETE /api/v1/catalog/categories/{id}?force=false

Response: 204 No Content

Errors:
- 400: Category has children (cannot delete)
- 409: Category has products linked (cannot delete)
```

### 6. Reorder Categories
```
POST /api/v1/catalog/categories/reorder

Request:
{
  "parent_id": "parent-uuid",  // NULL for root level
  "order": [
    "cat-uuid-1",  // New position 1
    "cat-uuid-2",  // New position 2
    "cat-uuid-3"   // New position 3
  ]
}

Response: 200 OK
{
  "reordered": 3,
  "categories": [...]
}
```

---

## FRONTEND UX

### Maintenance Landing Page
**Path**: `/maintenance`

```
┌──────────────────────────────────────────┐
│  Onderhoud                               │
├──────────────────────────────────────────┤
│                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────┐│
│  │  📦       │  │  🏷️       │  │  📂   ││
│  │Leverancier│  │  Merken   │  │Catego ││
│  │    23     │  │    15     │  │  78   ││
│  └───────────┘  └───────────┘  └───────┘│
│                                          │
└──────────────────────────────────────────┘
```

**Components**:
- Tile for Suppliers → `/maintenance/suppliers` (reuse existing SuppliersPage)
- Tile for Brands → `/maintenance/brands` (reuse existing BrandsPage)
- Tile for Categories → `/maintenance/categories` (NEW)

---

### Categories Page
**Path**: `/maintenance/categories`

```
┌─────────────────────────────────────────────────────┐
│  Productcategorieën                    [+ Nieuw]    │
├─────────────────┬───────────────────────────────────┤
│ Tree View       │  Details / Edit Form              │
│                 │                                   │
│ ▼ Werkkleding   │  Category: ALG-KLD-BRK-JEANS     │
│   ├─ Accessoires│  Code: ALG-KLD-BRK-JEANS          │
│   ▼ Werkbroeken │  Naam: Jeans werkbroeken          │
│     ├─ 3/4      │  Parent: Werkbroeken              │
│     ├─ Jeans ✓  │  Level: 3                         │
│     ├─ Kort     │  Sort: 2                          │
│     └─ Lang     │  Status: Actief                   │
│ ▼ Werkschoenen  │                                   │
│   └─ ...        │  [Opslaan]  [Annuleren]           │
│                 │                                   │
└─────────────────┴───────────────────────────────────┘
```

**Features**:
- Left: Collapsible tree (click to expand/collapse)
- Right: Details panel (view mode) or Edit form (edit mode)
- Toolbar: "Nieuw" button, "Verwijderen" button
- Optional (Phase 2): Drag-and-drop reordering

---

## FILE STRUCTURE

### Backend
```
backend/src/domains/catalog/
├── category_management/
│   ├── __init__.py
│   └── category_hierarchy/
│       ├── __init__.py
│       ├── router.py           # 6 endpoints
│       ├── service.py          # CategoryService (business logic)
│       ├── schemas.py          # Pydantic models
│       └── tree_builder.py     # Utility: flat list → nested tree
└── models.py                   # Add Category model

backend/migrations/versions/
└── YYYYMMDD_create_categories_table.py

backend/tests/domains/catalog/
└── test_category_hierarchy.py
```

### Frontend
```
frontend/src/
├── features/
│   ├── categories/
│   │   ├── CategoriesPage.tsx       # Main page
│   │   ├── components/
│   │   │   ├── CategoryTree.tsx     # Recursive tree component
│   │   │   ├── CategoryTreeNode.tsx # Single tree node
│   │   │   ├── CategoryForm.tsx     # Create/edit form
│   │   │   └── CategoryDetailsPanel.tsx
│   │   ├── hooks/
│   │   │   └── useCategories.ts     # API calls
│   │   ├── types.ts
│   │   └── index.ts
│   └── maintenance/
│       ├── MaintenancePage.tsx      # Tile dashboard
│       └── components/
│           └── MaintenanceTile.tsx  # Reusable tile component
└── pages/
    └── MaintenancePage.tsx          # Re-export from features
```

---

## VALIDATION RULES

### Create/Update
1. **category_code**:
   - Required
   - 3-50 characters
   - Alphanumeric + hyphens only
   - Unique (database constraint)
   - IMMUTABLE (cannot be changed after creation)

2. **name_nl**:
   - Required
   - 3-255 characters
   - No special restrictions

3. **parent_id**:
   - Optional (NULL for root categories)
   - Must exist in database (FK constraint)
   - Cannot be self (id != parent_id)
   - Cannot be own descendant (circular reference check)

4. **sort_order**:
   - Optional (auto-calculated if omitted)
   - Positive integer
   - Unique within siblings (same parent)

5. **level**:
   - Auto-calculated (read-only)
   - If parent: parent.level + 1
   - If no parent: 1

### Delete
1. Cannot delete if has children (return 400)
2. Cannot delete if products are linked (return 409)
3. Soft delete by default (set is_active = False)
4. Hard delete only with ?force=true (Admin only)

---

## TESTING CHECKLIST

### Backend Tests
- [ ] Create category with valid data
- [ ] Create root category (parent_id = NULL)
- [ ] Create child category (parent_id = existing)
- [ ] Reject duplicate category_code
- [ ] Reject invalid parent_id (FK violation)
- [ ] Reject circular reference (parent = own descendant)
- [ ] Update category name
- [ ] Update parent (re-calculate level)
- [ ] Soft delete (is_active = False)
- [ ] Reject delete with children
- [ ] Reject delete with linked products
- [ ] List categories returns tree structure
- [ ] Reorder categories updates sort_order

### Frontend Tests
- [ ] Render tree with 3+ levels
- [ ] Expand/collapse nodes
- [ ] Click node shows details panel
- [ ] Create new root category
- [ ] Create child category (select parent from dropdown)
- [ ] Edit category name
- [ ] Soft delete category (confirm modal)
- [ ] Error handling (duplicate code, invalid parent)

---

## SEED DATA

**Source**: `category.csv` (78 categories provided)

**Script**: `backend/src/domains/catalog/category_management/seed_categories.py`

**Process**:
1. Parse CSV (id, category_code, name_nl, level, parent_code, sort_order)
2. Sort by level (1 → 2 → 3) to create parents first
3. Bulk insert with parent_id resolution (parent_code → parent_id)
4. Verify all 78 categories imported successfully

**Run**:
```bash
cd backend
python -m src.domains.catalog.category_management.seed_categories
```

---

## SUCCESS CRITERIA

### MVP (Phase 1)
- ✅ Admin can view tree with 78 categories
- ✅ Admin can create new category (root or child)
- ✅ Admin can edit category name/parent/sort
- ✅ Admin can soft delete category
- ✅ Tree renders in <1 second
- ✅ All CRUD operations complete in <200ms

### Phase 2
- ✅ Admin can reorder via drag-and-drop
- ✅ Admin can search categories by name/code
- ✅ Admin can bulk import CSV

---

## NEXT STEPS

1. **Create Worktree**:
   ```bash
   node scripts/create-worktree.js --domain catalog --feature category-hierarchy
   ```

2. **Backend First**:
   - Create Category model
   - Create migration
   - Implement router + service
   - Write tests
   - Create seed script

3. **Frontend**:
   - MaintenancePage (tiles)
   - CategoriesPage (tree + form)
   - CategoryTree component

4. **Testing**:
   - Backend unit tests
   - Frontend E2E tests

5. **Deploy**:
   - Dev → Staging → Production

---

**Ready to Start**: ✅  
**Estimated Time**: 2-3 days (MVP)  
**Next Action**: Create worktree and start backend implementation

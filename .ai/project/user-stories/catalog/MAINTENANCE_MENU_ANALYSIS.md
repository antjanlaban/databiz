# Onderhoud Menu - Business Analysis

**Created**: December 18, 2025  
**Role**: Business Analyst  
**Status**: Concept - Ready for Review

---

## 1. BUSINESS CONTEXT

### 1.1 Purpose
Het **Onderhoud menu** biedt beheerders een centrale toegangsplek voor het beheren van stamgegevens die essentieel zijn voor de catalogus en imports:

- **Leveranciers** (Suppliers) - Al geïmplementeerd in Imports domain
- **Merken** (Brands) - Al geïmplementeerd in Imports domain  
- **Productcategorieën** (Categories) - **NIEUW** - Hiërarchische taxonomie voor producten
- **Toekomstig**: Kleuren, Maten, Materialen, etc.

### 1.2 User Needs
**Target Audience**: Admins en Content Managers

**Key Scenarios**:
1. Admin wil snel naar leveranciers/merken/categorieën navigeren vanuit één centrale plek
2. Admin wil de productcategorieën onderhouden om de catalogus te structureren
3. Admin wil categorieën in een hiërarchie organiseren (hoofdgroep → subgroep → detailniveau)
4. Admin wil de volgorde van categorieën binnen een niveau bepalen

---

## 2. CATEGORY HIERARCHY MODEL

### 2.1 Data Structure (from CSV analysis)

```
Level 1 (Hoofdgroep - No Parent):
├── ALG-KLEDING (Werkkleding)
│   Level 2 (Productgroep):
│   ├── ALG-KLD-ACC (Kledingaccessoires)
│   │   Level 3 (Specifieke categorie):
│   │   ├── ALG-KLD-ACC-KNIE (Kniebeschermers)
│   │   ├── ALG-KLD-ACC-MUTS (Werkmutsen)
│   │   └── ...
│   ├── ALG-KLD-BRK (Werkbroeken)
│   │   ├── ALG-KLD-BRK-3KWT (Driekwart werkbroeken)
│   │   ├── ALG-KLD-BRK-JEANS (Jeans werkbroeken)
│   │   └── ...
│   └── ...
└── ALG-SCHOENEN (Werkschoenen)
    ├── ALG-SCH-ACC (Schoenaccessoires)
    ├── ALG-SCH-KLOMP (Werkklompen)
    └── ...
```

### 2.2 Database Schema

```python
class Category(Base):
    """Product category with infinite parent-child hierarchy."""
    
    id: UUID
    category_code: str  # Unique, e.g. "ALG-KLEDING"
    name_nl: str        # Dutch name, e.g. "Werkkleding"
    level: int          # Depth in hierarchy (1=root, 2=sub, 3=detail, ...)
    parent_id: UUID | None  # NULL for level 1 (root categories)
    sort_order: int     # Position within siblings
    is_active: bool     # Soft delete / visibility toggle
    created_at: datetime
    updated_at: datetime
    
    # Relationships
    parent: "Category"  # Self-referential
    children: list["Category"]  # All child categories
    products: list["SupplierProduct"]  # Products in this category
```

**Business Rules**:
1. `category_code` is UNIQUE and IMMUTABLE (like supplier code)
2. Level 1 categories MUST have `parent_id = NULL`
3. Level 2+ categories MUST have a valid `parent_id`
4. `sort_order` is unique within siblings (same parent)
5. Deleting a category with children is NOT allowed (referential integrity)
6. Categories can be soft-deleted via `is_active = False`

---

## 3. DOMAIN MAPPING

### 3.1 Which Domain?

**Option A: New "Maintenance" Domain**
- ❌ Too generic, unclear boundaries
- ❌ Suppliers/Brands already in Imports

**Option B: Catalog Domain ✅ RECOMMENDED**
- ✅ Categories are used for product browsing/filtering
- ✅ Natural fit: catalog needs taxonomies
- ✅ Clear separation: Imports = data ingestion, Catalog = product presentation

### 3.2 Epic Structure

**Domain**: `catalog`  
**Epic**: `category_management`  
**Feature**: `category_hierarchy`

---

## 4. USER STORIES & SLICES

### Phase 1: CRUD Operations (6 slices)

#### CAT-CAT-LIST-001: List All Categories (Tree View)
**As a** Admin  
**I want to** view all categories in a hierarchical tree structure  
**So that** I can see the complete category taxonomy at a glance

**Acceptance Criteria**:
- AC1: API returns all categories with parent-child relationships
- AC2: Frontend displays collapsible tree (expand/collapse levels)
- AC3: Show category code, name, level, and sort_order
- AC4: Inactive categories are grayed out or hidden (toggle)
- AC5: Tree is sorted by sort_order within each level

**Endpoint**: `GET /api/v1/catalog/categories?include_inactive=false`

**Response**:
```json
{
  "categories": [
    {
      "id": "57192111-4585-5f23-869d-06d815e70296",
      "category_code": "ALG-KLEDING",
      "name_nl": "Werkkleding",
      "level": 1,
      "parent_id": null,
      "sort_order": 1,
      "is_active": true,
      "children": [
        {
          "id": "5552f564-3acd-5514-8f3f-10761b7927c5",
          "category_code": "ALG-KLD-ACC",
          "name_nl": "Kledingaccessoires",
          "level": 2,
          "parent_id": "57192111-4585-5f23-869d-06d815e70296",
          "sort_order": 1,
          "is_active": true,
          "children": [...]
        }
      ]
    }
  ]
}
```

---

#### CAT-CAT-GET-001: Get Single Category
**As a** Admin  
**I want to** view details of a specific category  
**So that** I can see its full information and parent/children relationships

**Acceptance Criteria**:
- AC1: API returns single category by ID
- AC2: Include parent category (if exists)
- AC3: Include direct children (not grandchildren)
- AC4: Return 404 if category not found

**Endpoint**: `GET /api/v1/catalog/categories/{id}`

---

#### CAT-CAT-CRE-001: Create New Category
**As a** Admin  
**I want to** create a new category with a parent (optional for level 1)  
**So that** I can extend the category hierarchy

**Acceptance Criteria**:
- AC1: Admin can create category with code, name, parent (optional), sort_order
- AC2: Code must be unique (validation error if duplicate)
- AC3: If parent_id is provided, it must exist (FK constraint)
- AC4: Level is auto-calculated: parent.level + 1 (or 1 if no parent)
- AC5: sort_order defaults to max(siblings) + 1 if not provided
- AC6: Returns created category with generated ID

**Endpoint**: `POST /api/v1/catalog/categories`

**Request Body**:
```json
{
  "category_code": "ALG-KLD-ACC-HAND",
  "name_nl": "Handschoenen",
  "parent_id": "5552f564-3acd-5514-8f3f-10761b7927c5",  // Optional
  "sort_order": 7  // Optional
}
```

---

#### CAT-CAT-UPD-001: Update Category
**As a** Admin  
**I want to** update category name, parent, or sort_order  
**So that** I can correct or reorganize the hierarchy

**Acceptance Criteria**:
- AC1: Admin can update name_nl, parent_id, sort_order, is_active
- AC2: category_code is IMMUTABLE (cannot be changed)
- AC3: Changing parent re-calculates level automatically
- AC4: Cannot set parent to own descendant (circular reference check)
- AC5: Changing sort_order re-indexes siblings if needed

**Endpoint**: `PATCH /api/v1/catalog/categories/{id}`

**Request Body**:
```json
{
  "name_nl": "Updated Name",
  "parent_id": "new-parent-uuid",  // Optional
  "sort_order": 3,  // Optional
  "is_active": false  // Optional (soft delete)
}
```

---

#### CAT-CAT-DEL-001: Delete Category
**As a** Admin  
**I want to** delete a category (hard or soft)  
**So that** I can remove obsolete categories

**Acceptance Criteria**:
- AC1: Cannot delete if category has children (return 400 error)
- AC2: Cannot delete if products are linked to this category (return 409 conflict)
- AC3: Soft delete: set is_active = False (default behavior)
- AC4: Hard delete: only if force=true query param (Admin only)
- AC5: Returns 204 No Content on success

**Endpoint**: `DELETE /api/v1/catalog/categories/{id}?force=false`

---

#### CAT-CAT-REORDER-001: Reorder Categories (Drag & Drop)
**As a** Admin  
**I want to** change the sort order of categories via drag-and-drop  
**So that** I can quickly organize categories visually

**Acceptance Criteria**:
- AC1: API accepts list of category IDs with new sort_order values
- AC2: Only siblings (same parent) can be reordered together
- AC3: sort_order values are re-indexed to be sequential (1, 2, 3, ...)
- AC4: Returns updated categories

**Endpoint**: `POST /api/v1/catalog/categories/reorder`

**Request Body**:
```json
{
  "parent_id": "57192111-4585-5f23-869d-06d815e70296",  // or null for level 1
  "order": [
    "5552f564-3acd-5514-8f3f-10761b7927c5",  // New position 1
    "bc5a91fd-bfac-58e1-85e4-73e169dc33db",  // New position 2
    "f051476b-abcc-5a66-829a-1dbd69edf770"   // New position 3
  ]
}
```

---

### Phase 2: Advanced Features (3 slices)

#### CAT-CAT-BULK-001: Bulk Import Categories (CSV)
**As a** Admin  
**I want to** upload a CSV with categories  
**So that** I can quickly seed the category hierarchy

**Endpoint**: `POST /api/v1/catalog/categories/import`

---

#### CAT-CAT-MOVE-001: Move Category to Different Parent
**As a** Admin  
**I want to** move a category (with all children) to a new parent  
**So that** I can restructure the taxonomy

**Endpoint**: `POST /api/v1/catalog/categories/{id}/move`

---

#### CAT-CAT-SEARCH-001: Search Categories by Name/Code
**As a** Admin  
**I want to** search categories by name or code  
**So that** I can quickly find a category in a large hierarchy

**Endpoint**: `GET /api/v1/catalog/categories/search?q=handschoen`

---

## 5. FRONTEND UX

### 5.1 Maintenance Landing Page

**Path**: `/maintenance`

**Layout**: Grid of tiles (cards) with icons

```
┌──────────────────────────────────────────┐
│  Onderhoud (Maintenance)                 │
├──────────────────────────────────────────┤
│                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────┐│
│  │  📦       │  │  🏷️       │  │  📂   ││
│  │Leverancier│  │  Merken   │  │Catego ││
│  │    23     │  │    15     │  │  78   ││
│  └───────────┘  └───────────┘  └───────┘│
│                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────┐│
│  │  🎨       │  │  📏       │  │  🧵   ││
│  │  Kleuren  │  │  Maten    │  │Materi ││
│  │   (Soon)  │  │   (Soon)  │  │ (Soon)││
│  └───────────┘  └───────────┘  └───────┘│
│                                          │
└──────────────────────────────────────────┘
```

**Click behavior**: Navigate to specific CRUD page

---

### 5.2 Categories CRUD Page

**Path**: `/maintenance/categories`

**Layout**: Split view - Tree on left, Details/Form on right

```
┌─────────────────────────────────────────────────────┐
│  Productcategorieën                    [+ Nieuw]    │
├─────────────────┬───────────────────────────────────┤
│ Tree View       │  Details / Edit Form              │
│                 │                                   │
│ ▼ Werkkleding   │  Category: ALG-KLD-BRK-JEANS     │
│   ├─ Accessoires│  Naam: Jeans werkbroeken          │
│   ▼ Werkbroeken │  Parent: Werkbroeken              │
│     ├─ 3/4      │  Level: 3                         │
│     ├─ Jeans ✓  │  Sort: 2                          │
│     ├─ Kort     │                                   │
│     └─ Lang     │  [Opslaan]  [Annuleren]           │
│ ▼ Werkschoenen  │                                   │
│   └─ ...        │                                   │
│                 │                                   │
└─────────────────┴───────────────────────────────────┘
```

**Features**:
- Tree: Collapsible nodes, drag-and-drop reorder
- Right panel: Switches between "View" and "Edit" mode
- Toolbar: Add root category, Add child, Delete, Bulk import

---

## 6. TECHNICAL IMPLEMENTATION

### 6.1 Backend Structure

```
backend/src/domains/catalog/
├── category_management/
│   ├── category_hierarchy/
│   │   ├── __init__.py
│   │   ├── router.py       # 6 endpoints (list, get, create, update, delete, reorder)
│   │   ├── service.py      # CategoryService (business logic)
│   │   ├── schemas.py      # Pydantic models (CategoryCreate, CategoryUpdate, etc.)
│   │   └── tree_builder.py # Utility: build hierarchical tree from flat list
│   └── models.py           # Category SQLAlchemy model (if not in imports)
```

### 6.2 Database Migration

**Action**: Create new migration for `categories` table

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

### 6.3 Frontend Structure

```
frontend/src/
├── features/
│   └── categories/
│       ├── CategoriesPage.tsx         # Main page with tree + details
│       ├── components/
│       │   ├── CategoryTree.tsx       # Recursive tree component
│       │   ├── CategoryForm.tsx       # Create/Edit form
│       │   └── CategoryDetailsPanel.tsx
│       ├── hooks/
│       │   └── useCategories.ts       # API calls + state management
│       └── types.ts
├── pages/
│   └── MaintenancePage.tsx            # Tile dashboard
└── config/
    └── navigation.ts                  # Add "Onderhoud" menu
```

---

## 7. SLICE REGISTRATION

**Domain**: `catalog`  
**Epic**: `category_management`  
**Feature**: `category_hierarchy`

| Slice ID | User Story | Status | Priority |
|----------|-----------|--------|----------|
| CAT-CAT-LIST-001 | List categories (tree) | planned | P0 |
| CAT-CAT-GET-001 | Get single category | planned | P0 |
| CAT-CAT-CRE-001 | Create category | planned | P0 |
| CAT-CAT-UPD-001 | Update category | planned | P0 |
| CAT-CAT-DEL-001 | Delete category | planned | P0 |
| CAT-CAT-REORDER-001 | Reorder categories | planned | P1 |
| CAT-CAT-BULK-001 | Bulk import CSV | planned | P2 |
| CAT-CAT-MOVE-001 | Move subtree | planned | P2 |
| CAT-CAT-SEARCH-001 | Search categories | planned | P2 |

---

## 8. DEPENDENCIES

**Existing Code to Leverage**:
- ✅ Suppliers CRUD: `/api/v2/imports/suppliers` (reference for patterns)
- ✅ Brands CRUD: `/api/v2/imports/brands` (reference for patterns)
- ✅ Frontend features structure: `features/suppliers/`, `features/brands/`

**New Code Needed**:
- ❌ Category model + migration
- ❌ Category CRUD endpoints (6 for Phase 1)
- ❌ CategoryTree component (recursive rendering)
- ❌ MaintenancePage.tsx (tile dashboard)
- ❌ Drag-and-drop reorder logic (optional for Phase 1)

---

## 9. IMPLEMENTATION PHASES

### Phase 1 (MVP): CRUD + Tree View
**Goal**: Admin can create/edit/delete categories and see tree

**Deliverables**:
- Backend: 5 endpoints (list, get, create, update, delete)
- Frontend: Tree view + form (no drag-and-drop yet)
- CSV seed script (manual import via script, not API)
- **Time**: 2-3 days

### Phase 2: Reordering + UX Polish
**Goal**: Admin can reorder via drag-and-drop

**Deliverables**:
- Reorder endpoint + frontend drag-and-drop
- Search functionality
- **Time**: 1-2 days

### Phase 3: Bulk Operations
**Goal**: Admin can import/export CSV

**Deliverables**:
- Bulk import endpoint
- CSV export
- Move subtree endpoint
- **Time**: 1 day

---

## 10. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Circular parent reference | High | Validate in service layer (check if new parent is descendant) |
| Orphaned children on delete | High | Enforce FK constraint with ON DELETE RESTRICT |
| Performance with deep trees | Medium | Add `level` column for efficient queries, limit depth to 5 |
| Concurrent edits | Low | Use optimistic locking (updated_at version check) |

---

## 11. SUCCESS METRICS

**Phase 1 (MVP)**:
- ✅ Admin can create 3-level category hierarchy (root → sub → detail)
- ✅ Tree view renders 100+ categories without lag (<1s load time)
- ✅ All CRUD operations complete in <200ms (API response time)
- ✅ CSV seed data (78 categories) imports successfully

**Phase 2**:
- ✅ Drag-and-drop reorder saves in <500ms
- ✅ Search returns results in <100ms

---

## 12. NEXT STEPS

1. **Review & Approve**: Stakeholder approval on structure and UX
2. **Update DOMAIN_REGISTRY.yaml**: Register 6-9 slices
3. **Create Worktree**: `catalog/category-hierarchy`
4. **Backend Implementation**: Models → Endpoints → Tests
5. **Frontend Implementation**: Tree component → CRUD forms → Maintenance page
6. **CSV Seed**: Load provided category data
7. **Testing**: Unit + E2E tests
8. **Deploy**: Dev → Staging → Production

---

**Status**: ✅ **Ready for Implementation**  
**Next Action**: Register slices in DOMAIN_REGISTRY.yaml

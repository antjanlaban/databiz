# Size Master Data Implementation Specification

**Status:** In Progress  
**Owner:** Maintenance Domain (imports/size_management)  
**Data Source:** `c:/Users/antja/Google Drive/VK PiM docs/Seeds/size_lookup.csv`  
**Created:** 2025-12-19

---

## 1. Business Requirements (BA Perspective)

### 1.1 Purpose

Implement a standardized **Size Reference Table** in the PIM system to:

- Provide authoritative size definitions for product variants
- Support multiple sizing systems (EU, confection, body measurements)
- Enable size matching across different garment categories
- Support inventory and product configuration

### 1.2 Data Inventory

**Total Records:** 185 unique sizes  
**Unique Categories:** 9  
**Supported Genders:** 4 (Men, Women, Unisex, Kids)

**Category Breakdown:**
| Category | Name (EN/NL) | Count | Gender | Primary Use |
|----------|---|---|---|---|
| MT | Men's Tops | 10 | Men | T-shirt, Polo, Sweater, Jacket, Hoodie |
| MB | Men's Bottoms | 52 | Men | Trousers, Shorts, Overalls, Dungarees |
| WT | Women's Tops | 7 | Women | T-shirt, Polo, Sweater, Jacket, Hoodie |
| WB | Women's Bottoms | 42 | Women | Trousers, Shorts, Overalls, Dungarees |
| UT | Unisex Tops | 10 | Unisex | Tops, Jackets (fits all genders) |
| UB | Unisex Bottoms | 24 | Unisex | Bottoms, Overalls (fits all genders) |
| JR | Junior/Kids | 17 | Kids | Children's Clothing (80-176 body length) |
| FW | Footwear | 16 | Unisex | Safety Shoes, Work Boots (sizes 35-50) |
| ACC | Accessories | 7 | Unisex | Caps, Beanies, Belts, Gloves, Scarves (OS, S, M, L, XL, S/M, L/XL) |

### 1.3 Key Attributes

Each size record contains:

**Core Attributes (Always present):**

- `size_code` (3-4 chars, unique) - e.g., "MT-XS", "MB-42-R", "FW-40", "JR-104"
- `category` (2-3 char enum) - Parent category
- `category_name_en` - English category name
- `category_name_nl` - Dutch category name
- `garment_type` (string) - Garment type(s) this size applies to
- `gender` (enum: Men|Women|Unisex|Kids) - Target gender
- `eu_size` (string) - EU standard size

**Measurement Attributes (May be NULL for some categories):**

- `eu_confection_men` - EU confection sizing for men
- `eu_confection_women` - EU confection sizing for women
- `chest_cm` - Chest circumference range
- `waist_cm` - Waist circumference range
- `hip_cm` - Hip circumference range
- `inseam_cm` - Inseam length for bottoms
- `body_length_cm` - Total body length
- `foot_length_cm` - Foot length (footwear)
- `leg_length` - Leg length designation (S/R/L/XL for length variants)
- `age` - Age range or months (for kids)

### 1.4 Dependencies

- Used by: `supplier_variant` table (size_code foreign key)
- Used by: Product variant configurations, inventory management, sizing guides
- Not used yet: Product color linking (separate feature, not yet implemented)

---

## 2. Technical Architecture (Orchestrator Perspective)

### 2.1 Domain Location

```
backend/src/domains/imports/size_management/
├── models.py          # Size ORM model
├── router.py          # FastAPI endpoints
├── service.py         # Business logic (CRUD, search, filter)
├── schemas.py         # Pydantic validation models
└── tests.py           # Unit & integration tests
```

### 2.2 Database Schema

**Table: `sizes`**

```sql
CREATE TABLE sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core identifiers
    size_code VARCHAR(10) UNIQUE NOT NULL,
    category VARCHAR(5) NOT NULL,
    category_name_en VARCHAR(50) NOT NULL,
    category_name_nl VARCHAR(50) NOT NULL,

    -- Classification
    garment_type TEXT NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK(gender IN ('Men', 'Women', 'Unisex', 'Kids')),

    -- Sizing reference
    eu_size VARCHAR(10) NOT NULL,
    eu_confection_men VARCHAR(10),
    eu_confection_women VARCHAR(10),

    -- Body measurements (in cm, nullable for accessories/footwear)
    chest_cm VARCHAR(20),
    waist_cm VARCHAR(20),
    hip_cm VARCHAR(20),
    inseam_cm VARCHAR(10),
    body_length_cm VARCHAR(10),
    foot_length_cm VARCHAR(10),
    leg_length VARCHAR(20),  -- S/R/L/XL length variants
    age VARCHAR(20),         -- For kids: "2-3 yr", "12-18 mnd"

    -- Standard audit fields
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    -- Indexes
    INDEX idx_category_gender (category, gender),
    INDEX idx_garment_type (garment_type),
    INDEX idx_eu_size (eu_size),
    UNIQUE INDEX idx_size_code (size_code)
);
```

### 2.3 API Endpoints

**Base:** `/api/v2/imports/sizes`

| Endpoint                  | Method | Purpose                                                           | Auth     |
| ------------------------- | ------ | ----------------------------------------------------------------- | -------- |
| `/sizes`                  | GET    | List all sizes (paginated, filterable by category/gender/eu_size) | Required |
| `/sizes`                  | POST   | Create new size                                                   | Required |
| `/sizes/{id}`             | GET    | Get single size by UUID                                           | Required |
| `/sizes/{id}`             | PUT    | Update size                                                       | Required |
| `/sizes/{id}`             | DELETE | Delete size (soft/hard)                                           | Required |
| `/sizes/code/{size_code}` | GET    | Get size by code                                                  | Required |
| `/sizes/categories`       | GET    | List available categories                                         | Required |
| `/sizes/count`            | GET    | Total size count                                                  | Required |

### 2.4 Service Methods

```python
class SizeService:
    async def list_sizes(
        self,
        skip: int = 0,
        limit: int = 100,
        category: str | None = None,
        gender: str | None = None,
        eu_size: str | None = None,
        search: str | None = None
    ) -> List[Size]

    async def count_sizes(self) -> int
    async def get_size(self, size_id: UUID) -> Size
    async def get_size_by_code(self, size_code: str) -> Size
    async def create_size(self, size_in: SizeCreate) -> Size
    async def update_size(self, size_id: UUID, size_in: SizeUpdate) -> Size
    async def delete_size(self, size_id: UUID, hard_delete: bool = False) -> None
    async def get_size_categories(self) -> List[str]
    async def get_sizes_by_category(self, category: str) -> List[Size]
```

### 2.5 Pydantic Schemas

```python
class SizeBase(BaseModel):
    size_code: str  # Unique, 3-10 chars
    category: str
    category_name_en: str
    category_name_nl: str
    garment_type: str
    gender: Literal["Men", "Women", "Unisex", "Kids"]
    eu_size: str
    eu_confection_men: str | None
    eu_confection_women: str | None
    chest_cm: str | None
    waist_cm: str | None
    hip_cm: str | None
    inseam_cm: str | None
    body_length_cm: str | None
    foot_length_cm: str | None
    leg_length: str | None
    age: str | None

class SizeCreate(SizeBase):
    pass

class SizeUpdate(SizeBase):
    pass

class SizeResponse(SizeBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

class SizeListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[SizeResponse]
```

### 2.6 Data Migration

**File:** `backend/migrations/versions/20251219_seed_sizes_complete.py`

- Generates INSERT...ON CONFLICT SQL from CSV (185 records)
- Upserts by `size_code` (idempotent)
- No manual UUIDs - PostgreSQL generates on insert
- Execution time: ~2 seconds

---

## 3. Implementation Checklist

- [ ] **Database Model** - Create `Size` SQLAlchemy ORM model
- [ ] **Migration Generator** - Python script to read CSV and generate alembic migration
- [ ] **Migration File** - Apply to Railway DB with all 185 sizes
- [ ] **Service Layer** - SizeService with all CRUD + filter methods
- [ ] **API Layer** - FastAPI router with all endpoints
- [ ] **Validation** - Pydantic schemas with proper constraints
- [ ] **Unit Tests** - Service layer tests (list, search, filter, CRUD)
- [ ] **Integration Tests** - API endpoint tests with auth
- [ ] **Frontend (Optional)** - SizesPage component + hooks (follow Colors pattern)
- [ ] **DOMAIN_REGISTRY** - Register size_management feature as "done"
- [ ] **Documentation** - Update DDD map and feature inventory

---

## 4. Timeline & Dependencies

| Phase | Task                       | Est. Time | Depends On            |
| ----- | -------------------------- | --------- | --------------------- |
| 1     | Model + Migration          | 30 min    | Colors pattern (done) |
| 2     | Service + Router + Schemas | 45 min    | Phase 1               |
| 3     | Tests                      | 30 min    | Phase 2               |
| 4     | Frontend UI (Optional)     | 45 min    | Phase 3               |
| 5     | Registry + Docs            | 15 min    | All phases            |

**Total Estimated Effort:** ~2.5 hours  
**Blocking:** None (parallel to other work possible)  
**Risks:** None identified

---

## 5. Quality Gates

- ✅ All 185 sizes loaded to Railway DB
- ✅ No duplicate size_codes
- ✅ All required fields populated
- ✅ API responds with correct pagination/filtering
- ✅ Unit test coverage > 80%
- ✅ DOMAIN_REGISTRY updated
- ✅ DDD documentation updated

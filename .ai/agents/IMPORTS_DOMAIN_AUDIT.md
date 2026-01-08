# [DATA] + [ARCHITECT] Imports Domain Complete Audit

## 🎯 Missie

Je bent de DATA_ENGINEER en ARCHITECT agent. Je taak is een **volledige implementatie** van de Imports domain in DataBiz Next. Dit omvat supplier management, file upload/parsing, en dataset lifecycle.

---

## 📋 Context

### Wat al bestaat:

**Shared utilities** (`backend/src/shared/`):
- `storage.py` - MinIO client met upload_raw_file() en upload_json() (WERKT)
- `database.py` - SQLAlchemy async engine (WERKT, gebruikt door Identity)
- `config.py` - Settings met MINIO_ENDPOINT op port 9022

**Docker** (`docker-compose.yml`):
- PostgreSQL op port **9020** ✅
- MinIO op port **9022** (API) en **9023** (Console) ✅

**Documentatie** (`.ai/project/`):
- `DOMAIN_REGISTRY.yaml` - ~20 slices gedefinieerd voor Imports
- `DECISION_LOG.md` - Business beslissingen (DEC-001 t/m DEC-007)
- `user-stories/IMPORTS_US001-004.md` - Gedetailleerde user stories

**Voorbeeld data** (`examples/suppliers/`):
- 11 echte leveranciersbestanden (CSV + XLSX)
- Tricorp, Engel, FHB, Puma, Sixton, TEE JAYS, Santino, ELKA, etc.

### Wat NIET bestaat:
- ❌ `backend/src/domains/imports/` folder
- ❌ Supplier model (SQLAlchemy)
- ❌ Dataset model (SQLAlchemy)
- ❌ Upload endpoints
- ❌ File parsing logic (CSV/XLSX → JSON)
- ❌ Fuzzy matching service
- ❌ Alembic migrations voor imports

---

## 📜 Business Beslissingen (DECISION_LOG.md)

Deze beslissingen zijn al genomen - **volg ze strikt**:

| ID | Beslissing |
|----|------------|
| DEC-001 | Dataset lifecycle: `new` (uploaded) → `inactive` (parsed) → `active` (mapped) |
| DEC-002 | Geen orphan datasets - `supplier_id` is verplicht (NOT NULL + FK) |
| DEC-003 | Duplicate detection via SHA-256 file hash |
| DEC-004 | Minimaal 95% valid rows voor parsing success |
| DEC-005 | 1 globale pool (geen multi-tenant) |
| DEC-007 | Ports: PostgreSQL=9020, MinIO=9022/9023 |

---

## 🏗️ Database Schema's (uit User Stories)

### Suppliers Tabel
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name ON suppliers(name);
```

### Datasets Tabel (nog te definiëren)
```sql
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    original_filename VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 for duplicate detection
    status VARCHAR(20) NOT NULL DEFAULT 'new',  -- new, inactive, active
    row_count INTEGER,
    valid_row_count INTEGER,
    error_count INTEGER,
    json_path VARCHAR(500),  -- Path in MinIO
    error_report_path VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_status CHECK (status IN ('new', 'inactive', 'active'))
);

CREATE INDEX idx_datasets_supplier ON datasets(supplier_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_hash ON datasets(file_hash);
```

---

## 🔍 Stap 1: Folder Structuur Aanmaken

Maak de volgende structuur aan:

```
backend/src/domains/imports/
├── __init__.py
├── models.py                    # Supplier + Dataset SQLAlchemy models
├── supplier_management/
│   ├── __init__.py
│   ├── router.py               # CRUD endpoints
│   ├── schemas.py              # Pydantic models
│   ├── service.py              # Business logic
│   └── seed.py                 # CLI command voor seeding
├── file_intake/
│   ├── __init__.py
│   ├── router.py               # Upload endpoints
│   ├── schemas.py
│   ├── service.py              # Upload + validation logic
│   ├── parser.py               # CSV/XLSX → JSON parsing
│   └── duplicate_checker.py    # SHA-256 hash check
└── dataset_lifecycle/
    ├── __init__.py
    ├── router.py               # Dataset CRUD
    ├── schemas.py
    └── service.py
```

---

## 🔍 Stap 2: Implementatie Volgorde

### Fase 1: Models & Migrations
1. **Maak `models.py`** met Supplier en Dataset models
2. **Genereer Alembic migration** voor beide tabellen
3. **Run migration** om tabellen aan te maken

### Fase 2: Supplier Management (IMP-SUP-*)
4. **Seed Suppliers** (IMP-SUP-SEED-001) - CLI command
5. **List Suppliers** (IMP-SUP-LIST-001) - GET /suppliers
6. **Create Supplier** (IMP-SUP-CRE-001) - POST /suppliers
7. **Update Supplier** (IMP-SUP-UPD-001) - PUT /suppliers/{id}
8. **Delete Supplier** (IMP-SUP-DEL-001) - DELETE /suppliers/{id}
9. **Fuzzy Match** (IMP-SUP-FUZ-001) - GET /suppliers/match?filename=

### Fase 3: File Intake (IMP-FIL-*)
10. **Upload File** (IMP-FIL-UPL-001) - POST /files/upload
11. **Validate Format** (IMP-FIL-VAL-001) - In upload service
12. **Check Duplicate** (IMP-FIL-DUP-001) - SHA-256 hash check
13. **Detect Table** (IMP-FIL-DET-001) - Header row detection
14. **Parse to JSON** (IMP-FIL-PAR-001) - CSV/XLSX → JSON
15. **Generate Error Report** (IMP-FIL-ERR-001) - Validation errors

### Fase 4: Dataset Lifecycle (IMP-DAT-*)
16. **Register Dataset** (IMP-DAT-REG-001) - After parsing
17. **List Datasets** (IMP-DAT-LST-001) - GET /datasets
18. **View Dataset** (IMP-DAT-VIW-001) - GET /datasets/{id}
19. **Delete Dataset** (IMP-DAT-DEL-001) - DELETE /datasets/{id}

---

## 📦 API Contracts

### Suppliers

```
GET  /api/v2/imports/suppliers?page=1&limit=20&search=tricorp
POST /api/v2/imports/suppliers
PUT  /api/v2/imports/suppliers/{id}
DELETE /api/v2/imports/suppliers/{id}
GET  /api/v2/imports/suppliers/match?filename=Tricorp_Catalog_2025.xlsx
POST /api/v2/imports/suppliers/seed  (multipart/form-data)
```

### Files

```
POST /api/v2/imports/files/upload  (multipart/form-data)
GET  /api/v2/imports/files/{upload_id}/status
```

### Datasets

```
GET    /api/v2/imports/datasets?page=1&status=inactive&supplier_id=uuid
GET    /api/v2/imports/datasets/{id}
GET    /api/v2/imports/datasets/{id}/preview  (first 10 rows)
GET    /api/v2/imports/datasets/{id}/errors   (error report)
DELETE /api/v2/imports/datasets/{id}
```

---

## 🛠️ Dependencies Toevoegen

Voeg toe aan `backend/requirements.txt`:

```
# File parsing
pandas>=2.0.0
openpyxl>=3.1.0      # Excel support
python-multipart>=0.0.9  # File uploads (already present)

# Fuzzy matching
rapidfuzz>=3.0.0

# File hashing
hashlib  # Standard library, no install needed
```

---

## ⚠️ Kritieke Punten

1. **Supplier is verplicht voor Dataset** - FK constraint, geen orphans
2. **File hash moet uniek zijn** - UNIQUE constraint op file_hash
3. **95% threshold** - Check valid_row_count / row_count >= 0.95
4. **MinIO buckets** - `raw-uploads` en `processed-json` (al in config)
5. **Cross-domain reference** - Dataset.created_by → users.id (Identity domain)

---

## 🚀 Start Commando's

```powershell
# 1. Check of Docker draait
docker compose ps

# 2. Start services indien nodig
docker compose up -d db storage

# 3. Activeer Python environment
cd backend
.venv\Scripts\activate

# 4. Check bestaande tabellen
docker compose exec db psql -U postgres -d databiz -c "\dt"

# 5. Na models aanmaken - genereer migration
alembic revision --autogenerate -m "Add suppliers and datasets tables"

# 6. Run migration
alembic upgrade head
```

---

## 📁 Relevante Bestanden om te Lezen

```
.ai/project/DOMAIN_REGISTRY.yaml          # Alle slices voor Imports
.ai/project/DECISION_LOG.md               # Business beslissingen
.ai/project/user-stories/IMPORTS_US001.md # Seed Suppliers
.ai/project/user-stories/IMPORTS_US002.md # Supplier CRUD
.ai/project/user-stories/IMPORTS_US003.md # Fuzzy Match
.ai/project/user-stories/IMPORTS_US004.md # Upload File
backend/src/shared/storage.py             # Bestaande MinIO client
backend/src/shared/database.py            # Bestaande DB setup
examples/suppliers/                        # Test data (11 bestanden)
```

---

## ✅ Definition of Done

- [ ] Supplier model + migration
- [ ] Dataset model + migration
- [ ] Seed suppliers werkt met `examples/suppliers/*.csv`
- [ ] CRUD endpoints voor suppliers
- [ ] Fuzzy match werkt met rapidfuzz
- [ ] File upload naar MinIO
- [ ] CSV/XLSX parsing naar JSON
- [ ] Duplicate detection blokkeert herhaalde uploads
- [ ] Error report gegenereerd bij parsing
- [ ] Dataset lifecycle states werken
- [ ] Tests voor alle endpoints

---

**Rol**: [DATA] + [ARCHITECT]  
**Focus**: Imports Domain - Full Implementation  
**Doel**: Van 0 naar volledig werkende import pipeline

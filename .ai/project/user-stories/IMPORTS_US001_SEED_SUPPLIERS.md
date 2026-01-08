# User Story: Seed Suppliers from CSV

**ID**: IMP-SUP-SEED-001  
**Domain**: Imports  
**Epic**: Supplier Management  
**Feature**: Supplier CRUD  
**Status**: PLANNED

---

## 1. The Story

**As a** System Admin,  
**I want** to seed suppliers from a CSV file,  
**So that** the initial supplier data is available.

---

## 2. Context & "Why"

The system needs a list of known suppliers before files can be imported and linked. Seeding allows bulk import of supplier master data from an existing CSV, avoiding manual entry.

---

## 3. Acceptance Criteria

- [ ] **AC1**: System reads CSV file with supplier data (name, code, optional fields)
- [ ] **AC2**: Suppliers are created if new, updated if code exists
- [ ] **AC3**: Duplicate codes are handled (update existing record)
- [ ] **AC4**: Success report shows: created, updated, skipped counts
- [ ] **AC5**: Invalid rows are logged with reason

---

## 4. Technical DoD

- [ ] **Backend**: CLI command `python -m src.cli seed-suppliers <file.csv>`
- [ ] **Backend**: Also available as admin API endpoint (optional)
- [ ] **Database**: Suppliers table with unique code constraint
- [ ] **Tests**: Unit test with sample CSV

---

## 5. Database Schema

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

---

## 6. CSV Format (Expected)

```csv
code,name,contact_email,country
SUP001,Tricorp,info@tricorp.nl,Netherlands
SUP002,Engel Workwear,sales@engelworkwear.com,Denmark
SUP003,FHB,info@fhb.de,Germany
```

---

## 7. API Contract (Optional Admin Endpoint)

**Request**:
```
POST /api/v2/imports/suppliers/seed
Content-Type: multipart/form-data

file: <suppliers.csv>
```

**Response (200 OK)**:
```json
{
  "created": 45,
  "updated": 5,
  "skipped": 2,
  "errors": [
    {"row": 12, "reason": "Missing required field: name"}
  ]
}
```

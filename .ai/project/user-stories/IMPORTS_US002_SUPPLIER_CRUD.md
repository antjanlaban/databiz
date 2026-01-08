# User Story: List, Create, Update, Delete Suppliers

**IDs**: IMP-SUP-LIST-001, IMP-SUP-CRE-001, IMP-SUP-UPD-001, IMP-SUP-DEL-001  
**Domain**: Imports  
**Epic**: Supplier Management  
**Feature**: Supplier CRUD  
**Status**: PLANNED

---

## 1. The Stories

### List Suppliers (IMP-SUP-LIST-001)
**As a** User, **I want** to view all suppliers, **so that** I can see available suppliers for imports.

### Create Supplier (IMP-SUP-CRE-001)
**As an** Admin, **I want** to create a new supplier on-the-fly, **so that** I can import files from new suppliers.

### Update Supplier (IMP-SUP-UPD-001)
**As an** Admin, **I want** to update supplier details, **so that** I can correct or enrich supplier data.

### Delete Supplier (IMP-SUP-DEL-001)
**As an** Admin, **I want** to delete a supplier, **so that** I can remove unused suppliers.

---

## 2. Acceptance Criteria

### List Suppliers
- [ ] **AC1**: API returns paginated list of suppliers
- [ ] **AC2**: List shows: id, code, name, is_active, dataset_count
- [ ] **AC3**: Filter by name (partial match) or code
- [ ] **AC4**: Sort by name or code (ascending/descending)
- [ ] **AC5**: Default: active suppliers only, option to include inactive

### Create Supplier
- [ ] **AC1**: Required fields: code, name
- [ ] **AC2**: Code must be unique (409 Conflict if duplicate)
- [ ] **AC3**: Code format: alphanumeric + underscore, max 50 chars
- [ ] **AC4**: Supplier created with is_active=true
- [ ] **AC5**: Returns created supplier with ID

### Update Supplier
- [ ] **AC1**: Can update: name, contact_email, contact_phone, address, country, is_active
- [ ] **AC2**: Code is immutable (cannot be changed)
- [ ] **AC3**: Returns updated supplier data

### Delete Supplier
- [ ] **AC1**: Cannot delete if datasets are linked
- [ ] **AC2**: If datasets exist, return 409 Conflict with dataset count
- [ ] **AC3**: Alternative: soft delete (set is_active=false)
- [ ] **AC4**: Hard delete removes record permanently

---

## 3. API Contracts

### List Suppliers
```
GET /api/v2/imports/suppliers?page=1&limit=20&search=tricorp&sort=name

Response 200 OK:
{
  "items": [
    {
      "id": "uuid",
      "code": "SUP001",
      "name": "Tricorp",
      "is_active": true,
      "dataset_count": 5,
      "created_at": "2025-12-16T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### Create Supplier
```
POST /api/v2/imports/suppliers
Content-Type: application/json

{
  "code": "SUP001",
  "name": "Tricorp",
  "contact_email": "info@tricorp.nl",
  "country": "Netherlands"
}

Response 201 Created:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "SUP001",
  "name": "Tricorp",
  ...
}
```

### Update Supplier
```
PATCH /api/v2/imports/suppliers/{id}
Content-Type: application/json

{
  "name": "Tricorp BV",
  "is_active": true
}

Response 200 OK:
{
  "id": "uuid",
  "code": "SUP001",
  "name": "Tricorp BV",
  ...
}
```

### Delete Supplier
```
DELETE /api/v2/imports/suppliers/{id}

Response 204 No Content (success)

Response 409 Conflict (has datasets):
{
  "detail": "Cannot delete supplier with 5 linked datasets. Deactivate instead."
}
```

---

## 4. Gherkin Scenarios

```gherkin
Feature: Supplier Management
  As an Admin
  I want to manage suppliers
  So that imports can be linked to the correct supplier

  Scenario: Create new supplier
    Given I am logged in as Admin
    When I create a supplier with code "NEW001" and name "New Supplier"
    Then the supplier is created successfully
    And I can see it in the supplier list

  Scenario: Attempt to create duplicate supplier code
    Given a supplier with code "SUP001" exists
    When I try to create a supplier with code "SUP001"
    Then I see error "A supplier with this code already exists"

  Scenario: Delete supplier with linked datasets
    Given supplier "SUP001" has 3 linked datasets
    When I try to delete supplier "SUP001"
    Then I see error "Cannot delete supplier with 3 linked datasets"

  Scenario: Soft delete supplier
    Given supplier "SUP001" exists and is active
    When I set supplier "SUP001" to inactive
    Then the supplier is_active becomes false
    And the supplier no longer appears in default list
```

---

## 5. Frontend Components

- `SupplierList.tsx` - Table with search, filter, pagination
- `CreateSupplierModal.tsx` - Form for new supplier
- `EditSupplierModal.tsx` - Form for editing supplier
- `SupplierDeleteConfirm.tsx` - Confirmation dialog with warning

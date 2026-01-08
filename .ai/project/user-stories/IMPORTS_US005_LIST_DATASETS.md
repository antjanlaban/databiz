# User Story: List Datasets

**ID**: IMP-DAT-LST-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As a** User,  
**I want** to view all datasets,  
**So that** I can see import history and status.

## 2. Context & "Why"
After uploading supplier files, users need a centralized view to track all imported datasets. This list serves as the main dashboard for monitoring import progress, identifying datasets that need attention (e.g., requiring field mapping or activation), and reviewing historical imports by supplier.

The list provides essential filtering and sorting capabilities to help users quickly find specific datasets, whether they're looking for recent uploads, datasets from a particular supplier, or datasets in a specific lifecycle status (new, inactive, active).

## 3. Acceptance Criteria
- [ ] **AC1**: API returns paginated list of datasets
- [ ] **AC2**: Show supplier name, status, row count, created date
- [ ] **AC3**: Filter by status (new, inactive, active)
- [ ] **AC4**: Filter by supplier
- [ ] **AC5**: Sort by date (newest first by default)

## 4. Technical DoD
- [ ] **Backend**: GET /api/v2/imports/datasets endpoint with query parameters for filtering (status, supplier_id, page, per_page) and sorting
- [ ] **Frontend**: Datasets list page with filter controls, search by supplier, status badges, and sortable table columns
- [ ] **Tests**: backend/tests/test_imports.py::TestDatasetLifecycle::test_list_datasets

## 5. API Contract

**Request**:
```http
GET /api/v2/imports/datasets?status=inactive&supplier_id=123&page=1&per_page=20
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "items": [
    {
      "id": 456,
      "supplier_id": 123,
      "supplier_name": "Tricorp",
      "filename": "Tricorp - RoerdinkCatalog.csv",
      "status": "inactive",
      "row_count": 1247,
      "error_count": 3,
      "created_at": "2025-12-17T10:30:00Z",
      "updated_at": "2025-12-17T10:31:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "per_page": 20,
  "pages": 3
}
```

## 6. Implementation Details

**Backend** (`backend/src/domains/imports/dataset_lifecycle/router.py`):
```python
@router.get("/datasets", response_model=PaginatedDatasetsResponse)
async def list_datasets(
    status: Optional[DatasetStatus] = None,
    supplier_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """List all datasets with filtering and pagination."""
    return await dataset_service.list_datasets(
        db, status=status, supplier_id=supplier_id, page=page, per_page=per_page
    )
```

**Service** (`backend/src/domains/imports/dataset_lifecycle/service.py`):
- Build query with filters using SQLAlchemy
- Join with suppliers table to include supplier_name
- Apply pagination using offset/limit
- Return paginated response with total count

## 7. Gherkin Scenarios

```gherkin
Feature: List Datasets

  Scenario: View all datasets
    Given I am authenticated as a User
    When I request GET /api/v2/imports/datasets
    Then I receive a paginated list of datasets
    And each dataset shows supplier name, status, row count, and created date
    And datasets are sorted by created_at descending (newest first)

  Scenario: Filter datasets by status
    Given I am authenticated as a User
    And there are datasets with statuses: new, inactive, active
    When I request GET /api/v2/imports/datasets?status=inactive
    Then I receive only datasets with status "inactive"

  Scenario: Filter datasets by supplier
    Given I am authenticated as a User
    And there are datasets from suppliers: Tricorp (ID 123), Engel (ID 124)
    When I request GET /api/v2/imports/datasets?supplier_id=123
    Then I receive only datasets from supplier Tricorp

  Scenario: Pagination works correctly
    Given I am authenticated as a User
    And there are 45 total datasets
    When I request GET /api/v2/imports/datasets?page=2&per_page=20
    Then I receive items 21-40
    And response shows total: 45, page: 2, pages: 3
```

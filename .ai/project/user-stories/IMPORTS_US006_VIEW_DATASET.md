# User Story: View Dataset

**ID**: IMP-DAT-VIW-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As a** User,  
**I want** to view dataset details,  
**So that** I can see metadata and error report.

## 2. Context & "Why"
After selecting a dataset from the list, users need to see comprehensive details about that specific import. This includes metadata (file information, supplier, timestamps), data quality metrics (row counts, error counts), and file paths for debugging purposes.

This detailed view helps users understand the dataset's health before proceeding with field mapping and activation. It serves as the entry point for viewing previews, error reports, and managing the dataset lifecycle.

## 3. Acceptance Criteria
- [ ] **AC1**: Show all dataset metadata
- [ ] **AC2**: Show supplier information
- [ ] **AC3**: Show row counts (total, valid, errors)
- [ ] **AC4**: Show file paths and timestamps
- [ ] **AC5**: Return 404 if dataset not found

## 4. Technical DoD
- [ ] **Backend**: GET /api/v2/imports/datasets/{id} endpoint returning full dataset details with nested supplier data
- [ ] **Frontend**: Dataset detail page with metadata display, action buttons (preview, errors, activate/deactivate, delete)
- [ ] **Tests**: backend/tests/test_imports.py::TestDatasetLifecycle::test_get_dataset, test_get_nonexistent_dataset_returns_404

## 5. API Contract

**Request**:
```http
GET /api/v2/imports/datasets/456
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": 456,
  "supplier_id": 123,
  "supplier": {
    "id": 123,
    "name": "Tricorp",
    "code": "TRICORP",
    "is_active": true
  },
  "filename": "Tricorp - RoerdinkCatalog.csv",
  "file_hash": "sha256:abc123...",
  "status": "inactive",
  "row_count": 1247,
  "error_count": 3,
  "json_data_path": "imports/tricorp/2025-12-17/dataset_456.json",
  "error_report_path": "imports/tricorp/2025-12-17/dataset_456_errors.json",
  "created_at": "2025-12-17T10:30:00Z",
  "updated_at": "2025-12-17T10:31:00Z"
}
```

**Response** (404 Not Found):
```json
{
  "detail": "Dataset not found"
}
```

## 6. Implementation Details

**Backend** (`backend/src/domains/imports/dataset_lifecycle/router.py`):
```python
@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Get single dataset with full details."""
    dataset = await dataset_service.get_dataset_by_id(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset
```

**Service** (`backend/src/domains/imports/dataset_lifecycle/service.py`):
- Query dataset by ID with eager loading of supplier relationship
- Return dataset with nested supplier data
- Raise 404 if not found

## 7. Gherkin Scenarios

```gherkin
Feature: View Dataset Details

  Scenario: View existing dataset
    Given I am authenticated as a User
    And dataset 456 exists with supplier Tricorp
    When I request GET /api/v2/imports/datasets/456
    Then I receive full dataset details
    And response includes supplier name, code, and active status
    And response includes row_count, error_count, and timestamps
    And response includes file paths for JSON data and error report

  Scenario: View non-existent dataset
    Given I am authenticated as a User
    And dataset 999 does not exist
    When I request GET /api/v2/imports/datasets/999
    Then I receive 404 Not Found
    And error message is "Dataset not found"

  Scenario: View dataset with no errors
    Given I am authenticated as a User
    And dataset 457 exists with error_count = 0
    When I request GET /api/v2/imports/datasets/457
    Then response shows error_count: 0
    And error_report_path may be null or empty
```

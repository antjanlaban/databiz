# User Story: View Dataset Errors

**ID**: IMP-DAT-ERR-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As a** User,  
**I want** to view dataset error report,  
**So that** I can see which rows failed validation.

## 2. Context & "Why"
During file parsing, certain rows may fail validation (e.g., missing EAN, invalid format, unparseable values). Users need visibility into these errors to:
- Understand data quality issues
- Communicate problems back to suppliers
- Decide whether the dataset is acceptable for activation
- Identify patterns in data quality across multiple imports

The error report provides row-level details with specific reasons for each failure, enabling users to assess the severity and take appropriate action (fix source data, proceed with warnings, or reject the import).

## 3. Acceptance Criteria
- [ ] **AC1**: Show total error count
- [ ] **AC2**: Show list of errors with row number and reason
- [ ] **AC3**: Return 404 if dataset not found

## 4. Technical DoD
- [ ] **Backend**: GET /api/v2/imports/datasets/{id}/errors endpoint that reads error report from storage
- [ ] **Frontend**: Error report page with filterable table showing row number, error type, and description
- [ ] **Tests**: backend/tests/test_imports.py::TestDatasetLifecycle::test_get_dataset_errors, test_get_errors_for_dataset_with_no_errors, test_get_errors_for_nonexistent_dataset

## 5. API Contract

**Request**:
```http
GET /api/v2/imports/datasets/456/errors
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "dataset_id": 456,
  "total_rows": 1247,
  "error_count": 3,
  "errors": [
    {
      "row_number": 234,
      "error_type": "missing_ean",
      "description": "EAN field is empty or missing",
      "raw_data": {
        "Style": "Basic T-Shirt",
        "Color": "White",
        "Size": "M"
      }
    },
    {
      "row_number": 567,
      "error_type": "invalid_ean_format",
      "description": "EAN must be 8-13 digits, found: 'ABC123'",
      "raw_data": {
        "EAN": "ABC123",
        "Style": "Worker Pants"
      }
    },
    {
      "row_number": 890,
      "error_type": "missing_ean",
      "description": "EAN field is empty or missing",
      "raw_data": {
        "Style": "Safety Vest",
        "Brand": "Tricorp"
      }
    }
  ]
}
```

**Response** (200 OK - No Errors):
```json
{
  "dataset_id": 457,
  "total_rows": 543,
  "error_count": 0,
  "errors": []
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
@router.get("/datasets/{dataset_id}/errors", response_model=DatasetErrorsResponse)
async def get_dataset_errors(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Get error report for dataset."""
    errors = await dataset_service.get_dataset_errors(db, dataset_id)
    if errors is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return errors
```

**Service** (`backend/src/domains/imports/dataset_lifecycle/service.py`):
- Fetch dataset by ID to get error_report_path
- If error_count is 0, return empty errors array
- Read error report JSON from MinIO using storage client
- Parse and structure error data
- Return error report with metadata

## 7. Gherkin Scenarios

```gherkin
Feature: View Dataset Errors

  Scenario: View errors for dataset with validation issues
    Given I am authenticated as a User
    And dataset 456 exists with 3 errors
    When I request GET /api/v2/imports/datasets/456/errors
    Then I receive error report with total_rows: 1247, error_count: 3
    And errors array contains 3 items
    And each error shows row_number, error_type, description, and raw_data

  Scenario: View errors for dataset with no issues
    Given I am authenticated as a User
    And dataset 457 exists with 0 errors
    When I request GET /api/v2/imports/datasets/457/errors
    Then I receive error report with error_count: 0
    And errors array is empty

  Scenario: View errors for non-existent dataset
    Given I am authenticated as a User
    And dataset 999 does not exist
    When I request GET /api/v2/imports/datasets/999/errors
    Then I receive 404 Not Found
    And error message is "Dataset not found"

  Scenario: Error types are categorized correctly
    Given I am authenticated as a User
    And dataset 456 has errors of types: missing_ean, invalid_ean_format, unparseable_value
    When I request GET /api/v2/imports/datasets/456/errors
    Then each error has a clear error_type field
    And users can filter/group by error_type in frontend
```

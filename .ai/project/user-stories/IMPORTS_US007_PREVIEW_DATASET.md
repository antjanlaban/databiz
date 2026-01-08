# User Story: Preview Dataset

**ID**: IMP-DAT-PRE-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As a** User,  
**I want** to preview dataset contents,  
**So that** I can see a sample of the data.

## 2. Context & "Why"
Before proceeding with field mapping and activation, users need to inspect the actual data within a dataset. This preview functionality allows users to verify that the file was parsed correctly, understand the structure of the data, and identify which columns contain the information needed for field mapping.

The preview shows a configurable number of rows (default 10, max 100) to balance between providing sufficient context and avoiding performance issues with large datasets.

## 3. Acceptance Criteria
- [ ] **AC1**: Show first N rows (default 10, max 100)
- [ ] **AC2**: Return JSON array of row objects
- [ ] **AC3**: Include column names
- [ ] **AC4**: Return 404 if dataset or JSON file not found

## 4. Technical DoD
- [ ] **Backend**: GET /api/v2/imports/datasets/{id}/preview?rows=N endpoint that reads from MinIO and returns sample data
- [ ] **Frontend**: Dataset preview component with configurable row count, display as table or JSON viewer
- [ ] **Tests**: backend/tests/test_imports.py::TestDatasetLifecycle::test_preview_dataset, test_preview_with_custom_row_count, test_preview_nonexistent_dataset_returns_404

## 5. API Contract

**Request**:
```http
GET /api/v2/imports/datasets/456/preview?rows=5
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "dataset_id": 456,
  "row_count": 1247,
  "preview_rows": 5,
  "columns": ["EAN", "Style", "Color", "Size", "Brand", "Image"],
  "data": [
    {
      "EAN": "8712318013000",
      "Style": "Premium Polo",
      "Color": "Navy",
      "Size": "M",
      "Brand": "Tricorp",
      "Image": "https://example.com/image1.jpg"
    },
    {
      "EAN": "8712318013017",
      "Style": "Premium Polo",
      "Color": "Navy",
      "Size": "L",
      "Brand": "Tricorp",
      "Image": "https://example.com/image2.jpg"
    }
  ]
}
```

**Response** (404 Not Found):
```json
{
  "detail": "Dataset not found or JSON file missing"
}
```

## 6. Implementation Details

**Backend** (`backend/src/domains/imports/dataset_lifecycle/router.py`):
```python
@router.get("/datasets/{dataset_id}/preview", response_model=DatasetPreviewResponse)
async def get_dataset_preview(
    dataset_id: int,
    rows: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Get preview of dataset contents."""
    preview = await dataset_service.get_dataset_preview(db, dataset_id, rows)
    if not preview:
        raise HTTPException(status_code=404, detail="Dataset not found or JSON file missing")
    return preview
```

**Service** (`backend/src/domains/imports/dataset_lifecycle/service.py`):
- Fetch dataset by ID to get json_data_path
- Read JSON file from MinIO using storage client
- Parse JSON and extract first N rows
- Extract column names from first row
- Return structured preview response

## 7. Gherkin Scenarios

```gherkin
Feature: Preview Dataset

  Scenario: Preview dataset with default row count
    Given I am authenticated as a User
    And dataset 456 exists with 1247 rows
    When I request GET /api/v2/imports/datasets/456/preview
    Then I receive the first 10 rows of data
    And response includes column names array
    And response shows total row_count: 1247

  Scenario: Preview dataset with custom row count
    Given I am authenticated as a User
    And dataset 456 exists with 1247 rows
    When I request GET /api/v2/imports/datasets/456/preview?rows=25
    Then I receive the first 25 rows of data

  Scenario: Preview with row count exceeding limit
    Given I am authenticated as a User
    And dataset 456 exists
    When I request GET /api/v2/imports/datasets/456/preview?rows=150
    Then I receive 422 Unprocessable Entity
    And error indicates rows must be between 1 and 100

  Scenario: Preview non-existent dataset
    Given I am authenticated as a User
    And dataset 999 does not exist
    When I request GET /api/v2/imports/datasets/999/preview
    Then I receive 404 Not Found
    And error message is "Dataset not found or JSON file missing"

  Scenario: Preview dataset with missing JSON file
    Given I am authenticated as a User
    And dataset 456 exists but JSON file was deleted
    When I request GET /api/v2/imports/datasets/456/preview
    Then I receive 404 Not Found
    And error message is "Dataset not found or JSON file missing"
```

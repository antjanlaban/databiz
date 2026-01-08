# User Story: Delete Dataset

**ID**: IMP-DAT-DEL-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As an** Admin,  
**I want** to delete a dataset,  
**So that** I can remove unwanted imports.

## 2. Context & "Why"
Over time, datasets may become obsolete, be uploaded by mistake, or need removal for data quality reasons. Admins need the ability to permanently delete datasets to maintain a clean import history and free up storage space.

However, deletion must be carefully controlled to prevent accidental removal of active datasets that are in use. The system enforces business rules around which datasets can be deleted and requires explicit status transitions to protect data integrity.

## 3. Acceptance Criteria
- [ ] **AC1**: Only datasets with status 'new' or 'inactive' can be deleted
- [ ] **AC2**: Active datasets must be deactivated first
- [ ] **AC3**: Delete JSON file from storage (optional)
- [ ] **AC4**: Delete error report from storage (optional)
- [ ] **AC5**: Delete dataset record from database

## 4. Technical DoD
- [ ] **Backend**: DELETE /api/v2/imports/datasets/{id} endpoint with status validation and cascade deletion
- [ ] **Frontend**: Delete button with confirmation modal, disabled for active datasets with tooltip explaining deactivation requirement
- [ ] **Tests**: backend/tests/test_imports.py::TestDatasetLifecycle::test_delete_dataset, test_delete_active_dataset_fails, test_delete_nonexistent_dataset_returns_404

## 5. API Contract

**Request**:
```http
DELETE /api/v2/imports/datasets/456
Authorization: Bearer {access_token}
```

**Response** (204 No Content):
```
(Empty body - successful deletion)
```

**Response** (400 Bad Request - Active Dataset):
```json
{
  "detail": "Cannot delete active dataset. Deactivate first."
}
```

**Response** (404 Not Found):
```json
{
  "detail": "Dataset not found"
}
```

**Response** (403 Forbidden - Non-Admin):
```json
{
  "detail": "Admin role required"
}
```

## 6. Implementation Details

**Backend** (`backend/src/domains/imports/dataset_lifecycle/router.py`):
```python
@router.delete("/datasets/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)  # Admin only
):
    """Delete dataset (only if status is 'new' or 'inactive')."""
    success = await dataset_service.delete_dataset(db, dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
```

**Service** (`backend/src/domains/imports/dataset_lifecycle/service.py`):
- Fetch dataset by ID
- Validate status is 'new' or 'inactive' (raise 400 if active)
- Optionally delete JSON file from MinIO using storage client
- Optionally delete error report from MinIO
- Delete dataset record from database (cascade to related records)
- Return success/failure

**Deletion Workflow**:
1. Check user role (Admin required)
2. Fetch dataset
3. Validate status (new/inactive only)
4. Delete storage files (JSON + error report)
5. Delete database record
6. Return 204 No Content

## 7. Gherkin Scenarios

```gherkin
Feature: Delete Dataset

  Scenario: Admin deletes inactive dataset
    Given I am authenticated as an Admin
    And dataset 456 exists with status "inactive"
    When I request DELETE /api/v2/imports/datasets/456
    Then I receive 204 No Content
    And dataset 456 is removed from database
    And JSON file and error report are deleted from storage

  Scenario: Admin attempts to delete active dataset
    Given I am authenticated as an Admin
    And dataset 457 exists with status "active"
    When I request DELETE /api/v2/imports/datasets/457
    Then I receive 400 Bad Request
    And error message is "Cannot delete active dataset. Deactivate first."
    And dataset 457 still exists in database

  Scenario: Admin deletes new dataset
    Given I am authenticated as an Admin
    And dataset 458 exists with status "new"
    When I request DELETE /api/v2/imports/datasets/458
    Then I receive 204 No Content
    And dataset 458 is removed from database

  Scenario: Non-admin attempts to delete dataset
    Given I am authenticated as a User (non-admin)
    And dataset 456 exists with status "inactive"
    When I request DELETE /api/v2/imports/datasets/456
    Then I receive 403 Forbidden
    And error message is "Admin role required"

  Scenario: Delete non-existent dataset
    Given I am authenticated as an Admin
    And dataset 999 does not exist
    When I request DELETE /api/v2/imports/datasets/999
    Then I receive 404 Not Found
    And error message is "Dataset not found"

  Scenario: Deletion cascade to related records
    Given I am authenticated as an Admin
    And dataset 456 has related field mappings
    When I request DELETE /api/v2/imports/datasets/456
    Then dataset 456 is deleted
    And all related field mappings are also deleted (cascade)
```

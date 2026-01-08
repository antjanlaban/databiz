# User Story: Deactivate Dataset

**ID**: IMP-DAT-DEA-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As an** Admin,  
**I want** to deactivate an active dataset,  
**So that** it is no longer used.

## 2. Context & "Why"
Deactivation allows admins to take a dataset out of production without permanently deleting it. This is useful when:
- A newer version of the supplier's catalog is available (activate new, deactivate old)
- Data quality issues are discovered after activation
- A dataset needs to be temporarily removed from production for review
- Historical datasets need to be archived but preserved for audit purposes

Deactivation is a reversible operation (datasets can be reactivated), whereas deletion is permanent. The system prevents deletion of active datasets, requiring deactivation first as a safety measure.

## 3. Acceptance Criteria
- [ ] **AC1**: Change status from 'active' to 'inactive'
- [ ] **AC2**: Only datasets with status 'active' can be deactivated
- [ ] **AC3**: Validate state transition via state machine
- [ ] **AC4**: Timestamp the status change
- [ ] **AC5**: Prevent deletion of active datasets (must deactivate first)

## 4. Technical DoD
- [ ] **Backend**: PATCH /api/v2/imports/datasets/{id}/status endpoint with status validation
- [ ] **Frontend**: Deactivate button on dataset detail page with confirmation modal, disabled if status != active
- [ ] **Tests**: backend/tests/test_imports.py::TestDatasetLifecycle::test_deactivate_dataset, test_deactivate_requires_active_status

## 5. API Contract

**Request**:
```http
PATCH /api/v2/imports/datasets/456/status
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "status": "inactive"
}
```

**Response** (200 OK):
```json
{
  "id": 456,
  "status": "inactive",
  "updated_at": "2025-12-17T11:30:00Z",
  "message": "Dataset deactivated successfully"
}
```

**Response** (400 Bad Request - Invalid Transition):
```json
{
  "detail": "Invalid status transition: new -> inactive. Only active datasets can be deactivated via API."
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
@router.patch("/datasets/{dataset_id}/status", response_model=DatasetStatusUpdateResponse)
async def update_dataset_status(
    dataset_id: int,
    status_update: DatasetStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)  # Admin only
):
    """Update dataset status (activate/deactivate)."""
    updated_dataset = await dataset_service.update_status(
        db, dataset_id, status_update.status
    )
    if not updated_dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return updated_dataset
```

**Service** (`backend/src/domains/imports/dataset_lifecycle/service.py`):
```python
async def update_status(db: AsyncSession, dataset_id: int, new_status: DatasetStatus):
    """Update dataset status with validation."""
    dataset = await get_dataset_by_id(db, dataset_id)
    if not dataset:
        return None
    
    # Validate status transition
    if new_status == DatasetStatus.INACTIVE:
        # Manual deactivation only allowed from active
        if dataset.status != DatasetStatus.ACTIVE:
            raise ValueError(
                f"Invalid status transition: {dataset.status} -> inactive. "
                "Only active datasets can be deactivated via API."
            )
        
        # Note: System can auto-set inactive after parsing (new -> inactive)
        # but user API only allows active -> inactive
    
    dataset.status = new_status
    dataset.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(dataset)
    return dataset
```

**Status Transition State Machine**:
```
new -> inactive (automatic after parsing - system only)
inactive -> active (activation - admin)
active -> inactive (deactivation - admin)
inactive -> deleted (deletion - admin, only if inactive/new)
```

**Frontend** (`frontend/src/pages/ImportsPage.tsx`):
```typescript
const handleStatusChange = async (datasetId: number, newStatus: 'active' | 'inactive') => {
  if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this dataset?`)) {
    return;
  }
  
  try {
    await importsApi.updateDatasetStatus(datasetId, newStatus);
    toast.success(`Dataset ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    refetchDatasets();
  } catch (error) {
    toast.error(`Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} dataset`);
  }
};
```

## 7. Gherkin Scenarios

```gherkin
Feature: Deactivate Dataset

  Scenario: Admin deactivates active dataset
    Given I am authenticated as an Admin
    And dataset 456 exists with status "active"
    When I request PATCH /api/v2/imports/datasets/456/status with {"status": "inactive"}
    Then I receive 200 OK
    And dataset status is now "inactive"
    And updated_at timestamp is recorded

  Scenario: Cannot deactivate non-active dataset
    Given I am authenticated as an Admin
    And dataset 457 exists with status "new"
    When I request PATCH /api/v2/imports/datasets/457/status with {"status": "inactive"}
    Then I receive 400 Bad Request
    And error message is "Invalid status transition: new -> inactive"

  Scenario: Non-admin cannot deactivate dataset
    Given I am authenticated as a User (non-admin)
    And dataset 456 exists with status "active"
    When I request PATCH /api/v2/imports/datasets/456/status with {"status": "inactive"}
    Then I receive 403 Forbidden
    And error message is "Admin role required"

  Scenario: Deactivated dataset can be deleted
    Given I am authenticated as an Admin
    And dataset 456 exists with status "active"
    When I deactivate dataset 456
    Then dataset status becomes "inactive"
    And I can now delete dataset 456

  Scenario: Active dataset cannot be deleted directly
    Given I am authenticated as an Admin
    And dataset 456 exists with status "active"
    When I request DELETE /api/v2/imports/datasets/456
    Then I receive 400 Bad Request
    And error message is "Cannot delete active dataset. Deactivate first."

  Scenario: Deactivation is reversible
    Given I am authenticated as an Admin
    And dataset 456 was deactivated
    And field mapping is still complete
    When I reactivate dataset 456
    Then dataset status becomes "active" again
    And previous mappings are preserved
```

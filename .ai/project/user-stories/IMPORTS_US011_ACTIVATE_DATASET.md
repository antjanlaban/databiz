# User Story: Activate Dataset

**ID**: IMP-DAT-ACT-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As an** Admin,  
**I want** to activate a dataset,  
**So that** SupplierProducts are extracted and the dataset is ready for use.

## 2. Context & "Why"
Activation is the final step that transitions a dataset from inactive (parsed, mapped) to active (in production use). When a dataset is activated:
- Field mappings are validated (7 required fields must be mapped)
- The dataset becomes the "live" version for that supplier
- Older datasets from the same supplier are automatically deactivated
- Product extraction is triggered (future: creates SupplierProducts)

This controlled activation process ensures that only validated, properly mapped datasets enter production, and that users always work with the most recent data from each supplier.

**IMPORTANT**: The current implementation is a TEMPORARY solution that allows manual status toggling for testing purposes. It skips the field mapping validation check. The true activation workflow will be implemented once the field mapping slices (IMP-MAP-*) are complete.

## 3. Acceptance Criteria
- [ ] **AC1**: Validate field mapping is complete (7 required mappings) *(currently skipped)*
- [ ] **AC2**: Change status from 'inactive' to 'active'
- [ ] **AC3**: Trigger extraction (Supplier Products domain) *(future)*
- [ ] **AC4**: Deactivate older versions (same supplier_id + EAN) *(future)*
- [ ] **AC5**: Return updated dataset with new status

## 4. Technical DoD
- [ ] **Backend**: PATCH /api/v2/imports/datasets/{id}/status endpoint with status validation and business logic
- [ ] **Frontend**: Activate button on dataset detail page with confirmation modal, disabled if status != inactive
- [ ] **Tests**: backend/tests/test_imports.py::TestDatasetLifecycle::test_activate_dataset, test_activate_requires_field_mapping (future)

## 5. API Contract

**Request**:
```http
PATCH /api/v2/imports/datasets/456/status
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "status": "active"
}
```

**Response** (200 OK):
```json
{
  "id": 456,
  "status": "active",
  "updated_at": "2025-12-17T11:00:00Z",
  "message": "Dataset activated successfully"
}
```

**Response** (400 Bad Request - Invalid Transition):
```json
{
  "detail": "Invalid status transition: new -> active. Dataset must be inactive first."
}
```

**Response** (400 Bad Request - Missing Mapping) *(future)*:
```json
{
  "detail": "Cannot activate: field mapping incomplete. Required fields: EAN, brand, productgroup, color, size, image_url"
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
    if new_status == DatasetStatus.ACTIVE:
        # FUTURE: Validate field mapping is complete
        # mapping = await get_field_mapping(db, dataset_id)
        # if not mapping or not mapping.is_complete():
        #     raise ValueError("Cannot activate: field mapping incomplete")
        
        if dataset.status != DatasetStatus.INACTIVE:
            raise ValueError(f"Invalid status transition: {dataset.status} -> active")
        
        # FUTURE: Trigger product extraction (SUP-EXT-PRO-001)
        # await trigger_extraction(db, dataset_id)
        
        # FUTURE: Deactivate older datasets from same supplier
        # await deactivate_older_datasets(db, dataset.supplier_id)
    
    dataset.status = new_status
    dataset.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(dataset)
    return dataset
```

**Status Transition State Machine**:
```
new -> inactive (automatic after parsing)
inactive -> active (admin action, requires mapping)
active -> inactive (deactivation)
```

## 7. Gherkin Scenarios

```gherkin
Feature: Activate Dataset

  Scenario: Admin activates inactive dataset
    Given I am authenticated as an Admin
    And dataset 456 exists with status "inactive"
    When I request PATCH /api/v2/imports/datasets/456/status with {"status": "active"}
    Then I receive 200 OK
    And dataset status is now "active"
    And updated_at timestamp is recorded

  Scenario: Cannot activate dataset with invalid status
    Given I am authenticated as an Admin
    And dataset 457 exists with status "new"
    When I request PATCH /api/v2/imports/datasets/457/status with {"status": "active"}
    Then I receive 400 Bad Request
    And error message is "Invalid status transition: new -> active"

  Scenario: Non-admin cannot activate dataset
    Given I am authenticated as a User (non-admin)
    And dataset 456 exists with status "inactive"
    When I request PATCH /api/v2/imports/datasets/456/status with {"status": "active"}
    Then I receive 403 Forbidden
    And error message is "Admin role required"

  Scenario: Activation triggers product extraction (future)
    Given I am authenticated as an Admin
    And dataset 456 exists with status "inactive"
    And field mapping is complete for dataset 456
    When I activate dataset 456
    Then product extraction job is triggered (SUP-EXT-PRO-001)
    And SupplierProducts are created from dataset JSON

  Scenario: Activation deactivates older datasets (future)
    Given I am authenticated as an Admin
    And dataset 456 (2025-12-17) exists with status "inactive" for supplier Tricorp
    And dataset 450 (2025-12-10) exists with status "active" for supplier Tricorp
    When I activate dataset 456
    Then dataset 456 becomes active
    And dataset 450 is automatically deactivated
```

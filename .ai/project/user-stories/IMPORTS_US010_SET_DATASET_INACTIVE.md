# User Story: Set Dataset Inactive

**ID**: IMP-DAT-INA-001  
**Domain**: Imports  
**Epic**: Dataset Lifecycle  
**Feature**: Dataset Management  
**Status**: done

## 1. The Story
**As the** System,  
**I want** to set a dataset to inactive after successful parsing,  
**So that** it awaits activation.

## 2. Context & "Why"
This is an automatic system operation that occurs after successful file upload and parsing. When a file is uploaded via the `/files/upload` endpoint, it is immediately parsed into JSON format. If parsing succeeds, the dataset status transitions from 'new' to 'inactive'.

The 'inactive' status signals that:
- The file was successfully parsed
- The data is available in JSON format
- Field mapping can now be performed
- The dataset is not yet in use (not activated)

This status transition is crucial for the workflow because it separates the parsing phase from the activation phase, allowing users to review data quality and configure field mappings before the dataset becomes active.

## 3. Acceptance Criteria
- [ ] **AC1**: Change status from 'new' to 'inactive'
- [ ] **AC2**: Only possible if parsing completed successfully
- [ ] **AC3**: Timestamp the status change
- [ ] **AC4**: Automatically triggered after file upload/parse

## 4. Technical DoD
- [ ] **Backend**: Automatic status update in POST /api/v2/imports/files/upload flow after successful parsing
- [ ] **Frontend**: No user action required - status badge automatically reflects new status after upload
- [ ] **Tests**: backend/tests/test_imports.py::TestFileUpload::test_upload_sets_dataset_inactive_on_success

## 5. API Contract

This is not a separate endpoint - it's part of the upload workflow.

**During Upload** (POST /api/v2/imports/files/upload):
```json
{
  "dataset_id": 456,
  "status": "new",
  "message": "Upload in progress..."
}
```

**After Parsing Succeeds**:
```json
{
  "dataset_id": 456,
  "status": "inactive",
  "row_count": 1247,
  "error_count": 3,
  "message": "File parsed successfully. Ready for field mapping."
}
```

## 6. Implementation Details

**Backend** (`backend/src/domains/imports/file_intake/service.py`):
```python
async def upload_and_parse_file(db: AsyncSession, file: UploadFile, supplier_id: int):
    """Upload file, parse to JSON, and set status to inactive."""
    # 1. Create dataset record with status='new'
    dataset = await create_dataset(db, supplier_id, filename, status="new")
    
    # 2. Upload file to MinIO
    file_path = await storage_client.upload(file)
    
    # 3. Parse file to JSON
    try:
        json_data, error_report = await parse_file(file_path)
        json_path = await storage_client.save_json(json_data)
        error_path = await storage_client.save_json(error_report) if error_report else None
        
        # 4. Update dataset with parsing results and set status='inactive'
        dataset.status = "inactive"
        dataset.json_data_path = json_path
        dataset.error_report_path = error_path
        dataset.row_count = len(json_data)
        dataset.error_count = len(error_report) if error_report else 0
        dataset.updated_at = datetime.utcnow()
        
        await db.commit()
        return dataset
    except ParsingError as e:
        # Keep status as 'new' if parsing fails
        dataset.error_message = str(e)
        await db.commit()
        raise
```

**Status Transition Logic** (`backend/src/domains/imports/dataset_lifecycle/service.py`):
```python
async def update_status(db: AsyncSession, dataset_id: int, new_status: DatasetStatus):
    """Update dataset status with validation."""
    dataset = await get_dataset_by_id(db, dataset_id)
    
    # Validate status transition
    if dataset.status == "new" and new_status == "inactive":
        # Allowed: automatic after parsing
        dataset.status = new_status
        dataset.updated_at = datetime.utcnow()
        await db.commit()
    else:
        raise ValueError(f"Invalid status transition: {dataset.status} -> {new_status}")
```

## 7. Gherkin Scenarios

```gherkin
Feature: Set Dataset Inactive After Parsing

  Scenario: Successful upload sets status to inactive
    Given I am authenticated as a User
    And supplier 123 exists
    When I upload file "Tricorp.csv" to supplier 123
    And file is parsed successfully
    Then dataset is created with status "inactive"
    And dataset has json_data_path, row_count, and error_count set
    And updated_at timestamp is recorded

  Scenario: Failed parsing keeps status as new
    Given I am authenticated as a User
    And supplier 123 exists
    When I upload corrupted file "invalid.csv" to supplier 123
    And file parsing fails
    Then dataset remains with status "new"
    And error_message is set with failure reason
    And json_data_path is null

  Scenario: Status transition is atomic
    Given I am authenticated as a User
    And file upload is in progress
    When parsing completes successfully
    Then status changes from "new" to "inactive" atomically
    And no intermediate states are visible to other users

  Background: Automatic Transition
    Given this is a system operation
    And no manual user action is required
    When upload and parse succeed
    Then status automatically becomes "inactive"
```

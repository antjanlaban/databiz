# User Story: Upload Supplier File

**ID**: IMP-FIL-UPL-001  
**Domain**: Imports  
**Epic**: File Intake  
**Feature**: File Upload  
**Status**: PLANNED

---

## 1. The Story

**As a** User,  
**I want** to upload a supplier file (CSV/XLSX),  
**So that** I can import supplier data into the system.

---

## 2. Context & "Why"

File upload is the entry point for all supplier data. Users need a reliable, user-friendly way to upload files with progress feedback. The system must validate files before processing to prevent wasted effort.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Accept CSV (.csv) and XLSX (.xlsx) files only
- [ ] **AC2**: Maximum file size: 100MB
- [ ] **AC3**: File is temporarily stored in upload directory
- [ ] **AC4**: Return upload ID for tracking processing status
- [ ] **AC5**: Show upload progress indicator (percentage)
- [ ] **AC6**: Support both drag & drop and file picker
- [ ] **AC7**: Validate file extension before upload starts
- [ ] **AC8**: Show clear error for unsupported file types

---

## 4. Technical DoD

- [ ] **Backend**: POST /api/v2/imports/files/upload endpoint
- [ ] **Backend**: Chunked upload support for large files
- [ ] **Backend**: Temporary storage cleanup job
- [ ] **Frontend**: Drag & drop zone component
- [ ] **Frontend**: File picker fallback
- [ ] **Frontend**: Progress bar with percentage
- [ ] **Tests**: Upload with various file sizes
- [ ] **Tests**: Reject invalid file types

---

## 5. API Contract

### Start Upload
```
POST /api/v2/imports/files/upload
Content-Type: multipart/form-data

file: <binary>
supplier_id: "uuid" (optional, can be set after fuzzy match)

Response 202 Accepted:
{
  "upload_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "uploading",
  "filename": "Tricorp_Catalog_2025.xlsx",
  "size_bytes": 5242880,
  "created_at": "2025-12-16T10:00:00Z"
}
```

### Check Upload Status
```
GET /api/v2/imports/files/upload/{upload_id}/status

Response 200 OK:
{
  "upload_id": "uuid",
  "status": "processing",  // uploading, processing, completed, failed
  "progress_percent": 75,
  "current_step": "parsing",
  "error": null
}
```

### Error Response (Invalid File Type)
```
Response 400 Bad Request:
{
  "detail": "Invalid file type. Only .csv and .xlsx files are accepted."
}
```

### Error Response (File Too Large)
```
Response 413 Request Entity Too Large:
{
  "detail": "File size exceeds maximum limit of 100MB."
}
```

---

## 6. File Validation (Backend)

```python
ALLOWED_EXTENSIONS = {'.csv', '.xlsx'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

async def validate_upload(file: UploadFile) -> None:
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Only .csv and .xlsx are accepted."
        )
    
    # Check file size (read first chunk to get content-length)
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size ({size // 1024 // 1024}MB) exceeds maximum limit of 100MB."
        )
```

---

## 7. Frontend Component

```typescript
// FileUploadZone.tsx
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';

export function FileUploadZone({ onUpload }: Props) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: handleDrop
  });
  
  async function handleDrop(files: File[]) {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const result = await uploadFile(files[0], (percent) => {
        setProgress(percent);
      });
      onUpload(result);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }
  
  return (
    <div 
      {...getRootProps()} 
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer",
        isDragActive && "border-primary bg-primary/5"
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <>
          <p>Uploading... {progress}%</p>
          <Progress value={progress} className="mt-4" />
        </>
      ) : isDragActive ? (
        <p>Drop the file here...</p>
      ) : (
        <p>Drag & drop a CSV or Excel file, or click to select</p>
      )}
    </div>
  );
}
```

---

## 8. Gherkin Scenarios

```gherkin
Feature: Upload Supplier File
  As a User
  I want to upload supplier files
  So that I can import data into the system

  Scenario: Successfully upload CSV file
    Given I am on the import page
    When I drop file "products.csv" (5MB) in the upload zone
    Then I see upload progress from 0% to 100%
    And I see message "File uploaded successfully"
    And I receive an upload ID

  Scenario: Successfully upload Excel file
    Given I am on the import page
    When I select file "catalog.xlsx" via file picker
    Then the file is uploaded successfully

  Scenario: Reject unsupported file type
    Given I am on the import page
    When I try to upload "document.pdf"
    Then I see error "Only .csv and .xlsx files are accepted"
    And no upload starts

  Scenario: Reject file too large
    Given I am on the import page
    When I try to upload "huge_catalog.xlsx" (150MB)
    Then I see error "File size exceeds maximum limit of 100MB"
    And no upload starts
```

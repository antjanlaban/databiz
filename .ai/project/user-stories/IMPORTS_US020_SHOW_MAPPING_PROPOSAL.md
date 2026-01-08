# User Story: Show Field Mapping Proposal (Activation Dialog)

**ID**: IMP-MAP-SHW-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: Activation Wizard  
**Status**: planned

---

## 1. The Story

**As an** Admin,  
**I want** to see AI-generated field mapping suggestions in a dialog when I click "Activate",  
**So that** I can review, adjust, and confirm mappings before the dataset is activated.

---

## 2. Context & "Why"

The activation flow is **the most critical user journey** in DataBiz Next. Currently:
- The "Activeren" button directly calls the API (bypassing field mapping)
- A separate `/field-mapping` page exists but is disconnected
- Activation fails with "Dataset has no field mappings" error

### Expected Activation Flow (7 Steps)
1. User clicks "Activeren" button on DatasetsPage
2. **Activation Dialog** opens (modal)
3. System calls AI to analyze dataset columns
4. AI returns mapping suggestions with confidence scores
5. User reviews/adjusts mappings in the dialog
6. User clicks "Confirm & Activate"
7. System saves mappings AND activates dataset (single action)

### Key Design Decisions
- **Modal vs Page**: Use modal dialog (stays in context of DatasetsPage)
- **AI Provider**: Start with rule-based FieldDetector, add LLM later (IMP-AI-001)
- **Validation**: All 7 fields must be mapped before "Activate" button is enabled

---

## 3. Acceptance Criteria

- [ ] **AC1**: "Activeren" button opens ActivationDialog modal
- [ ] **AC2**: Dialog shows loading state while analyzing dataset
- [ ] **AC3**: AI suggestions displayed with confidence score (0-100%)
- [ ] **AC4**: Low confidence (<70%) fields are highlighted for review
- [ ] **AC5**: User can change column mapping via dropdown (shows sample values)
- [ ] **AC6**: "Activate" button disabled until all required fields mapped
- [ ] **AC7**: On confirm: saves mappings AND activates dataset (single click)
- [ ] **AC8**: Success: dialog closes, DatasetsPage refreshes, shows "active" status
- [ ] **AC9**: Error: dialog shows error message, user can retry

---

## 4. Technical DoD

### Backend (existing endpoints - no changes needed)
- [x] `POST /api/v2/imports/field-mapping/datasets/{id}/analyze` - AI analysis
- [x] `POST /api/v2/imports/field-mapping/datasets/{id}/mappings` - Save mappings
- [x] `PATCH /api/v2/imports/datasets/{id}/activate` - Activate dataset

### Frontend (new components)
- [ ] `frontend/src/features/datasets/components/ActivationDialog.tsx` - Main modal (<150 lines)
- [ ] `frontend/src/features/datasets/components/MappingReviewTable.tsx` - Field mapping table
- [ ] `frontend/src/features/datasets/hooks/useActivationWizard.ts` - State management
- [ ] Update `useDatasets.ts` to open dialog instead of direct API call

### Tests
- [ ] `frontend/e2e/tests/activation-dialog.spec.ts` - E2E happy path
- [ ] Unit tests for useActivationWizard hook

---

## 5. API Contracts

### Step 1: Analyze Dataset (existing)
```http
POST /api/v2/imports/field-mapping/datasets/{id}/analyze
Authorization: Bearer {token}

Response 200 OK:
{
  "dataset_id": "uuid",
  "analysis": {
    "ean": {
      "suggested_column": "EAN13",
      "confidence": 95,
      "reasoning": "Column name matches, values are 13-digit numbers",
      "sample_values": ["8712345678901", "8712345678918"]
    },
    "brand": {
      "suggested_column": "Merk",
      "confidence": 90,
      "reasoning": "Matched against brands database",
      "sample_values": ["Nike", "Adidas"]
    },
    "productgroup": {
      "suggested_column": "Type",
      "confidence": 68,
      "reasoning": "Low confidence - values are generic",
      "sample_values": ["Product", "Article"]
    },
    "color": { ... },
    "size": { ... },
    "image_url": { ... },
    "style": { ... }
  },
  "columns": ["EAN13", "Merk", "Type", "Kleur", "Maat", "Afbeelding", "Model"]
}
```

### Step 2: Save Mappings (existing)
```http
POST /api/v2/imports/field-mapping/datasets/{id}/mappings
Content-Type: application/json

{
  "ean": "EAN13",
  "brand": "Merk",
  "productgroup": "Category",  // User changed from AI suggestion
  "color": "Kleur",
  "size": "Maat",
  "image_url": "Afbeelding",
  "style": "Model"
}

Response 201 Created:
{
  "dataset_id": "uuid",
  "mappings": { ... },
  "created_at": "2025-12-18T10:00:00Z"
}
```

### Step 3: Activate Dataset (existing)
```http
PATCH /api/v2/imports/datasets/{id}/activate
Authorization: Bearer {token}

Response 200 OK:
{
  "id": "uuid",
  "status": "active",
  "message": "Dataset activated successfully"
}
```

---

## 6. UI Design

### ActivationDialog Layout
```
┌────────────────────────────────────────────────────────────┐
│  🚀 Activate Dataset: "FHB-Artikelstammdaten_v104.csv"    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Step 1 of 2: Review Field Mapping                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                            │
│  ┌──────────────┬──────────────┬───────┬─────────────────┐ │
│  │ Required     │ Mapped To    │ Score │ Sample Values   │ │
│  │ Field        │              │       │                 │ │
│  ├──────────────┼──────────────┼───────┼─────────────────┤ │
│  │ EAN          │ EAN13 ▼      │ ✅ 95%│ 8712345678901   │ │
│  │ Brand        │ Merk ▼       │ ✅ 90%│ Nike, Adidas    │ │
│  │ Product Group│ Category ▼   │ ⚠️ 68%│ Shirts, Pants   │ │
│  │ Color        │ Kleur ▼      │ ✅ 85%│ Rood, Blauw     │ │
│  │ Size         │ Maat ▼       │ ✅ 88%│ 42, 44, 46      │ │
│  │ Image URL    │ Afbeelding ▼ │ ✅ 92%│ https://cdn...  │ │
│  │ Style        │ Model ▼      │ ✅ 80%│ Air Max 90      │ │
│  └──────────────┴──────────────┴───────┴─────────────────┘ │
│                                                            │
│  ⚠️  1 field has low confidence. Please review.           │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  [Cancel]                      [Confirm & Activate →]      │
└────────────────────────────────────────────────────────────┘
```

### States
1. **Loading**: Spinner + "Analyzing dataset columns..."
2. **Review**: Table with mappings (as shown above)
3. **Saving**: Button disabled + "Activating..."
4. **Success**: Dialog closes, toast shows "Dataset activated!"
5. **Error**: Alert banner with error message

---

## 7. Acceptance Test Scenarios

### Scenario 1: Happy Path
```gherkin
Given I have an inactive dataset with valid data
When I click "Activeren" button
Then the Activation Dialog opens
And AI suggestions are displayed with confidence scores
When I review and confirm the mappings
And I click "Confirm & Activate"
Then the mappings are saved
And the dataset is activated
And I see "active" status in the table
```

### Scenario 2: Low Confidence Field
```gherkin
Given the AI returns confidence <70% for "productgroup"
When I review the mappings
Then the field is highlighted with ⚠️ icon
And I can select a different column from dropdown
When I select "Category" instead of "Type"
Then the confidence warning is cleared
```

### Scenario 3: Cancel Flow
```gherkin
When I click "Cancel" in the dialog
Then the dialog closes
And no changes are saved
And the dataset remains "inactive"
```

---

## 8. Related Slices

| Slice ID         | Status    | Relationship                           |
|------------------|-----------|----------------------------------------|
| IMP-MAP-ANL-001  | done      | Backend: Analyze endpoint              |
| IMP-MAP-SAV-001  | done      | Backend: Save mappings endpoint        |
| IMP-DAT-ACT-001  | done      | Backend: Activate endpoint             |
| IMP-AI-001       | planned   | Future: LLM-based field detection      |

---

## 9. Out of Scope (Future)

- [ ] AI provider selection (OpenAI vs Anthropic)
- [ ] Token usage tracking in dialog
- [ ] Batch activation (multiple datasets)
- [ ] Field mapping templates (reuse previous mappings)

---

## 10. Dependencies

- **Existing**: FieldDetector (rule-based, rapidfuzz)
- **Existing**: field_mapping/router.py endpoints
- **Existing**: dataset_lifecycle/router.py activate endpoint
- **Frontend**: Need to refactor `useDatasets.ts` to open dialog

---

**Last Updated**: 2025-12-18  
**Author**: [BA] + [ARCHITECT]

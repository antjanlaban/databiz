# User Story: Fuzzy Match Supplier from Filename

**ID**: IMP-SUP-FUZ-001  
**Domain**: Imports  
**Epic**: Supplier Management  
**Feature**: Supplier CRUD  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** to fuzzy match supplier names from filenames,  
**So that** uploads are automatically linked to suppliers.

---

## 2. Context & "Why"

Supplier files often contain the supplier name in the filename (e.g., "Tricorp_Catalog_2025.xlsx"). Instead of requiring users to manually select the supplier, the system should automatically detect and suggest the matching supplier.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Extract potential supplier name from filename (before underscore/dash/date)
- [ ] **AC2**: Use fuzzy matching against existing supplier names and codes
- [ ] **AC3**: Return best match if confidence score > 80%
- [ ] **AC4**: Return null/empty if no confident match found
- [ ] **AC5**: User can override/confirm the suggested match
- [ ] **AC6**: Multiple matches above threshold: show ranked list to user

---

## 4. Technical Implementation

### Fuzzy Matching Library

```python
# Using rapidfuzz (faster than fuzzywuzzy)
from rapidfuzz import fuzz, process

def fuzzy_match_supplier(filename: str, suppliers: list[Supplier]) -> SupplierMatch | None:
    """
    Extract supplier name from filename and match against known suppliers.
    
    Args:
        filename: e.g., "Tricorp_ProductCatalog_2025.xlsx"
        suppliers: List of Supplier objects with name and code
        
    Returns:
        SupplierMatch with supplier_id and confidence, or None
    """
    # Step 1: Extract potential name from filename
    # Remove extension, split by common delimiters
    name_part = filename.rsplit('.', 1)[0]  # Remove extension
    
    # Split by common delimiters and take first meaningful part
    for delimiter in ['_', '-', ' ']:
        parts = name_part.split(delimiter)
        if len(parts) > 1:
            name_part = parts[0]
            break
    
    # Step 2: Build search corpus
    choices = []
    for supplier in suppliers:
        choices.append((supplier.id, supplier.name))
        choices.append((supplier.id, supplier.code))
    
    # Step 3: Fuzzy match
    results = process.extract(
        name_part, 
        [c[1] for c in choices],
        scorer=fuzz.WRatio,  # Weighted ratio - good for partial matches
        limit=5
    )
    
    # Step 4: Check confidence threshold
    if results and results[0][1] >= 80:
        matched_name = results[0][0]
        matched_idx = [c[1] for c in choices].index(matched_name)
        supplier_id = choices[matched_idx][0]
        
        return SupplierMatch(
            supplier_id=supplier_id,
            confidence=results[0][1],
            matched_on=matched_name
        )
    
    return None
```

### Dependencies

```toml
# pyproject.toml
[project.dependencies]
rapidfuzz = ">=3.0"
```

---

## 5. API Contract

**Request** (called during upload):
```
POST /api/v2/imports/suppliers/fuzzy-match
Content-Type: application/json

{
  "filename": "Tricorp_ProductCatalog_2025.xlsx"
}
```

**Response (match found)**:
```json
{
  "match_found": true,
  "supplier": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "TRI001",
    "name": "Tricorp"
  },
  "confidence": 95,
  "matched_on": "Tricorp"
}
```

**Response (no match)**:
```json
{
  "match_found": false,
  "supplier": null,
  "suggestions": [
    {"id": "uuid1", "name": "Tricolor", "confidence": 65},
    {"id": "uuid2", "name": "Tricot BV", "confidence": 60}
  ]
}
```

---

## 6. Gherkin Scenarios

```gherkin
Feature: Fuzzy Match Supplier from Filename
  As the System
  I want to automatically detect suppliers from filenames
  So that users don't have to manually select suppliers

  Scenario: Exact match in filename
    Given supplier "Tricorp" with code "TRI001" exists
    When I upload file "Tricorp_Catalog_2025.xlsx"
    Then the system suggests supplier "Tricorp" with 95%+ confidence
    And the supplier is pre-selected in the form

  Scenario: Partial match in filename
    Given supplier "FHB Workwear" exists
    When I upload file "FHB-prices-2025.csv"
    Then the system suggests supplier "FHB Workwear" with 85%+ confidence

  Scenario: No confident match
    Given no supplier contains "XYZ" in name or code
    When I upload file "XYZ_products.csv"
    Then the system shows "No supplier match found"
    And user must manually select or create supplier

  Scenario: User overrides suggestion
    Given supplier "Tricorp" is suggested for file "Tri_products.csv"
    When user selects different supplier "Tricolor"
    Then the upload is linked to "Tricolor"
```

---

## 7. UI Integration

```typescript
// During file upload, before final submit
const handleFileSelect = async (file: File) => {
  // Auto-detect supplier
  const match = await api.fuzzyMatchSupplier(file.name);
  
  if (match.match_found) {
    setSuggestedSupplier(match.supplier);
    setConfidence(match.confidence);
  } else {
    setShowSupplierSelector(true);
  }
};
```

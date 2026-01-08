# User Story: AI Detect EAN Column

**ID**: IMP-MAP-EAN-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: AI Analysis  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** AI to detect the EAN column,  
**So that** variants can be uniquely identified.

---

## 2. Context & "Why"

EAN (European Article Number) is the **most critical identifier** for product variants. It's a 8, 12, or 13-digit barcode number unique per product variant. Without EAN, we cannot reliably identify products or match against external systems.

However, **not all datasets have EAN**. Per business rule:
- Dataset without EAN column → BLOCKED (cannot activate)
- Dataset with EAN column but some rows missing EAN → ALLOWED (skip those rows during extraction)

---

## 3. Acceptance Criteria

- [ ] **AC1**: Look for columns named: EAN, EAN13, EAN8, GTIN, Barcode, Product Code, Artikelnummer
- [ ] **AC2**: Validate sample values are 8-13 digit numbers
- [ ] **AC3**: Confidence 95% if column name + valid format
- [ ] **AC4**: Confidence 60% if only name matches (format unclear)
- [ ] **AC5**: Return null if no EAN-like column found

---

## 4. Technical DoD

- [ ] **Backend**: EAN detection logic in AI prompt
- [ ] **Backend**: Validation: Block dataset activation if no EAN column
- [ ] **Tests**: Unit test for EAN pattern matching
- [ ] **Tests**: Test with various EAN column names (multilingual)

---

## 5. Detection Logic

### Column Name Patterns (Case-insensitive)
```
Primary: EAN, EAN13, EAN12, EAN8, GTIN, GTIN13
Secondary: Barcode, Product Code, Artikelnummer, Article Number
```

### Value Validation
```python
def is_valid_ean(value: str) -> bool:
    # Remove spaces/dashes
    cleaned = re.sub(r'[\s-]', '', str(value))
    
    # Check length (8, 12, or 13 digits)
    if not re.match(r'^\d{8,13}$', cleaned):
        return False
    
    # Optional: Validate EAN checksum
    # (skip for performance, just check format)
    
    return True

# Example valid EANs:
# 8712345678901 (EAN-13)
# 871234567890 (EAN-12)
# 87123456 (EAN-8)
# 8712-3456-7890-1 (with dashes, valid after cleaning)
```

### Confidence Scoring
```python
def calculate_ean_confidence(column_name: str, sample_values: List[str]) -> int:
    score = 0
    
    # Column name match (+40 points)
    if column_name.lower() in ['ean', 'ean13', 'ean12', 'ean8', 'gtin']:
        score += 40
    elif 'ean' in column_name.lower() or 'gtin' in column_name.lower():
        score += 30
    elif 'barcode' in column_name.lower():
        score += 20
    
    # Value format validation (+55 points)
    valid_count = sum(1 for v in sample_values if is_valid_ean(v))
    valid_ratio = valid_count / len(sample_values)
    
    if valid_ratio >= 0.95:
        score += 55  # Almost all values are valid EANs
    elif valid_ratio >= 0.80:
        score += 40
    elif valid_ratio >= 0.50:
        score += 20
    
    return min(score, 100)

# Examples:
# Column: "EAN13", Values: ["8712345678901", "8712345678918"] → 95%
# Column: "Product_Code", Values: ["8712345678901", "SKU123"] → 60%
# Column: "ID", Values: ["123", "456"] → 0%
```

---

## 6. AI Prompt Section

```
### EAN Detection

Look for columns that contain product barcodes (EAN/GTIN codes):

**Column name patterns:**
- Primary: EAN, EAN13, EAN8, GTIN, GTIN13
- Secondary: Barcode, Product Code, Artikelnummer

**Value validation:**
- Must be 8-13 digit numbers
- May contain spaces or dashes (e.g., "8712-3456-7890-1")
- At least 80% of sample values should match EAN format

**Output format:**
{
  "ean": {
    "suggested_column": "EAN13" or null,
    "confidence": 0-100,
    "reasoning": "Column name 'EAN13' + all sample values are 13-digit numbers",
    "sample_values": ["8712345678901", "8712345678918", "8712345678925"]
  }
}

**CRITICAL: If no EAN column found, return null. Dataset activation will be blocked.**
```

---

## 7. Business Rules

### Rule 1: No EAN Column → Block Activation
```python
async def validate_field_mapping(mapping: DatasetFieldMapping) -> None:
    if not mapping.ean_column:
        raise HTTPException(
            status_code=400,
            detail="Dataset must have an EAN column to be activated. "
                   "EAN is required for unique product identification."
        )
```

### Rule 2: EAN Column Present but Some Rows Missing → Allow
```python
# During extraction (SUP-EXT-PRO-001):
for row in dataset_rows:
    ean = row.get(mapping.ean_column)
    
    if not ean or not is_valid_ean(ean):
        # Skip this row, log as error
        logger.warning(f"Row {row_num} skipped: Invalid or missing EAN")
        continue
    
    # Process row normally
    create_supplier_variant(ean=ean, ...)
```

---

## 8. Edge Cases

### Case 1: Multiple EAN Columns
```
Columns: EAN13, EAN_Backup, Old_EAN

AI Decision: Pick primary column with most populated values
Reasoning: "Selected 'EAN13' (95% populated) over 'EAN_Backup' (30% populated)"
```

### Case 2: EAN Mixed with SKU
```
Column: "Product_ID"
Values: ["8712345678901", "SKU-ABC-123", "8712345678918"]

AI Decision: Confidence 60% (mixed format)
Reasoning: "Column contains mix of EAN and SKU codes. 66% are valid EANs."
User Action: Must review and decide if this is the EAN column
```

### Case 3: No EAN Column
```
Columns: SKU, Model, Description, Price

AI Decision: null
Reasoning: "No column found with EAN/barcode patterns"
System Action: Block dataset activation with clear error message
```

---

## 9. Multilingual Support

| Language | Column Names | Example |
|----------|--------------|---------|
| English | EAN, Barcode, Product Code | EAN13 |
| Dutch | EAN, Barcode, Artikelnummer | Artikelnummer |
| German | EAN, Barcode, Artikelnummer | EAN |
| French | EAN, Code-barres, Code produit | Code-barres |

---

## 10. Gherkin Scenarios

```gherkin
Feature: AI Detect EAN Column
  As the System
  I want to detect the EAN column
  So that products can be uniquely identified

  Scenario: Detect EAN column with high confidence
    Given dataset has column "EAN13"
    And sample values: ["8712345678901", "8712345678918", "8712345678925"]
    When AI analyzes columns
    Then EAN column is "EAN13"
    And confidence is 95%

  Scenario: Detect EAN column with alternative name
    Given dataset has column "Artikelnummer"
    And sample values are 13-digit numbers
    When AI analyzes columns
    Then EAN column is "Artikelnummer"
    And confidence is 90%

  Scenario: No EAN column found
    Given dataset has columns: SKU, Model, Price
    And no column contains barcode-like values
    When AI analyzes columns
    Then EAN column is null
    And dataset activation is blocked

  Scenario: EAN column with some invalid values
    Given dataset has column "EAN"
    And sample values: ["8712345678901", "MISSING", "8712345678918"]
    When AI analyzes columns
    Then EAN column is "EAN"
    And confidence is 85%
    And warning: "Some rows missing EAN will be skipped"
```

---

## 11. Dependencies

- **Part of**: IMP-MAP-ANL-001 (AI Analyze Dataset)
- **Blocks**: Dataset activation if no EAN column found
- **Used by**: SUP-EXT-PRO-001 (Product extraction)

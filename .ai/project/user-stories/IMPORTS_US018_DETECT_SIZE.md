# User Story: AI Detect Size Column

**ID**: IMP-MAP-SIZ-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: AI Analysis  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** AI to detect the size column,  
**So that** variant sizes are captured.

---

## 2. Context & "Why"

Size is a **required field** for product variants. Unlike color, size **allows "One Size" as default** for products without size variations (e.g., accessories, one-size-fits-all products).

AI must detect sizing systems (EU, UK, US, alphanumeric) and handle multi-language column names.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Look for columns: Size, Maat, Größe, Taille
- [ ] **AC2**: Validate sample values contain size codes (S/M/L or numbers)
- [ ] **AC3**: Confidence 85% if column name + size-like values
- [ ] **AC4**: Detect sizing system (EU, UK, US, Alpha)
- [ ] **AC5**: Allow "One Size" as valid value (no blocking if column missing)

---

## 4. Technical DoD

- [ ] **Backend**: Size detection logic with system detection
- [ ] **Backend**: Size pattern matching (numeric, alpha, combined)
- [ ] **Tests**: Test with EU, UK, US size formats
- [ ] **Tests**: Test with alphanumeric sizes (S, M, L, XL, XXL)

---

## 5. Detection Logic

### Column Name Patterns
```
Primary: Size, Maat (NL), Größe (DE), Grootte (NL alt), Taille (FR)
Secondary: Size_Code, Maatcode, Size_EU, Size_US
```

### Size Pattern Recognition
```python
SIZE_PATTERNS = {
    'alpha': r'^(XXS|XS|S|M|L|XL|XXL|XXXL)$',
    'numeric_eu': r'^\d{2,3}$',  # 36, 42, 176
    'numeric_us': r'^\d{1,2}(\.\d)?$',  # 8, 9.5, 10
    'uk': r'^UK\s?\d{1,2}$',  # UK 8
    'combined': r'^\d+[A-Z]$',  # 38L, 42R
    'range': r'^\d+-\d+$',  # 36-38
    'one_size': r'^(One Size|OS|Uni|Universal)$'
}

def detect_size_system(sample_values: List[str]) -> str:
    """Detect which sizing system is used"""
    systems = []
    
    for value in sample_values:
        val = str(value).strip().upper()
        
        if re.match(SIZE_PATTERNS['alpha'], val):
            systems.append('alpha')
        elif re.match(SIZE_PATTERNS['numeric_eu'], val):
            # EU sizes: 36-52 (shoes), 140-200 (clothing height)
            if 30 <= int(val) <= 60:
                systems.append('eu_shoes')
            elif 80 <= int(val) <= 220:
                systems.append('eu_clothing')
        elif re.match(SIZE_PATTERNS['numeric_us'], val):
            systems.append('us')
        elif re.match(SIZE_PATTERNS['uk'], val):
            systems.append('uk')
        elif re.match(SIZE_PATTERNS['one_size'], val):
            systems.append('one_size')
    
    if not systems:
        return 'unknown'
    
    # Return most common system
    return max(set(systems), key=systems.count)

# Examples:
# ["S", "M", "L", "XL"] → "alpha"
# ["42", "44", "46"] → "eu_shoes"
# ["8", "9.5", "10"] → "us"
# ["One Size", "One Size"] → "one_size"
```

### Confidence Scoring
```python
def calculate_size_confidence(column_name: str, sample_values: List[str]) -> dict:
    score = 0
    
    # Column name match (+35 points)
    col_lower = column_name.lower()
    if col_lower in ['size', 'maat', 'größe', 'grootte', 'taille']:
        score += 35
    elif 'size' in col_lower or 'maat' in col_lower:
        score += 25
    
    # Value validation (+50 points)
    size_matches = sum(1 for v in sample_values if matches_size_pattern(v))
    size_ratio = size_matches / len(sample_values)
    
    if size_ratio >= 0.90:
        score += 50
    elif size_ratio >= 0.75:
        score += 40
    elif size_ratio >= 0.50:
        score += 25
    
    # Detect system (+15 points for consistency)
    detected_system = detect_size_system(sample_values)
    if detected_system != 'unknown':
        score += 15
    
    return {
        "confidence": min(score, 100),
        "size_system": detected_system
    }
```

---

## 6. AI Prompt Section

```
### Size Detection

Look for columns that contain product variant sizes:

**Column name patterns:**
- Primary: Size, Maat, Größe, Grootte, Taille
- Secondary: Size_Code, Maatcode, Size_EU, Size_US

**Value validation:**
- Alphanumeric sizes: S, M, L, XL, XXL, XXXL
- Numeric EU sizes: 36, 38, 40, 42, 44, 46 (shoes/clothing)
- Numeric US sizes: 8, 9, 9.5, 10 (often with decimal)
- UK sizes: UK 8, UK 10
- One Size: "One Size", "OS", "Uni", "Universal"

**Sizing systems:**
- Alpha: S/M/L/XL (international)
- EU: 36-52 (shoes), 80-220 (clothing by height)
- US: 4-14 (decimal allowed)
- UK: UK prefix + number

**Output format:**
{
  "size": {
    "suggested_column": "Maat",
    "confidence": 88,
    "reasoning": "Column name 'Maat' (Dutch for Size) + numeric EU shoe sizes detected",
    "sample_values": ["42", "44", "46"],
    "size_system": "eu_shoes"
  }
}

**NOTE: Size is REQUIRED, but "One Size" is an acceptable default if no size column found.**
```

---

## 7. Edge Cases

### Case 1: Mixed Size Systems
```
Column: "Size"
Values: ["EU 42", "US 10", "UK 8"]

AI Decision: Confidence 75% (mixed systems)
Reasoning: "Column contains multiple sizing systems (EU, US, UK)"
User Action: Accept - enrichment will normalize to primary system
```

### Case 2: One Size Products
```
Column: "Size"
Values: ["One Size", "One Size", "One Size"]

AI Decision: Confidence 90%
Reasoning: "All products are 'One Size' - valid for accessories"
Note: "During extraction, store as size_raw='One Size'"
```

### Case 3: No Size Column (Default to One Size)
```
Columns: EAN, Model, Color, Price

AI Decision: null (no size column found)
System Action: ALLOW activation with default:
  "No size column detected. Defaulting all products to 'One Size'."
  
User Confirmation: "Confirm: All products will be marked as 'One Size'. Proceed?"
```

### Case 4: Size Ranges
```
Column: "Maat"
Values: ["36-38", "40-42", "44-46"]

AI Decision: Confidence 80%
Reasoning: "Column contains size ranges (valid for multi-fit products)"
Note: "Store as-is, do not split ranges"
```

---

## 8. Size System Reference

| System | Example Values | Use Case |
|--------|----------------|----------|
| **Alpha** | S, M, L, XL, XXL | T-shirts, casual wear |
| **EU Shoes** | 36, 38, 40, 42, 44 | European shoe sizes |
| **EU Clothing** | 140, 152, 164, 176 | EU clothing (by height in cm) |
| **US** | 8, 9, 9.5, 10, 10.5 | US shoe/clothing sizes |
| **UK** | UK 6, UK 8, UK 10 | UK shoe sizes |
| **One Size** | One Size, OS, Uni | Accessories, hats, scarves |

---

## 9. Gherkin Scenarios

```gherkin
Feature: AI Detect Size Column
  As the System
  I want to detect the size column
  So that variant sizes are captured

  Scenario: Detect size column (EU numeric)
    Given dataset has column "Maat"
    And sample values: ["42", "44", "46"]
    When AI analyzes columns
    Then size column is "Maat"
    And confidence is 88%
    And size system is "eu_shoes"

  Scenario: Detect size column (Alpha)
    Given dataset has column "Size"
    And sample values: ["S", "M", "L", "XL"]
    When AI analyzes columns
    Then size column is "Size"
    And confidence is 90%
    And size system is "alpha"

  Scenario: Detect One Size products
    Given dataset has column "Size"
    And all values are "One Size"
    When AI analyzes columns
    Then size column is "Size"
    And confidence is 90%
    And size system is "one_size"

  Scenario: No size column (default to One Size)
    Given dataset has no size-related columns
    When AI analyzes columns
    Then size column is null
    And system suggests default: "One Size"
    And activation is ALLOWED (not blocked)
    And user confirms default
```

---

## 10. Business Rule

**Size is REQUIRED, but "One Size" default is allowed**:
```python
async def validate_field_mapping(mapping: DatasetFieldMapping) -> None:
    if not mapping.size_column:
        # Prompt user to confirm One Size default
        logger.info("No size column mapped. Defaulting to 'One Size'")
        # Frontend shows confirmation dialog
        # If confirmed, proceed with size_raw = "One Size" for all products
```

**During extraction**:
```python
if mapping.size_column:
    size_raw = row.get(mapping.size_column) or "One Size"
else:
    size_raw = "One Size"  # Default for all products
```

---

## 11. Dependencies

- **Part of**: IMP-MAP-ANL-001 (AI Analyze Dataset)
- **Does NOT block**: Dataset activation (One Size default allowed)
- **Used by**: SUP-AI-SIZ-001 (Size normalization during enrichment)

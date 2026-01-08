# User Story: AI Detect Brand Column

**ID**: IMP-MAP-BRA-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: AI Analysis  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** AI to detect the brand column,  
**So that** products are linked to brands.

---

## 2. Context & "Why"

Brand is a **required field** for product categorization and search. Users want to filter products by brand (Nike, Adidas, etc.). AI must not only detect the brand column, but also **fuzzy match** sample values against our brands database to validate the column is correct.

Some datasets have single-brand catalogs (all Nike), others have multi-brand catalogs.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Look for columns: Brand, Merk, Manufacturer, Fabrikant, Marque
- [ ] **AC2**: Cross-check sample values against brands table (fuzzy match)
- [ ] **AC3**: Confidence 90% if column name + brands match
- [ ] **AC4**: If dataset has single brand → suggest hardcoding brand_id
- [ ] **AC5**: Return null if no brand column and multiple brands detected

---

## 4. Technical DoD

- [ ] **Backend**: Brand detection logic with fuzzy matching
- [ ] **Backend**: Query brands table for validation
- [ ] **Tests**: Test with single-brand vs multi-brand datasets
- [ ] **Tests**: Test fuzzy matching (e.g., "Nke" → "Nike")

---

## 5. Detection Logic

### Column Name Patterns
```
Primary: Brand, Merk (NL), Marque (FR), Marca (ES/IT)
Secondary: Manufacturer, Fabrikant (NL), Hersteller (DE), Fabricant (FR)
```

### Fuzzy Matching Against Brands Database
```python
from rapidfuzz import fuzz

async def fuzzy_match_brands(sample_values: List[str], db: AsyncSession) -> List[BrandMatch]:
    """Match sample values against brands table"""
    brands = await db.execute(select(Brand))
    all_brands = brands.scalars().all()
    
    matches = []
    for value in sample_values:
        best_match = None
        best_score = 0
        
        for brand in all_brands:
            score = fuzz.ratio(value.lower(), brand.name.lower())
            if score > best_score:
                best_score = score
                best_match = brand
        
        if best_score >= 80:  # Threshold for confident match
            matches.append({
                "value": value,
                "brand_id": best_match.id,
                "brand_name": best_match.name,
                "confidence": best_score
            })
    
    return matches

# Examples:
# "Nike" → Nike (100%)
# "Nke" → Nike (88%)
# "ADIDAS" → Adidas (100%)
# "UnknownBrand" → No match (<80%)
```

### Confidence Scoring
```python
def calculate_brand_confidence(
    column_name: str, 
    sample_values: List[str],
    brand_matches: List[BrandMatch]
) -> int:
    score = 0
    
    # Column name match (+30 points)
    if column_name.lower() in ['brand', 'merk', 'marque']:
        score += 30
    elif 'brand' in column_name.lower() or 'merk' in column_name.lower():
        score += 20
    
    # Brand database match (+60 points)
    match_ratio = len(brand_matches) / len(sample_values)
    avg_confidence = sum(m['confidence'] for m in brand_matches) / len(brand_matches)
    
    if match_ratio >= 0.90 and avg_confidence >= 90:
        score += 60  # Almost all values match known brands
    elif match_ratio >= 0.75:
        score += 45
    elif match_ratio >= 0.50:
        score += 30
    
    # Single brand bonus (+10 points)
    unique_brands = set(m['brand_name'] for m in brand_matches)
    if len(unique_brands) == 1:
        score += 10  # Single-brand catalog
    
    return min(score, 100)
```

---

## 6. AI Prompt Section

```
### Brand Detection

Look for columns that contain product brands/manufacturers:

**Column name patterns:**
- Primary: Brand, Merk, Marque, Marca
- Secondary: Manufacturer, Fabrikant, Hersteller

**Value validation:**
- Cross-check sample values against known brands database
- Use fuzzy matching (80%+ similarity)
- Common brands: Nike, Adidas, Puma, Under Armour, etc.

**Special case: Single-brand catalog**
If all sample values are the same brand (e.g., all "Nike"), suggest:
- Map column for consistency
- OR hardcode brand_id in extraction (more efficient)

**Output format:**
{
  "brand": {
    "suggested_column": "Merk",
    "confidence": 90,
    "reasoning": "Column name 'Merk' (Dutch for Brand) + fuzzy matched 'Nike' (92%), 'Adidas' (88%) against brands database",
    "sample_values": ["Nike", "Adidas", "Puma"],
    "brand_matches": [
      {"value": "Nike", "brand_id": "uuid", "confidence": 100},
      {"value": "Adidas", "brand_id": "uuid", "confidence": 100}
    ],
    "single_brand": false
  }
}
```

---

## 7. Single-Brand Catalog Optimization

### Detection
```python
if len(unique_brands) == 1:
    # Single-brand catalog (e.g., all Nike)
    return {
        "suggested_column": "Merk",
        "confidence": 95,
        "single_brand": True,
        "brand_id": nike_brand_id,
        "reasoning": "All products are from brand 'Nike'. Consider hardcoding brand_id instead of mapping column."
    }
```

### User Choice (UI)
```
⚠️  Single Brand Detected

All products in this dataset are from brand "Nike".

Option 1: Map column "Merk" (recommended for consistency)
Option 2: Hardcode brand to Nike (more efficient, skip column mapping)

[Map Column] [Hardcode Brand]
```

---

## 8. Edge Cases

### Case 1: Brand Column Empty (All Same Brand)
```
Column: "Brand"
Values: ["", "", ""]

AI checks other columns for brand mentions:
- Filename: "Nike_Catalog_2025.csv" → Detect "Nike"
- Supplier name: "Nike NL" → Detect "Nike"

Suggestion: Hardcode brand_id to Nike
```

### Case 2: Multiple Brands with Typos
```
Column: "Merk"
Values: ["Nike", "Nke", "NIKE", "nike"]

Fuzzy match: All → Nike (88%+)
Suggestion: Column "Merk", confidence 90%
Note: "Normalize to 'Nike' during extraction"
```

### Case 3: Unknown Brands
```
Column: "Brand"
Values: ["CustomBrand", "LocalSupplier", "OEM"]

Fuzzy match: 0% (no matches in brands DB)
Confidence: 50% (column name OK, but values unknown)
User Action: Must review - possibly add new brands to database
```

---

## 9. Brands Database

```sql
-- Seed common brands
INSERT INTO brands (name, logo_url) VALUES
('Nike', 'https://...'),
('Adidas', 'https://...'),
('Puma', 'https://...'),
('Under Armour', 'https://...'),
('Reebok', 'https://...'),
('New Balance', 'https://...'),
('Asics', 'https://...'),
('Skechers', 'https://...');
```

---

## 10. Gherkin Scenarios

```gherkin
Feature: AI Detect Brand Column
  As the System
  I want to detect the brand column
  So that products are linked to correct brands

  Scenario: Detect brand with fuzzy matching
    Given dataset has column "Merk"
    And sample values: ["Nike", "Adidas", "Puma"]
    And brands DB contains: Nike, Adidas, Puma
    When AI analyzes columns
    Then brand column is "Merk"
    And confidence is 90%
    And all values fuzzy matched (100%, 100%, 100%)

  Scenario: Detect single-brand catalog
    Given dataset has column "Brand"
    And all sample values are "Nike"
    When AI analyzes columns
    Then brand column is "Brand"
    And single_brand flag is true
    And suggests: "Hardcode brand_id to Nike"

  Scenario: Detect brand with typos
    Given dataset has column "Merk"
    And sample values: ["Nke", "NIKE", "nike"]
    When AI analyzes columns
    Then brand column is "Merk"
    And all values fuzzy match to "Nike" (88%+)

  Scenario: Unknown brands
    Given dataset has column "Brand"
    And sample values: ["CustomBrand", "LocalBrand"]
    And brands DB does not contain these
    When AI analyzes columns
    Then brand column is "Brand"
    And confidence is 50%
    And warning: "Unknown brands - manual review required"
```

---

## 11. Dependencies

- **Part of**: IMP-MAP-ANL-001 (AI Analyze Dataset)
- **Requires**: Brands table seeded with common brands
- **Requires**: rapidfuzz library for fuzzy matching
- **Used by**: SUP-EXT-PRO-001 (Brand linking during extraction)

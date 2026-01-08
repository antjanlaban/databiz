# User Story: AI Detect Productgroup Column

**ID**: IMP-MAP-GRP-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: AI Analysis  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** AI to detect the productgroup column,  
**So that** products can be categorized.

---

## 2. Context & "Why"

Productgroup (category/product type) is a **required field** that determines what kind of product it is (e.g., "T-shirt", "Sneaker", "Backpack"). This enables:

1. **Categorization**: Group products for navigation/filtering
2. **Business Rules**: Apply category-specific logic (e.g., shoes require size conversion)
3. **Analytics**: Report on sales by product type

Unlike brand/color/size, productgroup is more **semantic** - AI must understand that "Shirt", "T-Shirt", "Tee" all mean the same thing.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Look for columns: Category, Productgroep, Product Type, Artikel Type
- [ ] **AC2**: Validate sample values contain product categories
- [ ] **AC3**: Confidence 80% if column name + category-like values
- [ ] **AC4**: Support multi-language (NL, EN, DE, FR)
- [ ] **AC5**: Return null if no productgroup column found (will block activation)

---

## 4. Technical DoD

- [ ] **Backend**: Productgroup detection with semantic validation
- [ ] **Backend**: Category dictionary (common product types)
- [ ] **Tests**: Test with various category names
- [ ] **Tests**: Test with multi-language categories

---

## 5. Detection Logic

### Column Name Patterns
```
Primary: 
- Category, Productgroep (NL), Product Type, Artikel Type (NL)
- Producttype, Artikelgroep, Categorie

Secondary:
- Type, Group, Groep, Warengroep
- Main_Category, Product_Category
```

### Product Category Dictionary
```python
COMMON_CATEGORIES = {
    'clothing': [
        'shirt', 't-shirt', 'tee', 'polo', 'blouse',
        'pants', 'trousers', 'jeans', 'shorts',
        'jacket', 'coat', 'vest', 'hoodie', 'sweater',
        'dress', 'skirt', 'suit'
    ],
    'footwear': [
        'sneaker', 'shoe', 'boot', 'sandal', 'slipper',
        'trainer', 'loafer', 'pump', 'heel'
    ],
    'accessories': [
        'hat', 'cap', 'scarf', 'glove', 'belt',
        'bag', 'backpack', 'wallet', 'watch',
        'sunglasses', 'jewelry'
    ],
    'sportswear': [
        'sportshirt', 'tracksuit', 'legging', 'sportbra',
        'running shoe', 'football boot', 'gym bag'
    ]
}

# Dutch translations
COMMON_CATEGORIES_NL = {
    'kleding': ['shirt', 't-shirt', 'polo', 'broek', 'spijkerbroek', 'jas', 'vest', 'trui'],
    'schoenen': ['sneaker', 'schoen', 'laars', 'sandaal', 'slipper'],
    'accessoires': ['pet', 'sjaal', 'handschoen', 'riem', 'tas', 'rugzak', 'portemonnee'],
    'sportkleding': ['sportshirt', 'trainingspak', 'legging', 'sportbeha', 'hardloopschoen']
}

def is_product_category(value: str) -> Tuple[bool, str]:
    """Check if value resembles a product category"""
    value_lower = value.lower().strip()
    
    # Check all categories
    all_categories = []
    for cats in COMMON_CATEGORIES.values():
        all_categories.extend(cats)
    for cats in COMMON_CATEGORIES_NL.values():
        all_categories.extend(cats)
    
    # Exact match
    if value_lower in all_categories:
        return (True, 'exact')
    
    # Partial match (e.g., "Running Shoes" contains "shoe")
    for cat in all_categories:
        if cat in value_lower or value_lower in cat:
            return (True, 'partial')
    
    # Generic patterns (e.g., "Men's Shirt", "Women's Jacket")
    if any(word in value_lower for word in ['shirt', 'shoe', 'jacket', 'pants', 'bag']):
        return (True, 'pattern')
    
    return (False, None)
```

### Confidence Scoring
```python
def calculate_productgroup_confidence(column_name: str, sample_values: List[str]) -> dict:
    score = 0
    match_types = []
    
    # Column name match (+30 points)
    col_lower = column_name.lower()
    if col_lower in ['category', 'productgroep', 'product type', 'artikel type']:
        score += 30
    elif any(keyword in col_lower for keyword in ['category', 'type', 'group', 'groep']):
        score += 20
    
    # Value validation (+55 points)
    for value in sample_values:
        is_category, match_type = is_product_category(value)
        if is_category:
            match_types.append(match_type)
    
    category_ratio = len(match_types) / len(sample_values)
    
    if category_ratio >= 0.80:
        score += 55
    elif category_ratio >= 0.60:
        score += 40
    elif category_ratio >= 0.40:
        score += 25
    
    # Consistency bonus (+15 points)
    if match_types:
        # If mostly exact matches, higher confidence
        exact_count = match_types.count('exact')
        if exact_count / len(match_types) >= 0.70:
            score += 15
    
    return {
        "confidence": min(score, 100),
        "match_quality": "exact" if exact_count / len(match_types) >= 0.70 else "partial"
    }
```

---

## 6. AI Prompt Section

```
### Productgroup Detection

Look for columns that contain product categories or types:

**Column name patterns:**
- Primary: Category, Productgroep, Product Type, Artikel Type, Categorie
- Secondary: Type, Group, Groep, Warengroep, Main_Category

**Value validation:**
- Must contain product category names
- Common categories:
  - Clothing: Shirt, T-Shirt, Polo, Pants, Jeans, Jacket, Sweater, Dress
  - Footwear: Sneaker, Shoe, Boot, Sandal, Trainer
  - Accessories: Hat, Cap, Scarf, Bag, Backpack, Watch, Sunglasses
  - Sportswear: Sportshirt, Tracksuit, Legging, Running Shoe

**Multi-language support:**
- Dutch: Shirt, Broek, Jas, Sneaker, Tas, Sjaal
- English: Shirt, Pants, Jacket, Sneaker, Bag, Scarf
- German: Hemd, Hose, Jacke, Sneaker, Tasche, Schal
- French: Chemise, Pantalon, Veste, Basket, Sac, Écharpe

**Semantic understanding:**
- "T-Shirt" = "Tee" = "Shirt" (same category)
- "Running Shoes" contains "Shoes" (valid)
- "Men's Jacket" contains "Jacket" (valid)

**Output format:**
{
  "productgroup": {
    "suggested_column": "Productgroep",
    "confidence": 82,
    "reasoning": "Column name 'Productgroep' + sample values are product categories",
    "sample_values": ["T-Shirt", "Sneaker", "Rugzak"],
    "match_quality": "exact"
  }
}

**CRITICAL: Productgroup is REQUIRED. If no column found, dataset activation will be blocked.**
```

---

## 7. Edge Cases

### Case 1: Subcategories
```
Column: "Category"
Values: ["Men's T-Shirts", "Women's Sneakers", "Kids' Jackets"]

AI Decision: Confidence 85%
Reasoning: "Column contains product categories with gender/age prefixes"
Note: "Store as-is, enrichment will normalize to base categories"
```

### Case 2: Generic Type Column
```
Column: "Type"
Values: ["Shirt", "Shoe", "Bag"]

AI Decision: Confidence 75% (generic name but valid values)
Reasoning: "Generic 'Type' column, but values are clear product categories"
User Action: Accept
```

### Case 3: Numeric Category Codes
```
Column: "Category_Code"
Values: ["001", "002", "003"]

AI Decision: Confidence 40% (low - no semantic meaning)
Reasoning: "Numeric codes without category names"
User Action: Reject - ask user to provide category name column
```

### Case 4: No Productgroup Column
```
Columns: EAN, Brand, Color, Size, Price

AI Decision: null
Reasoning: "No column found with product category patterns"
System Action: BLOCK dataset activation with error:
  "Productgroup column is required. Please add a category/type column."
```

---

## 8. Multilingual Category Examples

| English | Dutch | German | French |
|---------|-------|--------|--------|
| T-Shirt | T-Shirt | T-Shirt | T-Shirt |
| Shirt | Shirt | Hemd | Chemise |
| Pants | Broek | Hose | Pantalon |
| Jeans | Spijkerbroek | Jeans | Jean |
| Jacket | Jas | Jacke | Veste |
| Sweater | Trui | Pullover | Pull |
| Sneaker | Sneaker | Sneaker | Basket |
| Shoe | Schoen | Schuh | Chaussure |
| Boot | Laars | Stiefel | Botte |
| Bag | Tas | Tasche | Sac |
| Backpack | Rugzak | Rucksack | Sac à dos |
| Cap | Pet | Mütze | Casquette |

---

## 9. Gherkin Scenarios

```gherkin
Feature: AI Detect Productgroup Column
  As the System
  I want to detect the productgroup column
  So that products can be categorized

  Scenario: Detect productgroup column (Dutch)
    Given dataset has column "Productgroep"
    And sample values: ["T-Shirt", "Sneaker", "Rugzak"]
    When AI analyzes columns
    Then productgroup column is "Productgroep"
    And confidence is 82%
    And match quality is "exact"

  Scenario: Detect productgroup column (English with prefixes)
    Given dataset has column "Category"
    And sample values: ["Men's T-Shirt", "Women's Sneaker"]
    When AI analyzes columns
    Then productgroup column is "Category"
    And confidence is 85%
    And note: "Will normalize gender/age prefixes"

  Scenario: Generic type column with valid values
    Given dataset has column "Type"
    And sample values: ["Shirt", "Shoe", "Bag"]
    When AI analyzes columns
    Then productgroup column is "Type"
    And confidence is 75%

  Scenario: No productgroup column found
    Given dataset has no category-related columns
    When AI analyzes columns
    Then productgroup column is null
    And dataset activation is blocked
    And error: "Productgroup column is required"
```

---

## 10. Business Rule

**Productgroup is REQUIRED** (no default allowed):
```python
async def validate_field_mapping(mapping: DatasetFieldMapping) -> None:
    if not mapping.productgroup_column:
        raise HTTPException(
            status_code=400,
            detail="Productgroup column is required for all datasets. "
                   "Cannot activate without category mapping."
        )
```

During extraction, every product MUST have a productgroup value.

---

## 11. Dependencies

- **Part of**: IMP-MAP-ANL-001 (AI Analyze Dataset)
- **Blocks**: Dataset activation if no productgroup column found
- **Used by**: SUP-AI-CAT-001 (Category normalization during enrichment)

# User Story: AI Detect Color Column

**ID**: IMP-MAP-COL-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: AI Analysis  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** AI to detect the color column,  
**So that** variant colors are captured.

---

## 2. Context & "Why"

Color is a **required field** for product variants. Every variant has a color (even if "N/A" or "One Color"). Unlike size, color does NOT have a "One Color" default - the field must be explicitly mapped.

AI must handle multi-language color names (Rood, Red, Rouge, Rot) and detect which column contains color information.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Look for columns: Color, Kleur, Colour, Farbe, Couleur
- [ ] **AC2**: Validate sample values contain color names
- [ ] **AC3**: Confidence 85% if column name + color-like values
- [ ] **AC4**: Support multi-language (NL, EN, DE, FR)
- [ ] **AC5**: Return null if no color column found (will block activation)

---

## 4. Technical DoD

- [ ] **Backend**: Color detection logic with language detection
- [ ] **Backend**: Color name dictionary (common colors multi-language)
- [ ] **Tests**: Test with Dutch, English, German, French color names
- [ ] **Tests**: Test with hex codes, RGB values (edge cases)

---

## 5. Detection Logic

### Column Name Patterns
```
Primary: Color, Kleur (NL), Colour (UK), Farbe (DE), Couleur (FR), Colore (IT), Color (ES)
Secondary: Colour_Name, Kleurcode, Color_Description
```

### Color Name Dictionary (Multi-language)
```python
COMMON_COLORS = {
    'nl': ['rood', 'blauw', 'groen', 'geel', 'zwart', 'wit', 'grijs', 'oranje', 'roze', 'paars'],
    'en': ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'orange', 'pink', 'purple'],
    'de': ['rot', 'blau', 'grün', 'gelb', 'schwarz', 'weiß', 'grau', 'orange', 'rosa', 'lila'],
    'fr': ['rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'gris', 'orange', 'rose', 'violet']
}

def is_color_name(value: str) -> Tuple[bool, str]:
    """Check if value is a color name, return (is_color, language)"""
    value_lower = value.lower().strip()
    
    for lang, colors in COMMON_COLORS.items():
        if value_lower in colors:
            return (True, lang)
    
    # Check for hex codes (#FF0000)
    if re.match(r'^#[0-9A-Fa-f]{6}$', value):
        return (True, 'hex')
    
    # Check for RGB (rgb(255, 0, 0))
    if re.match(r'^rgb\(\d+,\s*\d+,\s*\d+\)$', value):
        return (True, 'rgb')
    
    return (False, None)
```

### Confidence Scoring
```python
def calculate_color_confidence(column_name: str, sample_values: List[str]) -> dict:
    score = 0
    detected_language = None
    
    # Column name match (+35 points)
    col_lower = column_name.lower()
    if col_lower in ['color', 'kleur', 'colour', 'farbe', 'couleur']:
        score += 35
    elif 'color' in col_lower or 'kleur' in col_lower:
        score += 25
    
    # Value validation (+50 points)
    color_matches = [is_color_name(v) for v in sample_values]
    color_count = sum(1 for match, _ in color_matches if match)
    color_ratio = color_count / len(sample_values)
    
    if color_ratio >= 0.90:
        score += 50
    elif color_ratio >= 0.75:
        score += 40
    elif color_ratio >= 0.50:
        score += 25
    
    # Detect primary language (+15 points for consistency)
    languages = [lang for match, lang in color_matches if match and lang]
    if languages:
        detected_language = max(set(languages), key=languages.count)
        lang_consistency = languages.count(detected_language) / len(languages)
        if lang_consistency >= 0.80:
            score += 15
    
    return {
        "confidence": min(score, 100),
        "language": detected_language
    }
```

---

## 6. AI Prompt Section

```
### Color Detection

Look for columns that contain product variant colors:

**Column name patterns:**
- Primary: Color, Kleur, Colour, Farbe, Couleur, Colore
- Secondary: Color_Name, Kleurcode, Kleur_Omschrijving

**Value validation:**
- Must contain recognizable color names
- Support multi-language: NL (Rood), EN (Red), DE (Rot), FR (Rouge)
- Accept hex codes (#FF0000) or RGB values (rgb(255,0,0))
- At least 75% of sample values should be valid colors

**Common color names:**
- English: Red, Blue, Green, Yellow, Black, White, Gray, Orange, Pink, Purple
- Dutch: Rood, Blauw, Groen, Geel, Zwart, Wit, Grijs, Oranje, Roze, Paars
- German: Rot, Blau, Grün, Gelb, Schwarz, Weiß, Grau, Orange, Rosa, Lila
- French: Rouge, Bleu, Vert, Jaune, Noir, Blanc, Gris, Orange, Rose, Violet

**Output format:**
{
  "color": {
    "suggested_column": "Kleur",
    "confidence": 85,
    "reasoning": "Column name 'Kleur' (Dutch for Color) + sample values are Dutch color names",
    "sample_values": ["Rood", "Blauw", "Groen"],
    "detected_language": "nl"
  }
}

**CRITICAL: Color is REQUIRED. If no color column found, dataset activation will be blocked.**
```

---

## 7. Edge Cases

### Case 1: Multi-language Color Names in Same Column
```
Column: "Color"
Values: ["Red", "Rood", "Rouge", "Rot"]

AI Decision: Confidence 80% (mixed languages)
Reasoning: "Column contains colors in multiple languages (EN, NL, FR, DE)"
User Action: Accept - will normalize during enrichment (SUP-AI-COL-001)
```

### Case 2: Color Codes Instead of Names
```
Column: "Color_Code"
Values: ["#FF0000", "#0000FF", "#00FF00"]

AI Decision: Confidence 85%
Reasoning: "Column contains hex color codes (valid color representation)"
Note: "Enrichment will convert to standard names (Red, Blue, Green)"
```

### Case 3: Descriptive Colors
```
Column: "Kleur_Omschrijving"
Values: ["Felrood met witte strepen", "Donkerblauw", "Lichtgroen"]

AI Decision: Confidence 70%
Reasoning: "Column contains descriptive colors (primary color + modifiers)"
User Action: Review - may need manual normalization
```

### Case 4: No Color Column
```
Columns: EAN, Model, Size, Price

AI Decision: null
Reasoning: "No column found with color patterns"
System Action: BLOCK dataset activation with error:
  "Color column is required. Please add a color column or set all products to a default color."
```

---

## 8. Multilingual Color Mapping

| English | Dutch | German | French | Spanish | Italian |
|---------|-------|--------|--------|---------|---------|
| Red | Rood | Rot | Rouge | Rojo | Rosso |
| Blue | Blauw | Blau | Bleu | Azul | Blu |
| Green | Groen | Grün | Vert | Verde | Verde |
| Yellow | Geel | Gelb | Jaune | Amarillo | Giallo |
| Black | Zwart | Schwarz | Noir | Negro | Nero |
| White | Wit | Weiß | Blanc | Blanco | Bianco |
| Gray | Grijs | Grau | Gris | Gris | Grigio |
| Orange | Oranje | Orange | Orange | Naranja | Arancione |
| Pink | Roze | Rosa | Rose | Rosa | Rosa |
| Purple | Paars | Lila | Violet | Morado | Viola |

---

## 9. Gherkin Scenarios

```gherkin
Feature: AI Detect Color Column
  As the System
  I want to detect the color column
  So that variant colors are captured

  Scenario: Detect color column (Dutch)
    Given dataset has column "Kleur"
    And sample values: ["Rood", "Blauw", "Groen"]
    When AI analyzes columns
    Then color column is "Kleur"
    And confidence is 85%
    And detected language is "nl"

  Scenario: Detect color column (English)
    Given dataset has column "Color"
    And sample values: ["Red", "Blue", "Green"]
    When AI analyzes columns
    Then color column is "Color"
    And confidence is 85%
    And detected language is "en"

  Scenario: Detect color codes
    Given dataset has column "Color_Code"
    And sample values: ["#FF0000", "#0000FF", "#00FF00"]
    When AI analyzes columns
    Then color column is "Color_Code"
    And confidence is 85%
    And note: "Will convert to names during enrichment"

  Scenario: No color column found
    Given dataset has no color-related columns
    When AI analyzes columns
    Then color column is null
    And dataset activation is blocked
    And error: "Color column is required"
```

---

## 10. Business Rule

**Color is REQUIRED** (no default allowed):
```python
async def validate_field_mapping(mapping: DatasetFieldMapping) -> None:
    if not mapping.color_column:
        raise HTTPException(
            status_code=400,
            detail="Color column is required for all datasets. "
                   "Cannot activate without color mapping."
        )
```

Unlike size (which allows "One Size" default), color must be explicitly provided per variant.

---

## 11. Dependencies

- **Part of**: IMP-MAP-ANL-001 (AI Analyze Dataset)
- **Blocks**: Dataset activation if no color column found
- **Used by**: SUP-AI-COL-001 (Color normalization during enrichment)

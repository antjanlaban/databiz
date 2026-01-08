# User Story: AI Detect Image URL Column

**ID**: IMP-MAP-IMG-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: AI Analysis  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** AI to detect the image URL column,  
**So that** product images can be displayed.

---

## 2. Context & "Why"

Image URL is a **required field** for product display. Every product needs at least one image. Without images, products cannot be effectively merchandised.

AI must detect columns containing URLs (http/https) pointing to image files (jpg, png, webp) and validate their accessibility.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Look for columns: Image, Afbeelding, Image_URL, Foto
- [ ] **AC2**: Validate sample values contain valid URLs
- [ ] **AC3**: Confidence 90% if column name + URL pattern + image extension
- [ ] **AC4**: Return null if no image column found (will block activation)
- [ ] **AC5**: Support multi-image columns (Image1, Image2, etc.)

---

## 4. Technical DoD

- [ ] **Backend**: Image URL detection with URL validation
- [ ] **Backend**: Check for image extensions (jpg, png, webp, gif)
- [ ] **Tests**: Test with valid/invalid URLs
- [ ] **Tests**: Test with multi-image columns

---

## 5. Detection Logic

### Column Name Patterns
```
Primary:
- Image, Afbeelding (NL), Image_URL, Photo, Foto
- Picture, Beeld, Image1, MainImage

Secondary:
- ImageLink, Afbeelding_URL, Product_Image
- img, pic, foto_url
```

### URL Validation
```python
IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg']

def is_image_url(value: str) -> Tuple[bool, str]:
    """Check if value is a valid image URL"""
    if not value or not isinstance(value, str):
        return (False, 'empty')
    
    value = value.strip()
    
    # Must start with http/https
    if not value.startswith(('http://', 'https://')):
        return (False, 'no_protocol')
    
    # Check for image extension
    value_lower = value.lower()
    has_extension = any(value_lower.endswith(ext) for ext in IMAGE_EXTENSIONS)
    
    if has_extension:
        return (True, 'valid')
    
    # Could be a CDN URL without extension (e.g., Cloudinary)
    # Accept if contains "image", "img", "photo" in path
    if any(keyword in value_lower for keyword in ['image', 'img', 'photo', 'pic']):
        return (True, 'likely')
    
    return (False, 'no_extension')

# Examples:
# "https://example.com/product.jpg" → (True, 'valid')
# "https://cdn.example.com/images/12345" → (True, 'likely')
# "example.com/product.jpg" → (False, 'no_protocol')
# "" → (False, 'empty')
```

### Confidence Scoring
```python
def calculate_image_confidence(column_name: str, sample_values: List[str]) -> dict:
    score = 0
    valid_count = 0
    likely_count = 0
    
    # Column name match (+25 points)
    col_lower = column_name.lower()
    if col_lower in ['image', 'afbeelding', 'image_url', 'foto', 'photo']:
        score += 25
    elif any(keyword in col_lower for keyword in ['image', 'img', 'foto', 'photo', 'pic']):
        score += 20
    
    # URL validation (+60 points)
    for value in sample_values:
        is_valid, validation_type = is_image_url(value)
        if is_valid:
            if validation_type == 'valid':
                valid_count += 1
            elif validation_type == 'likely':
                likely_count += 1
    
    url_ratio = (valid_count + likely_count) / len(sample_values)
    
    if url_ratio >= 0.95:
        score += 60
    elif url_ratio >= 0.80:
        score += 50
    elif url_ratio >= 0.60:
        score += 35
    
    # Extension bonus (+15 points if all have image extensions)
    extension_ratio = valid_count / len(sample_values)
    if extension_ratio >= 0.90:
        score += 15
    
    return {
        "confidence": min(score, 100),
        "valid_urls": valid_count + likely_count,
        "total_samples": len(sample_values)
    }
```

---

## 6. AI Prompt Section

```
### Image URL Detection

Look for columns that contain product image URLs:

**Column name patterns:**
- Primary: Image, Afbeelding, Image_URL, Photo, Foto, Picture
- Secondary: ImageLink, Product_Image, MainImage, img, pic

**Value validation:**
- Must be valid URLs starting with http:// or https://
- Should end with image extensions: .jpg, .jpeg, .png, .webp, .gif
- CDN URLs without extensions are acceptable if path contains "image", "img", or "photo"

**Valid URL examples:**
- https://example.com/products/12345.jpg ✅
- https://cdn.example.com/images/product.png ✅
- https://storage.googleapis.com/bucket/photo.webp ✅
- https://cloudinary.com/images/abc123 ✅ (CDN without extension)

**Invalid URL examples:**
- example.com/product.jpg ❌ (no protocol)
- /images/product.jpg ❌ (relative path)
- product.jpg ❌ (filename only)
- "" ❌ (empty)

**Multi-image support:**
If multiple image columns found (Image1, Image2, Image3), map the first one as primary.
Note: "Additional image columns can be mapped later in advanced settings."

**Output format:**
{
  "image_url": {
    "suggested_column": "Afbeelding",
    "confidence": 92,
    "reasoning": "Column name 'Afbeelding' (Dutch for Image) + all URLs valid with image extensions",
    "sample_values": ["https://example.com/product1.jpg", "https://example.com/product2.png"],
    "valid_urls": 5,
    "total_samples": 5
  }
}

**CRITICAL: Image URL is REQUIRED. If no column found, dataset activation will be blocked.**
```

---

## 7. Edge Cases

### Case 1: Multi-Image Columns
```
Columns: Image1, Image2, Image3
Sample values: All valid URLs

AI Decision: Map Image1 as primary
Confidence: 93%
Reasoning: "Primary image detected (Image1), additional columns available"
Note: "Image2 and Image3 can be mapped in advanced settings"
```

### Case 2: CDN URLs Without Extensions
```
Column: "Image_URL"
Values: [
  "https://cdn.shopify.com/s/files/1/12345",
  "https://cloudinary.com/image/upload/abc123"
]

AI Decision: Confidence 85%
Reasoning: "CDN URLs without extensions, but path contains 'image'"
Note: "Enrichment will validate image accessibility"
```

### Case 3: Mixed Valid/Invalid URLs
```
Column: "Afbeelding"
Values: [
  "https://example.com/product.jpg",
  "example.com/product.png",  # Missing protocol
  "",                         # Empty
  "https://example.com/item.jpg"
]

AI Decision: Confidence 70% (50% valid)
Reasoning: "Only 50% of URLs are valid (missing protocol, empty values)"
User Action: Review - may need data cleanup before activation
```

### Case 4: No Image Column
```
Columns: EAN, Brand, Color, Size, Price

AI Decision: null
Reasoning: "No column found with image URL patterns"
System Action: BLOCK dataset activation with error:
  "Image URL column is required. Products without images cannot be displayed."
```

---

## 8. Image URL Accessibility Check (Optional)

During field mapping validation, optionally check if URLs are accessible:

```python
import aiohttp

async def validate_image_urls(urls: List[str]) -> dict:
    """Check accessibility of sample image URLs"""
    results = {'accessible': 0, 'not_accessible': 0, 'errors': []}
    
    async with aiohttp.ClientSession() as session:
        for url in urls[:5]:  # Check first 5 only
            try:
                async with session.head(url, timeout=5) as response:
                    if response.status == 200:
                        content_type = response.headers.get('Content-Type', '')
                        if content_type.startswith('image/'):
                            results['accessible'] += 1
                        else:
                            results['not_accessible'] += 1
                            results['errors'].append(f"{url}: Not an image (Content-Type: {content_type})")
                    else:
                        results['not_accessible'] += 1
                        results['errors'].append(f"{url}: HTTP {response.status}")
            except Exception as e:
                results['not_accessible'] += 1
                results['errors'].append(f"{url}: {str(e)}")
    
    return results

# Example usage:
# accessibility = await validate_image_urls(sample_values)
# if accessibility['not_accessible'] > accessibility['accessible']:
#     warning = "⚠️ Most image URLs are not accessible"
```

---

## 9. Gherkin Scenarios

```gherkin
Feature: AI Detect Image URL Column
  As the System
  I want to detect the image URL column
  So that product images can be displayed

  Scenario: Detect image column with valid URLs
    Given dataset has column "Afbeelding"
    And sample values: ["https://example.com/p1.jpg", "https://example.com/p2.png"]
    When AI analyzes columns
    Then image_url column is "Afbeelding"
    And confidence is 92%
    And all URLs are valid

  Scenario: Detect CDN URLs without extensions
    Given dataset has column "Image_URL"
    And sample values: ["https://cdn.example.com/image/12345"]
    When AI analyzes columns
    Then image_url column is "Image_URL"
    And confidence is 85%
    And note: "CDN URLs will be validated during enrichment"

  Scenario: Multi-image columns
    Given dataset has columns "Image1", "Image2", "Image3"
    And all contain valid URLs
    When AI analyzes columns
    Then image_url column is "Image1"
    And confidence is 93%
    And note: "Additional image columns available: Image2, Image3"

  Scenario: No image column found
    Given dataset has no image-related columns
    When AI analyzes columns
    Then image_url column is null
    And dataset activation is blocked
    And error: "Image URL column is required"
```

---

## 10. Business Rule

**Image URL is REQUIRED** (no default allowed):
```python
async def validate_field_mapping(mapping: DatasetFieldMapping) -> None:
    if not mapping.image_url_column:
        raise HTTPException(
            status_code=400,
            detail="Image URL column is required for all datasets. "
                   "Products without images cannot be displayed."
        )
```

**Optional accessibility validation**:
```python
# After field mapping saved, optionally validate URLs
if settings.VALIDATE_IMAGE_URLS:
    sample_urls = await get_sample_image_urls(dataset_id, mapping.image_url_column)
    accessibility = await validate_image_urls(sample_urls)
    if accessibility['not_accessible'] > 0:
        logger.warning(f"{accessibility['not_accessible']} image URLs not accessible")
        # Store warning, but don't block activation
```

---

## 11. Dependencies

- **Part of**: IMP-MAP-ANL-001 (AI Analyze Dataset)
- **Blocks**: Dataset activation if no image_url column found
- **Used by**: SUP-EXT-PRD-001 (Extract products with images)
- **Optional**: Image accessibility validation during enrichment

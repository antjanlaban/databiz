# User Story: AI Analyze Dataset Columns

**ID**: IMP-MAP-ANL-001  
**Domain**: Imports  
**Epic**: Field Mapping  
**Feature**: AI Analysis  
**Status**: PLANNED

---

## 1. The Story

**As the** System,  
**I want** AI to analyze dataset columns,  
**So that** field mappings are automatically suggested.

---

## 2. Context & "Why"

Field mapping is the bridge between raw supplier data and our standardized data model. Manual mapping for every dataset is time-consuming and error-prone. AI can analyze column names and sample values to suggest mappings with high accuracy (85-95%), saving ~5 minutes per dataset.

This is the **entry point** for the entire field mapping workflow. AI analyzes first 10 rows and returns suggestions for all 7 required fields.

---

## 3. Acceptance Criteria

- [ ] **AC1**: Read first 10 rows from dataset JSON
- [ ] **AC2**: Detect column names and sample values
- [ ] **AC3**: AI suggests mapping for each required field (EAN, brand, productgroup, color, size, image_url, style)
- [ ] **AC4**: AI provides reasoning/confidence per suggestion
- [ ] **AC5**: Flag uncertain mappings (confidence <70%) for user review
- [ ] **AC6**: Return structured response: `{field: suggested_column, confidence: 0-100, reasoning: string, sample_values: []}`

---

## 4. Technical DoD

- [ ] **Backend**: POST /api/v2/imports/datasets/{id}/analyze-fields endpoint
- [ ] **Backend**: AI service integration (OpenAI GPT-4o-mini)
- [ ] **Backend**: Log AI request to `ai_requests` table
- [ ] **Frontend**: Field Mapping Wizard (initial analysis screen)
- [ ] **Tests**: Unit test for AI prompt generation
- [ ] **Tests**: Integration test with mocked AI response

---

## 5. API Contract

### Analyze Dataset Fields
```
POST /api/v2/imports/datasets/550e8400-e29b-41d4-a716-446655440000/analyze-fields

Response 200 OK:
{
  "dataset_id": "550e8400-e29b-41d4-a716-446655440000",
  "analysis": {
    "ean": {
      "suggested_column": "EAN13",
      "confidence": 95,
      "reasoning": "Column name matches exactly and all sample values are 13-digit numbers",
      "sample_values": ["8712345678901", "8712345678918", "8712345678925"]
    },
    "brand": {
      "suggested_column": "Merk",
      "confidence": 90,
      "reasoning": "Column name is Dutch for 'Brand'. Fuzzy matched values: Nike (92%), Adidas (88%) against brands database",
      "sample_values": ["Nike", "Adidas", "Puma"]
    },
    "color": {
      "suggested_column": "Kleur",
      "confidence": 85,
      "reasoning": "Column name is Dutch for 'Color'. Sample values contain color names",
      "sample_values": ["Rood", "Blauw", "Groen"]
    },
    "size": {
      "suggested_column": "Maat",
      "confidence": 88,
      "reasoning": "Column name is Dutch for 'Size'. Sample values are numeric size codes",
      "sample_values": ["42", "44", "46"]
    },
    "productgroup": {
      "suggested_column": "Type",
      "confidence": 65,
      "reasoning": "Low confidence - values are generic ('Product', 'Article'). Consider 'Category' column instead?",
      "sample_values": ["Product", "Article", "Item"],
      "alternative_column": "Category",
      "alternative_samples": ["Shirts", "Pants", "Shoes"]
    },
    "image_url": {
      "suggested_column": "Afbeelding",
      "confidence": 92,
      "reasoning": "Column name is Dutch for 'Image'. All sample values are valid URLs",
      "sample_values": ["https://cdn.supplier.nl/img/123.jpg", "https://cdn.supplier.nl/img/124.jpg"]
    },
    "style": {
      "suggested_column": "Model",
      "confidence": 80,
      "reasoning": "Column name matches 'Model'. Sample values contain product style names",
      "sample_values": ["Air Max 90", "Superstar", "Suede Classic"]
    }
  },
  "ai_provider": "openai",
  "model": "gpt-4o-mini",
  "tokens_used": {
    "input": 1234,
    "output": 567
  },
  "cost": 0.003,
  "latency_ms": 1823,
  "created_at": "2025-12-17T10:05:30Z"
}
```

### Error Response (Dataset not found)
```
Response 404 Not Found:
{
  "detail": "Dataset with ID '...' not found"
}
```

### Error Response (AI provider unavailable)
```
Response 503 Service Unavailable:
{
  "detail": "AI provider temporarily unavailable. Please retry in 1 minute."
}
```

---

## 6. AI Prompt Design

```python
SYSTEM_PROMPT = """
You are an expert data analyst specializing in CSV/Excel column analysis.
Your task is to identify which columns in a dataset correspond to specific product fields.

Available fields to map:
- EAN: European Article Number (8-13 digits)
- Brand: Product manufacturer (e.g., Nike, Adidas)
- Productgroup: Category or product type
- Color: Variant color
- Size: Variant size
- Image URL: Product image link
- Style: Product model/style name

For each field, provide:
1. Suggested column name (or null if not found)
2. Confidence score (0-100)
3. Reasoning (why you chose this column)
4. Sample values (3 examples from the data)

Respond in JSON format only.
"""

USER_PROMPT = f"""
Dataset columns and sample data:

{json.dumps(sample_data, indent=2)}

Analyze these columns and suggest mappings for: EAN, Brand, Productgroup, Color, Size, Image URL, Style.
"""
```

---

## 7. Implementation Steps

### Backend Service
```python
# backend/src/domains/imports/field_mapping/service.py

from src.shared.ai.service import AIAgentService

class FieldMappingService:
    def __init__(self, db: AsyncSession, ai_service: AIAgentService):
        self.db = db
        self.ai = ai_service
    
    async def analyze_fields(self, dataset_id: UUID) -> FieldMappingAnalysis:
        # 1. Fetch dataset
        dataset = await self.db.get(Dataset, dataset_id)
        if not dataset:
            raise HTTPException(404, "Dataset not found")
        
        # 2. Read first 10 rows from MinIO
        json_data = await storage.read_json(dataset.json_data_path)
        sample = json_data[:10]
        
        # 3. Build AI prompt
        prompt = build_field_mapping_prompt(sample)
        
        # 4. Call AI
        response = await self.ai.complete(
            use_case="field_mapping_analyze",
            prompt=prompt,
            user_id=None,  # System-triggered
            entity_id=str(dataset_id),
            entity_type="dataset",
            temperature=0.3,  # Low temp for consistent results
            response_format="json"
        )
        
        # 5. Parse AI response
        analysis = parse_ai_response(response.content)
        
        # 6. Return structured result
        return FieldMappingAnalysis(
            dataset_id=dataset_id,
            analysis=analysis,
            ai_provider=response.model_id.split('/')[0],
            model=response.model_id,
            tokens_used={
                "input": response.input_tokens,
                "output": response.output_tokens
            },
            cost=response.cost,
            latency_ms=response.latency_ms
        )
```

---

## 8. Frontend Workflow

**Step 1**: User clicks "Activate Dataset" → Opens Field Mapping Wizard  
**Step 2**: Wizard auto-triggers `POST /analyze-fields`  
**Step 3**: Shows loading state: "🤖 Analyzing dataset columns..."  
**Step 4**: Display results (see UI mockup in AI_ARCHITECTURE.md)

```typescript
// frontend/src/components/FieldMappingWizard.tsx

async function startAnalysis(datasetId: string) {
  setLoading(true);
  try {
    const analysis = await api.post(`/datasets/${datasetId}/analyze-fields`);
    setMappings(analysis.data.analysis);
    setStep('review');  // Move to review step
  } catch (error) {
    toast.error('AI analysis failed. Please try again.');
  } finally {
    setLoading(false);
  }
}
```

---

## 9. Gherkin Scenarios

```gherkin
Feature: AI Analyze Dataset Columns
  As the System
  I want to analyze dataset columns with AI
  So that field mappings are automatically suggested

  Scenario: Successfully analyze dataset with high confidence
    Given I have a dataset with columns: EAN13, Merk, Kleur, Maat, Model
    When I trigger field analysis
    Then AI suggests:
      | Field | Column | Confidence |
      | EAN   | EAN13  | 95%        |
      | Brand | Merk   | 90%        |
      | Color | Kleur  | 85%        |
      | Size  | Maat   | 88%        |
      | Style | Model  | 80%        |
    And all suggestions are marked as "high confidence"

  Scenario: Analyze dataset with uncertain mapping
    Given I have a dataset with ambiguous column names
    When I trigger field analysis
    Then AI suggests productgroup with confidence 65%
    And mapping is flagged as "requires user review"

  Scenario: Handle AI provider unavailable
    Given OpenAI API is down
    When I trigger field analysis
    Then I see error "AI provider temporarily unavailable"
    And I can retry manually
```

---

## 10. Dependencies

- **Requires**: AI service layer (backend/src/shared/ai/)
- **Requires**: `ai_providers` and `ai_requests` database tables
- **Requires**: OpenAI API key in environment variables
- **Blocks**: IMP-MAP-SHW-001 (Show Mapping Proposal)

---

## 11. Success Metrics

- **Accuracy**: 85%+ of suggestions accepted by users without changes
- **Speed**: <5 seconds analysis time (p95)
- **Cost**: <€0.01 per dataset
- **User Satisfaction**: 90%+ users report time savings vs manual mapping

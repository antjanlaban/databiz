# Vertical Slice Template (Python V2)

Use this template when creating a new feature slice in the `/api/v2` (Python) backend.

## 1. Slice Definition

- **Name**: `[FeatureName]` (e.g., `ImportSupplierFile`)
- **User Story**: "As a [Role], I want to [Action], so that [Benefit]."
- **Endpoint**: `POST /api/v2/[resource]/[action]`

## 2. File Structure

Create a new directory: `backend/src/slices/[feature_name]/`

```text
backend/src/slices/[feature_name]/
├── __init__.py
├── router.py          # FastAPI endpoints
├── service.py         # Business logic
├── models.py          # Pydantic & SQLModel definitions
├── dependencies.py    # Slice-specific deps (optional)
└── tests/
    ├── __init__.py
    └── test_[feature].py
```

## 3. Checklist (Iron Dome)

- [ ] **OpenAPI**: Does `router.py` define clear response models?
- [ ] **Type Safety**: Are Pydantic models strict?
- [ ] **Tests**: Are there unit tests for the service and integration tests for the router?
- [ ] **Auth**: Is `Depends(get_current_user)` used?
- [ ] **Error Handling**: Are HTTP exceptions used correctly?

## 4. Example Code (Router)

```python
from fastapi import APIRouter, Depends
from .models import RequestModel, ResponseModel
from .service import process_request

router = APIRouter()

@router.post("/", response_model=ResponseModel)
async def endpoint(
    data: RequestModel,
    user = Depends(get_current_user)
):
    return await process_request(data, user)
```

# Error Handling & Logging Guide

## 1. Philosophy

Errors are inevitable. How we handle them defines the user experience.
**Goal:** Fail safe, fail fast, and inform the user clearly.

---

## 2. Backend V2 (Python)

### 2.1 Exception Hierarchy

We do not return raw 500 errors. We catch specific issues and map them to HTTP codes.

- **400 Bad Request**: Validation failed, business rule violated.
- **401 Unauthorized**: Missing/Invalid token.
- **403 Forbidden**: Valid token, but no permission.
- **404 Not Found**: Resource does not exist.
- **422 Validation Error**: Pydantic schema mismatch (handled automatically by FastAPI).
- **500 Internal Server Error**: Unexpected crash (bug).

### 2.2 Implementation Pattern

Use `HTTPException` in your Service layer.

```python
from fastapi import HTTPException, status

def get_product(product_id: str):
    product = repo.find(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found"
        )
    return product
```

### 2.3 Logging

**NEVER** use `print()`. Use the structured logger.

```python
import logging

logger = logging.getLogger(__name__)

try:
    process_file()
except Exception as e:
    logger.error("File processing failed", extra={"error": str(e), "file_id": 123})
    raise HTTPException(status_code=500, detail="Processing failed")
```

---

## 3. Frontend (TypeScript)

### 3.1 Global Error Boundary

Wrap the application in a React Error Boundary to catch crashes and show a "Something went wrong" UI instead of a white screen.

### 3.2 API Error Handling

Use a centralized Axios/Fetch interceptor or React Query `onError` callback.

- **4xx Errors**: Show a Toast notification (Warning/Info).
- **5xx Errors**: Show a Toast notification (Error) and log to Sentry.
- **Network Errors**: Show "You are offline" message.

### 3.3 Form Validation

Zod errors should be displayed **inline** next to the field, not in a generic alert.

---

## 4. Monitoring (Sentry)

- All 500 errors are automatically sent to Sentry.
- Include `trace_id` in both Backend logs and Frontend reports to correlate issues.

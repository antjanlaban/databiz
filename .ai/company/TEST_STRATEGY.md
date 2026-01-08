# Testing Strategy

## Quality Control for AI-Generated Code at Scale

**Purpose:** Maintain high code quality while agents produce features at velocity.
**Scope:** All projects (PiM, Korfbal, future apps)
**Last Updated:** December 14, 2025

---

## 1. Why Testing is Critical for AI-Generated Code

### The AI Code Quality Challenge

Research shows AI-generated code exhibits specific quality issues:

- **2-3x higher duplication** rates vs human-written code
- **Context loss** between iterations leads to inconsistencies
- **Security vulnerabilities** in ~40-50% of AI-generated code
- **Suboptimal algorithms** – AI optimizes for correctness, not efficiency
- **Missing edge cases** – AI focuses on happy paths

### Our Solution: Automated Quality Gates

Every slice must pass through **automated checkpoints** before merging:

1. **Pre-commit checks** (local, agent machine)
2. **CI pipeline tests** (GitHub Actions, T environment)
3. **Staging validation** (Railway staging, A environment)
4. **Production monitoring** (Runtime checks, P environment)

**Rule:** AI speed is only valuable if quality is maintained.

---

## 2. The Testing Pyramid (Adapted for DDD + Microservices)

We follow the **modern testing pyramid** for distributed systems:

```text
                ╱╲
               ╱  ╲
              ╱ E2E╲              (5-10% of tests)
             ╱      ╲             - Full user workflows
            ╱────────╲            - Slowest, most brittle
           ╱          ╲
          ╱Integration╲          (20-30% of tests)
         ╱             ╲          - Cross-slice, cross-domain
        ╱   Contract    ╲         - API contract verification
       ╱                 ╲        - Event contract verification
      ╱───────────────────╲
     ╱                     ╱      (60-70% of tests)
    ╱        Unit          ╱      - Slice-level logic
   ╱                      ╱       - Domain model validation
        - Fast, isolated, reliable  ╱────
```

### Distribution per Layer

| Layer           | % of Tests | Speed   | Scope                   | Tools                       |
| --------------- | ---------- | ------- | ----------------------- | --------------------------- |
| **Unit**        | 60-70%     | < 100ms | Single slice            | pytest, Jest                |
| **Integration** | 20-30%     | < 5s    | Multiple slices/domains | pytest + TestClient, MSW    |
| **Contract**    | 5-10%      | < 2s    | API/Event contracts     | Pact, Spring Cloud Contract |
| **E2E**         | 5-10%      | < 30s   | Full workflows          | Playwright, Selenium        |

---

## 3. Testing Strategy per OTAP Environment

### O (Omgeving – Development / Local)

**Purpose:** Fast feedback loop for agents during vibecoding.

**Tests run:**

- Unit tests (pytest, Jest)
- Linting (pylint, ESLint)
- Type checking (mypy, tsc)
- Basic integration tests (if fast)

**Tools:**

- pytest (Python)
- Jest (TypeScript)
- Pre-commit hooks (Husky, pre-commit framework)

**Requirements:**

- All unit tests pass before commit
- No linting/type errors
- Coverage ≥ 70% on new code

**Command:**

```bash
# Backend
pytest --cov=src --cov-report=term-missing tests/

# Frontend
npm test -- --coverage --watchAll=false
```

---

### T (Test – GitHub Actions)

**Purpose:** Automated quality gate – blocks bad code from reaching staging.

**Tests run:**

- All unit tests
- Integration tests (within single domain)
- Contract tests (provider verification)
- Security scanning (Bandit, npm audit)
- Code quality checks (SonarQube/CodeClimate)

**Tools:**

- GitHub Actions (CI/CD)
- pytest + pytest-cov
- Jest + coverage
- Bandit (Python security)
- npm audit (JS security)
- Optional: SonarQube for quality gates

**Requirements:**

- All tests green
- Coverage ≥ 70% (strictly enforced)
- No high/critical security vulnerabilities
- Code complexity within thresholds
- Duplication < 3%

**GitHub Actions Workflow Example:**

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio
      - name: Run tests
        run: |
          pytest --cov=src --cov-report=xml --cov-fail-under=70
      - name: Security scan
        run: bandit -r src/

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: "20"
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test -- --coverage --coverageThreshold='{"global":{"lines":70}}'
      - name: Lint
        run: npm run lint
      - name: Type check
        run: npm run type-check
```

---

### A (Acceptatie – Staging)

**Purpose:** Manual QA + smoke tests before production.

**Tests run:**

- Smoke tests (critical paths)
- End-to-end tests (key user workflows)
- Performance tests (load, stress)
- Security penetration tests (quarterly)

**Tools:**

- Playwright/Selenium (E2E)
- Locust/k6 (load testing)
- Manual exploratory testing

**Requirements:**

- All smoke tests pass
- No regressions in key workflows
- Performance within SLA (< 500ms API, < 3s frontend load)
- Manual sign-off before production

**Smoke Test Example (Playwright):**

```typescript
// tests/smoke/critical-path.spec.ts
import { test, expect } from "@playwright/test";

test("User can complete critical workflow", async ({ page }) => {
  await page.goto("https://staging.your-app.com");

  // Login
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Verify logged in
  await expect(page.locator("h1")).toContainText("Dashboard");

  // Complete key action
  await page.click("text=Create New");
  await page.fill('input[name="title"]', "Test Item");
  await page.click('button:has-text("Save")');

  // Verify success
  await expect(page.locator(".success-message")).toBeVisible();
});
```

---

### P (Productie – Production)

**Purpose:** Runtime monitoring + incident response.

**Tests run:**

- Health checks (every 5 min)
- Synthetic monitoring (Pingdom, UptimeRobot)
- Error tracking (Sentry)
- Performance monitoring (APM)

**Tools:**

- Sentry (error tracking)
- Railway metrics (built-in)
- UptimeRobot (uptime monitoring)
- Optional: Datadog/New Relic (APM)

**Requirements:**

- Uptime ≥ 99.5%
- API response < 500ms (p95)
- Error rate < 0.1%
- Alerts on: downtime > 5min, error rate > 0.5%

---

## 4. Test Types & Implementation

### 4.1 Unit Tests (60-70% of all tests)

**Scope:** Single slice, isolated logic.

**What to test:**

- Domain logic (business rules)
- Data validation (Pydantic, Zod)
- Edge cases, error handling
- Pure functions, utilities

**What NOT to test:**

- Framework code (FastAPI, React internals)
- Third-party libraries
- Trivial getters/setters

**Python Example (FastAPI):**

```python
# tests/domains/pim/price_management/test_calculate_margin.py
import pytest
from src.domains.pim.price_management.margin_calculator.service import calculate_margin

def test_calculate_margin_basic():
    """Test basic margin calculation."""
    cost = 100.0
    price = 150.0
    result = calculate_margin(cost, price)
    assert result == 50.0

def test_calculate_margin_zero_price():
    """Test margin with zero price."""
    with pytest.raises(ValueError, match="Price must be > 0"):
        calculate_margin(100.0, 0.0)

@pytest.mark.parametrize("cost,price,expected", [
    (100, 150, 50),
    (50, 100, 50),
    (200, 250, 50),
])
def test_calculate_margin_parametrized(cost, price, expected):
    """Test margin with multiple inputs."""
    assert calculate_margin(cost, price) == pytest.approx(expected)
```

**TypeScript Example (React):**

```typescript
// tests/components/ProductCard.test.tsx
import { render, screen } from "@testing-library/react";
import { ProductCard } from "@/components/ProductCard";

describe("ProductCard", () => {
  it("renders product information", () => {
    const product = {
      id: "1",
      name: "Test Product",
      price: 99.99,
    };

    render(<ProductCard product={product} />);

    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("€99.99")).toBeInTheDocument();
  });

  it("handles missing price gracefully", () => {
    const product = { id: "1", name: "Test", price: null };

    render(<ProductCard product={product} />);

    expect(screen.getByText("Price unavailable")).toBeInTheDocument();
  });
});
```

---

### 4.2 Integration Tests (20-30% of tests)

**Scope:** Multiple slices within same domain, or cross-domain interactions.

**What to test:**

- API endpoints (full request/response cycle)
- Database interactions (CRUD operations)
- Cross-slice workflows within one domain
- Event publishing/handling

**Python Example (FastAPI + Database):**

```python
# tests/domains/pim/integration/test_product_api.py
import pytest
from httpx import AsyncClient
from src.main import app
from src.database import get_db

@pytest.fixture
async def client():
    """Test client with database."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_product_integration(client):
    """Test full product creation flow."""
    payload = {
        "name": "Test Product",
        "sku": "TEST-001",
        "price": 99.99
    }

    response = await client.post("/api/v1/products", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["sku"] == "TEST-001"
    assert "id" in data

    # Verify in database
    product_id = data["id"]
    get_response = await client.get(f"/api/v1/products/{product_id}")
    assert get_response.status_code == 200
```

**Database Test Cleanup:**

```python
# conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from src.database import Base

@pytest.fixture(scope="function")
async def db_session():
    """Create clean database for each test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session

    await engine.dispose()
```

---

### 4.3 Contract Tests (5-10% of tests)

**Scope:** API contracts between domains/services.

**Why:** Prevents breaking changes when one domain changes its API.

**Approach:** Consumer-Driven Contract Testing (CDCT).

**How it works:**

1. **Consumer** (e.g. Sales domain) defines expected API contract from **Provider** (e.g. Catalog domain)
2. Consumer writes contract test (mock provider)
3. Contract is shared with Provider
4. Provider verifies their API satisfies consumer contract
5. If provider changes API → contract test fails → breaking change detected

**Tools:**

- Pact (Python, JS/TS)
- Spring Cloud Contract (if using Java)

**Example (Pact - Consumer Side):**

```python
# tests/contracts/test_catalog_api_contract.py
from pact import Consumer, Provider
import pytest

@pytest.fixture
def pact():
    pact = Consumer('SalesService').has_pact_with(Provider('CatalogService'))
    pact.start_service()
    yield pact
    pact.stop_service()

def test_get_product_contract(pact):
    """Define contract: Sales expects Catalog to return product."""
    expected = {
        'id': '123',
        'name': 'Product Name',
        'price': 99.99
    }

    (pact
     .given('Product 123 exists')
     .upon_receiving('a request for product 123')
     .with_request('GET', '/api/v1/products/123')
     .will_respond_with(200, body=expected))

    with pact:
        # Actual test using contract
        result = sales_service.get_product_from_catalog('123')
        assert result['name'] == 'Product Name'
```

**Example (Pact - Provider Side):**

```python
# tests/contracts/verify_catalog_contracts.py
from pact import Verifier

def test_catalog_honors_contracts():
    """Verify Catalog API satisfies all consumer contracts."""
    verifier = Verifier(provider='CatalogService',
                        provider_base_url='http://localhost:8000')

    # Load contracts from consumers
    verifier.verify_pacts('./pacts/SalesService-CatalogService.json')
```

---

### 4.4 End-to-End Tests (5-10% of tests)

**Scope:** Full user workflows across frontend + backend.

**When to use:**

- Critical business flows (signup, checkout, etc.)
- Smoke tests before production deploy
- Regression tests for high-value features

**When NOT to use:**

- Testing every edge case (use unit/integration instead)
- Validating domain logic (use unit tests)

**Tools:**

- Playwright (modern, fast)
- Selenium (legacy, slower)

**Example (Playwright):**

```typescript
// tests/e2e/product-management.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Product Management Workflow", () => {
  test("Admin can create and publish product", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "admin@example.com");
    await page.fill('[data-testid="password"]', "admin123");
    await page.click('[data-testid="login-button"]');

    // Navigate to products
    await page.click("text=Products");
    await expect(page).toHaveURL("/products");

    // Create new product
    await page.click('[data-testid="create-product"]');
    await page.fill('[data-testid="product-name"]', "New Product");
    await page.fill('[data-testid="product-sku"]', "TEST-001");
    await page.fill('[data-testid="product-price"]', "99.99");
    await page.click('[data-testid="save-product"]');

    // Verify success
    await expect(page.locator(".success-toast")).toContainText(
      "Product created"
    );
    await expect(page.locator("text=New Product")).toBeVisible();
  });
});
```

---

## 5. Testing Async Code (FastAPI + Python)

FastAPI uses async/await extensively. Testing requires specific setup.

### Setup for Async Tests

**Install:**

```bash
pip install pytest-asyncio httpx
```

**Configure pytest.ini:**

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
addopts = -v --cov=src
```

**Async Test Example:**

```python
# tests/test_async_endpoint.py
import pytest
from httpx import AsyncClient
from src.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_async_endpoint(client):
    """Test async FastAPI endpoint."""
    response = await client.get("/api/v1/users/123")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "123"
```

**Mocking Async Dependencies:**

```python
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_with_async_mock():
    """Test with mocked async dependency."""
    mock_db = AsyncMock()
    mock_db.get_user.return_value = {"id": "123", "name": "Test"}

    result = await some_service(mock_db)

    assert result["name"] == "Test"
    mock_db.get_user.assert_called_once_with("123")
```

---

## 6. Code Coverage Standards

### Minimum Requirements

| Code Type               | Min Coverage | Enforcement         |
| ----------------------- | ------------ | ------------------- |
| New code (AI-generated) | 80%          | Strict (CI fails)   |
| Existing code           | 70%          | Gradual improvement |
| Critical paths          | 90%+         | Manual review       |
| Utility functions       | 60%          | Encouraged          |

### Measuring Coverage

**Python:**

```bash
pytest --cov=src --cov-report=html --cov-report=term-missing
```

**TypeScript:**

```bash
npm test -- --coverage
```

### Interpreting Coverage

- **Lines covered:** Basic metric, aim for 70%+
- **Branch coverage:** More tests all if/else pathsimportant
- **Function coverage:** Ensures all functions are tested
- **Untested code:** Review coverage report, add tests for critical paths

**Don't chase 100% coverage** – focus on high-value code.

---

## 7. Quality Gates (CI/CD Pipeline)

### Gate 1: Pre-Commit (Local)

**Runs:** Before git commit
**Tool:** Husky (JS) or pre-commit (Python)
**Checks:**

- Linting
- Type checking
- Unit tests (fast subset)

**Configuration (.pre-commit-config.yaml):**

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/pylint
    rev: v3.0.0
    hooks:
      - id: pylint
```

### Gate 2: Pull Request (GitHub Actions)

**Runs:** On every PR to `dev`/`staging`/`main`
**Blocks merge if:** Any check fails
**Checks:**

- All tests pass
- Coverage ≥ 70%
- No security vulnerabilities (high/critical)
- Code complexity acceptable
- Duplication < 3%

### Gate 3: Staging Deploy

**Runs:** After merge to `staging`
**Blocks production if:** Smoke tests fail
**Checks:**

- Smoke tests pass
- Performance within SLA
- No error spikes in Sentry

### Gate 4: Production Deploy

**Runs:** After merge to `main`
**Rollback if:** Health checks fail
**Monitoring:**

- Uptime checks
- Error rate monitoring
- Performance degradation alerts

---

## 8. Tools & Dependencies

### Backend (Python/FastAPI)

```text
# requirements-test.txt
pytest==7.4.0
pytest-cov==4.1.0
pytest-asyncio==0.21.0
httpx==0.24.1 # Async HTTP client for FastAPI tests
faker==19.0.0 # Generate test data
freezegun==1.2.2 # Mock datetime
pytest-mock==3.11.1 # Mocking helper
bandit==1.7.5 # Security scanner
```

### Frontend (TypeScript/React)

```json
{
  "devDependencies": {
    "jest": "^29.6.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/user-event": "^14.4.3",
    "ts-jest": "^29.1.1",
    "@playwright/test": "^1.36.0",
    "msw": "^1.2.3"
  }
}
```

### CI/CD

- GitHub Actions (free for public repos, included in Pro)
- SonarQube Cloud (optional, for code quality)
- Codecov (optional, for coverage reports)

---

## 9. Testing Checklist per Slice

Before marking a slice "done", ensure:

- [ ] **Unit tests written** (≥70% coverage of new code)
- [ ] **Integration test** for API endpoint (if applicable)
- [ ] **Contract test** if slice exposes API to other domains
- [ ] **All tests pass locally** (`pytest`, `npm test`)
- [ ] **No linting errors** (`pylint`, `eslint`)
- [ ] **Type checking passes** (`mypy`, `tsc`)
- [ ] **Security scan clean** (no high/critical vulnerabilities)
- [ ] **CI pipeline green** (GitHub Actions)
- [ ] **Code reviewed** by you (human oversight)
- [ ] **Manual QA** in staging (if user-facing)

---

## 10. Best Practices for AI-Generated Code

### Test-First for AI

Traditional TDD breaks down at AI speed. Better approach:

1. **Define all tests upfront** (before implementation)
2. **Have AI generate implementation** to satisfy all tests
3. **Run tests, iterate until green**

**Example Prompt:**

> Generate ALL tests that should pass when this feature is complete:
> Feature: Bulk price update for products
>
> Include:
>
> - Happy path (valid CSV upload)
> - Edge cases (empty file, invalid format, duplicate SKUs)
> - Error cases (network failure, database error)
> - Security (unauthorized access, file size limits)
>
> Then generate the implementation.

### Red-Green Cycle for AI

1. Agent writes failing test
2. Agent writes code to make it pass
3. Verify green
4. Repeat

This creates a **structured feedback loop** that reduces regressions.

### Validation Checkpoints

After each slice, ask agent:

- "Does this implementation satisfy all requirements?"
- "Are there edge cases we missed?"
- "What could break in production?"

### Human-in-the-Loop

AI doesn't "understand" like humans. Always:

- Review AI-generated tests (are they meaningful?)
- Check edge cases (did AI miss something obvious?)
- Validate business logic (does it make sense?)
- Security review (is this safe?)

**Rule:** AI writes code fast, humans ensure it's correct.

---

## 11. Continuous Improvement

### Monthly Review

- [ ] Review test suite performance (are tests too slow?)
- [ ] Check coverage trends (improving or declining?)
- [ ] Analyze flaky tests (fix or remove)
- [ ] Update test data/fixtures
- [ ] Review security scan results

### Quarterly Review

- [ ] Audit test pyramid distribution (still 60/30/10?)
- [ ] Evaluate new tools (Playwright vs Selenium?)
- [ ] Update dependencies (pytest, Jest, etc.)
- [ ] Security penetration test
- [ ] Load testing (can we handle 10x traffic?)

### Annual Review

- [ ] Full test suite refactor (remove obsolete tests)
- [ ] Update testing standards (new best practices?)
- [ ] Benchmark against industry (are we behind?)
- [ ] Training for new tools/techniques

---

## 12. Quick Reference

| Question                       | Answer                                              |
| ------------------------------ | --------------------------------------------------- |
| **What % unit tests?**         | 60-70% of all tests                                 |
| **Min coverage?**              | 70% overall, 80% for AI-generated code              |
| **Which tool for Python?**     | pytest + pytest-cov + httpx                         |
| **Which tool for TypeScript?** | Jest + React Testing Library                        |
| **Which tool for E2E?**        | Playwright (modern), Selenium (legacy)              |
| **When do tests run?**         | Pre-commit (local), PR (CI), Deploy (staging/prod)  |
| **What blocks a merge?**       | Failed tests, coverage < 70%, security issues       |
| **Who reviews tests?**         | You (human oversight required)                      |
| **How often update?**          | Monthly minor, quarterly major, annually full audit |

---

## Summary

Your testing strategy:

**70% unit** – Fast, isolated, slice-level
**25% integration** – API/DB, cross-slice
**5% contract** – Domain boundaries
**5% E2E** – Critical workflows

**Coverage ≥ 70%** (80% for AI code)
**CI enforces quality gates**
**Human reviews AI-generated tests**
**Automated monitoring in production**

**This strategy keeps agents productive while maintaining quality.**

---

**Document Version:** 1.0
**Last Updated:** December 14, 2025
**Owner:** Antjan Laban

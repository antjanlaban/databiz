# Performance Baseline Report - DataBiz Next

> **Purpose:** Document API response times and performance benchmarks  
> **Owner:** [DEVOPS]  
> **Updated:** On each test run

---

## Performance Targets

| Metric                 | Target  | Acceptable | Action if Exceeded       |
| :--------------------- | :------ | :--------- | :----------------------- |
| API Response (simple)  | < 100ms | < 200ms    | Investigate slow queries |
| API Response (complex) | < 300ms | < 1000ms   | Add caching/indexing     |
| File Upload (1MB)      | < 2s    | < 5s       | Optimize parsing logic   |
| Database Query         | < 50ms  | < 200ms    | Add indexes              |
| Page Load (FCP)        | < 1s    | < 2s       | Code splitting           |

---

## Baseline Measurements

### {DATE} - Initial Baseline

**Environment:** {Local/Staging}
**Hardware:** {Specs}
**Database:** {Size/Records}

#### API Endpoints

| Endpoint                          | Method | Avg Response | P50 | P95 | P99 | Status |
| :-------------------------------- | :----- | :----------- | :-- | :-- | :-- | :----- |
| /health                           | GET    | TBD          | TBD | TBD | TBD | ⏳     |
| /api/v1/auth/login                | POST   | TBD          | TBD | TBD | TBD | ⏳     |
| /api/v2/catalog/supplier-products | GET    | TBD          | TBD | TBD | TBD | ⏳     |
| /api/v2/catalog/search            | GET    | TBD          | TBD | TBD | TBD | ⏳     |
| /api/v2/imports/upload            | POST   | TBD          | TBD | TBD | TBD | ⏳     |

#### Database Queries

| Query                    | Description      | Avg Time | Status |
| :----------------------- | :--------------- | :------- | :----- |
| SELECT users WHERE email | User lookup      | TBD      | ⏳     |
| SELECT supplier_products | Catalog listing  | TBD      | ⏳     |
| INSERT supplier_product  | Product creation | TBD      | ⏳     |
| UPDATE supplier_product  | Product update   | TBD      | ⏳     |

#### Frontend Metrics

| Page       | FCP | LCP | TTI | Status |
| :--------- | :-- | :-- | :-- | :----- |
| /login     | TBD | TBD | TBD | ⏳     |
| /dashboard | TBD | TBD | TBD | ⏳     |
| /catalog   | TBD | TBD | TBD | ⏳     |
| /imports   | TBD | TBD | TBD | ⏳     |

---

## Performance Testing Commands

### API Response Time (PowerShell)

```powershell
# Health check
Measure-Command {
    curl -s http://localhost:9000/health
} | Select-Object TotalMilliseconds

# Login
Measure-Command {
    curl -s http://localhost:9000/api/v1/auth/login `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"email":"admin@databiz.dev","password":"admin123"}'
} | Select-Object TotalMilliseconds

# Catalog listing
$token = "..." # Get from login
Measure-Command {
    curl -s http://localhost:9000/api/v2/catalog/supplier-products `
        -Headers @{"Authorization"="Bearer $token"}
} | Select-Object TotalMilliseconds
```

### Database Query Time (Python)

```python
import time
from src.shared.database import get_db
from src.shared.models import User
from sqlalchemy import select

async def measure_query():
    async for db in get_db():
        start = time.time()
        result = await db.execute(select(User).where(User.email == "admin@databiz.dev"))
        user = result.scalar_one_or_none()
        elapsed = (time.time() - start) * 1000
        print(f"Query time: {elapsed:.2f}ms")
        break

# Run with: python -m asyncio
```

### Frontend Lighthouse

```powershell
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:9003/login --output html --output-path ./lighthouse-report.html

# View metrics
cat lighthouse-report.html | grep "first-contentful-paint"
```

---

## Performance History

### Tracking Table

| Date       | Environment | Health | Login | Catalog | Upload | Notes            |
| :--------- | :---------- | :----- | :---- | :------ | :----- | :--------------- |
| 2025-12-20 | Local       | TBD    | TBD   | TBD     | TBD    | Initial baseline |

---

## Bottleneck Analysis

### Identified Issues

| ID       | Component   | Issue   | Impact   | Priority   | Status       |
| :------- | :---------- | :------ | :------- | :--------- | :----------- |
| PERF-001 | {component} | {issue} | {impact} | {P1/P2/P3} | {OPEN/FIXED} |

### Optimization Opportunities

1. **{Opportunity 1}**
   - Current: {X}ms
   - Target: {Y}ms
   - Action: {optimization strategy}

---

## Load Testing (Future)

**Tools:** Locust, k6, Artillery

**Scenarios to Test:**

- 10 concurrent users uploading files
- 100 concurrent users browsing catalog
- Sustained load over 30 minutes
- Spike test (sudden 10x traffic)

**NOT IMPLEMENTED YET** - Defer to Phase 2

---

**Last Updated:** 2025-12-20  
**Next Review:** After initial baseline measurement

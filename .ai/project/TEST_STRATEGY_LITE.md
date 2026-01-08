# DataBiz Next - Lightweight Test Strategy

**Versie**: 1.0  
**Datum**: 2025-12-17  
**Status**: ✅ Goedgekeurd (DEC-008, DEC-009, DEC-010)

---

## 🎯 Doel

Maximale kwaliteit met minimale overhead. Geen 100% coverage jagen, wel 100% confidence in kritieke paden.

---

## 📐 Test Pyramid (Aangepast voor PIM)

```text
          ╱╲
         ╱E2E╲           5 tests max (P1 flows only)
        ╱──────╲
       ╱Integr. ╲        20-30% - API endpoints
      ╱──────────╲
     ╱    Unit    ╲      60-70% - Business logic
    ╱──────────────╲
   Trust: Pydantic + Zod + TypeScript (gratis validatie)
```

| Laag | % | Wat testen | Niet testen |
|------|---|------------|-------------|
| **Unit** | 60-70% | Services, business logic, edge cases | Triviale getters, framework code |
| **Integration** | 20-30% | API endpoints (happy + 1 error) | Elke mogelijke error |
| **E2E** | 5 tests | User journeys (login → upload → view) | Elke button click |

---

## 🎯 Coverage Targets

| Component | Minimum | Ideaal | Blokkeer CI |
|-----------|---------|--------|-------------|
| Backend Services | 70% | 85% | < 60% |
| Backend Routers | 50% | 70% | < 40% |
| Frontend (logica) | 60% | 75% | < 50% |
| E2E | N/A | 5-10 tests | 0 failing |

**Regel**: 70% *meaningful* coverage > 90% *trivial* coverage.

---

## 🚫 Wat We NIET Testen (Bewuste Keuze)

| Skip | Reden | Alternatief |
|------|-------|-------------|
| Pydantic validation | Framework doet dit | Type hints + schema |
| Zod validation | Framework doet dit | TypeScript strict |
| UI component unit tests | Te fragiel | E2E + TypeScript |
| Load/performance tests | Pas bij schaal | Defer to Phase 2 |
| 100% edge cases | Diminishing returns | Happy + 1 error |
| Mocking everything | Tests testen mocks | Echte DB in CI |

---

## 🧪 Test Types per Domain

### Identity Domain
| Test Type | Scope | Priority |
|-----------|-------|----------|
| Unit | JWT token generation | P1 |
| Unit | Password hashing | P1 |
| Integration | Login endpoint | P1 |
| Integration | User invite flow | P2 |
| E2E | Login → Dashboard | P1 |

### Imports Domain
| Test Type | Scope | Priority |
|-----------|-------|----------|
| Unit | SHA-256 duplicate check | P1 |
| Unit | CSV/XLSX parser | P1 |
| Unit | Fuzzy matching | P2 |
| Integration | File upload endpoint | P1 |
| Integration | Dataset lifecycle | P1 |
| E2E | Upload → Parse → View | P1 |

---

## 📍 OTAP Test Verdeling

| Omgeving | Tests | Trigger | Duur |
|----------|-------|---------|------|
| **O** (Local) | Unit + Integration | Pre-commit | < 2 min |
| **T** (GitHub Actions) | Unit + Integration + E2E | Push/PR | < 5 min |
| **A** (Staging) | Smoke + Manual QA | Deploy | Manual |
| **P** (Production) | Health checks | Continuous | N/A |

**Besluit**: E2E tests draaien ALLEEN op T (niet lokaal) - zie DEC-010.

---

## 🛠️ Tooling

### Backend (Python)
```
pytest>=7.0.0
pytest-asyncio>=0.21.0
pytest-cov>=4.0.0
httpx>=0.24.0
```

### Frontend (TypeScript)
```
vitest
@testing-library/react
msw (API mocking)
```

### E2E
```
playwright
```

---

## ✅ Quality Gates (CI Blokkeren)

1. **Unit + Integration tests** - Alle groen
2. **Coverage** - ≥60% (warning bij <70%)
3. **Type check** - mypy/tsc strict, geen errors
4. **Lint** - pylint/ESLint, geen errors
5. **Security** - Geen high/critical vulnerabilities

---

## 📁 Test Folder Structuur

```
backend/
├── tests/
│   ├── conftest.py              # Shared fixtures
│   ├── test_health.py           # Smoke test
│   └── domains/
│       ├── identity/
│       │   ├── test_auth_service.py    # Unit
│       │   └── test_auth_router.py     # Integration
│       └── imports/
│           ├── test_parser.py           # Unit
│           ├── test_duplicate_checker.py # Unit
│           └── test_upload_router.py    # Integration

frontend/
├── src/
│   └── __tests__/               # Co-located with components
├── e2e/
│   └── tests/
│       ├── login.spec.ts        # P1
│       ├── upload-file.spec.ts  # P1
│       └── view-dataset.spec.ts # P1
```

---

## 🎭 Kritieke E2E Flows (Max 5)

| # | Flow | Reden | Priority |
|---|------|-------|----------|
| 1 | Login → Dashboard | Toegang systeem | P1 |
| 2 | Upload supplier file | Core functionaliteit | P1 |
| 3 | View dataset + preview | Data validatie | P1 |
| 4 | Create/Edit supplier | Admin flow | P2 |
| 5 | Search/Filter | UX kritiek | P2 |

---

## 🔁 Pragmatische Regels

1. **Happy path + 1 error** = voldoende
2. **Flaky test = delete** = liever geen test
3. **Trust types** = Pydantic/Zod/TS zijn "gratis" tests
4. **E2E = journeys** = niet features
5. **Fast feedback** = < 2 min lokaal, < 5 min CI

---

**Eigenaar**: QA Specialist  
**Review**: Architect  
**Volgende review**: Na MVP launch

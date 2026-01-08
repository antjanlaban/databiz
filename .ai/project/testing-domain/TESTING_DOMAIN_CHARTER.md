# Testing Domain Charter

**Status**: 🆕 PLANNED (Ready for Worktree Deployment)  
**Date Created**: December 17, 2025  
**Orchestrator**: [ORCHESTRATOR] Agent  
**Domain ID**: `TST` (in DOMAIN_REGISTRY.yaml)

---

## 1. Domain Purpose & Vision

The **Testing Domain** is a **cross-cutting, parallel domain** responsible for:
- ✅ Defining and enforcing test standards across all domains (Identity, Imports, Catalog, etc.)
- ✅ Orchestrating test execution (unit, integration, E2E)
- ✅ Providing test infrastructure (tools, CI/CD, environments)
- ✅ Maintaining Iron Dome compliance (type safety, validation, coverage)
- ✅ Tracking test quality metrics and trends

### Unique Characteristics

- **Not a Feature Domain**: Testing does NOT implement business features. Instead, it supports **all other domains**.
- **Independent Worktree Potential**: Can be isolated into a separate worktree for focused testing work:
  ```bash
  git worktree add ../databiz-next--testing -b feature/testing-domain
  ```
- **Governance Role**: Enforces quality gates that block PRs if standards aren't met.
- **Living Documentation**: Continually updated as new testing patterns emerge.

---

## 2. Domain Scope

### IN SCOPE ✅
- Pytest configuration and marker definitions
- Frontend test runner setup (Jest/Vitest/Vitest)
- Playwright E2E framework configuration
- GitHub Actions CI/CD workflows
- Test environment provisioning (test database, mock storage)
- Coverage reporting and metrics
- Test documentation and patterns
- Type safety enforcement in tests (mypy, TypeScript strict mode)
- Quality gates and CI failure rules

### OUT OF SCOPE ❌
- **Actual test implementation**: Each domain (Identity, Imports, Catalog) writes its own tests.
- **Business logic testing**: That belongs to the domain itself, not Testing.
- **Manual QA/exploratory testing**: This is a separate responsibility.
- **Production monitoring/observability**: That's operational, not testing.

---

## 3. Epics & Features

### Epic 1: Test Orchestration
**Responsibility**: Running and reporting on all tests

| Feature | Purpose | Slices |
|---------|---------|--------|
| **Test Execution** | Run unit, integration, E2E tests | `run_backend_tests`, `run_frontend_tests`, `run_e2e_tests` |
| **Test Reporting** | Aggregate results & publish metrics | `generate_coverage_report`, `publish_test_metrics` |

### Epic 2: Test Standards
**Responsibility**: Defining testing best practices and enforcing consistency

| Feature | Purpose | Slices |
|---------|---------|--------|
| **Unit Test Standards** | Patterns for fast, isolated tests | `define_unit_test_patterns`, `enforce_type_safety_in_tests` |
| **Integration Test Standards** | Patterns for testing real flows | `define_integration_test_patterns`, `manage_test_database` |

### Epic 3: Test Infrastructure
**Responsibility**: Provisioning tools, environments, and CI/CD

| Feature | Purpose | Slices |
|---------|---------|--------|
| **Testing Tools Setup** | Configure pytest, Playwright, Jest | `setup_pytest_config`, `setup_frontend_test_runner`, `setup_playwright_config` |
| **CI/CD Integration** | GitHub Actions workflows | `create_test_workflow`, `run_linters_and_type_checks` |
| **Test Environment Setup** | Provision test DB, mock storage | `provision_test_database`, `setup_test_storage_mock` |

---

## 4. Current Status (December 2025)

### DONE ✅
- **[TST-INF-TSK-001]**: Pytest configuration (pyproject.toml)
  - ✅ Markers, asyncio support, coverage settings embedded
  - ✅ conftest.py with typed fixtures
  - ✅ 25 backend tests discoverable

- **[TST-INF-TSK-003]**: Playwright configuration
  - ✅ frontend/e2e/playwright.config.ts with DEC-010 compliance
  - ✅ .archive tests excluded from testDir
  - ✅ Port configuration for Test environment

### PLANNED 📋
- **[TST-ORK-EXE-001]**: Backend test execution script (run_tests.bat exists, needs documentation)
- **[TST-ORK-EXE-003]**: E2E tests on Test environment (framework ready, flows not implemented)
- **[TST-STD-UNT-001]**: Unit test patterns guide (.ai/project/UNIT_TEST_PATTERNS.md)
- **[TST-INF-CID-001]**: GitHub Actions test workflow (.github/workflows/test.yml)
- **[TST-INF-ENV-001]**: Test database provisioning (TEST_DB_URL setup)

---

## 5. Dependencies & Relationships

### No Hard Dependencies
Testing Domain depends on **supporting all other domains** without being depended on by them.

### Relationship with Other Domains

| Domain | Relationship | Example |
|--------|--------------|---------|
| **Identity** | Testing defines standards, Identity implements tests | TST creates patterns → IDN writes user management tests |
| **Imports** | Same as Identity | TST provides fixtures → IMP writes file parsing tests |
| **Catalog** | Same as Identity | (Future domain) TST provides hooks → CAT writes entity tests |

---

## 6. Success Criteria (Iron Dome Compliance)

### Coverage
- ✅ **Backend**: 60% target (40% floor during MVP)
- ✅ **Frontend**: 70% target
- ✅ Measured and reported per PR

### Type Safety
- ✅ **Backend Tests**: All type hints, no `any` types, mypy strict mode
- ✅ **Frontend Tests**: TypeScript strict mode, no `any` types
- ✅ CI enforces: `mypy backend/tests/ --strict`

### Test Quality
- ✅ Unit tests: <100ms each (fast)
- ✅ Integration tests: <5s each (marked with `@pytest.mark.integration`)
- ✅ E2E tests: <60s each (run on Test env only)
- ✅ All tests are flake-free (no random failures)

### Continuous Improvement
- ✅ Test metrics tracked in `.ai/project/TESTING_METRICS.yaml`
- ✅ Coverage trends visible (improving/declining)
- ✅ New test patterns documented as they emerge
- ✅ Annual review: raise coverage floor from 40% → 60%

---

## 7. Governance & Decision Points

### Decision Log (Decisions Made)

| ID | Date | Decision | Rationale |
|---|---|---|---|
| **DEC-008** | Dec 17 | Test Pyramid: 60% unit, 30% integration, 5% E2E | Pragmatic coverage, fast feedback |
| **DEC-009** | Dec 17 | Coverage floor 40% (target 60%) | Allow MVP development, enforce rigor later |
| **DEC-010** | Dec 17 | E2E tests run ONLY on Test env (not locally) | Avoid port conflicts, fast local loop |
| **DEC-011** | Dec 17 | Testing Domain as separate worktree option | Enable focused testing work without disrupting other domains |

### Quality Gates (CI Enforcement)

```yaml
fail_if:
  - coverage_backend < 40%  # Floor for MVP
  - coverage_frontend < 50%  # Frontend soft target
  - mypy_errors > 0  # Strict type checking
  - test_count_backend < 20  # Sanity check
  - e2e_failures > 1  # (on Test env only)
```

---

## 8. Worktree Deployment Guide

### When to Create a Worktree
**Create a separate worktree when:**
- You need to focus on test infrastructure for extended period (>1 day)
- Multiple people working on different test improvements simultaneously
- Avoiding merge conflicts with main development

### Setup Instructions

```bash
# From main repo root
git worktree add ../databiz-next--testing -b feature/testing-domain

# Navigate to worktree
cd ../databiz-next--testing

# Create WORKTREE.md (see section 9 below)
# Edit restricted to: .ai/project/testing-domain, .github/workflows, backend/tests patterns, frontend/e2e patterns

# Work on slices
# Commit locally: git add -A && git commit -m "feat(testing): ..."

# When done, merge back to main
git push origin feature/testing-domain
# (Create PR, merge, then remove worktree)

# Remove worktree from main repo
cd ../databiz-next
git worktree remove ../databiz-next--testing
```

### Allowed Paths in Testing Worktree
- ✅ `.ai/project/testing-domain/` (domain documentation)
- ✅ `.ai/project/DOMAIN_REGISTRY.yaml` (update Testing domain only)
- ✅ `.github/workflows/` (test CI/CD workflows)
- ✅ `backend/tests/` (test patterns, fixtures)
- ✅ `frontend/e2e/` (E2E test patterns)
- ✅ `backend/pyproject.toml` (pytest config sections only)
- ✅ `backend/requirements.txt` (test dependencies)
- ✅ `frontend/package.json` (test scripts)

### Forbidden Paths in Testing Worktree
- ❌ `backend/src/domains/` (business logic - other domain's responsibility)
- ❌ `frontend/src/` (business components - other domain's responsibility)
- ❌ Database migrations (unless adding test-specific schema)
- ❌ Configuration unrelated to testing

---

## 9. Documentation Index

| Document | Purpose |
|----------|---------|
| `TESTING_DOMAIN_CHARTER.md` | This file - high-level overview |
| `.ai/project/UNIT_TEST_PATTERNS.md` | Specific patterns for unit tests (backend) |
| `.ai/project/INTEGRATION_TEST_PATTERNS.md` | Specific patterns for integration tests |
| `.ai/project/E2E_TEST_PATTERNS.md` | Playwright E2E patterns and best practices |
| `.ai/project/TESTING_METRICS.yaml` | Historical test coverage and metrics |
| `TEST_STRATEGY_LITE.md` | Lightweight testing strategy (already created) |
| `DECISION_LOG.md` | All testing decisions (DEC-008 through DEC-010+) |

---

## 10. Next Steps (Recommended Roadmap)

### Phase 1: Foundation (Week 1) - DONE ✅
- [x] Design Testing Domain in DOMAIN_REGISTRY.yaml
- [x] Create folder structure
- [x] Write this charter
- [x] Pytest + Playwright configs in place
- [x] 25 backend tests discoverable

### Phase 2: Standards & Documentation (Week 2) 📋
- [ ] Write UNIT_TEST_PATTERNS.md with examples
- [ ] Write INTEGRATION_TEST_PATTERNS.md
- [ ] Write E2E_TEST_PATTERNS.md (Playwright)
- [ ] Create GitHub Actions workflow (.github/workflows/test.yml)
- [ ] Document test database provisioning

### Phase 3: Infrastructure & CI/CD (Week 3) 📋
- [ ] GitHub Actions: Run backend tests on PR
- [ ] GitHub Actions: Run frontend tests on PR
- [ ] GitHub Actions: Run E2E on Test environment
- [ ] Coverage reports uploaded to PR
- [ ] CI blocks merge if coverage < 40%

### Phase 4: Expansion (Ongoing) 🔄
- [ ] Add frontend test examples (React components)
- [ ] Implement mock storage fixtures
- [ ] Raise coverage floor from 40% → 60%
- [ ] Track metrics in TESTING_METRICS.yaml
- [ ] Quarterly review of test effectiveness

---

## 11. Contact & Escalation

**Domain Owner**: [ORCHESTRATOR] Agent (coordinated)  
**Technical Lead**: [QA] Specialist (test execution, CI/CD)  
**Architecture Lead**: [ARCHITECT] (test infrastructure design)

**When to Escalate**:
- New test tool adoption (e.g., switch from Jest to Vitest) → Ask [ARCHITECT]
- Coverage target changes → Ask Product Owner
- Breaking changes in GitHub Actions → Ask [DEVOPS]

---

## Appendix A: Key Decisions Explained

### Why a Separate Domain?
1. **Cross-Cutting**: Testing is not a feature; it supports all domains
2. **Worktree-Friendly**: Can be developed independently
3. **Clear Governance**: Testing standards are non-negotiable (Iron Dome)
4. **Team Scaling**: As team grows, dedicated QA lead can own this domain

### Why Testing is NOT Part of "Platform"?
- Platform (future domain) would be infrastructure ops (deployment, monitoring, logging)
- Testing is quality gates during development (pre-production)
- Different team, different concerns, different schedule

### Why DEC-010 (E2E on Test Env Only)?
- Local development is fast with pytest (unit + integration)
- E2E tests are slow and flaky (browser, real services)
- Test environment is stable (CI builds it fresh)
- Developers run integration tests locally, E2E runs in GitHub Actions

---

**Document Status**: 📋 READY FOR REVIEW  
**Last Updated**: December 17, 2025  
**Next Review**: January 17, 2026 (30-day checkpoint)

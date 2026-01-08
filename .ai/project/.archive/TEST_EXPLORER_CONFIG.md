# Test Explorer Configuration Guide

**Datum**: 2025-12-17  
**Doel**: Zorgen dat VS Code test explorer ALLEEN lokale tests toont (pytest), NIET E2E (Playwright)

---

## ✅ Configuratie (DEC-008, DEC-009, DEC-010)

### Backend Tests (Local = pytest unit + integration)

**Bestand**: `.vscode/settings.json`

```json
"python.testing.pytestArgs": [
  "backend/tests",           // ONLY tests folder
  "-v",
  "--tb=short",
  "-m", "not slow and not integration"  // Filter slow/integration
]
```

**Wat dit doet**:
- 🎯 Toont ALLEEN tests in `backend/tests/`
- ✅ Sluit out slow tests (pytest marker)
- ✅ Sluit out integration tests (optional, afhankelijk van voorkeur)
- ❌ Sluit Playwright NIET uit (staat niet in backend folder)

### Frontend Tests (Local = vitest/jest unit tests)

**Bestand**: `frontend/package.json`

```json
"scripts": {
  "test": "vitest",
  "test:e2e": "playwright test"  // Separate, NOT in explorer
}
```

**Wat dit doet**:
- 🎯 `npm test` → Vitest unit tests (local)
- 🎯 `npm run test:e2e` → Playwright E2E (Test env only)

### E2E Tests (Remote = Playwright only on Test env)

**Bestand**: `frontend/e2e/playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests',
  baseURL: process.env.BASE_URL || 'http://localhost:5173',
  // ...
});
```

**Wat dit doet**:
- ❌ NIET in VS Code explorer (apart folder)
- ✅ Alleen accessible via `npm run test:e2e`
- ✅ Runs on Test (T) environment via GitHub Actions

---

## 🔍 Verificatie

### Backend Tests (Local)

```powershell
# In VS Code: Open Test Explorer
# Expected: Shows 16 tests from backend/tests/

# OR via terminal:
cd backend
./run_tests.bat          # All tests
./run_tests.bat fast     # Unit tests only (exclude integration)
```

**Expected output**:
```
✅ tests/test_health.py::test_health_check
✅ tests/domains/identity/test_identity_endpoints.py
✅ tests/domains/imports/test_duplicate_checker.py::TestCalculateFileHash
✅ tests/domains/imports/test_upload_router.py::TestFileUploadEndpoint
```

### Frontend Tests (Local)

```powershell
# In VS Code: Open Test Explorer (TypeScript)
# OR via terminal:
cd frontend
npm test          # Unit tests via Vitest

# NOT shown in explorer:
npm run test:e2e  # E2E tests (runs ONLY on T environment)
```

### E2E Tests (Remote Only)

```powershell
# NOT accessible locally
# Only via GitHub Actions on Test (T) environment

# OR on staging/test deployment:
npm run test:e2e  # Requires LIVE test environment
```

---

## 📊 Test Explorer Behavior (Expected)

| Type | Location | Explorer | Command | Runs | Env |
|------|----------|----------|---------|------|-----|
| **Unit** | `backend/tests/` | ✅ Yes | `pytest` | Local | O |
| **Integration** | `backend/tests/` | ✅ Yes | `pytest -m integration` | Local | O |
| **E2E Playwright** | `frontend/e2e/` | ❌ No | `npm run test:e2e` | CI/Manual | T |
| **Frontend Unit** | `frontend/src/__tests__` | ✅ Yes | `npm test` | Local | O |

---

## 🛠️ Troubleshooting

### Problem: Test Explorer shows Playwright tests

**Solution**:
1. Check `.vscode/settings.json` has `"backend/tests"` (not just `"backend"`)
2. Playwright config is in `frontend/e2e/` (separate folder, not picked up)
3. If still showing: Reload VS Code (`Ctrl+Shift+P` → Reload Window)

### Problem: Tests not showing at all

**Solution**:
1. Verify pytest is installed: `pip list | grep pytest`
2. Check `backend/pyproject.toml` has `[tool.pytest.ini_options]`
3. Try: `pytest --collect-only` in terminal to verify tests exist

### Problem: Integration tests showing in explorer

**Current behavior**: They DO show (we haven't excluded them by default)

**Option 1**: Leave them (they're still local tests)  
**Option 2**: Add `-m "not integration"` to exclude them  
**DEC**: We keep them visible for now (dev choice)

---

## 📝 Summary

✅ **Backend**: Pytest configured for `backend/tests/` only  
✅ **Frontend**: Vitest unit tests separate from Playwright E2E  
✅ **E2E**: Playwright excluded from local explorer (runs on T only)  
✅ **Iron Dome**: Local tests are fast, isolated, reliable  

**Status**: Ready for local testing via VS Code Test Explorer

---

**Owner**: QA Specialist  
**Reference**: DEC-008, DEC-009, DEC-010

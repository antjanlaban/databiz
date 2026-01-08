# Test Scope Clarity - Fixed ✅

**Issue**: `.archive/e2e/` tests waren zichtbaar en verwarrend

**Root Cause**: 
- `.archive/` bevat OUDE Playwright tests (legacy code)
- Niet in `.gitignore` opgenomen
- Hardcoded ports (3000, 8000) - niet van toepassing op huidge setup

---

## ✅ Wat is opgelost

### 1. `.gitignore` Updated
```
# Archive (old/legacy code - do not track)
.archive/
```
- `.archive` folder is nu geignoreerd
- Oude tests verschijnen niet meer in git

### 2. `playwright.config.ts` Clarified
```typescript
// CRITICAL RULES (DEC-010):
// 1. E2E tests run ONLY on Test (T) environment via GitHub Actions
// 2. DO NOT run locally (requires live backend + frontend services)
// 3. testDir: './tests' - searches ONLY this folder
// 4. Legacy/archived tests in '.archive/' are ignored (.gitignore)
```

### 3. `.archive/README.md` Created
```
⚠️ DO NOT RUN THESE TESTS
- ❌ Outdated
- ❌ Hardcoded ports (3000, 8000)
- ❌ Will fail

Use instead:
- Local: backend/tests/ + frontend/src/__tests__/
- E2E: frontend/e2e/tests/ (Test env only)
```

---

## 📍 Test Distribution (NOW CORRECT)

```
✅ backend/tests/               (25 pytest tests) → Local (O)
✅ frontend/src/__tests__/      (Jest/Vitest)    → Local (O)
✅ frontend/e2e/tests/          (Playwright)     → Test env (T) only

❌ .archive/e2e/               (OLD - NOT USED)  → Ignored (.gitignore)
```

---

## 🎯 What You Should See Now

### Locally (O environment):
```
pytest --collect-only -q
→ 25 tests in backend/tests/
→ ZERO .archive references
```

### In VS Code Test Explorer:
```
✅ Backend tests (25)
✅ Frontend unit tests (if configured)
❌ NO Playwright tests (correct - runs on T only)
❌ NO .archive tests (correct - deprecated)
```

---

## 🚀 Next Steps

1. **Don't run `.archive` tests** - They're old and won't work locally
2. **Use `./run_tests.bat`** for local testing (backend)
3. **Use `npm test`** for frontend unit tests
4. **Use `npm run test:e2e`** ONLY on Test environment (CI)

---

**Fixed**: 2025-12-17  
**Status**: ✅ COMPLIANT - Test scope clear and enforced

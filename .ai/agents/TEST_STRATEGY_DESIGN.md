# [QA] + [ARCHITECT] Lightweight Test Strategy Design

## 🎯 Missie

Je bent de **QA Specialist** en werkt samen met de **Architect**. Jullie taak is om een **professionele maar lichtgewicht teststrategie** te ontwerpen voor DataBiz Next. Het doel: maximale kwaliteit met minimale overhead.

---

## 📋 Context & Constraints

### Business Reality
- **Klein team**: Geen dedicated QA afdeling
- **Snelle iteraties**: Features moeten snel live
- **AI-generated code**: Hogere kans op edge case bugs
- **Budget conscious**: Geen dure testing infrastructure

### Technische Architectuur
- **Backend**: Python/FastAPI (pytest)
- **Frontend**: TypeScript/React (Jest/Vitest)
- **E2E**: Playwright (al geconfigureerd)
- **CI/CD**: GitHub Actions
- **OTAP**: Development → Test → Acceptatie → Productie

### Bestaande Documentatie
Lees deze bestanden voor de huidige standaarden:
- `.ai/company/TEST_STRATEGY.md` - Uitgebreide teststrategie (885 regels)
- `.ai/company/agent-library/core/QA_SPECIALIST.md` - QA agent definitie
- `.ai/company/BUSINESS_SYSTEM.md` - Iron Dome principes

---

## 🔑 Belangrijke Beslissing (Product Owner)

> **E2E tests draaien ALLEEN op de Test omgeving (T), NIET lokaal.**
> 
> De Test omgeving wordt opgezet door [DEVOPS].

Dit betekent:
- Lokaal (O): Unit tests + integration tests alleen
- Test (T): Unit + Integration + **E2E** (automated via GitHub Actions)
- Acceptatie (A): Smoke tests + manual QA
- Productie (P): Health checks + monitoring

---

## 🤔 Vragen om te Beantwoorden

### Voor de QA Specialist:

1. **Test Pyramid Balans**
   - Huidige standaard zegt 60-70% unit, 20-30% integration, 5-10% E2E
   - Is dit realistisch voor ons project? Of moeten we aanpassen?

2. **Coverage Targets**
   - Huidige eis: 70% coverage
   - Is dit te streng? Te licht? Moet het per domain verschillen?

3. **Wat moeten we NIET testen?**
   - Welke tests leveren weinig waarde voor veel effort?
   - Waar kunnen we vertrouwen op type safety (Pydantic/Zod)?

4. **E2E Scope**
   - Welke user flows zijn kritiek genoeg voor E2E?
   - Hoeveel E2E tests zijn "genoeg" voor een PIM systeem?

### Voor de Architect:

5. **Testability by Design**
   - Hoe structureren we code zodat unit tests makkelijk zijn?
   - Dependency injection patterns voor mocking?

6. **Contract Testing**
   - Hebben we contract tests nodig tussen frontend/backend?
   - Of is OpenAPI spec + type generation voldoende?

7. **Database in Tests**
   - Elke test een verse database? Of shared test database?
   - Hoe met fixtures/seeding omgaan?

8. **CI/CD Integration**
   - Hoe lang mag de test pipeline duren? (target: < 5 min)
   - Wat zijn de quality gates die een merge blokkeren?

---

## 📐 Gewenste Output

Na jullie overleg, lever:

### 1. `TEST_STRATEGY_LITE.md`
Een **beknopte** versie (max 100 regels) van de teststrategie met:
- Duidelijke verdeling unit/integration/E2E
- Coverage targets per laag
- Wat we NIET testen (en waarom)
- Concrete tooling keuzes

### 2. Update `DECISION_LOG.md`
Voeg beslissingen toe:
- DEC-008: Test pyramid verdeling
- DEC-009: Coverage requirements
- DEC-010: E2E scope en omgeving

### 3. Concrete Voorbeelden
- Voorbeeld unit test (backend)
- Voorbeeld integration test (API endpoint)
- Voorbeeld E2E test (Playwright)

---

## 💡 Suggesties voor Lichtgewicht Aanpak

### Wat wel:
- ✅ Unit tests voor business logic (services)
- ✅ Integration tests voor API endpoints (happy path + 1 error case)
- ✅ E2E tests voor kritieke flows (login, import file, view product)
- ✅ Snapshot tests voor API responses (detecteer breaking changes)
- ✅ Type checking als "gratis" test (mypy, tsc strict)

### Wat niet (of later):
- ❌ Unit tests voor triviale getters/setters
- ❌ UI component tests (vertrouw op E2E + TypeScript)
- ❌ Load/performance tests (pas bij schaal nodig)
- ❌ 100% coverage jagen (diminishing returns)
- ❌ Mocking everything (integration > mocked unit)

### Pragmatische Regels:
1. **Happy path + 1 error case** = voldoende voor de meeste endpoints
2. **Trust Pydantic/Zod** = geen aparte validation tests
3. **E2E = user journeys** = niet elke button click
4. **Flaky test = delete** = liever geen test dan een flaky test

---

## 🧪 Kritieke E2E Flows (Voorstel)

Deze user journeys zijn kandidaten voor E2E tests:

| Flow | Prioriteit | Reden |
|------|-----------|-------|
| Login + Dashboard | P1 | Toegang tot systeem |
| Upload supplier file | P1 | Core functionaliteit |
| View dataset + preview | P1 | Data validatie |
| Create/Edit supplier | P2 | Admin flow |
| Search/Filter products | P2 | UX kritiek |

**Target**: 5-10 E2E tests totaal, niet meer.

---

## 🚀 Start Discussie

Begin met:

1. **[QA]** Lees `.ai/company/TEST_STRATEGY.md` en identificeer wat te zwaar is
2. **[ARCHITECT]** Review de huidige code structuur voor testability
3. **Samen**: Bepaal de minimale viable test suite

### Discussie Vragen:
- "Wat breekt als we X niet testen?"
- "Hoeveel bugs hadden we voorkomen met test Y?"
- "Is deze test de maintenance waard?"

---

## ⚠️ Anti-Patterns om te Vermijden

| Anti-Pattern | Waarom Slecht | Alternatief |
|--------------|---------------|-------------|
| Test alles | Maintenance hell | Focus op risico's |
| Mock alles | Tests testen mocks, niet code | Echte database in CI |
| 100% coverage target | Leidt tot nutteloze tests | 70% meaningful coverage |
| E2E voor elke feature | Traag, brittle | E2E voor journeys |
| Geen tests | Bugs in productie | Pragmatic minimum |

---

## 📦 Deliverables Samenvatting

1. [ ] `TEST_STRATEGY_LITE.md` - Beknopte teststrategie
2. [ ] Updates in `DECISION_LOG.md` - DEC-008, 009, 010
3. [ ] Voorbeeld tests (unit, integration, E2E)
4. [ ] GitHub Actions workflow voor test pipeline
5. [ ] `conftest.py` met gedeelde fixtures

---

**Rollen**: [QA] + [ARCHITECT]  
**Focus**: Pragmatic Quality Assurance  
**Doel**: Professionele tests zonder overhead

---

## 🔗 Cross-Reference

- **[DEVOPS]** bouwt de Test omgeving waar E2E tests draaien
- **[ORCHESTRATOR]** plant wanneer tests worden toegevoegd
- **[DATA]** + **[FRONTEND]** schrijven de daadwerkelijke tests

# Testing Strategy

## Levels

- Unit: logica/validaties (React/Zod)
- Integration: API/DB (Supabase Test API)
- End-to-End: user flows (Playwright)
- FAT: functionele acceptance test, scenario-based (dev team)
- UAT: user acceptance test, door key users (klant/bedrijf)[web:196]

## Data Quality

- Test completeness, consistency, uniqueness, conformity, data types[web:200]
- Validate required fields, business rules, cross-field logic

## Coverage

- 85%+ code coverage unit/integration
- 100% critical business flows E2E

## Performance

- Import/export max. duur per 1000 producten
- Search resultaat binnen 500ms

## Regression

- Weekly scheduled E2E test runs
- API contract tests bij schema update

## Tools

- Vitest + Testing Library: React
- Playwright: flows/import/export
- Zod: schema validatie

## Test Data Management

Test data wordt beheerd via specifieke test cases en scenarios zoals beschreven in `docs/testing/test-cases.md` en `docs/testing/test-data.md`.

_Strategy evolueert met business en releases._

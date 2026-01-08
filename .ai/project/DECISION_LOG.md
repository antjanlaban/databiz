# Decision Log - DataBiz Next

Dit document bevat alle architectuur- en businessbeslissingen die zijn genomen tijdens development.

---

## Beslissingen

### DEC-001: Dataset Lifecycle States
**Datum**: 2025-12-16  
**Besluit door**: Product Owner  
**Status**: ✅ Goedgekeurd

**Vraag**: Wat triggert de overgang tussen dataset statussen?

**Beslissing**:
| Status | Betekenis | Trigger |
|--------|-----------|---------|
| `new` | Raw bestand geüpload, nog niet verwerkt | Upload voltooid |
| `inactive` | Bestand geparsed naar JSON | Parsing succesvol (≥95% valid rows) |
| `active` | AI mapping succesvol uitgevoerd | AI mapping voltooid |

**Opmerking**: De volledige flow (upload → parse → map) mag in één automatische workflow gebeuren.

---

### DEC-002: Supplier-Dataset Relatie
**Datum**: 2025-12-16  
**Besluit door**: Product Owner  
**Status**: ✅ Goedgekeurd

**Vraag**: Kan een dataset bestaan zonder supplier?

**Beslissing**: **Nee, geen orphans toegestaan.**
- `supplier_id` is een verplicht veld (NOT NULL)
- Foreign key constraint naar suppliers tabel
- Fuzzy match suggereert supplier, user moet bevestigen of handmatig selecteren

---

### DEC-003: Duplicate Detection Strategie
**Datum**: 2025-12-16  
**Besluit door**: Product Owner  
**Status**: ✅ Goedgekeurd

**Vraag**: Hoe detecteren we duplicaten?

**Beslissing**: **File hash (SHA-256) check**
- Bij upload: bereken SHA-256 hash van bestandsinhoud
- Vergelijk met bestaande datasets in database
- Als match: blokkeer upload met melding "Dit bestand is al geïmporteerd op [datum]"
- Geen override optie (voorkom dubbele imports)

---

### DEC-004: Parse Error Threshold
**Datum**: 2025-12-16  
**Besluit door**: Product Owner  
**Status**: ✅ Goedgekeurd

**Vraag**: Bij hoeveel parse errors mag een dataset nog worden geactiveerd?

**Beslissing**: **Minimaal 95% valid rows vereist**
- < 95% valid: Dataset blijft op `new`, user moet bestand corrigeren
- ≥ 95% valid: Dataset gaat naar `inactive`, error report beschikbaar
- Error rows worden gelogd maar niet geïmporteerd

---

### DEC-005: Multi-Tenancy Model
**Datum**: 2025-12-16  
**Besluit door**: Product Owner  
**Status**: ✅ Goedgekeurd

**Vraag**: Moeten suppliers/datasets per organisatie gescheiden zijn?

**Beslissing**: **Eén globale pool**
- Geen `organization_id` of tenant isolation
- Alle users zien dezelfde suppliers en datasets
- Vereenvoudigt architectuur, past bij huidige use case

---

### DEC-006: Invite Token Expiry Handling
**Datum**: 2025-12-16  
**Besluit door**: Product Owner  
**Status**: ✅ Goedgekeurd

**Vraag**: Wat gebeurt na invite token expiry (7 dagen)?

**Beslissing**:
- **Geen auto-delete** van user account
- User blijft bestaan met status `invited`
- Admin kan **re-invite** sturen (genereert nieuwe token)
- Oude tokens worden geïnvalideerd bij re-invite

---

### DEC-007: Port Allocatie (Infrastructure)
**Datum**: 2025-12-16  
**Besluit door**: Architect  
**Status**: ✅ Goedgekeurd

**Vraag**: Port conflicten oplossen (MinIO 9000 vs Backend API 9000, PostgreSQL 5432 vs 9020)

**Beslissing**:
| Service | Oude Port | Nieuwe Port | Reden |
|---------|-----------|-------------|-------|
| Backend API | 9000 | 9000 | Blijft (primary service) |
| PostgreSQL | 5432 | 9020 | Align met PORT_REGISTRY |
| MinIO API | 9000 | 9022 | Verplaatst naar storage block |
| MinIO Console | 9001 | 9023 | Volgt MinIO API |

**Opmerking**: `docker-compose.yml` en `.env.example` worden bijgewerkt.

---

### DEC-008: Test Pyramid Verdeling
**Datum**: 2025-12-17  
**Besluit door**: QA Specialist + Architect  
**Status**: ✅ Goedgekeurd

**Vraag**: Hoe verdelen we onze tests over unit/integration/E2E?

**Beslissing**:
| Laag | Percentage | Scope |
|------|------------|-------|
| Unit tests | 60-70% | Business logic, services, edge cases |
| Integration tests | 20-30% | API endpoints (happy path + 1 error case) |
| E2E tests | 5 tests max | Kritieke user journeys |

**Alternatieven overwogen**:
- 80% unit: Te veel mocking, tests testen niet echte integratie
- 50% E2E: Te traag, te fragiel

**Impact**: Test structuur volgt pyramid, geen UI component unit tests.

---

### DEC-009: Coverage Requirements
**Datum**: 2025-12-17  
**Besluit door**: QA Specialist + Architect  
**Status**: ✅ Goedgekeurd

**Vraag**: Welke coverage targets hanteren we?

**Beslissing**:
| Component | Minimum (CI blokkeert) | Ideaal |
|-----------|------------------------|--------|
| Backend Services | 60% | 85% |
| Backend Routers | 40% | 70% |
| Frontend Logic | 50% | 75% |

**Regel**: 70% meaningful coverage > 90% trivial coverage.

**Wat NIET meetellen**:
- Pydantic/Zod validation (framework verantwoordelijkheid)
- Triviale getters/setters
- Framework boilerplate

**Impact**: CI faalt bij < 60% backend coverage, warning bij < 70%.

---

### DEC-010: E2E Scope en Omgeving
**Datum**: 2025-12-17  
**Besluit door**: Product Owner + QA Specialist  
**Status**: ✅ Goedgekeurd

**Vraag**: Waar draaien E2E tests en welke flows testen we?

**Beslissing**:
1. **Omgeving**: E2E tests draaien ALLEEN op Test (T) via GitHub Actions, NIET lokaal
2. **Scope**: Maximaal 5 kritieke user journeys:
   - Login → Dashboard (P1)
   - Upload supplier file (P1)
   - View dataset + preview (P1)
   - Create/Edit supplier (P2)
   - Search/Filter (P2)

**Reden**:
- Lokaal E2E is traag en fragiel
- Test omgeving is stabiel en reproduceerbaar
- 5 journeys dekken 80% business waarde

**Impact**: DevOps moet Test omgeving opzetten met E2E pipeline.

---

## Template voor Nieuwe Beslissingen

```markdown
### DEC-XXX: [Titel]
**Datum**: YYYY-MM-DD  
**Besluit door**: [Rol]  
**Status**: ⏳ Open | ✅ Goedgekeurd | ❌ Afgewezen

**Vraag**: [De vraag die beantwoord moet worden]

**Beslissing**: [Het besluit]

**Alternatieven overwogen**:
- Optie A: ...
- Optie B: ...

**Impact**: [Wat moet er aangepast worden]
```

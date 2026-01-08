# DataBiz Documentation

## Overview
Deze documentatie beschrijft de Domain-Driven Design (DDD) architectuur en ETL workflows voor het DataBiz import systeem.

## Documentatie Structuur

### Domain Documentation
- **[File Upload Domain Model](./domain/01-file-upload-domain.md)**: DDD model voor file upload bounded context
- **[Session Delete Domain Model](./domain/02-session-delete-domain.md)**: DDD model voor session delete operatie
- **[File Parsing Domain Model](./domain/03-file-parsing-domain.md)**: DDD model voor file parsing bounded context
- *Meer domain models volgen (File Validation, EAN Processing, etc.)*

### ETL Workflows
- **[Extract Phase: File Reception](./etl/01-extract-phase-file-reception.md)**: Bestand ontvangst en opslag
- **[Transform Phase: File Parsing](./etl/02-transform-phase-file-parsing.md)**: File parsing queue en metadata extractie
- *Meer ETL phases volgen (Load: Import, etc.)*

### Test Cases
- **[File Upload Test Cases](./tests/01-file-upload-test-cases.md)**: Uitgebreide test specificaties
- **[Session Delete Test Cases](./tests/02-session-delete-test-cases.md)**: Test cases voor session delete functionaliteit
- **[File Parsing Queue Test Cases](./tests/03-file-parsing-queue-test-cases.md)**: Test cases voor file parsing queue en metadata extractie
- *Meer test suites volgen per feature*

## ETL Pipeline Overzicht

```
EXTRACT (Fase 1) ✓
    ↓
    • File Reception
    • Duplicate Detection
    • Storage

TRANSFORM (Fase 2) ← [Huidige Focus]
    ↓
    • File Parsing Queue
    • Metadata Extraction (Rows/Columns)
    • Status: received → parsing → ready_for_processing
    • (Later: Data Validation, EAN Extraction, Conflict Detection)

LOAD (Fase 3)
    ↓
    • Database Import
    • EAN Catalog Update
    • Conflict Resolution
    • Audit Trail
```

## Development Workflow

1. **Documentation First**: Domain model en test cases beschrijven
2. **Implementation**: Code bouwen volgens DDD principes
3. **Testing**: Uitvoeren van test cases
4. **Refinement**: Domain model bijwerken op basis van learnings

## Conventies

- **Domain Entities**: PascalCase (ImportSession)
- **Value Objects**: PascalCase (FileHash, StoragePath)
- **Domain Services**: PascalCase (FileValidator)
- **Repositories**: Interface prefix `I` (IImportSessionRepository)
- **Status Values**: snake_case ('received', 'validating')

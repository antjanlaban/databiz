# DataBiz Documentation

## Overview
Deze documentatie beschrijft de Domain-Driven Design (DDD) architectuur en ETL workflows voor het DataBiz import systeem.

## Documentatie Structuur

### Domain Documentation
- **[Data-import Domain Model](./domain/data-import-domain.md)**: Volledige DDD model voor het Data-import domein
  - File Upload & Validation
  - File Parsing & Metadata Extraction
  - EAN Analysis & Code Detection
  - Session Management & Cleanup

- **[EAN-Varianten Domain Model](./domain/ean-variants-domain.md)**: Volledige DDD model voor het EAN-Varianten domein
  - Dataset Activatie Workflow
  - MERK Detectie & Mapping
  - Naam Generatie & Template Configuratie
  - Duplicaat Detectie & Variant Beheer

- **[Identity Domain Model](./domain/identity-domain.md)**: Volledige DDD model voor het Identity domein
  - User Management & Invites
  - Authentication & Authorization
  - Role-Based Access Control (RBAC)
  - Multi-Tenant Isolation

### ETL Workflows
- **[Data-import ETL Workflow](./etl/data-import-etl-workflow.md)**: Geïntegreerde ETL workflow voor Data-import
  - Phase 1: Extract (File Reception & Storage)
  - Phase 2: Transform (File Parsing & Metadata Extraction)
  - Phase 3: EAN Analysis & Code Detection

- **[EAN-Varianten ETL Workflow](./etl/ean-variants-etl-workflow.md)**: Geïntegreerde ETL workflow voor EAN-Varianten activatie
  - Phase 1: Data Preparation (JSON Conversie)
  - Phase 2: MERK Detection & Mapping
  - Phase 3: Name Template Configuration
  - Phase 4: Duplicate Detection
  - Phase 5: Insert/Update EAN Variants

### Test Cases
- **[Data-import Test Cases](./tests/data-import-test-cases.md)**: Uitgebreide test specificaties voor het Data-import domein
  - File Upload & Storage tests
  - File Parsing Queue tests
  - EAN Analysis tests
  - Session Management tests

- **[EAN-Varianten Test Cases](./tests/ean-variants-test-cases.md)**: Uitgebreide test specificaties voor het EAN-Varianten domein
  - Data Preparation tests
  - MERK Detection & Mapping tests
  - Name Generation tests
  - Duplicate Detection tests
  - EAN Variant Creation tests

## Seed Strategy

- **[Seed Strategy](./seed-strategy.md)**: Strategie voor het seeden van initiële data
  - Empty Table Only principe
  - Pre-flight checks
  - Seeder implementatie richtlijnen

## Gerealiseerde Domeinen

### Data-import ✓
Het Data-import domein is volledig gerealiseerd en omvat:
- File upload, validatie en opslag
- File parsing en metadata extractie
- EAN kolom detectie en analyse
- Session management en cleanup

**Status**: ✅ Volledig geïmplementeerd en operationeel

### EAN-Varianten ✓
Het EAN-Varianten domein is volledig gerealiseerd en omvat:
- Dataset activatie workflow
- MERK detectie (automatisch met fuzzy search, fallback naar handmatig)
- Kolom mapping (Kleur, Maat)
- Naam generatie met template builder
- Duplicaat detectie (EAN + fuzzy naam matching)
- EAN variant creatie en beheer
- Data storage strategie (essentiële velden in database, volledige data in JSON)

**Status**: ✅ Volledig geïmplementeerd en operationeel

### Identity ✓
Het Identity domein is volledig gerealiseerd en omvat:
- User management met rollen (Admin, Business Admin, Worker)
- Invite systeem met 48-uurs expiratie
- Authentication via Supabase Auth (email/password)
- Role-based access control (RBAC)
- Multi-tenant isolatie via company koppeling
- User profile management
- Invite acceptatie en wachtwoord instellen

**Status**: ✅ Volledig geïmplementeerd en operationeel

## ETL Pipeline Overzicht

### Data-import ETL Pipeline

```
EXTRACT (Fase 1) ✓
    ↓
    • File Reception
    • Validation (Extension, Size)
    • Duplicate Detection (Hash-based)
    • Storage Upload

TRANSFORM (Fase 2) ✓
    ↓
    • File Parsing Queue
    • Metadata Extraction (Rows/Columns)
    • Status: pending → uploading → parsing → analyzing_ean

EAN ANALYSIS (Fase 3) ✓
    ↓
    • EAN Column Detection
    • GTIN-13 Validation
    • EAN Code Analysis (Unique/Duplicate Count)
    • Status: analyzing_ean → completed → approved

JSON CONVERSION (Fase 4) ✓
    ↓
    • Automatic conversion triggered after approval
    • Convert approved file to JSON format
    • Save to Storage (approved/{sessionId}/data.json)
    • Status: approved → converting → ready_for_activation
```

### EAN-Varianten ETL Pipeline

```
DATA PREPARATION (Fase 1) ✓
    ↓
    • JSON data already available (from automatic conversion)
    • Load JSON from Storage (approved/{sessionId}/data.json)
    • Status: ready_for_activation → activating

MERK DETECTION & MAPPING (Fase 2) ✓
    ↓
    • Automatic MERK column detection (fuzzy search)
    • Extract distinct brand values
    • Check brands exist in database
    • Map columns (Kleur, Maat)

NAME TEMPLATE CONFIGURATION (Fase 3) ✓
    ↓
    • Template builder (columns + static text + separators)
    • Preview generated names
    • Validate template
    • Check name uniqueness (warning)

DUPLICATE DETECTION (Fase 4) ✓
    ↓
    • Check EAN exists in ean_variants
    • Fuzzy name matching
    • Deactivate old variants (is_active = FALSE)

INSERT/UPDATE EAN VARIANTS (Fase 5) ✓
    ↓
    • Batch processing (500 rows per batch)
    • Generate names from template
    • Validate required fields
    • Insert new variants
    • Status: activating → activated
```

## Development Workflow

1. **Documentation First**: Domain model en test cases beschrijven
2. **Implementation**: Code bouwen volgens DDD principes
3. **Testing**: Uitvoeren van test cases
4. **Refinement**: Domain model bijwerken op basis van learnings

## Conventies

- **Domain Entities**: PascalCase (ImportSession)
- **Value Objects**: PascalCase (FileHash, StoragePath, ParseMetadata, EANAnalysisResult)
- **Domain Services**: PascalCase (FileValidator, FileProcessor, EANDetector, EANAnalyzer)
- **Repositories**: Interface prefix `I` (IImportSessionRepository)
- **Status Values**: snake_case ('pending', 'uploading', 'parsing', 'analyzing_ean', 'waiting_column_selection', 'processing', 'approved', 'activating', 'activated', 'rejected', 'failed')
- **Domain Services**: PascalCase (BrandDetector, NameGenerator, DuplicateDetector, DataValidator)
- **Value Objects**: PascalCase (NameTemplate, ColumnMapping, BrandMatch)

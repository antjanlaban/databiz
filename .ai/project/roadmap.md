# Project Roadmap

**Current Phase**: Phase 2 - Hybrid Architecture & Data Ingestion
**Status**: Active Development

## Active Domains & Epics

### 1. Domain: Ingestion (Priority: High)

Focus: Getting supplier data into the system reliably.

- **Epic: ImportPipeline**
  - [ ] Slice: `UploadSupplierFile` (Python V2) - _Next Up_
  - [ ] Slice: `AnalyzeColumns` (AI-driven recognition)
  - [ ] Slice: `ActivateDataset` (Mapping to Golden Record)

### 2. Domain: PIM (Priority: Medium)

Focus: Managing the Golden Record.

- **Epic: Catalog**
  - [ ] Slice: `GetProductMaster` (View details)
  - [ ] Slice: `SearchProducts` (Filter/Sort)

## Technical Roadmap

- [x] **Documentation**: Establish AI Knowledge Base (Iron Dome).
- [ ] **Infrastructure**: Set up Python V2 backend (FastAPI + Supabase).
- [ ] **Integration**: Configure Proxy for `/api/v2` routing.
- [ ] **Type Safety**: Set up OpenAPI -> TypeScript generation pipeline.

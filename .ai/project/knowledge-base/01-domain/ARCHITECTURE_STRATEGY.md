# Architecture Strategy: Hybrid Vertical Slices

## 1. Core Philosophy

We adopt a **Vertical Slice Architecture** within an **Iron Dome** (safety & stability) environment.
We are gradually migrating from a monolithic Node.js backend to a hybrid model using Python for all new features.

## 2. Technology Stack (Best of Both Worlds)

| Layer          | Technology              | Version | Role                                          |
| :------------- | :---------------------- | :------ | :-------------------------------------------- |
| **Frontend**   | TypeScript (React/Vite) | Latest  | UI, State, Validation (shared types)          |
| **Backend V1** | Node.js (Fastify/TS)    | 20+     | Legacy CRUD, Maintenance of existing features |
| **Backend V2** | Python (FastAPI)        | 3.11+   | **ALL NEW FEATURES**, AI, Data Processing     |
| **Database**   | PostgreSQL (Managed)    | 15+     | Shared data storage                           |

## 3. The Rules of the Slice

A slice is an autonomous vertical cross-section of the application that realizes exactly one user story.

### 3.1 Scope & Size

- **Scope**: One clear use case (e.g., `CreateProduct`, `ImportSupplierFile`).
- **Boundary**: "Everything related to products" is NOT a slice. `ListProducts` and `ArchiveProduct` are separate slices.
- **Mental Size**: The impact of a change must be fully comprehensible.
- **File Size**: Guideline ±200 lines per file. Split if necessary, but keep within the slice directory.

### 3.2 Structure of a Python Slice (V2)

A new slice in `/api/v2` contains:

1.  **API Endpoint**: FastAPI route (`@router.post("/...")`).
2.  **Business Logic**: Service class or function.
3.  **Data Model**: Pydantic models (Input/Output) & SQLAlchemy/SQLModel definitions.
4.  **Tests**: Pytest unit & integration tests.

### 3.3 Type Safety (Iron Dome Requirement)

Because we are mixing languages (TS Frontend <-> Python Backend), the risk of type errors is high.

- **REQUIREMENT**: Every Python slice MUST generate an OpenAPI (Swagger) specification.
- **REQUIREMENT**: The frontend automatically generates TypeScript clients/types based on this OpenAPI spec.
- **FORBIDDEN**: Manually writing TypeScript interfaces that "approximately" match the Python backend.

## 4. Routing & Co-existence (Strangler Fig)

- `/api/v1/*` -> Handled by the existing **Node.js** backend.
- `/api/v2/*` -> Handled by the new **Python** backend.
- **Proxy**: A reverse proxy (or Vite proxy in dev) routes the traffic.

## 5. Authentication

- **Identity Provider**: Both backends use a shared Identity Provider (currently Supabase Auth).
- **Mechanism**: The Frontend sends the JWT (Bearer Token).
- **Validation**: Both Node.js and Python validate this token against the shared JWT Secret / Public Key.
  - _Note_: Avoid using vendor-specific SDKs (like `supabase-js`) for token validation in the Python backend. Use standard JWT libraries.

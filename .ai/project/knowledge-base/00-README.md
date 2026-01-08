# AI Knowledge Base (Single Source of Truth)

⚠️ **CRITICAL FOR AI AGENTS**:
This directory (`.ai/knowledge-base`) contains the **AUTHORITATIVE** documentation and rules for this project.
In case of conflicts with documentation in `docs/` or legacy code, **THIS DIRECTORY ALWAYS TAKES PRECEDENCE**.

## Index

- [01-domain](01-domain/README.md): Business logic, terminology, and architectural strategy.
- [02-datamodel](02-datamodel/README.md): Database schemas and data models.
- [03-validation](03-validation/README.md): Validation rules and constraints.
- [04-api](04-api/README.md): API specifications (v1 Node.js & v2 Python).
- [05-integration](05-integration/README.md): External integrations.
- [06-examples](06-examples/README.md): JSON examples.
- [07-archive](07-archive/README.md): Legacy context.

## Core Principles (Iron Dome)

1.  **Vertical Slices**: Code is grouped by feature/use-case.
2.  **Hybrid Architecture**:
    - Legacy/Maintenance: Node.js/TypeScript (`/api/v1`)
    - **NEW FEATURES**: Python/FastAPI (`/api/v2`)
3.  **Type Safety**: Python backends MUST generate OpenAPI specs for TypeScript client generation.

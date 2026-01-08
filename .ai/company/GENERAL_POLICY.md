# Company General Policy (The DNA)

This document defines the non-negotiable principles for all software development.
It applies to ALL projects and ALL agents.

## 1. The "Iron Dome" Philosophy

- **Safety First**: We prioritize system stability over feature speed.
- **Strict Validation**: No data enters our systems without strict schema validation (Zod/Pydantic).
- **Type Safety**: We do not use `any`. We use strong typing in Python and TypeScript.

## 2. Technology Standards

- **Hybrid Architecture**:
  - **Heavy Lifting (AI/ETL)**: Python (FastAPI).
  - **User Interface**: TypeScript (React).
  - **Legacy**: Node.js is for maintenance only.
- **Documentation**: Documentation is code. It must be kept in sync with the implementation.

## 3. Vibe Coding Workflow

- **Micro-Steps**: Do not build "big bang" features. Build small, testable slices.
- **Test-Driven**: Tests are not optional. They are part of the definition of done.
- **No Hallucinations**: Verify facts (tables, files, libraries) before using them.

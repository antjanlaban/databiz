# Quality & Safety Rules (The "Iron Dome" Protocol)

This document defines the **NON-NEGOTIABLE** standards for Code Quality and Hallucination Prevention.
Every Agent must adhere to these rules to ensure the stability and reliability of DataBiz.

## 1. Preventing Hallucinations (Truth Anchoring)

**The Problem**: AI Agents sometimes invent table names, libraries, or file paths.
**The Solution**: Always anchor your work in reality.

### DO's

- **Check the Schema**: Before writing SQL, read `schema_dump.sql` or check the `models.py` in the relevant Domain.
- **Check Dependencies**: Before importing a library, check `package.json` or `pyproject.toml`.
- **Check Paths**: Use `list_dir` or `file_search` to verify a file exists before editing it.
- **Admit Ignorance**: If you don't know something, ask the user or search the codebase. Don't guess.

### DON'Ts

- **NEVER** assume a column exists (e.g., `product.created_at`) without verifying.
- **NEVER** invent a new architectural pattern (e.g., "I'll add a Controller layer") if it violates `TECH_STACK.md`.
- **NEVER** reference files that "should" be there but aren't.

## 2. Code Quality Standards

**The Problem**: "Spaghetti code", technical debt, and regressions.
**The Solution**: Strict adherence to Vibe Coding and Clean Code principles.

### DO's

- **Test-Driven**: Write the test _before_ or _alongside_ the code. No code without tests.
- **Strict Typing**:
  - **Python**: Use Type Hints (`def func(a: int) -> str:`). Use Pydantic for data structures.
  - **TypeScript**: No `any`. Define Interfaces/Types for everything.
- **Small Functions**: Keep functions under 20-30 lines. One function, one responsibility.
- **Descriptive Naming**: `calculate_margin_percentage()` is better than `calc()`.
- **Clean Up**: Remove unused imports, `console.log` (use logger), and commented-out code.

### DON'Ts

- **NEVER** commit broken code. Run `Validate` task before finishing.
- **NEVER** bypass validation. All inputs must be validated (Zod/Pydantic).
- **NEVER** leave `TODO` comments without a plan or a ticket.

## Definition of Done (DoD) - REQUIRED for every Slice

Every User Story MUST have a corresponding checklist item in the PR/Commit:

- [ ] **Acceptance Criteria**: Does it do what the PO asked?
- [ ] **Tests (Unit)**: Vitest/Jest tests passing?
- [ ] **Tests (E2E)**: Playwright Flow verified (No "Trust me, bro", show the green checkmark)?
- [ ] **Integration**: Front-to-Back connection verified?
- [ ] **Code Quality**: No `any`, clean logs, small functions?
- [ ] **Security**: Inputs validated (Zod/Pydantic)?
- [ ] **Documentation**: `DOMAIN_REGISTRY.yaml` updated?

## 3. Safety Protocols

- **Database**: `DROP`, `TRUNCATE`, and `DELETE` (without WHERE) are FORBIDDEN without explicit user confirmation.
- **Secrets**: NEVER print API keys or passwords in the chat or logs.
- **Refactoring**: When refactoring, ensure existing tests pass. Do not break the "Iron Dome".

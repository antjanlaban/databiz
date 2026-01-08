# AGENT TASKING PROTOCOL (The Anti-Hallucination Standard)

## 1. PHILOSOPHY

To prevent hallucination and ensure quality, every task must be framed with **Context**, **Focus**, and **Rules**.
An agent must never "guess" what to do; it must execute a specific, registered Slice.

---

## 2. THE STANDARD PROMPT STRUCTURE

When assigning work to an agent, the user (or the system) must provide these three layers:

### LAYER 1: THE CONTEXT (The "Iron Dome")

_What are the laws of this universe?_

- **Must Read:** `.ai/company/BUSINESS_SYSTEM.md` (The Stack & Rules)
- **Must Read:** `.ai/company/DDD_GUIDE.md` (The Architecture)
- **Must Read:** `.ai/project/DOMAIN_REGISTRY.yaml` (The Map)

### LAYER 2: THE FOCUS (The Assignment)

_What exactly am I building right now?_

- **Input:** A specific Slice ID from the Registry (e.g., `ING-IMP-SUP-001`).
- **Scope:** The User Story associated with that ID.
- **Boundaries:** The specific file paths defined in the Registry.

### LAYER 3: THE EXECUTION (The Workflow)

_How do I deliver this?_

1.  **Verify:** Check if the Slice ID exists in `DOMAIN_REGISTRY.yaml`.
2.  **Plan:** Create the folder structure if missing.
3.  **Implement:** Write the 4 mandatory files (`router.py`, `service.py`, `schemas.py`, `tests/`).
4.  **Validate:** Run the specific test for this slice.

---

## 3. RULES FOR AGENTS ACCEPTING TASKS

### Rule #1: No Registry, No Code.

If the user asks for a feature that is NOT in `.ai/project/DOMAIN_REGISTRY.yaml`:

> **STOP.** Do not write code.
> Ask the user to register the Slice first.
> _Response:_ "I cannot find this feature in the Domain Registry. Please define the Domain, Epic, and User Story first so I know where to place it."

**VERIFICATION STEPS (MANDATORY):**
1. Search DOMAIN_REGISTRY.yaml for the slice ID (e.g., `IMP-DAT-ACT-001`)
2. If slice ID exists → Read the user_story and acceptance_criteria
3. If slice ID missing → STOP and ask user to register it first
4. After implementation → Update slice status from 'planned' to 'active' or 'done'

**NEVER assume** a feature is "part of" another slice. Each user story = separate slice with ID.

### Rule #2: Stay in the Box.

If assigned Slice `ING-IMP-SUP-001`:

- You may ONLY edit files in `backend/src/domains/ingestion/import_pipeline/supplier_upload/upload_file/`.
- You may NOT edit `sales` domain code.
- You may NOT create "global utils" outside the domain.

### Rule #3: The Definition of Done.

A task is only complete when:

1.  The code exists in the path defined in the Registry.
2.  A test exists in `tests/test_[slice].py`.
3.  The test passes.
4.  The Registry status is updated to `done`.

---

## 4. EXAMPLE TASK PROMPT

_Use this format to instruct the agent:_

> **Agent, please implement Slice `ING-IMP-SUP-001`.**
>
> **Context:**
>
> - I have read the Business System and DDD Guide.
> - The Slice is defined in `DOMAIN_REGISTRY.yaml`.
>
> **Task:**
>
> - Implement the User Story: _"As a Supplier Manager, I want to upload a CSV..."_
> - Target Path: `backend/src/domains/ingestion/import_pipeline/supplier_upload/upload_file`
>
> **Constraints:**
>
> - Use Python 3.11+, FastAPI, Pydantic.
> - No cross-domain imports.
> - Create a passing test.

---

## 5. MULTI-AGENT SLICE COMPLETION

### Triggering Full Orchestration

User says: "Implement feature X" or "Build slice Y" → Adopt Orchestrator persona

### Quality Gates Between Agents

- Each handoff requires explicit verification
- Use the checklist from QUALITY_RULES.md
- Document handoff in consistent format
- No silent assumptions between agents

### Parallel vs Sequential Work

**Parallel** (both can work simultaneously):

- Backend (Data Engineer) + Frontend (Frontend Dev)
- Documentation + Implementation

**Sequential** (must wait):

- Architecture → Implementation
- Implementation → Testing
- All phases → Deployment

---

## 6. WORKTREES (Fencing Parallel Work)

When you want parallel workstreams without cross-contamination, use Git worktrees:

- Create: `git worktree add ..\\databiz-next--feature-xyz -b feature/xyz`
- List: `git worktree list`
- Remove: `git worktree remove ..\\databiz-next--feature-xyz`

Rules:

- Open the worktree folder in VS Code (treat it as an isolated workspace)
- Prefer a separate `.venv` per worktree
- Run tests and commit from the worktree you changed

# System Instructions for Agents

## 1. Core Identity

You are an expert AI programming assistant for this project.
You follow the **Iron Dome** principles: Safety, Reliability, and Type Safety above all.

## 2. Critical Rules

1.  **Read First**: Always read `.ai/company/AGENT_TASKING_PROTOCOL.md` and `.ai/company/BUSINESS_SYSTEM.md` before starting.
2.  **Registry First**: Never write code for a feature not registered in `.ai/project/DOMAIN_REGISTRY.yaml`.
3.  **STOP & VERIFY**: Never guess tables, paths, endpoints, or dependencies. Verify in repo first.
4.  **Vertical Slices**: Implement features as isolated vertical slices.
5.  **Hybrid Stack**: **Backend = Python** (FastAPI/SQLAlchemy/Pydantic), **Frontend = TypeScript**. Node.js is legacy maintenance only.
6.  **No Destructive DB Ops**: Never run `DROP`, `TRUNCATE`, or `DELETE` without `WHERE` without explicit user approval.
7.  **Always Commit**: After significant changes, commit (`git add -A && git commit -m "..."`).
8.  **Role Specifics**: If the user invokes a persona trigger, read the matching `.ai/company/agent-library/` file first.
9.  **Unified Workflow**: Use `npm start` to start development. NEVER suggest VS Code Tasks or deprecated commands.

## 2.1 Command Enforcement (MANDATORY)

**ALWAYS use these commands:**

- `npm start` - Start development (backend + frontend)
- `npm run stop` - Stop services
- `npm run db:migrate` - Run migrations
- `npm run db:check` - Health check

**FORBIDDEN:**

- ❌ "Use Task 'Dev: Start All'" (VS Code UI-specific)
- ❌ "npm run dev:simple" (deprecated)
- ❌ "npm run dev:terminal" (deprecated)
- ❌ Suggesting VS Code Tasks for service management

**Why?** Commands work everywhere (terminal, CI, remote). Tasks are optional UI features.

## 2.1 STOP & VERIFY Checklist (Anti-Hallucination)

Before you do anything that changes code:

1. Verify the Slice exists in `.ai/project/DOMAIN_REGISTRY.yaml`
2. Verify the target path exists (or is explicitly to-be-created) and matches the registry
3. Verify schema by reading existing `models.py` and Alembic migrations under `backend/migrations/`
4. Verify dependencies in `backend/pyproject.toml` / `backend/requirements.txt` and `frontend/package.json`
5. If uncertain: ask 1-3 targeted questions (never assume)

## 3. Workflow (Vibe Coding)

1.  **Plan**: Break down the request into micro-steps.
2.  **Context**: Gather necessary files and documentation.
3.  **Implement**: Write code for ONE slice/component.
4.  **Test**: Verify with tests immediately.
5.  **Review**: Check against `.ai/company/BUSINESS_SYSTEM.md` goals.

## 4. Documentation

- **SSOT (Company Policies)**: `.ai/company/` is the Single Source of Truth for global rules and standards.
- **SSOT (Project Architecture)**: `.ai/project/DOMAIN_REGISTRY.yaml` and `.ai/project/PORT_REGISTRY.yaml` are the Single Source of Truth for this repo.
- **Project Docs**: `.ai/project/knowledge-base/` contains project-specific implementation details.
- **Update**: If you change architecture or business logic, update the relevant `.ai/` docs.

## 5. Worktrees (Fencing Work)

When running parallel workstreams, prefer Git worktrees to isolate changes:

- Create: `git worktree add ..\\databiz-next--feature-xyz -b feature/xyz`
- List: `git worktree list`
- Remove: `git worktree remove ..\\databiz-next--feature-xyz`

Guidelines:

- Treat each worktree as its own workspace in VS Code (open the folder of the worktree)
- Keep per-worktree Python environments (create `.venv` per worktree)
- Run tests per worktree before committing

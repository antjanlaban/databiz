# AGENT INSTRUCTIONS — platform/catalog-consolidation

**READ THIS FIRST before starting work.**

## Your Scope (MANDATORY)

You are working in the **platform/catalog-consolidation** worktree.
- Branch: **feature/platform-catalog-consolidation**
- Allowed paths: See WORKTREE.md (Scope Fence section)
- Non-goals: See WORKTREE.md (Non-goals section)

## Quick Start

1. **Read** WORKTREE.md (Scope Fence + Definition of Done)
2. **Reference** .ai/project/DOMAIN_REGISTRY.yaml for context
3. **Understand** the allowed paths — do NOT work outside them
4. **Before committing**: Run VALIDATION_CHECKLIST.md

## Copy This for Your LLM

```
[DEVOPS]  // or [DATA], [FRONTEND], [FULLSTACK], etc.

You are an engineer working in **platform/catalog-consolidation** worktree.

**Allowed paths:**
- frontend/src/features/catalog-browse/**
- frontend/src/features/supplier-catalog/browse/**
- frontend/src/pages/CatalogBrowsePage.tsx
- e2e/tests/catalog-browse/**
- .ai/project/DOMAIN_REGISTRY.yaml

**Non-goals:**
- No changes to assortment feature
- No backend changes
- No changes to other supplier-catalog features
- No shared component library changes

**Objective:**
[INSERT YOUR TASK HERE]

**Definition of Done:**
- Unit + integration tests local green (O)
- CI (T) green on PR to dev
- Update DOMAIN_REGISTRY.yaml slice status only
- All changes within allowed paths only
- No new secrets/env vars without approval

**References (SSOT):**
- Scope: WORKTREE.md
- Validation: VALIDATION_CHECKLIST.md
- Domain architecture: .ai/project/DOMAIN_REGISTRY.yaml
```

## Anti-Hallucination Guardrails

✅ **DO**
- Work only in allowed paths
- Read SSOT documents first
- Ask before changing architecture
- Test before committing
- Reference line numbers when suggesting changes

❌ **DON'T**
- Create files outside allowed paths
- Add new environment variables without explicit request
- Change database schema without migrations
- Refactor outside scope (no "nice-to-have" refactors)
- Assume function signatures or module structure

## Before You Commit

Run through VALIDATION_CHECKLIST.md before `git push`.

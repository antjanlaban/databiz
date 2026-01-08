# Frontend Architecture Guide

**Status:** DRAFT - Awaiting AI Director Approval  
**Created:** December 18, 2025  
**Author:** [ARCHITECT]  
**Review Required:** [AI-DIRECTOR], [ORCHESTRATOR], [ARCHITECT]

---

## 🎯 Problem Statement

Our backend follows strict Iron Dome principles with small, focused slices (~50-150 lines per file). However, frontend pages have grown to 400-600+ lines, making them:

1. **Hard for AI agents to process** - Context window bloat
2. **Difficult to maintain** - Too many concerns in one file
3. **Error-prone during edits** - Large files = more merge conflicts
4. **Inconsistent** - No clear decomposition rules

### Current State (December 2025)

| File                     | Lines | Status        |
| :----------------------- | ----: | :------------ |
| ImportsPage.tsx          |   591 | ⚠️ Too large  |
| ImportWizardPage.tsx     |   566 | ⚠️ Too large  |
| SuppliersPage.tsx        |   544 | ⚠️ Too large  |
| BrandsPage.tsx           |   499 | ⚠️ Borderline |
| FieldMappingFlowPage.tsx |   385 | 🔶 Acceptable |
| DatasetsPage.tsx         |   328 | 🔶 Acceptable |
| SupplierProductsPage.tsx |   228 | ✅ Good       |
| UsersPage.tsx            |   150 | ✅ Good       |

---

## 📐 Proposed Frontend Architecture

### The 150-Line Rule

> **A single React component file should not exceed 150 lines.**
>
> If it does, extract sub-components into separate files.

### Directory Structure

```text
frontend/src/
├── pages/                          # Route entry points ONLY
│   └── SuppliersPage.tsx           # Max 100 lines - composition only
│
├── features/                       # Feature-specific components
│   └── suppliers/                  # Maps to backend domain/epic/feature
│       ├── index.ts                # Public exports
│       ├── SupplierTable.tsx       # Table with data display
│       ├── SupplierModal.tsx       # Create/Edit form modal
│       ├── SupplierFilters.tsx     # Search + filter controls
│       ├── SupplierActions.tsx     # Row action buttons
│       ├── useSuppliers.ts         # React Query hooks
│       ├── suppliers.types.ts      # TypeScript interfaces
│       └── suppliers.api.ts        # API calls (if not in lib/)
│
├── components/                     # Shared/reusable components
│   ├── ui/                         # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   └── Pagination.tsx
│   ├── feedback/                   # User feedback components
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── Toast.tsx
│   └── forms/                      # Form components
│       ├── FormField.tsx
│       ├── SearchInput.tsx
│       └── SelectDropdown.tsx
│
├── hooks/                          # Shared custom hooks
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   └── useConfirmDialog.ts
│
└── lib/                            # Utilities & API clients
    ├── api.ts                      # Base API client
    ├── maintenance-api.ts          # Domain-specific APIs
    └── store.ts                    # Global state (Zustand)
```

---

## 🔄 Component Decomposition Rules

### Rule 1: Page = Composition Only

A page file should ONLY:

- Import feature components
- Handle routing params
- Compose the layout

```tsx
// ✅ GOOD: SuppliersPage.tsx (~60 lines)
export function SuppliersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Leveranciers" />
      <SupplierFilters />
      <SupplierTable />
      <SupplierModal />
    </div>
  );
}
```

```tsx
// ❌ BAD: Everything in one 500+ line file
export function SuppliersPage() {
  // 50 lines of state
  // 100 lines of mutations
  // 150 lines of handlers
  // 200 lines of JSX with inline components
}
```

### Rule 2: One Concern Per Component

| Component Type    | Responsibility           | Max Lines |
| :---------------- | :----------------------- | --------: |
| Page              | Route entry, composition |       100 |
| Feature Component | Single UI feature        |       150 |
| UI Component      | Reusable primitive       |       100 |
| Hook              | State/logic extraction   |        80 |
| Modal             | Form + submission        |       150 |

### Rule 3: Extract When You See These Patterns

Extract into a separate component when you see:

1. **Inline component definitions** - `function StatusBadge()` inside a page
2. **Repeated UI patterns** - Same table/card structure in multiple pages
3. **Complex state logic** - More than 3 `useState` calls → extract to hook
4. **Form handling** - All form state + validation → separate modal component
5. **Data fetching** - React Query hooks → `useFeatureName.ts`

---

## 🎨 Naming Conventions

### Files

```text
# Feature components (PascalCase)
SupplierTable.tsx
SupplierModal.tsx

# Hooks (camelCase with use prefix)
useSuppliers.ts
usePagination.ts

# Types (kebab-case with .types suffix)
suppliers.types.ts

# API (kebab-case with .api suffix)
suppliers.api.ts
```

### Exports

```typescript
// features/suppliers/index.ts
export { SupplierTable } from "./SupplierTable";
export { SupplierModal } from "./SupplierModal";
export { SupplierFilters } from "./SupplierFilters";
export { useSuppliers, useSupplierMutations } from "./useSuppliers";
export type {
  Supplier,
  SupplierCreate,
  SupplierUpdate,
} from "./suppliers.types";
```

---

## 🤖 AI Agent Optimization

### Why This Matters for Agents

1. **Smaller context** - 150-line files fit easily in agent context
2. **Clear boundaries** - Agents know exactly which file to edit
3. **Predictable structure** - Agents can find components by convention
4. **Isolated changes** - Editing SupplierModal.tsx doesn't touch table logic

### Agent-Friendly Patterns

```typescript
// ✅ Clear, focused component with single responsibility
// File: features/suppliers/SupplierTable.tsx
// Lines: ~120

export function SupplierTable() {
  const { data, isLoading } = useSuppliers();

  if (isLoading) return <LoadingSpinner />;

  return (
    <Table>
      {data?.items.map((supplier) => (
        <SupplierRow key={supplier.id} supplier={supplier} />
      ))}
    </Table>
  );
}
```

### File Header Comments (Optional but Recommended)

```typescript
/**
 * @component SupplierModal
 * @feature suppliers
 * @description Create/Edit modal for supplier entities
 * @dependencies useSupplierMutations, Modal, FormField
 */
```

---

## 📋 Migration Plan

### Phase 1: Documentation (Current)

- [x] Create FRONTEND_GUIDE.md
- [ ] Review with AI Director, Orchestrator, Architect
- [ ] Add to DOMAIN_REGISTRY.yaml as enforcement rule

### Phase 2: Shared Components (Sprint N+1)

- [ ] Extract `components/ui/` primitives (Pagination, StatusBadge, Modal)
- [ ] Extract `components/feedback/` (LoadingSpinner, ErrorMessage, Toast)
- [ ] Create `components/forms/` (FormField, SearchInput)

### Phase 3: Feature Decomposition (Sprint N+2)

- [ ] Decompose SuppliersPage → `features/suppliers/`
- [ ] Decompose BrandsPage → `features/brands/`
- [ ] Decompose ImportsPage → `features/imports/`
- [ ] Decompose DatasetsPage → `features/datasets/`

### Phase 4: Enforcement (Sprint N+3)

- [ ] Add ESLint rule for max file length
- [ ] Add CI check for component structure
- [ ] Update agent instructions to use feature folders

---

## 🔗 Related Documents

- [DDD_GUIDE.md](./DDD_GUIDE.md) - Backend slice architecture
- [WORKFLOW_RULES.md](../.github/copilot/WORKFLOW_RULES.md) - Development workflow
- [DOMAIN_REGISTRY.yaml](../project/DOMAIN_REGISTRY.yaml) - Slice registry

---

## ✅ Approval Status

| Role           | Status      | Date       | Notes                |
| :------------- | :---------- | :--------- | :------------------- |
| [ARCHITECT]    | ✅ Proposed | 2025-12-18 | Initial draft        |
| [AI-DIRECTOR]  | ⏳ Pending  | -          | Review required      |
| [ORCHESTRATOR] | ⏳ Pending  | -          | Registry integration |

---

## 📝 Decision Record

**Decision:** Adopt component decomposition rules for frontend  
**Status:** PROPOSED  
**Context:** Large page files (400-600 lines) are causing AI agent inefficiency  
**Consequences:**

- Refactoring effort required for existing pages
- New pages must follow this structure
- Agents will work more efficiently with smaller files

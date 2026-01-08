# Priority #1: Assortment Management UI - Expert Analysis

**Status:** Draft  
**Created:** 2025-12-20  
**Author:** [AI-ARCHITECT] + [AI-FULLSTACK]  
**Sprint:** MVP Happy Path (Phase 5-6)

---

## 📋 Problem Statement

**From Business Perspective:**
Users hebben nu geen werkbare interface om hun assortiment te beheren. Ze kunnen wel producten promoveren vanuit de supplier catalog (via PromoteButton), maar zodra een product in het assortiment staat, is er **geen UI** om:
- Het product te bekijken (master + variants detail)
- Het product te bewerken (naam, description, actief/inactief)
- Het product te verwijderen
- Tussen actieve/inactieve producten te filteren

**Current State:**
- ✅ Backend: 6 API endpoints volledig geïmplementeerd en getest (13 test cases)
- ✅ PromoteButton werkend in supplier catalog browse
- ⚠️ AssortimentPage: Placeholder met basis grid + filter checkbox
- ⚠️ Geen detail modal
- ⚠️ Geen edit functionaliteit
- ⚠️ Geen delete functionaliteit

**Gap:**
De AssortimentPage kan alleen een lijst tonen. Er is geen interactie mogelijk met individuele producten.

---

## 🎯 User Stories (High-Level)

### Epic: Assortment Product Management

1. **Als gebruiker wil ik** een overzicht zien van mijn gepromoveerde producten **zodat** ik weet welke producten in mijn assortiment zitten
2. **Als gebruiker wil ik** details van een assortment product bekijken (master + alle variants) **zodat** ik kan zien wat ik gepromoveerd heb
3. **Als gebruiker wil ik** een assortment product kunnen bewerken (naam, description) **zodat** ik mijn assortiment kan verfijnen
4. **Als gebruiker wil ik** een product actief/inactief kunnen zetten **zodat** ik bepaal wat beschikbaar is voor export
5. **Als gebruiker wil ik** een product kunnen verwijderen uit mijn assortiment **zodat** ik ongewenste producten kan opschonen
6. **Als gebruiker wil ik** kunnen filteren tussen actieve/inactieve producten **zodat** ik specifieke producten kan vinden

---

## 🏗️ Technical Approach

### Architecture Decisions

**Component Reuse Strategy:**
- Hergebruik MasterDetailModal pattern van supplier-catalog/browse
- Hergebruik FilterSidebar pattern (kan later uitgebreid worden naar brand/category filters)
- Hergebruik ToastNotification voor feedback
- Hergebruik ProductCardContent voor consistente display

**State Management:**
- React Query voor server state (bestaande hooks in `useAssortment.ts`)
- Local component state voor modal open/close
- URL state voor filters (future enhancement)

**UI Library:**
- Radix UI Dialog voor modals (al aanwezig in `frontend/src/components/ui/dialog.tsx`)
- Tailwind CSS v4 utility classes (geen custom CSS files)
- Lucide React icons

**Component Structure:**
```
frontend/src/features/assortment/
├── components/
│   ├── AssortmentProductGrid.tsx (✅ EXISTS - needs enhancement)
│   ├── AssortmentProductCard.tsx (✅ EXISTS)
│   ├── AssortmentDetailModal.tsx (🔴 NEW - master + variants detail)
│   ├── AssortmentEditForm.tsx (🔴 NEW - edit name/description/status)
│   ├── AssortmentDeleteDialog.tsx (🔴 NEW - delete confirmation)
│   └── ProductCardContent.tsx (✅ REUSE from supplier-catalog)
├── hooks/
│   └── useAssortment.ts (✅ EXISTS - complete)
├── api/
│   ├── assortment-api.ts (✅ EXISTS - complete)
│   └── types.ts (✅ EXISTS - complete)
└── pages/
    └── AssortimentPage.tsx (⚠️ EXISTS - needs enhancement)
```

---

## 📦 Slice Definitions

### Slice 1: ASS-UI-DET-001 - Assortment Detail Modal

**Domain:** assortment  
**Epic:** product_management  
**Feature:** detail_view  
**Slice ID:** ASS-UI-DET-001

**User Story:**
Als gebruiker wil ik op een assortment product kunnen klikken om de volledige details te zien (master info + alle variants) zodat ik begrijp wat ik in mijn assortiment heb.

**Acceptance Criteria:**
1. **Given** user is on AssortimentPage **When** user clicks product card **Then** modal opens with master + variants detail
2. **Given** modal is open **When** data loads **Then** user sees master info (name, description, brand, category, promoted_at, is_active status)
3. **Given** modal is open **When** data loads **Then** user sees variants table (EAN, color_raw, size_raw, image thumbnails)
4. **Given** modal shows >50 variants **When** rendering **Then** show "Showing first 50, more available" message
5. **Given** modal is open **When** user clicks close (X or backdrop) **Then** modal closes and returns to grid
6. **Given** API call fails **When** modal loads **Then** show error state with retry option
7. **Given** product is inactive **When** modal renders **Then** show clear "Inactief" badge

**Technical Implementation:**

**Component:** `AssortmentDetailModal.tsx`  
**Location:** `frontend/src/features/assortment/components/`  
**Pattern:** Reuse MasterDetailModal structure from supplier-catalog/browse  

**Props:**
```typescript
interface AssortmentDetailModalProps {
  productId: string | null;
  onClose: () => void;
  onEdit?: (productId: string) => void; // Opens edit form
  onDelete?: (productId: string) => void; // Opens delete dialog
}
```

**Dependencies:**
- `useAssortmentDetail(productId)` hook (already exists)
- Radix UI Dialog from `@/components/ui/dialog`
- Lucide icons: X (close), Edit, Trash2

**API Integration:**
- GET `/api/v1/assortment/products/{id}`
- Error handling: 404 (not found), 401 (unauthorized)

**UI/UX Requirements:**
- Modal overlay (shadcn Dialog component)
- Header: Product name + close button
- Body (scrollable):
  - Master info grid (brand, category, promoted date, status badge)
  - Action buttons row: Edit, Delete (if active)
  - Variants table with columns: EAN, Color, Size, Image
  - Loading skeleton during fetch
  - Error state with "Retry" button
- Footer: Close button
- Responsive: Full screen on mobile, max-w-4xl on desktop

**Testing:**
- Unit tests:
  - Renders loading state
  - Renders master info correctly
  - Renders variants table
  - Close button works
  - Edit/Delete buttons trigger callbacks
- Integration tests:
  - API call success → data displayed
  - API call 404 → error state
  - Close via backdrop → modal closes

**Effort:** 4 hours  
**Priority:** HIGH (Blocker for edit/delete)  
**Dependencies:** None (uses existing hooks)

---

### Slice 2: ASS-UI-EDT-001 - Assortment Edit Form

**Domain:** assortment  
**Epic:** product_management  
**Feature:** edit_product  
**Slice ID:** ASS-UI-EDT-001

**User Story:**
Als gebruiker wil ik een assortment product kunnen bewerken (naam, description, actief/inactief status) zodat ik mijn assortiment kan verfijnen zonder het product opnieuw te moeten promoveren.

**Acceptance Criteria:**
1. **Given** user opens detail modal **When** user clicks "Edit" button **Then** edit form opens in modal
2. **Given** edit form is open **When** form loads **Then** current values are pre-filled (name, description, is_active)
3. **Given** user enters new name **When** name is empty or >200 chars **Then** validation error shows
4. **Given** user edits fields **When** user clicks "Save" **Then** PUT request is sent with changes
5. **Given** save succeeds **When** response received **Then** toast shows "Product bijgewerkt", modal closes, grid refreshes
6. **Given** save fails **When** API returns error **Then** error message shows in form (inline, not toast)
7. **Given** user makes changes **When** user clicks "Cancel" **Then** show confirm dialog "Wijzigingen niet opgeslagen, doorgaan?"
8. **Given** user makes no changes **When** user clicks "Cancel" **Then** modal closes immediately

**Technical Implementation:**

**Component:** `AssortmentEditForm.tsx`  
**Location:** `frontend/src/features/assortment/components/`  

**Props:**
```typescript
interface AssortmentEditFormProps {
  product: AssortmentMasterDetail;
  onSuccess: () => void; // Close modal + refresh
  onCancel: () => void;
}
```

**Dependencies:**
- `useUpdateAssortmentProduct()` hook (already exists)
- `useState` for form state + dirty tracking
- Radix UI Dialog

**API Integration:**
- PUT `/api/v1/assortment/products/{id}`
- Request: `{ name?, description?, is_active? }`
- Error handling: 404, 400 (validation), 401

**Form Fields:**
- Name: text input (required, max 200 chars)
- Description: textarea (optional, max 500 chars)
- Is Active: toggle switch (boolean)

**UI/UX Requirements:**
- Modal overlay (reuse Dialog)
- Header: "Product bewerken"
- Form fields with labels
- Inline validation errors
- Loading state on submit (disabled button + spinner)
- Cancel + Save buttons
- Dirty state tracking for unsaved changes warning

**Testing:**
- Unit tests:
  - Form pre-fills with current values
  - Validation works (empty name, too long)
  - Dirty tracking works
  - Cancel with changes shows confirm
- Integration tests:
  - Submit success → API called, toast shown, modal closes
  - Submit failure → error displayed in form
  - Cancel → modal closes

**Effort:** 6 hours  
**Priority:** HIGH  
**Dependencies:** ASS-UI-DET-001 (edit button in detail modal)

---

### Slice 3: ASS-UI-DEL-001 - Assortment Delete Dialog

**Domain:** assortment  
**Epic:** product_management  
**Feature:** delete_product  
**Slice ID:** ASS-UI-DEL-001

**User Story:**
Als gebruiker wil ik een product uit mijn assortiment kunnen verwijderen (soft delete) zodat ik producten kan opschonen die ik niet meer wil gebruiken.

**Acceptance Criteria:**
1. **Given** user opens detail modal **When** user clicks "Delete" button **Then** confirmation dialog opens
2. **Given** confirmation dialog is open **When** dialog renders **Then** show product name + warning message
3. **Given** confirmation dialog is open **When** user clicks "Cancel" **Then** dialog closes, detail modal remains open
4. **Given** user clicks "Delete" **When** request succeeds **Then** toast shows "Product verwijderd", both modals close, grid refreshes (product disappears if filter=active)
5. **Given** delete request fails **When** API returns error **Then** show error toast, keep dialog open
6. **Given** product has >10 variants **When** dialog renders **Then** show additional warning "Dit verwijdert ook X variants"

**Technical Implementation:**

**Component:** `AssortmentDeleteDialog.tsx`  
**Location:** `frontend/src/features/assortment/components/`  

**Props:**
```typescript
interface AssortmentDeleteDialogProps {
  product: { id: string; name: string; variant_count: number };
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Dependencies:**
- `useDeleteAssortmentProduct()` hook (already exists)
- Radix UI AlertDialog (destructive variant)
- Lucide icons: AlertTriangle

**API Integration:**
- DELETE `/api/v1/assortment/products/{id}`
- Response: 204 No Content
- Error handling: 404, 401

**UI/UX Requirements:**
- AlertDialog overlay (destructive red theme)
- Icon: Warning triangle
- Title: "Product verwijderen?"
- Message: 
  ```
  Weet je zeker dat je "{product.name}" wilt verwijderen?
  Dit verwijdert ook {variant_count} variants.
  Deze actie kan niet ongedaan gemaakt worden.
  ```
- Buttons: "Annuleren" (default) + "Verwijderen" (destructive red)
- Loading state during delete

**Testing:**
- Unit tests:
  - Dialog renders with product name
  - Cancel closes dialog
  - Confirm triggers onConfirm callback
- Integration tests:
  - Delete success → product removed from grid
  - Delete failure → error toast shown
  - Product with many variants shows warning

**Effort:** 3 hours  
**Priority:** MEDIUM (Nice-to-have for MVP)  
**Dependencies:** ASS-UI-DET-001 (delete button in detail modal)

---

### Slice 4: ASS-UI-FIL-001 - Enhanced Filters

**Domain:** assortment  
**Epic:** product_management  
**Feature:** filter_products  
**Slice ID:** ASS-UI-FIL-001

**User Story:**
Als gebruiker wil ik kunnen filteren op actief/inactief, brand, category, en search zodat ik snel specifieke producten in mijn assortiment kan vinden.

**Acceptance Criteria:**
1. **Given** user is on AssortimentPage **When** page loads **Then** show filter sidebar (collapsed on mobile)
2. **Given** user types in search **When** debounced 300ms **Then** grid updates with matching products
3. **Given** user toggles "Toon inactieve" **When** clicked **Then** grid shows both active + inactive products
4. **Given** user selects brand filter **When** brand radio selected **Then** grid shows only that brand
5. **Given** user selects category filter **When** category radio selected **Then** grid shows only that category
6. **Given** multiple filters active **When** "Wis filters" clicked **Then** all filters reset to default
7. **Given** no results match filters **When** grid empty **Then** show "Geen producten gevonden met deze filters"

**Technical Implementation:**

**Component Enhancement:** Update `AssortimentPage.tsx`  
**Location:** `frontend/src/pages/AssortimentPage.tsx`  

**New Sub-Components:**
- `AssortmentFilterSidebar.tsx` (reuse pattern from supplier-catalog FilterSidebar)
- `SearchBar.tsx` (reuse from supplier-catalog)

**Dependencies:**
- Existing `useAssortmentProducts(filters)` hook
- Debounce utility (use-debounce library or custom hook)
- Filter options API (GET `/api/v1/assortment/filters` - **NEW BACKEND ENDPOINT NEEDED**)

**API Integration:**
- **NEW:** GET `/api/v1/assortment/filters` → Returns `{ brands: FilterOption[], categories: FilterOption[] }`
- Existing: GET `/api/v1/assortment/products?search=...&brand_id=...&category_id=...&is_active=...`

**UI/UX Requirements:**
- Left sidebar (hidden on mobile, slide-in drawer)
- Search bar at top
- Filter sections: Brand (radio), Category (radio), Status (checkbox)
- "Clear all" button when filters active
- Mobile: Floating "Filters" button opens drawer
- Filter counts: Show "(12)" next to each brand/category

**Testing:**
- Unit tests:
  - Search debounce works
  - Filter changes update URL params
  - Clear all resets state
- Integration tests:
  - Search → grid updates
  - Brand filter → grid updates
  - Multiple filters → combined query

**Effort:** 8 hours (includes NEW backend filter endpoint)  
**Priority:** MEDIUM (Can be phased: search + active/inactive first, brand/category later)  
**Dependencies:** None for basic search, NEW backend endpoint for brand/category filters

**NOTE:** For MVP, can implement only search + active/inactive toggle. Brand/category filters require new backend endpoint.

---

### Slice 5: ASS-UI-INT-001 - Grid Interaction Polish

**Domain:** assortment  
**Epic:** product_management  
**Feature:** grid_navigation  
**Slice ID:** ASS-UI-INT-001

**User Story:**
Als gebruiker wil ik een smooth ervaring bij het navigeren door producten met keyboard support, loading states, en error recovery zodat de app professioneel aanvoelt.

**Acceptance Criteria:**
1. **Given** grid is loading **When** page loads **Then** show loading skeleton (8 cards)
2. **Given** grid has products **When** user hovers card **Then** show subtle hover effect + arrow icon
3. **Given** grid has products **When** user presses Enter/Space on focused card **Then** open detail modal
4. **Given** grid is empty **When** no products match **Then** show empty state with "Browse Supplier Catalogs" link
5. **Given** API call fails **When** error occurs **Then** show error banner with "Retry" button
6. **Given** user performs action (edit/delete) **When** success **Then** show toast notification (3s auto-dismiss)
7. **Given** pagination exists **When** user changes page **Then** scroll to top of grid

**Technical Implementation:**

**Component Enhancement:** Polish `AssortmentProductGrid.tsx` and `AssortmentProductCard.tsx`  

**Changes:**
- Add keyboard navigation (already partially implemented)
- Add hover states
- Improve loading skeleton
- Add error boundary
- Add empty state with call-to-action
- Add scroll-to-top on pagination

**Dependencies:**
- React Router Link for "Browse Catalogs" link
- Error boundary (create generic `ErrorBoundary.tsx` if not exists)

**UI/UX Requirements:**
- Smooth transitions (transition-all duration-200)
- Accessible focus states (focus:ring-2 focus:ring-blue-500)
- Loading skeletons match final card layout
- Empty state includes icon + heading + description + CTA link
- Error banner: Yellow warning stripe at top with reload button

**Testing:**
- Unit tests:
  - Loading state renders correctly
  - Empty state renders with link
  - Error state renders with retry
- Accessibility tests:
  - Keyboard navigation works
  - Focus trap in modals
  - ARIA labels correct
- E2E tests:
  - Click card → modal opens
  - Pagination → page changes

**Effort:** 4 hours  
**Priority:** LOW (Polish, not MVP critical)  
**Dependencies:** All previous slices (integrates everything)

---

## 🔄 Implementation Sequence

### Phase 1: Core Functionality (MVP Critical)
**Time: 2 days**

1. **ASS-UI-DET-001** (4h) - Detail Modal  
   *Why first:* Enables viewing products, required for edit/delete buttons

2. **ASS-UI-EDT-001** (6h) - Edit Form  
   *Why second:* Most requested feature, builds on detail modal

3. **ASS-UI-DEL-001** (3h) - Delete Dialog  
   *Why third:* Completes CRUD operations

**Checkpoint:** User can view, edit, delete assortment products

---

### Phase 2: Improved Discovery (Nice-to-Have)
**Time: 1 day**

4. **ASS-UI-FIL-001** (8h) - Enhanced Filters (PARTIAL: search + active/inactive only)  
   *Why deferred:* Brand/category filters need new backend endpoint (can be added later)

**Checkpoint:** User can search and filter between active/inactive

---

### Phase 3: Polish (Future Sprint)
**Time: 0.5 day**

5. **ASS-UI-INT-001** (4h) - Grid Polish  
   *Why last:* UX improvements, not blocking functionality

**Checkpoint:** Production-ready UI

---

## ✅ Definition of Done

### Per Slice:
- [ ] All acceptance criteria met
- [ ] Component < 150 lines (or decomposed)
- [ ] TypeScript types defined
- [ ] Unit tests written (minimum: happy path + error case)
- [ ] Integration tests for API calls
- [ ] No console errors/warnings
- [ ] Responsive (mobile + desktop tested)
- [ ] Accessible (keyboard nav + ARIA labels)
- [ ] Code reviewed by team

### For Full Feature:
- [ ] E2E test: Full CRUD flow (promote → view → edit → delete)
- [ ] Documentation updated (if needed)
- [ ] PO acceptance: Feature demo validated
- [ ] Performance: Grid loads <1s for 100 products
- [ ] Error handling: All API errors show user-friendly messages

---

## ⚠️ Risk Assessment

### Risk 1: Component Complexity Creep
**Description:** AssortimentPage could grow beyond 150 lines with all features  
**Likelihood:** HIGH  
**Impact:** MEDIUM  
**Mitigation:**  
- Decompose into sub-components (FilterSidebar, SearchBar, EmptyState, ErrorBanner)
- Keep page component as orchestrator only (< 100 lines)
- Move business logic to hooks

### Risk 2: Backend Filter Endpoint Missing
**Description:** Brand/category filters need new backend endpoint (`GET /api/v1/assortment/filters`)  
**Likelihood:** CERTAIN (confirmed not implemented)  
**Impact:** MEDIUM (blocks full filter functionality)  
**Mitigation:**  
- Phase filter implementation: search + active/inactive first (uses existing params)
- Backend team implements filter endpoint in parallel
- Frontend ready to integrate when available

### Risk 3: State Management Complexity
**Description:** Multiple modals + edit states could cause state bugs  
**Likelihood:** MEDIUM  
**Impact:** MEDIUM  
**Mitigation:**  
- Use React Query cache invalidation (already setup in hooks)
- Single source of truth: server state via useAssortmentDetail
- Local state only for modal open/close

### Risk 4: Variant Table Performance
**Description:** Products with 1000+ variants could slow modal rendering  
**Likelihood:** LOW (backend limits to 50)  
**Impact:** LOW  
**Mitigation:**  
- Backend already returns max 50 variants with `has_more_variants` flag
- Frontend shows "Showing first 50" message
- Future: Virtual scrolling if needed

### Risk 5: Delete Cascade Confusion
**Description:** Users might not understand soft delete vs hard delete  
**Likelihood:** MEDIUM  
**Impact:** LOW  
**Mitigation:**  
- Clear messaging in delete dialog: "Dit deactiveert het product"
- Explain soft delete in tooltip/help text
- Future: Add "Permanently delete" for admins only

---

## 📊 Estimated Total Effort

### MVP (Phase 1 + 2):
- **Phase 1 (Core CRUD):** 13 hours = ~2 days
- **Phase 2 (Basic Filters):** 8 hours = ~1 day
- **Total MVP:** ~3 days (1 fullstack developer)

### Full Implementation (Phase 1 + 2 + 3):
- **Total with Polish:** ~3.5 days

### Parallel Work Opportunities:
- Backend filter endpoint can be developed in parallel (not blocking Phase 1)
- Design system components (Dialog, AlertDialog) already exist (Radix UI)

---

## 📝 Backend Work Required

### Existing Endpoints (Already Done):
- ✅ GET `/api/v1/assortment/products`
- ✅ GET `/api/v1/assortment/products/{id}`
- ✅ PUT `/api/v1/assortment/products/{id}`
- ✅ DELETE `/api/v1/assortment/products/{id}`
- ✅ POST `/api/v1/assortment/promotion/promote`
- ✅ GET `/api/v1/assortment/promotion/check`

### New Backend Work Needed:
- 🔴 GET `/api/v1/assortment/filters` - Returns `{ brands: [], categories: [] }` with counts
  - **Effort:** 2 hours
  - **Priority:** MEDIUM (blocks full filter experience)
  - **Can be deferred:** Yes, Phase 1-2 works without this

---

## 🎨 Component Reuse Map

| Component | Source | Reuse Strategy |
|-----------|--------|---------------|
| Dialog/AlertDialog | `@/components/ui/dialog` | ✅ Radix UI already installed |
| ProductCardContent | `supplier-catalog/browse` | ✅ Already used in AssortmentProductCard |
| ToastNotification | `supplier-catalog/browse` | ✅ Reuse pattern, maybe extract to `@/components/ui` |
| SpinnerIcon | `supplier-catalog/browse` | ✅ Reuse or use Lucide Loader2 |
| FilterSidebar | `supplier-catalog/browse` | 🔄 Adapt for assortment filters |
| SearchBar | `supplier-catalog/browse` | ✅ Direct reuse with prop changes |

**Recommendation:** Extract `ToastNotification` and `SpinnerIcon` to `frontend/src/components/ui/` for global reuse.

---

## 🚦 Go/No-Go Decision Points

### Before Starting Phase 1:
- [ ] PO approval on user stories
- [ ] Design mockups reviewed (or approval to use supplier-catalog pattern)
- [ ] Backend endpoints confirmed working (run backend tests)

### Before Starting Phase 2:
- [ ] Phase 1 E2E test passing
- [ ] Decision: Implement full filters now or defer to next sprint?

### Before Starting Phase 3:
- [ ] User feedback on MVP collected
- [ ] Performance benchmarks met (grid loads < 1s)

---

## 📚 Related Documentation

- Backend API: `backend/src/domains/assortment/master/product_lifecycle/README.md`
- Backend Tests: `backend/tests/assortment/test_assortment_service.py`
- Frontend Patterns: `.github/copilot/FRONTEND_GUIDE.md`
- DDD Guide: `.ai/company/DDD_GUIDE.md`
- Domain Registry: `.ai/project/DOMAIN_REGISTRY.yaml` (lines 689-800)

---

## 🎯 Success Metrics

### Technical Metrics:
- Grid load time: < 1 second for 100 products
- Modal open time: < 300ms
- Test coverage: > 80% for new components
- Bundle size increase: < 50kb

### User Metrics:
- Task completion time: View product detail < 5 seconds
- Task completion time: Edit product < 10 seconds
- Error rate: < 1% on CRUD operations
- User satisfaction: "Can easily manage my assortment" (qualitative)

---

## 🔄 Future Enhancements (Out of Scope for MVP)

1. **Bulk Operations**
   - Multi-select products for bulk activate/deactivate
   - Bulk delete

2. **Advanced Filters**
   - Filter by promoted date range
   - Filter by variant count
   - Custom filter combinations

3. **Sorting**
   - Sort by name, promoted date, variant count
   - Save sort preferences

4. **Export**
   - Export filtered list to Excel
   - Print product labels

5. **Product History**
   - Show edit history (who changed what when)
   - Show promotion history (from which supplier)

6. **Quick Actions**
   - Inline edit (edit name without opening modal)
   - Quick toggle active/inactive from card

---

## ✅ Approval & Sign-Off

**Reviewed by:**
- [ ] Product Owner: _____________________
- [ ] Tech Lead: _____________________
- [ ] Backend Developer: _____________________ (for filter endpoint)
- [ ] QA Lead: _____________________

**Approved for Implementation:** ☐ YES ☐ NO ☐ NEEDS REVISION

**Notes:**
```
[Space for review comments]
```

---

**END OF IMPLEMENTATION PLAN**

_Last Updated: 2025-12-20_  
_Version: 1.0 - Initial Draft_

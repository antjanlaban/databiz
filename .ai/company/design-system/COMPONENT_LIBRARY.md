# Component Library Specifications

> **Philosophy**: Consistent, reusable, and accessible components built with Tailwind CSS.
> **React Library**: Radix UI (Primitives) + Tailwind CSS (Styling).

---

## 1. Buttons
**Style**: Rounded (Standard)
**Border Radius**: `rounded-md` (6px)

### Variants
*   **Primary**: `bg-primary-600 text-white hover:bg-primary-700`
*   **Secondary**: `bg-surface-active text-text-primary hover:bg-surface-hover`
*   **Ghost**: `bg-transparent text-text-secondary hover:bg-surface-active hover:text-text-primary`
*   **Destructive**: `bg-red-600 text-white hover:bg-red-700`

### Sizes
*   **Small**: `h-8 px-3 text-xs`
*   **Medium**: `h-10 px-4 text-sm` (Default)
*   **Large**: `h-12 px-6 text-base`

---

## 2. Form Inputs
**Style**: Filled (Material Style)
**Background**: Light Gray / Surface Active
**Border**: None (until focus)

### Implementation
```html
<input class="
  h-10 w-full rounded-md 
  bg-surface-active px-3 text-sm text-text-primary placeholder-text-tertiary
  border-transparent focus:border-primary-500 focus:bg-surface focus:ring-2 focus:ring-primary-500/20
  transition-colors
" />
```

*   **Default**: `bg-surface-active` (e.g., `bg-slate-100` in light, `bg-slate-800` in dark)
*   **Hover**: `hover:bg-surface-hover`
*   **Focus**: `bg-surface` (White/Dark Gray) + Brand Border + Ring

---

## 3. Cards & Containers
**Style**: Flat + Border
**Elevation**: None (No Shadow)

### Implementation
```html
<div class="rounded-lg border border-border bg-surface p-6">
  <!-- Content -->
</div>
```

*   **Background**: `bg-surface` (White in light, Slate-900 in dark)
*   **Border**: `border-border` (Slate-200 in light, Slate-700 in dark)
*   **Radius**: `rounded-lg` (8px)

---

## 4. Navigation Structure
**Layout**: Sidebar (Vertical Left)

### Sidebar Specs
*   **Width**: `w-64` (256px)
*   **Position**: Fixed Left (`fixed inset-y-0 left-0`)
*   **Styling**: `border-r border-border bg-surface`
*   **Content**:
    *   Logo (Top)
    *   Primary Navigation (Middle)
    *   User Profile / Settings (Bottom)

### Mobile Responsiveness
*   **Desktop**: Visible Sidebar
*   **Mobile**: Hidden Sidebar + Hamburger Menu (Slide-over Sheet)

---

## 5. Status Badges
**Style**: Soft Background + Colored Text (`bg-opacity-10`)

*   **Success**: `bg-green-500/10 text-green-700 dark:text-green-400`
*   **Warning**: `bg-yellow-500/10 text-yellow-700 dark:text-yellow-400`
*   **Error**: `bg-red-500/10 text-red-700 dark:text-red-400`
*   **Neutral**: `bg-slate-500/10 text-slate-700 dark:text-slate-400`
*   **Shape**: `rounded-full px-2.5 py-0.5 text-xs font-medium`

# Spacing & Layout System

> **Base Unit**: 4px (0.25rem)
> **Grid System**: Tailwind CSS Default
> **Strategy**: Hybrid Layout (Centered Content / Full-Width Data)

---

## 1. Spacing Scale

We use the standard Tailwind spacing scale based on the 4px grid.

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| `0.5` | 0.125rem | 2px | Minimal adjustments |
| `1` | 0.25rem | 4px | Tight grouping |
| `2` | 0.5rem | 8px | Icon spacing, tight lists |
| `3` | 0.75rem | 12px | Small gaps |
| `4` | 1rem | 16px | **Standard Gap** (Luchtig), Input padding |
| `6` | 1.5rem | 24px | **Card Padding** (Comfortabel) |
| `8` | 2rem | 32px | Section spacing |
| `12` | 3rem | 48px | Major section breaks |
| `16` | 4rem | 64px | Page margins |

---

## 2. Layout Strategy (Hybrid)

We use a **Hybrid Layout** approach depending on the page content type.

### Type A: Content Pages (Forms, Settings, Documentation)
**Goal**: Readability and focus.
- **Container**: `max-w-5xl` (1024px) or `max-w-3xl` (768px) for pure text.
- **Alignment**: Centered (`mx-auto`).
- **Padding**: `px-4 sm:px-6 lg:px-8`.

### Type B: Data Pages (Tables, Dashboards, Kanban)
**Goal**: Maximize screen real estate for data density.
- **Container**: `w-full` (Full Width).
- **Padding**: `px-4 sm:px-6 lg:px-8`.
- **Responsive**: Horizontal scrolling for tables on small screens.

---

## 3. Component Spacing

### Cards
- **Padding**: `p-6` (24px) - *Comfortable spacing*.
- **Gap**: `gap-6` between stacked cards.

### Lists & Grids
- **Gap**: `gap-4` (16px) - *Luchtig spacing* between items.
- **Grid Columns**:
    - Mobile: 1 col
    - Tablet: 2 cols
    - Desktop: 3 or 4 cols

### Form Layouts
- **Field Spacing**: `space-y-6` (24px) between distinct fields.
- **Label Spacing**: `mb-2` (8px) between label and input.
- **Action Bar**: `mt-8` (32px) spacing above submit buttons.

---

## 4. Agent Rules for Layout

1.  **Use the Scale**: Never use arbitrary pixels (e.g., `margin: 13px`). Use `m-3` or `m-4`.
2.  **Responsive Padding**: Always include horizontal padding on containers (`px-4`) to prevent content touching screen edges on mobile.
3.  **Consistent Gaps**: Use `gap-4` as the default for lists and button groups.
4.  **Vertical Rhythm**: Use `space-y-*` utilities to manage vertical spacing between stacked elements.

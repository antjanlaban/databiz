# Color System (Dark Mode First)

> **Strategy**: This system uses **Semantic Tokens** mapped to **Tailwind CSS** palettes.
> **Default Mode**: Dark Mode 🌑 (Light mode is an optional override).

---

## 1. Project Inheritance (The "Chameleon" Rule)

The **Primary Brand Color** is NOT defined here. It is injected by the Project Layer.
Agents must use the semantic token `primary` which resolves to the project's specific hue.

| Token | Tailwind Class | Description |
|-------|----------------|-------------|
| `primary` | `bg-primary` / `text-primary` | The main brand color (defined in Project Layer) |
| `primary-foreground` | `text-primary-foreground` | Text color on top of primary (usually white or black) |

---

## 2. Neutral Palette (Slate)

We use **Tailwind Slate** for a professional, slightly cool grey that reduces eye strain in dark mode compared to pure black/grey.

| Semantic Token | Dark Mode (Default) 🌑 | Light Mode (Optional) ☀️ | Usage |
|----------------|------------------------|--------------------------|-------|
| `background` | `bg-slate-950` | `bg-white` | Page background |
| `surface` | `bg-slate-900` | `bg-slate-50` | Cards, Sidebars, Modals |
| `surface-highlight` | `bg-slate-800` | `bg-slate-100` | Hover states, Active items |
| `border` | `border-slate-800` | `border-slate-200` | Dividers, Inputs |
| `text-main` | `text-slate-50` | `text-slate-900` | Headings, Body text |
| `text-muted` | `text-slate-400` | `text-slate-500` | Secondary text, Labels |

---

## 3. Semantic Status Colors (Business Standard)

Standardized colors for feedback and status. These remain consistent across all projects to ensure usability.

### ✅ Success (Emerald)
Used for: Completed actions, positive trends, "In Stock".
- **Base**: `text-emerald-400` (Dark) / `text-emerald-600` (Light)
- **Background**: `bg-emerald-500/10` (Subtle tint)
- **Border**: `border-emerald-500/20`

### ⚠️ Warning (Amber)
Used for: Non-blocking errors, "Low Stock", attention needed.
- **Base**: `text-amber-400` (Dark) / `text-amber-600` (Light)
- **Background**: `bg-amber-500/10`
- **Border**: `border-amber-500/20`

### 🚨 Error (Rose)
Used for: Critical failures, destructive actions, validation errors.
- **Base**: `text-rose-400` (Dark) / `text-rose-600` (Light)
- **Background**: `bg-rose-500/10`
- **Border**: `border-rose-500/20`

### ℹ️ Info (Sky)
Used for: Neutral information, help tips, "Processing".
- **Base**: `text-sky-400` (Dark) / `text-sky-600` (Light)
- **Background**: `bg-sky-500/10`
- **Border**: `border-sky-500/20`

---

## 4. Agent Rules for Colors

1.  **NEVER use Hex Codes**: Do not write `#1e293b`. Use `bg-slate-800`.
2.  **NEVER hardcode Primary**: Do not use `bg-blue-600`. Use `bg-primary`.
3.  **Dark Mode Default**: Write classes assuming dark mode first.
    *   *Bad*: `bg-white text-black dark:bg-slate-950 dark:text-white`
    *   *Good*: `bg-slate-950 text-slate-50 light:bg-white light:text-slate-900`
4.  **Contrast Check**: Ensure `text-muted` is readable on `surface` (WCAG AA).

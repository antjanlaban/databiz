# Typography System

> **Font Family**: Inter (Sans-serif) & JetBrains Mono/Fira Code (Monospace)
> **Base Size**: 16px (1rem)
> **Scale**: Tailwind CSS Default

---

## 1. Font Families

| Type | Font Stack | Tailwind Class | Usage |
|------|------------|----------------|-------|
| **Sans** | Inter, system-ui, sans-serif | `font-sans` | UI, Headings, Body |
| **Mono** | ui-monospace, SFMono-Regular, monospace | `font-mono` | IDs, Code, SKU numbers |

---

## 2. Scale & Hierarchy

We follow the standard Tailwind type scale.

| Level | Size | Line Height | Tailwind Class | Usage |
|-------|------|-------------|----------------|-------|
| **H1** | 2.25rem (36px) | 2.5rem (40px) | `text-4xl font-bold tracking-tight` | Page Titles |
| **H2** | 1.875rem (30px) | 2.25rem (36px) | `text-3xl font-semibold tracking-tight` | Section Headings |
| **H3** | 1.5rem (24px) | 2rem (32px) | `text-2xl font-semibold` | Card Titles, Modal Headers |
| **H4** | 1.25rem (20px) | 1.75rem (28px) | `text-xl font-medium` | Subsections |
| **Body** | 1rem (16px) | 1.5rem (24px) | `text-base font-normal` | Standard content |
| **Small** | 0.875rem (14px) | 1.25rem (20px) | `text-sm font-normal` | Table data, Form labels |
| **Tiny** | 0.75rem (12px) | 1rem (16px) | `text-xs font-medium` | Badges, Captions, Help text |

---

## 3. Font Weights

| Weight | Value | Tailwind Class | Usage |
|--------|-------|----------------|-------|
| **Regular** | 400 | `font-normal` | Body text, paragraphs |
| **Medium** | 500 | `font-medium` | Labels, Buttons, Navigation |
| **Semibold** | 600 | `font-semibold` | Subheadings, Emphasized data |
| **Bold** | 700 | `font-bold` | Main Headings (H1) |

---

## 4. Agent Rules for Typography

1.  **Use Semantic Tags**: Always use `<h1>` through `<h6>` for headings, not just divs with classes.
2.  **Readable Widths**: Limit line length to ~65 characters for long text blocks (`max-w-prose`).
3.  **Data Density**: Use `text-sm` for data-heavy components like Tables and Lists.
4.  **Contrast**: Ensure text color meets WCAG AA against the background (check `colors.md`).
5.  **Tracking**: Use `tracking-tight` on H1 and H2 for a modern, tighter look.

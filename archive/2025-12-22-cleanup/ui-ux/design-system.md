# Design System

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Design system voor Van Kruiningen PIM - gebaseerd op bedrijfsidentiteit met focus op **data-intensive UI** en **efficiënte workflows**.

**Design Philosophy:**

- **Data-first:** Maximale ruimte voor tabellen, lijsten, overzichten
- **Efficiency:** Minimale decoratie, maximale functionaliteit
- **Consistency:** shadcn/ui components, Tailwind utilities
- **Brand integration:** Van Kruiningen kleuren en logo subtiel toegepast

---

## Brand Colors

**From Logo:** Diagonale strepen in blauw, groen, oranje

### Primary Palette

```css
/* Primary - Blauw (dominant in logo) */
--vk-blue-50: #E6F5FC;
--vk-blue-100: #CCE9F9;
--vk-blue-500: #0097D7;  /* Main brand blue */
--vk-blue-600: #0086C2;
--vk-blue-700: #0075AD;
--vk-blue-900: #004D73;

/* Secondary - Groen (accent in logo) */
--vk-green-50: #E6F7ED;
--vk-green-100: #CCEFDB;
--vk-green-500: #009639;  /* Main brand green */
--vk-green-600: #008532;
--vk-green-700: #00742B;

/* Accent - Oranje (highlight in logo) */
--vk-orange-50: #FFF3E6;
--vk-orange-100: #FFE7CC;
--vk-orange-500: #FF8200;  /* Main brand orange */
--vk-orange-600: #E67500;
--vk-orange-700: #CC6800;
```

### Usage Guidelines

| Color      | Usage                                 | Example                    |
| ---------- | ------------------------------------- | -------------------------- |
| Blue-500   | Primary actions, links, active states | Buttons, nav active        |
| Green-500  | Success states, confirmations         | Success toasts, checkmarks |
| Orange-500 | Warnings, highlights, CTAs            | Important actions, alerts  |
| Gray       | Neutral UI, backgrounds, borders      | Tables, cards, dividers    |

---

## Theme: Dark Mode (Default)

**Background Philosophy:** Dark mode default voor data-intensive app - minder oogvermoeidheid bij lange werk sessies.

### Dark Mode Colors

```css
/* Backgrounds */
--bg-primary: #0A0A0B;        /* Main background */
--bg-secondary: #141416;      /* Cards, panels */
--bg-tertiary: #1E1E21;       /* Hover states, elevated */
--bg-elevated: #26262A;       /* Modals, dropdowns */

/* Text */
--text-primary: #FFFFFF;      /* Headings, important */
--text-secondary: #B8B8BC;    /* Body text */
--text-tertiary: #86868B;     /* Subtle text, placeholders */
--text-disabled: #545458;     /* Disabled states */

/* Borders */
--border-primary: #2C2C2F;    /* Default borders */
--border-secondary: #3A3A3E;  /* Hover borders */
--border-accent: #0097D7;     /* Focus borders (blue) */

/* Interactive */
--interactive-hover: rgba(255, 255, 255, 0.05);
--interactive-active: rgba(255, 255, 255, 0.08);
--interactive-disabled: rgba(255, 255, 255, 0.02);
```

**Implementation (Tailwind):**

```javascript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vk: {
          blue: { 500: '#0097D7', 600: '#0086C2' },
          green: { 500: '#009639', 600: '#008532' },
          orange: { 500: '#FF8200', 600: '#E67500' }
        },
        background: {
          DEFAULT: '#0A0A0B',
          secondary: '#141416',
          tertiary: '#1E1E21',
          elevated: '#26262A'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B8B8BC',
          tertiary: '#86868B'
        }
      }
    }
  }
}
```

---

## Theme: Light Mode

### Light Mode Colors

```css
/* Backgrounds */
--bg-primary: #FFFFFF;        /* Main background */
--bg-secondary: #F8F8F8;      /* Cards, panels */
--bg-tertiary: #F0F0F0;       /* Hover states */
--bg-elevated: #FFFFFF;       /* Modals, dropdowns (elevated) */

/* Text */
--text-primary: #0A0A0B;      /* Headings, important */
--text-secondary: #525252;    /* Body text */
--text-tertiary: #737373;     /* Subtle text */
--text-disabled: #A3A3A3;     /* Disabled states */

/* Borders */
--border-primary: #E5E5E5;    /* Default borders */
--border-secondary: #D4D4D4;  /* Hover borders */
--border-accent: #0097D7;     /* Focus borders (blue) */

/* Interactive */
--interactive-hover: rgba(0, 0, 0, 0.03);
--interactive-active: rgba(0, 0, 0, 0.06);
--interactive-disabled: rgba(0, 0, 0, 0.01);
```

---

## Typography

**Font Stack:** System fonts voor snelheid en leesbaarheid

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
             'Helvetica Neue', sans-serif;
```

### Type Scale

| Style   | Size | Weight | Line Height | Usage               |
| ------- | ---- | ------ | ----------- | ------------------- |
| Display | 36px | 700    | 1.2         | Page titles (rare)  |
| H1      | 28px | 600    | 1.3         | Section headers     |
| H2      | 22px | 600    | 1.4         | Subsection headers  |
| H3      | 18px | 600    | 1.4         | Card titles         |
| Body    | 14px | 400    | 1.5         | Default text        |
| Small   | 12px | 400    | 1.4         | Captions, metadata  |
| Tiny    | 11px | 400    | 1.3         | Table cells, labels |

**Rationale:** Kleinere base font (14px) = meer data per screen, essentieel voor PIM.

---

## Spacing System

**8px base unit** voor consistency

```
0.5 = 4px   (tight spacing)
1   = 8px   (default)
2   = 16px  (comfortable)
3   = 24px  (section spacing)
4   = 32px  (large gaps)
6   = 48px  (page sections)
8   = 64px  (rare, hero sections)
```

**Component Spacing:**

- Table row padding: 8px vertical, 12px horizontal
- Card padding: 16px
- Modal padding: 24px
- Page margin: 24px

---

## Screen Size Requirements

**Desktop-Only Application**

Van Kruiningen PIM is ontworpen als een **desktop-only** tool vanwege de complexiteit van data-intensieve workflows zoals import mapping, bulk editing, en multi-column tabellen.

**Minimum Requirements:**
- Screen width: **≥ 1280px** (lg breakpoint)
- Recommended: **≥ 1440px** voor optimale gebruikservaring
- Browser: Modern desktop browsers (Chrome, Firefox, Safari, Edge)

**Why Desktop-Only?**
- Import mapping vereist side-by-side kolom preview
- Product tabellen tonen 10+ kolommen tegelijk
- Bulk operations gebruiken complex multi-select UI
- Decoration configuratie heeft detailrijke formulieren

**Fallback voor kleine schermen:**
Een melding wordt getoond op schermen < 1280px:
> "Van Kruiningen PIM vereist een desktop scherm (minimaal 1280px breed). De applicatie is niet geschikt voor tablets of mobiele apparaten."

---

## Layout Structure

**Primary Layout Pattern:**

```
┌─────────────────────────────────────────┐
│ Header (60px)                           │
│ Logo + Title + User Menu                │
├─────────────────────────────────────────┤
│ Sidebar    │ Main Content               │
│ (240px)    │ (flexible, min 1040px)     │
│            │                             │
│ Navigation │ Page Header (80px)         │
│            │ Title + Actions             │
│            │                             │
│            │ Content Area                │
│            │ Tables, forms, wizards      │
│            │                             │
└─────────────────────────────────────────┘
```

**Collapsed Sidebar (user preference):**
- Sidebar = 60px (icons only)
- Main content = full width - 60px
- Triggers: Manual toggle + auto-hide on hover

---

## Components

### Buttons

**Variants:**

**Primary (Blue):**

```tsx
<Button variant="default" className="bg-vk-blue-500 hover:bg-vk-blue-600">
  Opslaan
</Button>
```

**Success (Green):**

```tsx
<Button variant="default" className="bg-vk-green-500 hover:bg-vk-green-600">
  Importeren
</Button>
```

**Warning (Orange):**

```tsx
<Button variant="default" className="bg-vk-orange-500 hover:bg-vk-orange-600">
  Sync Gripp
</Button>
```

**Sizes:**

- sm: h-8 px-3 text-xs (table actions)
- default: h-10 px-4 text-sm (forms)
- lg: h-12 px-6 text-base (CTAs)

---

### Tables

**Critical Component** - most screen time in PIM.

**Design Principles:**

- Compact row height (36px)
- Sticky headers
- Zebra striping (subtle)
- Inline actions (hover reveals)
- Sortable columns (icon indicators)

**Dark Mode Example:**

```tsx
<Table className="text-tiny">
  <TableHeader className="sticky top-0 bg-background-secondary">
    <TableRow className="border-b border-border-primary">
      <TableHead className="h-10">SKU Code</TableHead>
      <TableHead>Product Naam</TableHead>
      <TableHead>Merk</TableHead>
      <TableHead className="text-right">Prijs</TableHead>
      <TableHead className="text-right">Voorraad</TableHead>
      <TableHead className="w-[80px]"></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-interactive-hover border-b border-border-primary">
      <TableCell className="font-mono">PRO-WB-001</TableCell>
      <TableCell>Werkbroek Professional</TableCell>
      <TableCell className="text-text-secondary">Tricorp</TableCell>
      <TableCell className="text-right">€44,95</TableCell>
      <TableCell className="text-right">25</TableCell>
      <TableCell>
        <DropdownMenu>...</DropdownMenu>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Features:**

- Row height: 36px (compact)
- Font: 11px (tiny) for data cells
- Hover: subtle background change
- Actions: right-aligned, icon buttons

---

### Cards

**Minimal decoration** - focus on content.

```tsx
<Card className="border border-border-primary bg-background-secondary">
  <CardHeader className="p-4 border-b border-border-primary">
    <CardTitle className="text-lg">Import Status</CardTitle>
  </CardHeader>
  <CardContent className="p-4">
    {/* Content */}
  </CardContent>
</Card>
```

**Spacing:**

- Header padding: 16px
- Content padding: 16px
- No shadow (flat design)

---

### Forms

**Layout:** Single column, labels above inputs.

```tsx
<Form>
  <FormField>
    <FormLabel className="text-sm font-medium">SKU Code</FormLabel>
    <FormControl>
      <Input
        className="h-10 bg-background-tertiary border-border-primary
                   focus:border-vk-blue-500"
      />
    </FormControl>
    <FormDescription className="text-tiny text-text-tertiary">
      Unieke code, 3-100 karakters
    </FormDescription>
    <FormMessage className="text-tiny text-red-500" />
  </FormField>
</Form>
```

**Input Heights:**

- Input: 40px (h-10)
- Textarea: min 80px
- Select: 40px

---

### Navigation

**Sidebar Navigation:**

```
Logo (top)
─────────
Products
  ├─ List
  └─ Archived
Import
Export
  ├─ Gripp
  ├─ Calculated
  └─ Status
Decorations
─────────
Settings (bottom)
```

**Active State:** Blue left border + blue text

```tsx
<NavLink
  className="flex items-center gap-3 px-4 py-2 text-text-secondary
             hover:text-text-primary hover:bg-interactive-hover
             data-[active]:border-l-2 data-[active]:border-vk-blue-500
             data-[active]:text-vk-blue-500"
>
  <PackageIcon className="w-5 h-5" />
  <span className="text-sm">Producten</span>
</NavLink>
```

---

## Logo Usage

### Primary Logo

- **Location:** Top left sidebar (60px height)
- **Dark mode:** Full color logo (blue/green/orange)
- **Light mode:** Full color logo

### Favicon

- Use "VK" letters from logo
- Size: 32x32px
- Background: Blue (#0097D7)

### Loading States

- Animated diagonal stripes (like logo pattern)
- Colors cycle: blue → green → orange

---

## Status Colors

**Beyond brand colors** - functional states.

| State   | Color      | Usage                           |
| ------- | ---------- | ------------------------------- |
| Success | Green-500  | Import success, sync complete   |
| Warning | Orange-500 | Validation warnings, low stock  |
| Error   | Red-500    | Import failed, validation error |
| Info    | Blue-500   | Informational messages          |
| Neutral | Gray-500   | Default, inactive states        |

---

## Icons

**Library:** Lucide React (consistent with shadcn/ui)

**Size Scale:**

- sm: 16px (w-4 h-4) - inline icons
- default: 20px (w-5 h-5) - nav, buttons
- lg: 24px (w-6 h-6) - headers

**Style:** Outline style (not filled) voor consistency.

---

## Data Visualization

**Charts (via recharts):**

**Color Palette:**

```javascript
const chartColors = {
  primary: '#0097D7',    // Blue
  secondary: '#009639',  // Green
  tertiary: '#FF8200',   // Orange
  quaternary: '#8B5CF6', // Purple (if needed)
  neutral: '#6B7280'     // Gray
};
```

**Chart Types:**

- Bar charts: Voor product counts per merk
- Line charts: Voor price history
- Pie charts: KERN vs RAND verdeling

---

## Accessibility

**WCAG 2.1 Level AA minimum**

**Color Contrast:**

- Text on dark bg: minimum 4.5:1
- Text on light bg: minimum 4.5:1
- Interactive elements: minimum 3:1

**Keyboard Navigation:**

- All interactive elements focusable
- Tab order logical
- Escape closes modals
- Enter submits forms

**Focus Indicators:**

```css
focus-visible:ring-2 ring-vk-blue-500 ring-offset-2 ring-offset-background
```

---

## Motion & Animation

**Principle:** Minimal, purposeful animation.

**Durations:**

- Micro: 100ms (hover states)
- Short: 200ms (dropdowns, tooltips)
- Medium: 300ms (modals, drawers)
- Long: 500ms (page transitions)

**Easing:** ease-in-out (default)

**Examples:**

```css
transition-colors duration-200 ease-in-out
transition-transform duration-300 ease-in-out
```

**Avoid:**

- Decorative animations
- Long transitions (> 500ms)
- Complex keyframe animations

---

## Performance Guidelines

**Images:**

- Logo: SVG preferred (scalable)
- Product images: WebP, max 800x800px
- Lazy load below fold

**Code Splitting:**

- Route-based splitting
- Heavy components (charts) lazy loaded

**Bundle Size:**

- Target: < 200kb initial JS
- Use tree-shaking
- Avoid heavy icon libraries (use Lucide)

---

_Design system evolves with user feedback - practical over pretty._

# Platform Domain - Design Specification

**Domain**: `platform`  
**Description**: Application shell, navigation, theme system, and shared UI framework  
**Tech Stack**: React 19, Tailwind v4, Shadcn/ui, Lucide React  
**Design Philosophy**: Balanced (Data-dense where needed, Minimalistic for focus)

---

## 1. Navigation Structure

### 1.1 Sidebar Menu (8 Items, No Scroll)

```
📦 PRODUCTEN
  • Assortiment    (/products/assortiment)
  • Catalogus      (/products/catalog)

⚡ ACTIES
  • Importeren     (/actions/import)
  • Activeren      (/actions/activate)
  • Promoveren     (/actions/promote)
  • Exporteren     (/actions/export)

🔧 ONDERHOUD
  • Basis          (/maintenance/basis)
  • Werk           (/maintenance/werk)
  • Applicatie     (/maintenance/app)
```

**Navigation Notes:**
- **Zones** = Visual grouping only (not collapsible)
- **Basis/Werk/Applicatie** = Tab pages (not sub-menus)
  - Basis tabs: Leveranciers | Merken | Datasets
  - Werk tabs: Lookups
  - Applicatie tabs: Gebruikers | Rollen

### 1.2 Crosslinking Flows

**Promoveren:**
- Entry: Catalogus page → "Promoveer" button on supplier master
- Flow: Opens promote modal/page
- Exit: Returns to Catalogus after completion

**Activeren:**
- Entry: Onderhoud > Basis (Datasets tab) → "Activeer" button
- Flow: Dataset activation wizard
- Exit: Returns to Datasets tab

**Importeren:**
- Entry: Onderhoud > Basis (Datasets tab) → "Nieuwe Import" button OR Acties > Importeren
- Flow: Upload CSV workflow

**Exporteren:**
- Entry: Assortiment page → "Exporteer" button (in filter toolbar)
- Flow: Export wizard (select type, format, scope)

---

## 2. Layout Specifications

### 2.1 Complete Layout Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] DataBiz                                        👤▼   │  48px Header (fixed)
├──────────┬──────────────────────────────────────────────────┤
│          │ Producten > Catalogus > SKU-12345               │  Breadcrumb (in main)
│ 📦       │ ─────────────────────────────────────────────── │
│ Producten│                                                  │
│  • Ass.. │                                                  │
│  • Cat.. │                                                  │
│          │                                                  │
│ ⚡       │         MAIN CONTENT AREA                        │
│ Acties   │         (Maximum screen space)                   │
│  • Imp.. │                                                  │
│  • Act.. │                                                  │
│  • Pro.. │                                                  │
│  • Exp.. │                                                  │
│          │                                                  │
│ 🔧       │                                                  │
│ Onderhoud│                                                  │
│  • Basis │                                                  │
│  • Werk  │                                                  │
│  • Appl. │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│ 🟢 DB  🟢 API  🟢 S3 │ 🔵 DEV │ ⏳ 2 │ v3.0.0 © 2025      │  32px Footer (fixed)
└─────────────────────────────────────────────────────────────┘
│← 240px →│← Dynamic width (100% - 240px - 32px padding) →│
(Expanded)
```

### 2.2 Responsive Breakpoints

| Breakpoint | Sidebar | Header | Footer | Main Content |
|------------|---------|--------|--------|--------------|
| **Desktop** (≥768px) | 240px expanded | Full: Logo + Title + User | Full | 100% - 240px |
| **Tablet** (640-767px) | 64px collapsed | Logo + User (no title) | Full | 100% - 64px |
| **Mobile** (<640px) | Overlay (hidden) | Hamburger + User | Compact | 100% - 32px padding |

---

## 3. Component Specifications

### 3.1 Header (48px height, fixed top)

**Structure:**
```
┌─────────────────────────────────────────────────────┐
│ [32px Logo] DataBiz              [Avatar Menu▼]     │
│  PNG image    text-lg             Dropdown          │
└─────────────────────────────────────────────────────┘
```

**Detailed Specs:**

| Element | Specification |
|---------|---------------|
| **Logo** | 32x32px PNG (provided by business), clickable → `/dashboard` |
| **Title** | "DataBiz" (default), text-lg, configurable via `/maintenance/app` |
| **User Menu** | Avatar (uploaded photo) OR initials fallback (2 chars, uppercase) |
| **Dropdown** | Items: "Profiel", "Uitloggen" |
| **Background** | Dark theme primary color (`bg-zinc-900`) |
| **Border** | Bottom border on scroll (`border-b border-zinc-800`) |
| **Height** | 48px fixed at all breakpoints |
| **Z-index** | 50 (above main content, below modals) |

**Component Tree:**
```tsx
<Header>
  <Logo onClick={() => navigate('/dashboard')} />
  <Title text={config.appTitle} />
  <UserMenu>
    <Avatar src={user.avatar} fallback={user.initials} />
    <DropdownMenu>
      <DropdownMenuItem>Profiel</DropdownMenuItem>
      <DropdownMenuItem>Uitloggen</DropdownMenuItem>
    </DropdownMenu>
  </UserMenu>
</Header>
```

### 3.2 Sidebar (64px icon / 240px expanded, fixed left)

**Structure:**
```
┌──────────────────┐
│ [≡] Toggle       │ ← Collapse button (top, 40px height)
├──────────────────┤
│                  │ ← 16px spacing
│ 📦 PRODUCTEN     │ ← Zone header (non-clickable, uppercase, text-xs)
│  • Assortiment   │ ← Nav item (text-sm, hover bg, active border-left)
│  • Catalogus     │
│                  │ ← 24px spacing
│ ⚡ ACTIES        │
│  • Importeren    │
│  • Activeren     │
│  • Promoveren    │
│  • Exporteren    │
│                  │
│ 🔧 ONDERHOUD     │
│  • Basis         │
│  • Werk          │
│  • Applicatie    │
│                  │ ← 16px bottom padding
└──────────────────┘
```

**Detailed Specs:**

| Element | Specification |
|---------|---------------|
| **Width Collapsed** | 64px (icon only, text hidden) |
| **Width Expanded** | 240px (icon + text visible) |
| **Toggle Button** | Top of sidebar, icon: `ChevronsLeft` / `ChevronsRight` (Lucide) |
| **State Persistence** | localStorage key: `sidebar-collapsed` (boolean) |
| **Zone Headers** | UPPERCASE, text-xs, font-semibold, text-zinc-500 (muted) |
| **Nav Items** | text-sm, icon 20px, gap 12px, padding 8px 16px |
| **Active State** | `border-l-4 border-primary bg-zinc-800` |
| **Hover State** | `bg-zinc-800/50` |
| **Icons** | Lucide React (20px size, stroke-width: 2) |
| **Spacing** | Zone gap: 24px, Item gap: 4px |
| **Animation** | 200ms ease transition on width change |
| **Z-index** | 40 (above main content, below header/modals) |

**Proposed Icons (Lucide React):**
- 📦 Producten: `Package`
  - Assortiment: `ShoppingCart`
  - Catalogus: `Database`
- ⚡ Acties: `Zap`
  - Importeren: `Upload`
  - Activeren: `CheckCircle`
  - Promoveren: `ArrowUpCircle`
  - Exporteren: `Download`
- 🔧 Onderhoud: `Settings`
  - Basis: `Layers`
  - Werk: `Wrench`
  - Applicatie: `Users`

### 3.3 Main Content Area (dynamic)

**Structure:**
```
┌──────────────────────────────────────────────────────┐
│ Producten > Catalogus > SKU-12345                    │ ← Breadcrumb (24px top, 16px left)
├──────────────────────────────────────────────────────┤
│                                                      │ ← 16px padding
│  [Page Content: Cards, Tables, Forms, etc.]         │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Detailed Specs:**

| Element | Specification |
|---------|---------------|
| **Background** | `bg-zinc-950` (darker than sidebar for contrast) |
| **Padding** | 16px all sides (mobile), 24px all sides (desktop) |
| **Max Width** | None (fluid, uses all available space) |
| **Min Height** | `calc(100vh - 48px header - 32px footer)` |
| **Scroll** | Vertical scroll when content exceeds viewport |
| **Breadcrumb Position** | Top-left corner, outside page content padding |

**Breadcrumb Specs:**

| Property | Value |
|----------|-------|
| **Format** | `Zone > Page > Item` (max 4 levels) |
| **Separator** | `>` with 8px spacing |
| **Font** | text-sm, text-zinc-400 (muted) |
| **Active Item** | text-zinc-200 (brighter), not clickable |
| **Parent Items** | text-zinc-500, hover:text-zinc-300, clickable |
| **Truncation** | After 4 levels: `Zone > ... > Parent > Current` |
| **Sub-headers** | Include BASISGEGEVENS/WERKGEGEVENS/APPLICATIE as non-clickable crumbs |

### 3.4 Footer (32px height, fixed bottom)

**Structure:**
```
┌────────────────────────────────────────────────────────────┐
│ 🟢 DB: OK  🟢 API: OK  🟢 S3: OK │ 🔵 DEV │ ⏳ 2 │ v3.0.0 │
│ ├─ Connections (left)             ├─OTAP  ├─Jobs ├─Version│
└────────────────────────────────────────────────────────────┘
```

**Detailed Specs:**

#### Connection Status (Left Section)

| Service | Port | Status Colors | Thresholds |
|---------|------|---------------|------------|
| **Database** | 9020 | 🟢 <200ms, 🟡 200-1000ms, 🔴 >1000ms / error | Polling: 30s |
| **API** | 9000 | 🟢 <200ms, 🟡 200-1000ms, 🔴 >1000ms / error | Polling: 30s |
| **Storage (S3)** | 9022 | 🟢 <200ms, 🟡 200-1000ms, 🔴 >1000ms / error | Polling: 30s |

**Tooltip Content (on hover):**
```
DB: PostgreSQL
Status: ✓ Connected
Latency: 45ms
Last check: 08:23:15
```

**Click Behavior:** (Future) Open diagnostics modal with connection logs

#### OTAP Badge (Center-Left)

| Environment | Color | Background | Text |
|-------------|-------|------------|------|
| **DEV** | Blue | `bg-blue-500` | `text-white` |
| **TEST** | Yellow | `bg-yellow-500` | `text-black` |
| **ACC** | Orange | `bg-orange-500` | `text-white` |
| **PROD** | Red | `bg-red-500` | `text-white` |

**Format:** Uppercase, bold (font-semibold), 6px padding, rounded badge

**Tooltip:**
```
Environment: DEVELOPMENT
API URL: http://localhost:9000
Database: localhost:9020
```

#### Background Jobs (Center)

**States:**

| State | Display | Icon | Behavior |
|-------|---------|------|----------|
| **No Jobs** | Hidden | - | No widget shown |
| **Active** | `⏳ 2` (count) | Spinner animation | Clickable → `/jobs` |
| **Failed** | `❌ 1` (count) | Red color | Clickable → `/jobs` |

**Tooltip:**
```
Active Jobs:
• 2 import(s) running
• Dataset: FHB-Artikelstammdaten
• Dataset: Engel_Product_Information
```

**Update Interval:** 10 seconds (polling)

#### Version Info (Right)

**Format:** `v3.0.0 | © 2025 DataBiz`

**Specs:**
- Font: text-xs
- Color: text-zinc-500 (muted)
- Not clickable (future: link to changelog)
- Version from: `package.json` (injected at build time via Vite)

---

## 4. Theme System

### 4.1 Shadcn/ui Configuration

**Installation Command:**
```bash
npx shadcn@latest init
```

**Config Options:**
- Style: `New York` (cleaner, more modern)
- Base color: `Zinc` (neutral gray for dark theme)
- CSS variables: Yes
- Tailwind config: `tailwind.config.js`
- Components path: `src/components/ui`
- Utils path: `src/lib/utils.ts`

**Required Components (Phase 1):**
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add tooltip
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
```

### 4.2 Dark Mode Setup

**Tailwind Config:**
```js
// tailwind.config.js
export default {
  darkMode: 'class', // NOT 'media' (we control it)
  // ... rest of config
}
```

**HTML Root Class:**
```html
<!-- index.html -->
<html lang="nl" class="dark">
```

**CSS Variables (from Shadcn):**
```css
/* src/index.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    /* ... light mode colors (for future toggle) */
  }

  .dark {
    --background: 240 10% 3.9%;      /* zinc-950 */
    --foreground: 0 0% 98%;          /* zinc-50 */
    --primary: 210 100% 60%;         /* blue-500 */
    --secondary: 240 5.9% 10%;       /* zinc-900 */
    --muted: 240 3.7% 15.9%;         /* zinc-800 */
    --accent: 240 4.8% 20%;          /* zinc-700 */
    --border: 240 3.7% 15.9%;        /* zinc-800 */
    /* ... rest of dark mode tokens */
  }
}
```

### 4.3 Design Tokens

**Spacing Scale (Tailwind defaults):**
- Base: 4px
- Scale: 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 6 (24px), 8 (32px), 12 (48px), 16 (64px)

**Typography Scale:**
- text-xs: 12px / 16px
- text-sm: 14px / 20px
- text-base: 16px / 24px
- text-lg: 18px / 28px
- text-xl: 20px / 28px
- text-2xl: 24px / 32px

**Border Radius:**
- rounded-sm: 2px
- rounded: 4px
- rounded-md: 6px
- rounded-lg: 8px

**Shadows:**
- shadow-sm: Subtle elevation
- shadow: Standard card shadow
- shadow-lg: Modal/dialog shadow

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
**Slices:**
- PLT-THM-SHD-001: Shadcn CLI Setup
- PLT-THM-DRK-001: Dark Mode Config
- PLT-SHL-LAY-001: Main Layout Component

**Deliverables:**
- Shadcn/ui installed with base components
- Dark mode enabled (default)
- Empty layout shell (Header/Sidebar/Footer/Main)

### Phase 2: Layout Components (Week 1-2)
**Slices:**
- PLT-SHL-HDR-001: Header Component
- PLT-SHL-SDB-001: Sidebar Navigation
- PLT-SHL-FTR-001: Footer Status Bar
- PLT-NAV-CFG-001: Navigation Config

**Deliverables:**
- Functional Header with logo, title, user menu
- Collapsible Sidebar with 3-zone navigation
- Footer with status indicators
- Navigation config file

### Phase 3: Navigation & Context (Week 2)
**Slices:**
- PLT-NAV-BRC-001: Breadcrumb Component
- PLT-NAV-BRC-002: Auto Breadcrumb Generation
- PLT-CTX-CON-001: Connection Monitoring
- PLT-CTX-OTP-001: OTAP Indicator
- PLT-CTX-JOB-001: Background Jobs Widget

**Deliverables:**
- Dynamic breadcrumbs from routes
- Real-time connection status
- Environment badge
- Background jobs counter

### Phase 4: Responsive & Polish (Week 2-3)
**Slices:**
- PLT-SHL-MOB-001: Mobile Navigation
- PLT-SHL-MOB-002: Responsive Header
- PLT-THM-CMP-001: Base Components
- PLT-THM-CMP-002: Composite Components

**Deliverables:**
- Mobile-optimized layout
- Component library complete
- Documentation/showcase page

---

## 6. Acceptance Criteria Summary

**Global Layout Requirements:**
- ✅ Header (48px), Sidebar (240px/64px), Footer (32px) rendered on all auth pages
- ✅ Main content area uses remaining space (dynamic height)
- ✅ Dark mode enabled by default
- ✅ Responsive: Sidebar collapses <768px, hamburger menu on mobile
- ✅ Fixed header/footer (scroll main content only)

**Navigation Requirements:**
- ✅ 8 menu items across 3 zones (Producten, Acties, Onderhoud)
- ✅ Active state highlights current page
- ✅ Sidebar state persists in localStorage
- ✅ Breadcrumbs show current location (max 4 levels)

**Status Requirements:**
- ✅ Connection status shows DB/API/Storage health
- ✅ OTAP badge shows environment (color-coded)
- ✅ Background jobs count visible when jobs active
- ✅ Version number from package.json

**Theme Requirements:**
- ✅ Shadcn/ui components installed and configured
- ✅ Dark mode with Zinc color palette
- ✅ Consistent spacing and typography
- ✅ Accessible components (Radix UI primitives)

---

## 7. Technical Dependencies

**NPM Packages to Install:**
```bash
npm install lucide-react      # Icons
npm install class-variance-authority  # Shadcn CVA utility
npm install clsx              # Class merging
npm install tailwind-merge    # Tailwind class merging
```

**Shadcn Components (via CLI):**
- button, card, dialog, dropdown-menu, avatar
- table, badge, tooltip, separator, scroll-area

**Files to Create:**
```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx           (PLT-SHL-LAY-001)
│   │   ├── Header.tsx               (PLT-SHL-HDR-001)
│   │   ├── Sidebar.tsx              (PLT-SHL-SDB-001)
│   │   ├── SidebarNavigation.tsx    (PLT-NAV-REN-001)
│   │   ├── Footer.tsx               (PLT-SHL-FTR-001)
│   │   ├── Breadcrumb.tsx           (PLT-NAV-BRC-001)
│   │   ├── ConnectionStatus.tsx     (PLT-CTX-CON-001)
│   │   ├── OtapBadge.tsx            (PLT-CTX-OTP-001)
│   │   └── JobsWidget.tsx           (PLT-CTX-JOB-001)
│   ├── ui/                          (Shadcn components)
│   └── common/                      (Composite components)
├── config/
│   ├── navigation.ts                (PLT-NAV-CFG-001)
│   ├── breadcrumbs.ts               (PLT-NAV-BRC-002)
│   └── environment.ts               (PLT-CTX-OTP-001)
├── hooks/
│   ├── useActiveRoute.ts            (PLT-NAV-REN-001)
│   ├── useBreadcrumbs.ts            (PLT-NAV-BRC-002)
│   ├── useSystemStatus.ts           (PLT-CTX-CON-001)
│   ├── useBackgroundJobs.ts         (PLT-CTX-JOB-001)
│   └── useMediaQuery.ts             (PLT-SHL-MOB-001)
├── lib/
│   ├── health-api.ts                (PLT-CTX-CON-001)
│   └── jobs-api.ts                  (PLT-CTX-JOB-001)
└── types/
    └── navigation.ts                (PLT-NAV-CFG-001)
```

---

## 8. Future Enhancements (Out of Scope for Initial Release)

- [ ] Light mode toggle (User Preferences)
- [ ] Customizable app logo/title via Applicatie onderhoud
- [ ] Websocket for real-time status updates (instead of polling)
- [ ] Diagnostics modal (click connection status for details)
- [ ] Changelog/Release notes page (click version number)
- [ ] Batch actions from navigation (e.g., bulk promote)
- [ ] Sidebar search/filter (when menu grows >15 items)
- [ ] Keyboard shortcuts (CMD+K command palette)
- [ ] Notification center (bell icon in header)
- [ ] User avatar upload (Profiel page feature)

---

**Last Updated:** December 18, 2025  
**Validated By:** Product Owner, Architect, Frontend Developer  
**Status:** Ready for Implementation (Worktree)


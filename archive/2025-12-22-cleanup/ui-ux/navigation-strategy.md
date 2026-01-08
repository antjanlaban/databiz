# Navigation Strategy

**Last Updated:** 18 december 2025  
**Version:** 2.0 (Post-Nested Sidebar Refactor)

---

## Design Philosophy

**Core Principle**: Context behouden, nooit de gebruiker laten verdwalen.

### Problems We Solved

**Before (Anti-pattern)**:
- Stamdata had aparte StamdataLayout met eigen sidebar
- Hoofdmenu verdween bij navigatie naar Stamdata
- "Terug naar Home" links als workaround
- Inconsistente UX tussen secties

**After (Best Practice)**:
- Eén universele MainLayout voor alle pagina's
- Sidebar altijd zichtbaar
- Stamdata als collapsible submenu
- Consistente navigatie experience

---

## Implementation Details

### Sidebar Structure (POST MASTERPLAN RESTRUCTURE)

**Nieuwe Structuur vanaf Fase 3 Implementation:**

```
AppSidebar
├─ HOOFDFUNCTIES
│  ├─ Dashboard (/)
│  ├─ 📥 IMPORT: Bestand Inlezen (/import)
│  │
│  ├─ 🤖 DATA DIRIGENT (Collapsible Group)
│  │  ├─ Converteren (/data-dirigent/convert)
│  │  ├─ Activeren (/data-dirigent/activate)
│  │  ├─ Promoveren (/data-dirigent/promote)
│  │  └─ Verrijken (/data-dirigent/enrich)
│  │
│  ├─ 📦 LEVERANCIERS
│  │  └─ Catalogus (/supplier-catalog) [ACTIVE products only]
│  │
│  ├─ 🎯 MIJN ASSORTIMENT
│  │  └─ Producten (/products) [PROMOTED products only]
│  │
│  └─ 📤 EXPORT & INTEGRATIE (/export)
│
├─ AI ENGINE (Collapsible Group)
│  ├─ Dataset Mapping (/ai-engine/dataset-mapping)
│  ├─ Dataset Quality (/ai-engine/dataset-quality)
│  ├─ Dataset Intelligence (/ai-engine/dataset-intelligence)
│  └─ Pattern Learning (/ai-engine/pattern-learning)
│
├─ QUALITY (Collapsible Group)
│  ├─ Quality Overview (/quality/overview)
│  ├─ Quality Rules (/quality/rules)
│  ├─ Quality Reports (/quality/reports)
│  └─ Bulk Enrichment (/quality/bulk-enrichment)
│
└─ SYSTEEMBEHEER (Collapsible Group)
   ├─ ⚙️ INRICHTING (Collapsible Subgroup)
   │  ├─ Leveranciers (/stamdata/suppliers)
   │  ├─ Merken (/stamdata/brands)
   │  ├─ Categorieën (/stamdata/categories)
   │  ├─ Kleuren (/stamdata/color-families)
   │  ├─ Maten (/stamdata/sizing)
   │  ├─ Decoratie (/stamdata/decoration)
   │  └─ PIM Velddefinities (/ai-engine/pim-fields) [MOVED FROM AI ENGINE]
   │
   └─ Gebruikersbeheer (/users)
```

**🔴 KEY CHANGES vs OLD STRUCTURE:**
1. ✅ **DATA DIRIGENT** toegevoegd als nieuw main menu item met 4 sub-items
2. ✅ **IMPORT** hernoemd naar "IMPORT: Bestand Inlezen" (alleen fase 1)
3. ✅ **LEVERANCIERS** verplaatst van "Stamdata" naar "HOOFDFUNCTIES" (data flows hier doorheen)
4. ✅ **MIJN ASSORTIMENT** nieuw toegevoegd (was "Producten")
5. ✅ **EXPORT & INTEGRATIE** hernoemd + generiek systeem
6. ✅ **INRICHTING** toegevoegd als sub-groep van "Systeembeheer" (was "Stamdata")
7. ✅ **PIM Velddefinities** verplaatst van "AI Engine" naar "Inrichting"

**Filtering Logic Changes:**
- `/supplier-catalog` → Only show `product_status = 'ACTIVE'` products
- `/products` → Only show `product_status = 'PROMOTED'` products

### Component Hierarchy

```
App.tsx
└─ MainLayout (universal)
   ├─ SidebarProvider
   ├─ AppSidebar (with nested Stamdata)
   ├─ Header (SidebarTrigger + ProfileMenu)
   └─ Main Content (Outlet)
      ├─ Index (Dashboard)
      ├─ UsersPage
      ├─ StamdataDashboard
      └─ Stamdata pages (7x)
```

### Active State Logic

**Main items**: Active when `location.pathname === item.path`

**Stamdata group**: Auto-expands when `location.pathname.startsWith('/stamdata')`

**Stamdata submenu items**: Active when `location.pathname === item.path`

---

## User Experience Benefits

✅ **Orientation**: Gebruiker weet altijd waar hij is  
✅ **Efficiency**: Eén klik naar elke sectie  
✅ **Consistency**: Zelfde navigatie op elke pagina  
✅ **Discovery**: Submenu toont alle beschikbare opties  
✅ **Accessibility**: Keyboard navigatie werkt consistent  

---

## Technical Benefits

✅ **DRY**: MainLayout herbruikbaar voor alle routes  
✅ **Maintainability**: Eén plek voor layout updates  
✅ **Performance**: Geen layout re-renders bij route switch  
✅ **Testability**: Routing logic geïsoleerd  

---

## Desktop-Only Design

### Waarom geen mobile?

Van Kruiningen PIM is **bewust ontworpen als desktop-only applicatie**:

✅ **Complex workflows:** Import mapping met dual-pane layout  
✅ **Data-intensief:** Tabellen met 10+ kolommen  
✅ **Bulk operations:** Multi-select met keyboard shortcuts  
✅ **Precision editing:** Inline editing vereist muis + keyboard  

### Minimum Requirements

- **Screen:** ≥1280px breed (laptop/desktop)
- **Browser:** Modern desktop browsers
- **Input:** Keyboard + muis (touchscreen niet ondersteund)

### Small Screen Handling

Voor schermen < 1280px wordt een warning overlay getoond:

```tsx
{screenWidth < 1280 && (
  <Alert variant="destructive" className="m-4">
    <AlertTriangle className="h-5 w-5" />
    <AlertTitle>Scherm te klein</AlertTitle>
    <AlertDescription>
      Van Kruiningen PIM vereist minimaal 1280px schermbreed.
      Deze applicatie is ontworpen voor desktop gebruik.
    </AlertDescription>
  </Alert>
)}
```

---

## Best Practices Followed

Based on shadcn/ui documentation:

1. **Persistent Navigation**: Main sidebar altijd zichtbaar
2. **Collapsible Groups**: Logische groepering met expand/collapse
3. **Active State**: Duidelijke visuele indicator (blue border)
4. **Keyboard Shortcuts**: Cmd+K voor search, etc.
5. **Desktop-Optimized**: Designed for desktop workstations (≥1280px)
6. **Accessibility**: ARIA labels, keyboard navigation, screen reader support
7. **Hover-Triggered Sidebar**: Auto-reveal bij hover over linker schermrand (desktop only)

---

## Navigation States

### Desktop

**Expanded Sidebar (240px)**:
- Volledige navigatie zichtbaar
- Stamdata submenu open bij /stamdata/* routes
- Active state met blue left border
- Hover states voor feedback

**Collapsed Sidebar (56px)**:
- Alleen icons zichtbaar
- Tooltips bij hover
- Stamdata chevron icon roteert
- **Hover zone active**: 4px zone aan linker schermrand triggert auto-open
- Sidebar verschijnt met slide-in animatie (300ms ease-out)
- Auto-close na 250ms wanneer muis sidebar verlaat

**Collapsed Group**:
- Stamdata ▶ (submenu verborgen)
- Chevron wijst naar rechts

**Expanded Group**:
- Stamdata ▼ (submenu zichtbaar)
- Chevron wijst naar beneden
- 7 submenu items getoond

---

## Component Files

### Core Components

**src/components/layout/MainLayout.tsx**
- Universal layout wrapper
- SidebarProvider + AppSidebar + Header
- Used for all authenticated routes

**src/components/layout/AppSidebar.tsx**
- Main navigation component
- Collapsible Stamdata group
- Admin role checks
- Active state logic

**src/components/layout/ProfileMenu.tsx**
- User menu dropdown
- Sign out functionality
- Profile actions

### Routing

**src/App.tsx**
- All authenticated routes wrapped in MainLayout
- Stamdata routes use nested AdminGuard
- Auth route has no layout

### Pages

All pages now render content only, no layout wrapper:
- src/pages/Index.tsx
- src/pages/users/UsersPage.tsx
- src/pages/users/ChangePasswordPage.tsx
- src/pages/stamdata/*.tsx (7 pages: Brands, Suppliers, ColorFamilies, DecorationMethods, DecorationPositions, Categories, AuditLog)

---

## Migration Notes

### Removed

- `src/components/stamdata/StamdataLayout.tsx` - No longer needed
- `src/pages/stamdata/TaxonomiesPage.tsx` - Merged into CategoriesPage
- "Terug naar Home" links in stamdata pages - Redundant

### Changed

- AppSidebar now includes collapsible Stamdata submenu (7 items instead of 8)
- CategoriesPage refactored to use tabs for Categories + Taxonomies
- All routes now use MainLayout
- Index page simplified to content only

### Added

- MainLayout.tsx - Universal layout component
- CategoriesTab.tsx - Categories management logic
- TaxonomiesTab.tsx - Taxonomies management logic
- Categories & Taxonomies tab integration (see `docs/features/stamdata-beheer.md`)
- Collapsible component usage in sidebar
- navigation-strategy.md documentation

---

## Testing Checklist

**Functionaliteit**:
- [x] Hoofdmenu blijft zichtbaar op alle pagina's
- [x] Stamdata groep klapt open/dicht met chevron click
- [x] Stamdata groep opent automatisch bij /stamdata/* routes
- [x] Active state werkt op alle items
- [x] Sidebar collapse/expand werkt
- [x] Admin guards blokkeren non-admin users
- [x] Hover zone triggert sidebar open (desktop only)
- [x] Sidebar sluit automatisch bij mouse leave
- [x] Geen flikkering bij hover (debounce werkt)

**Visual**:
- [x] Blue border op active items
- [x] Chevron rotatie bij toggle
- [x] Submenu items zijn geïndenteerd
- [x] Hover states werken
- [x] Slide-in/out animaties zijn vloeiend

---

## References

- [shadcn/ui Sidebar Docs](https://ui.shadcn.com/docs/components/sidebar)
- [React Router Nested Routes](https://reactrouter.com/en/main/start/tutorial#nested-routes)
- [Collapsible Component Docs](https://ui.shadcn.com/docs/components/collapsible)

---

## Hover-Triggered Sidebar Feature

**Implemented:** 19 december 2025

### Hoe het werkt

1. **Hover Trigger Zone**: 4px breedte aan linker schermrand
2. **Auto-Open**: Sidebar schuift in met `slide-in-left` animatie (300ms)
3. **Auto-Close**: Sidebar sluit automatisch 250ms nadat muis de sidebar verlaat
4. **Desktop Only**: Functionaliteit uitgeschakeld op mobile devices
5. **Manual Override**: SidebarTrigger knop werkt nog steeds voor permanente toggle

### Technische Details

**Animaties (tailwind.config.ts)**:
```typescript
"slide-in-left": "slide-in-left 0.3s ease-out"
"slide-out-left": "slide-out-left 0.25s ease-in"
```

**Hover Logic (MainLayout.tsx)**:
- Hover trigger zone: `onMouseEnter` → `setOpen(true)`
- Sidebar: `onMouseLeave` → setTimeout 250ms → `setOpen(false)`
- Debounce met `useRef<NodeJS.Timeout>` voorkomt flikkering
- Media query check: `useIsMobile()` hook voor mobile disable

### UX Voordelen

✅ Maximale schermruimte met collapsed sidebar  
✅ Instant toegang zonder klikken  
✅ Vloeiende animaties voor professionele uitstraling  
✅ Geen conflict tussen hover en manual toggle  

---

## Future Improvements

**Potential Enhancements**:
- [ ] Add breadcrumbs for additional context
- [ ] Implement Cmd+K global search
- [ ] Add favorites/pinned items
- [ ] Recent pages history
- [x] Collapsed mini sidebar with flyout on hover ✅ **IMPLEMENTED**

**Performance Optimizations**:
- [ ] Lazy load submenu items
- [ ] Virtualize long lists
- [ ] Memoize navigation components

---

_Navigation strategy designed for optimal user experience and maintainability._

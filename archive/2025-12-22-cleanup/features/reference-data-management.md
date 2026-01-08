# Stamdata Beheer Module

**Last Updated:** 2025-10-29  
**Version:** 2.0  
**Status:** ✅ **LIVE IN PRODUCTIE**  
**Access Level:** Admin only

---

## Overview

Admin-only CRUD interface voor alle stamdata/referentie tabellen in het Van Kruiningen PIM systeem. Deze module biedt een centraal punt voor het beheren van alle referentiedata die door het systeem worden gebruikt.

## Scope

De module beheert de volgende stamdata tabellen:

| Tabel | Nederlands | Beschrijving | Status |
|-------|-----------|--------------|--------|
| `brands` | Merken | Kledingmerken (bijv. Projob, Tricorp) | ✅ Live |
| `suppliers` | Leveranciers | Leveranciers van producten | ✅ Live |
| `color_families` | Kleuren | Standaard kleurnamen met hex codes | ✅ Live |
| `decoration_methods` + `decoration_positions` | Decoratie | Methoden (borduren, zeefdruk) en posities (borst, rug, mouw) - gecombineerd met tab interface | ✅ Complete |
| `categories` + `category_taxonomies` | Categorieën | Hiërarchische categorieën met taxonomie-beheer (tab interface) | ✅ Complete |
| `audit_log` | Audit Log | Wijzigingshistorie | ✅ Live |

---

## Features

### ✅ 1. Full CRUD Operations
- **Create:** Nieuwe records aanmaken met validatie
- **Read:** Overzicht met search & filter
- **Update:** Records wijzigen met duplicate check
- **Delete:** Records verwijderen met impact analysis

### ✅ 2. Audit Trail
- Alle wijzigingen worden automatisch gelogd in `audit_log` tabel
- Vastgelegd: wie, wat, wanneer, oude waarde, nieuwe waarde
- View-only pagina voor audit logs
- Filter op tabel en/of record ID

### ✅ 3. Duplicate Check
- Real-time validatie tijdens typen
- Visuele feedback (badge/warning)
- UNIQUE constraints op database niveau
- Voorkomt dubbele entries

### ✅ 4. Circular Reference Check
- Speciaal voor categorieën: voorkomt circulaire parent-child relaties
- Validatie op formulier én database niveau
- Duidelijke foutmelding

### ✅ 5. Admin-only Toegang
- RLS policies: alleen admins kunnen CRUD uitvoeren
- AdminGuard component op UI niveau
- `has_role('admin')` check op Edge Function niveau

### ✅ 6. Impact Analysis
- Bij delete: toon hoeveel records afhankelijk zijn
- Voorkomt orphaned records
- Foreign key constraints op database niveau

### ✅ 7. Search & Filter
- Per tabel: zoek in alle relevante velden
- Client-side filtering voor snelheid
- Desktop UI met duidelijke feedback

---

## Bulk Operations

### Bulk Recategorize Feature

**Status:** ✅ Geïmplementeerd  
**Priority:** Medium

De Bulk Recategorize feature stelt admins in staat om producten in bulk te verplaatsen tussen categorieën zonder de originele categorie te verwijderen.

**Locaties:**
- `src/lib/utils/category-utils.ts` - Backend functies
- `src/components/stamdata/BulkRecategorizeDialog.tsx` - UI component
- `src/pages/stamdata/CategoriesPage.tsx` - Integratie

**Features:**
- Product selectie met checkboxes
- "Selecteer alles" / "Deselecteer alles" knoppen
- Real-time productlijst per categorie
- Validatie: bron ≠ doel, minimaal 1 product
- Batch update via Supabase

**Use Case:**
Admin wil 50 producten van "Werkkleding > Jassen" naar "Outdoor > Jassen" verplaatsen ZONDER de originele "Werkkleding > Jassen" categorie te verwijderen.

---

## CSV Import

### Category Import Feature

**Status:** ✅ Geïmplementeerd  
**Priority:** High

Import categorieën tree vanuit CSV bestand met volledige validatie en dependency resolution.

**CSV Format:**

**Vereiste Kolommen:**
- `taxonomy_code` (verplicht): ALG of GS1
- `category_code` (verplicht): Unieke code
- `category_name_nl` (verplicht): Nederlandse naam

**Optionele Kolommen:**
- `category_name_en`, `parent_code`, `description`, `sort_order`, `is_active`

**Locaties:**
- `src/lib/utils/csv-parser.ts` - CSV parsing
- `src/lib/utils/category-import.ts` - Import processing
- `src/components/stamdata/CategoryImportDialog.tsx` - UI wizard
- `public/templates/category-import-template.csv` - Template

**Features:**
- Papa Parse voor CSV parsing
- Topological sort voor parent dependencies
- Validation met error reporting
- Multi-step wizard (select, validate, import, complete)

**Import Flow:**
```
1. Upload CSV bestand
2. Parse en valideer kolommen
3. Check voor duplicaten en ongeldige parent references
4. Topological sort (parents eerst, dan children)
5. Batch insert met dependency resolution
6. Success report met insert counts
```

---

## Delete Protection

### Category Delete Impact Analysis

**Status:** ✅ Geïmplementeerd  
**Priority:** Critical (BR-026-EXTENDED)

Deze feature voorkomt onbedoeld dataverlies bij het verwijderen van categorieën door:
1. **Impact Analysis** uit te voeren voor elke delete actie
2. **Replacement Flow** af te dwingen voor ALG categorieën met producten
3. **Optionele Replacement** te bieden voor GS1 categorieën
4. **UNCATEGORIZED Fallback** categorie te beschermen

### Business Scenarios

#### Scenario 1: ALG Categorie met Producten (STRICT)

**Context:** ALG categorieën zijn verplicht (BR-026). Elk product MOET exact 1 ALG categorie hebben.

**Delete Flow:**
1. Admin klikt [🗑️] bij "Werkkleding > Jassen" (25 producten)
2. getCategoryDeleteImpact() detecteert: isAlgCategory = true, productCount = 25
3. CategoryReplacementDialog toont waarschuwing
4. Admin MOET vervangende categorie selecteren
5. Backend: UPDATE product_categories SET category_id = new_id
6. Backend: DELETE FROM categories WHERE category_id = old_id
7. Toast: "✅ 25 producten verplaatst naar 'Polo's' en categorie 'Jassen' verwijderd"

**Validatie:**
- ❌ Delete zonder replacement → geblokkeerd
- ❌ Replacement naar zichzelf → validatie error
- ❌ Replacement naar subcategorie → circulaire referentie error
- ✅ Replacement naar andere ALG categorie → toegestaan

#### Scenario 2: GS1 Categorie met Producten (FLEXIBLE)

**Context:** GS1 categorieën zijn optioneel. Producten kunnen bestaan zonder GS1 categorie.

**Delete Flow:**
1. Admin klikt [🗑️] bij "GS1 > Workwear > Jackets" (12 producten)
2. CategoryReplacementDialog toont 2 opties:
   - Optie 1: Verplaats naar andere GS1 categorie
   - Optie 2: Verwijder GS1 koppeling (producten behouden ALG)
3. Admin kiest optie 2
4. Backend: DELETE FROM product_categories WHERE category_id = old_id AND taxonomy = 'GS1'
5. Toast: "✅ GS1 koppeling verwijderd voor 12 producten"

#### Scenario 3: UNCATEGORIZED Bescherming

**Context:** Fallback categorie mag NOOIT verwijderd worden.

**UI Rendering:**
- Delete knop ontbreekt voor UNCATEGORIZED categorie
- Badge "Beschermd" getoond met lock icon

**Implementatie Details:**

**Locatie:** `src/lib/utils/category-utils.ts`

```typescript
export interface CategoryImpact {
  canDelete: boolean;
  blockedReason: string | null;
  productStyleCount: number;
  productStyleNames: string[]; // Max 10
  remainingCount: number; // Als > 10 producten
  isAlgCategory: boolean;
  requiresReplacement: boolean;
  availableReplacements: Category[];
}

export async function getCategoryDeleteImpact(
  categoryId: number,
  allCategories: Category[],
  supabase: SupabaseClient
): Promise<CategoryImpact>;

export async function replaceCategoryInProducts(
  oldCategoryId: number,
  newCategoryId: number | null, // null = unlink (GS1 only)
  productStyleIds: number[],
  supabase: SupabaseClient
): Promise<void>;
```

**UI Component:** `src/components/stamdata/CategoryReplacementDialog.tsx`

---

## UI Architecture

### Categorieën & Taxonomieën Integratie

**Implemented:** 2025-01-17  
**Version:** 1.0

**Pattern:** Tabs Component (shadcn/ui)

**Structure:**
- **Tab 1: Categorieën** (default) - Volledige tree view + import/bulk operations
- **Tab 2: Taxonomieën** - Simpele CRUD tabel

**Benefits:**
✅ Context behouden - taxonomie en categorieën logisch gegroepeerd  
✅ Ruimtebesparing - 1 sidebar item in plaats van 2  
✅ Workflow efficiency - switch tussen taxonomie en categorieën zonder navigatie  
✅ Maintainability - Logische code organisatie in tabs  
✅ Consistent met design system - herbruikbaar tab pattern

**Component Architecture:**
```
CategoriesPage.tsx (refactored)
├─ Tabs (shadcn/ui)
│  ├─ TabsList
│  │  ├─ TabsTrigger: "Categorieën"
│  │  └─ TabsTrigger: "Taxonomieën"
│  ├─ TabsContent: "categories"
│  │  └─ CategoriesTab Component
│  │     ├─ Taxonomy selector
│  │     ├─ Action buttons (Import, Bulk, Add)
│  │     ├─ Tree view
│  │     └─ Dialogs (Form, Replacement, Bulk, Import)
│  └─ TabsContent: "taxonomies"
│     └─ TaxonomiesTab Component
│        ├─ StamdataTable
│        └─ Dialogs (Form, Delete)
```

**File Structure:**

**Created:**
- `src/components/stamdata/tabs/CategoriesTab.tsx` - Categories logic
- `src/components/stamdata/tabs/TaxonomiesTab.tsx` - Taxonomies logic

**Modified:**
- `src/pages/stamdata/CategoriesPage.tsx` - Refactored to tabs
- `src/components/layout/AppSidebar.tsx` - Removed taxonomies item (8 → 7 items)
- `src/App.tsx` - Removed taxonomies route

**Routing:**
- **Active:** `/stamdata/categories` - Shows Categories & Taxonomies page with tabs
- **Removed:** `/stamdata/taxonomies` - Merged into categories page

---

## Decoration Management

### Decoratie Integratie

**Implemented:** 2025-10-18  
**Version:** 1.0

**Pattern:** Tabs Component (shadcn/ui) - identiek aan Categorieën implementatie

**Structure:**
- **Tab 1: Methoden** (default) - CRUD voor borduren, zeefdruk, DTG, etc.
- **Tab 2: Posities** - CRUD voor borst, rug, mouw, etc.

**Benefits:**
✅ Context behouden - methode en positie logisch gegroepeerd  
✅ Ruimtebesparing - 1 sidebar item in plaats van 2  
✅ Workflow efficiency - switch tussen methoden en posities zonder navigatie  
✅ Consistentie - Zelfde pattern als Categorieën & Taxonomieën

**User Workflow:**

**Scenario 1: Configure New Decoration Option**
1. Ga naar "Decoratie"
2. Default: Methoden tab active
3. Check beschikbare methoden (borduren, zeefdruk)
4. Switch naar "Posities" tab
5. Check beschikbare posities (borst links, rug, etc.)
6. Keer terug naar product configuratie met juiste methode + positie combo

**Scenario 2: Add New Decoration Method**
1. Ga naar "Decoratie"
2. Default: Methoden tab active
3. Klik "Toevoegen" → vul method_name, min_order_quantity, max_colors
4. Optioneel: Switch naar Posities tab om nieuwe positie toe te voegen

**Components:**
- `src/pages/stamdata/DecorationPage.tsx` - Main page met Tabs
- `src/components/stamdata/tabs/DecorationMethodsTab.tsx` - Methods CRUD
- `src/components/stamdata/tabs/DecorationPositionsTab.tsx` - Positions CRUD

**Routing:**
- Route: `/stamdata/decoration`
- Sidebar item: "Decoratie" (icon: Sparkles)

**Consistency with Categories Pattern:**

Dit patroon volgt **EXACT** hetzelfde als de Categorieën & Taxonomieën implementatie:

| Aspect | Categorieën | Decoratie |
|--------|-------------|-----------|
| **Main Page** | `CategoriesPage.tsx` | `DecorationPage.tsx` |
| **Tab 1 Component** | `CategoriesTab.tsx` | `DecorationMethodsTab.tsx` |
| **Tab 2 Component** | `TaxonomiesTab.tsx` | `DecorationPositionsTab.tsx` |
| **Default Tab** | "categories" | "methods" |
| **Route** | `/stamdata/categories` | `/stamdata/decoration` |
| **Icon** | `Tags` | `Sparkles` |

---

## Implementation Status

| Phase | Status | Completion Date |
|-------|--------|-----------------|
| Phase 0: Documentatie | ✅ Done | 2025-10-18 |
| Phase 1: Database Migrations | ✅ Done | 2025-10-18 |
| Phase 2: Types & Validation | ✅ Done | 2025-10-18 |
| Phase 3: Hooks & API Layer | ✅ Done | 2025-10-18 |
| Phase 4: UI Components | ✅ Done | 2025-10-18 |
| Phase 5: Routing | ✅ Done | 2025-10-18 |
| Phase 6: Testing & Polish | ✅ Done | 2025-10-18 |

---

## Access & Navigation

### Van Homepage naar Stamdata
1. Log in als admin gebruiker
2. Klik op "Stamdata Beheer" kaart op de homepage
3. Of navigeer direct naar `/stamdata`

### Sidebar Navigatie
De stamdata module heeft een collapsible submenu in de hoofdsidebar met 6 items:
- **Referentie Data:** Merken, Leveranciers, Kleuren
- **Decoratie:** Methoden & Posities (gecombineerd met tab interface)
- **Categorieën:** Categorieën & Taxonomieën (gecombineerd met tab interface)
- **Systeem:** Audit Log

---

## Technical Implementation

### Database Schema

**audit_log table:**
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Indexes:**
- `idx_audit_log_table` on `table_name`
- `idx_audit_log_record` on `(table_name, record_id)`
- `idx_audit_log_user` on `user_id`
- `idx_audit_log_created` on `created_at DESC`

**RLS Policy:**
```sql
CREATE POLICY "Admins can view audit logs"
ON audit_log FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));
```

### Triggers

Elke stamdata tabel heeft een `AFTER INSERT OR UPDATE OR DELETE` trigger:
```sql
CREATE TRIGGER audit_[table]_changes
AFTER INSERT OR UPDATE OR DELETE ON [table]
FOR EACH ROW EXECUTE FUNCTION log_stamdata_changes();
```

### UNIQUE Constraints

| Tabel | Constraint | Beschrijving |
|-------|-----------|--------------|
| `brands` | `brands_brand_name_key` | Merknaam uniek |
| `suppliers` | `suppliers_supplier_name_key` | Leveranciersnaam uniek |
| `decoration_methods` | `decoration_methods_method_name_key` | Methodenaam uniek |
| `decoration_positions` | `decoration_positions_position_name_key` | Positienaam uniek |
| `category_taxonomies` | `category_taxonomies_taxonomy_name_key` | Taxonomienaam uniek |
| `categories` | `categories_taxonomy_name_unique` | Categorienaam uniek binnen taxonomy |

---

## Validation Rules

### Brands
```typescript
brandSchema = z.object({
  brand_name: z.string().min(1).max(100).trim(),
  brand_code: z.string().min(2).max(50).regex(/^[A-Z0-9-]+$/).optional(),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
});
```

**Logo Upload Opties:**
1. **Handmatige Upload:** Bestand selecteren (PNG, SVG, WEBP, max 100KB)
2. **Externe URL:** Direct URL naar logo invullen
3. **🆕 Automatisch via Brandfetch:** Logo ophalen op basis van merknaam of website URL

**Brandfetch Integratie:**
- Knop: "Brandfetch" naast logo upload veld
- Type: Client-side implementatie (geen Edge Function)
- API: Brandfetch Logo API (`https://img.brandfetch.io/{domain}`)
- Process:
  1. Extracteer domain uit `website_url` of gebruik `brand_name`
  2. Construeer Brandfetch URL
  3. Test of image beschikbaar is via Image() object
  4. Bij succes: gebruik URL direct als `logo_url` (externe link)
- Voordelen: Snel, gratis (500k requests/maand), geen handmatig werk, geen API key nodig
- Nadeel: Logo blijft extern gehost (niet in eigen Storage bucket)
- Fallback: Bij failure blijft handmatige upload beschikbaar

### Suppliers
```typescript
supplierSchema = z.object({
  supplier_name: z.string().min(1).max(200).trim(),
  supplier_code: z.string().min(2).max(50).regex(/^[A-Z0-9-]+$/).optional(),
  contact_person: z.string().max(100).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().regex(/^[\d\s\+\-\(\)]+$/).max(50).optional(),
  website_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
});
```

### Colors
```typescript
colorFamilySchema = z.object({
  color_name_nl: z.string().min(1).max(50).trim(),
  color_name_en: z.string().max(50).optional(),
  hex_code: z.string().regex(/^#[0-9A-F]{6}$/i).length(7),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
```

---

## Testing Checklist

### ✅ Completed Tests

**CRUD Operations:**
- ✅ Create: Nieuw merk aanmaken → zichtbaar in lijst
- ✅ Read: Alle merken ophalen → correct weergegeven
- ✅ Update: Merknaam wijzigen → audit log entry
- ✅ Delete: Merk verwijderen → impact analysis getoond

**Duplicate Check:**
- ✅ Bestaande merknaam typen → warning badge
- ✅ Submit duplicaat → database error + toast
- ✅ Unieke naam typen → geen warning

**Admin Guard:**
- ✅ Non-admin navigeert naar `/stamdata` → error message
- ✅ Admin navigeert naar `/stamdata` → toegang
- ✅ Uitloggen tijdens gebruik → redirect naar `/auth`

**Audit Trail:**
- ✅ Record aanmaken → INSERT log entry
- ✅ Record wijzigen → UPDATE log entry met old/new values
- ✅ Record verwijderen → DELETE log entry
- ✅ Audit log pagina → alle entries zichtbaar

**Validation:**
- ✅ Lege verplichte velden → form error
- ✅ Ongeldige hex code → form error
- ✅ Te lange tekst → form error
- ✅ Ongeldige URL → form error

**Category Tests:**
- ✅ ALG categorie met 0 producten → direct delete toegestaan
- ✅ ALG categorie met producten → replacement dialog getoond
- ✅ GS1 categorie met producten → optie "Unlink" beschikbaar
- ✅ UNCATEGORIZED delete poging → delete knop disabled
- ✅ Parent categorie met kinderen → delete geblokkeerd
- ✅ CSV import met parent dependencies → topological sort werkt

---

## Known Limitations

1. **Soft Delete:** Records worden hard deleted (geen restore mogelijk)
2. **Concurrent Edits:** Geen optimistic locking (last write wins)

---

## Future Enhancements (v2.1+)

### Planned Features
- ✨ Bulk import/export van stamdata (CSV)
- ✨ Merge/deduplicate tool
- ✨ History compare (diff view voor old/new values)
- ✨ Soft delete met restore functionaliteit
- ✨ Audit log advanced filters (date range, user, action type)
- ✨ Drag-and-drop category reordering
- ✨ Cross-tab state sync (nieuwe taxonomy → auto-select in categories tab)
- ✨ Keyboard shortcuts (Ctrl+1 = Categories, Ctrl+2 = Taxonomies)

---

## Related Documentation

- `docs/technical/database-schema.md` - Complete database structure
- `docs/technical/user-authorization.md` - RBAC implementation
- `docs/technical/import-architecture.md` - Import system architecture
- `docs/data-model/validation-rules.md` - Validation patterns
- `docs/vibe-coding/component-patterns.md` - UI component patterns
- `PROJECT_PROMPT.md` - Complete project specification

---

## Troubleshooting

### "Geen toegang" melding
**Oorzaak:** Gebruiker is geen admin  
**Oplossing:** Laat admin je role upgraden in `user_roles` tabel

### Duplicate check werkt niet
**Oorzaak:** UNIQUE constraint ontbreekt  
**Oplossing:** Run database migration opnieuw

### Audit log leeg
**Oorzaak:** Triggers niet correct geïnstalleerd  
**Oplossing:** Controleer of alle triggers bestaan met `\df log_stamdata_changes` in psql

### Impact analysis toont geen data
**Oorzaak:** Foreign key relaties ontbreken  
**Oplossing:** Check dependencies array in `useImpactAnalysis` hook

### Category import fails
**Oorzaak:** Parent dependencies niet correct opgelost  
**Oplossing:** Check topological sort logic in `category-import.ts`

---

**Last Review:** 2025-10-29  
**Next Review:** Na v2.1 release

**Module Status:** ✅ Production Ready

# UI/UX Implementation Plan - 3-Fase Architectuur
## Van Import-First naar Funnel-First

**Status:** Planning  
**Versie:** 1.0  
**Datum:** 2025-01-16  
**Last Updated:** 2025-01-16 - Taalcorrecties toegepast (code/DB Engels, UI Nederlands)

---

## 📋 EXECUTIVE SUMMARY

Dit implementatieplan beschrijft exact welke componenten, routes, en bestanden moeten worden aangepast/gemaakt om de 3-fase architectuur te implementeren volgens het Masterplan. De transformatie splitst de huidige unified import wizard in 3 afzonderlijke flows met dedicated pages.

**Belangrijkste wijzigingen:**
- AppSidebar: Nieuwe "DATA DIRIGENT" sectie met 4 sub-items
- Routing: 11 nieuwe routes (3 voor Data Dirigent, 3 voor Export, 5 verplaatsingen)
- Components: 12 nieuwe components, 8 te verplaatsen components
- Database: 2 nieuwe kolommen (`is_temp`, `product_status`)

### 🌍 TAALGEBRUIK CONVENTIE

| Element Type | Taal | Voorbeelden |
|--------------|------|-------------|
| **Code & Files** | 🇬🇧 **ENGELS** | |
| - Bestandsnamen | Engels | `ConvertPage.tsx`, `ActivatePage.tsx` |
| - Component names | Engels | `DatasetSelector`, `ValidationPreview` |
| - Folder names | Engels | `convert/`, `activate/`, `promote/`, `enrich/` |
| - TypeScript interfaces | Engels | `ConvertPageProps`, `ActivationResult` |
| - Function names | Engels | `activateDataset()`, `convertProducts()` |
| - Edge Functions | Engels | `activate-dataset`, `export-generic` |
| - Database tabellen | Engels | `supplier_products`, `export_channels` |
| - Database kolommen | Engels | `product_status`, `is_temp` |
| - Routes | Engels | `/data-dirigent/convert`, `/export/channels` |
| | | |
| **User Interface** | 🇳🇱 **NEDERLANDS** | |
| - Menu Labels | Nederlands | "Converteren", "Activeren", "Promoveren" |
| - Button Text | Nederlands | "Dataset Activeren", "Nu Converteren" |
| - Page Titles | Nederlands | "Dataset Converteren", "Kwaliteitscontrole" |
| - Descriptions | Nederlands | "AI Kolom Mapping uitvoeren" |
| - Error Messages | Nederlands | "Dataset kon niet worden geactiveerd" |
| - Toast Notifications | Nederlands | "Dataset succesvol geactiveerd!" |
| - Table Headers | Nederlands | "Status", "Naam", "Aangemaakt op" |
| - Tooltips | Nederlands | "Upload Excel of CSV bestand" |
| - Dialog Titles | Nederlands | "Dataset Activeren Bevestigen" |
| - Form Labels | Nederlands | "Leverancier", "Merk", "Prioriteit" |
| - Help Text | Nederlands | "Kies een prioriteit voor deze dataset" |
| - Status Labels | Nederlands | "ACTIEF", "INACTIEF", "GEPROMOVEERD" |

**Database Comments:** Nederlands (voor developer reference)

```sql
COMMENT ON COLUMN import_supplier_dataset_jobs.is_temp IS 
'true = In IMPORT fase (nog niet geconverteerd), false = Geconverteerd naar supplier_products';

COMMENT ON COLUMN supplier_products.product_status IS 
'INACTIVE = Aangemaakt in Convert (niet zichtbaar in catalogus)
ACTIVE = Geactiveerd in Activate (zichtbaar in catalogus)
PROMOTED = Gepromoveerd naar master producten (toekomstig gebruik)';
```

---

## 1. COMPONENT HIËRARCHIE

### 1.1 Huidige Structuur (OLD - v5.0)

```
src/
├── pages/
│   ├── import/
│   │   └── ImportPage.tsx (5-step unified wizard)
│   ├── supplier-catalog/
│   │   └── SupplierCatalogPage.tsx (ALL products)
│   ├── products/
│   │   └── ProductsListPage.tsx
│   └── quality/
│       ├── QualityOverviewPage.tsx
│       ├── QualityReportsPage.tsx
│       └── BulkEnrichmentPage.tsx
│
├── components/
│   ├── import/
│   │   ├── DatasetCreationDialog.tsx (5-step wizard modal)
│   │   ├── steps/
│   │   │   ├── Step1SelectFile.tsx
│   │   │   ├── Step2AnalyseAndMappingStep.tsx
│   │   │   ├── MappingStep1Required.tsx
│   │   │   ├── MappingStep2Optional.tsx
│   │   │   ├── MappingStep3Confirmation.tsx
│   │   │   ├── Step4DatasetCreatieStep.tsx
│   │   │   └── Step5EindcontroleStep.tsx
│   │   └── DatasetCreationContent.tsx
│   │
│   └── promotion/
│       └── PromotionWizard.tsx (modal)
```

### 1.2 Nieuwe Structuur (NEW - v6.0)

```
src/
├── pages/
│   ├── import/
│   │   └── ImportPage.tsx (SIMPLIFIED: alleen file upload)
│   │
│   ├── data-dirigent/                          ⭐ NIEUW
│   │   ├── ConvertPage.tsx                     ⭐ NIEUW
│   │   ├── ActivatePage.tsx                    ⭐ NIEUW
│   │   ├── PromotePage.tsx                     ⭐ NIEUW (was modal)
│   │   └── EnrichPage.tsx                      ⭐ NIEUW (merge quality pages)
│   │
│   ├── export/                                  ⭐ NIEUW
│   │   ├── ExportChannelsPage.tsx              ⭐ NIEUW
│   │   ├── ExportJobsPage.tsx                  ⭐ NIEUW
│   │   └── ExportReadinessPage.tsx             ⭐ NIEUW
│   │
│   ├── inrichting/                              ⭐ NIEUW (hernoemen stamdata)
│   │   ├── PimFieldsPage.tsx                   ⭐ VERPLAATST (van ai-engine)
│   │   ├── SuppliersPage.tsx                   (blijft)
│   │   ├── BrandsPage.tsx                      (blijft)
│   │   ├── CategoriesPage.tsx                  (blijft)
│   │   ├── ColorFamiliesPage.tsx               (blijft)
│   │   ├── SizingPage.tsx                      (blijft)
│   │   └── DecorationPage.tsx                  (blijft)
│   │
│   ├── supplier-catalog/
│   │   └── SupplierCatalogPage.tsx             ⚠️ GEWIJZIGD (filter ACTIVE only)
│   │
│   └── products/
│       └── ProductsListPage.tsx                (blijft)
│
├── components/
│   ├── data-dirigent/                           ⭐ NIEUW
│   │   ├── convert/                             ⭐ NIEUW
│   │   │   ├── DatasetSelector.tsx              ⭐ NIEUW
│   │   │   ├── SupplierBrandSelector.tsx        🔄 HERGEBRUIK (van import)
│   │   │   ├── ColumnMappingWizard.tsx          🔄 HERGEBRUIK (MappingSteps)
│   │   │   ├── ValidationPreview.tsx            ⭐ NIEUW
│   │   │   └── DatasetCreationProgress.tsx      🔄 HERGEBRUIK (van import)
│   │   │
│   │   ├── activate/                            ⭐ NIEUW
│   │   │   ├── DatasetQualityReview.tsx         🔄 HERGEBRUIK (DatasetQualityScore)
│   │   │   ├── ImpactPreview.tsx                🔄 HERGEBRUIK (van import/steps)
│   │   │   ├── PrioritySelector.tsx             🔄 HERGEBRUIK (DatasetPrioritySelector)
│   │   │   └── ActivationConfirmDialog.tsx      ⭐ NIEUW
│   │   │
│   │   ├── promote/                             (blijft zelfde structuur)
│   │   │   └── PromotionWizard.tsx              (blijft)
│   │   │
│   │   └── enrich/                              ⭐ NIEUW
│   │       ├── BulkEnrichmentWorkflow.tsx       🔄 VERPLAATST (van quality)
│   │       ├── QualityReportsManager.tsx        🔄 VERPLAATST (van quality)
│   │       └── EnrichmentDashboard.tsx          ⭐ NIEUW
│   │
│   └── export/                                   ⭐ NIEUW
│       ├── ChannelConfigCard.tsx                ⭐ NIEUW
│       ├── ExportJobRow.tsx                     ⭐ NIEUW
│       └── ReadinessCheckTable.tsx              ⭐ NIEUW
```

---

## 2. ROUTING CHANGES (App.tsx)

### 2.1 Routes te Verwijderen

```typescript
// ❌ VERWIJDEREN - Wordt vervangen
import DatasetMappingPage from "./pages/ai-engine/DatasetMappingPage";
import DatasetQualityPage from "./pages/ai-engine/DatasetQualityPage";
import DatasetIntelligencePage from "./pages/ai-engine/DatasetIntelligencePage";
import PatternLearningPage from "./pages/ai-engine/PatternLearningPage";
import QualityOverviewPage from './pages/quality/QualityOverviewPage';
import QualityReportsPage from './pages/quality/QualityReportsPage';
import BulkEnrichmentPage from './pages/quality/BulkEnrichmentPage';
```

### 2.2 Nieuwe Imports

```typescript
// ⭐ NIEUWE IMPORTS - Data Dirigent
import ConvertPage from "./pages/data-dirigent/ConvertPage";
import ActivatePage from "./pages/data-dirigent/ActivatePage";
import PromotePage from "./pages/data-dirigent/PromotePage";
import EnrichPage from "./pages/data-dirigent/EnrichPage";

// ⭐ NIEUWE IMPORTS - Export
import ExportChannelsPage from "./pages/export/ExportChannelsPage";
import ExportJobsPage from "./pages/export/ExportJobsPage";
import ExportReadinessPage from "./pages/export/ExportReadinessPage";

// ⭐ NIEUWE IMPORTS - Inrichting
import PimFieldsPage from "./pages/inrichting/PimFieldsPage";
```

### 2.3 Nieuwe Route Configuratie

```typescript
<Routes>
  {/* Auth route (no layout) */}
  <Route path="/auth" element={<Auth />} />
  
  <Route path="/" element={
    <ProtectedRoute>
      <MainLayout><Outlet /></MainLayout>
    </ProtectedRoute>
  }>
    <Route index element={<Index />} />
    
    {/* ========================================== */}
    {/* FASE 1: IMPORT (SIMPLIFIED)               */}
    {/* ========================================== */}
    <Route path="import" element={<AdminGuard><ImportPage /></AdminGuard>} />
    
    {/* ========================================== */}
    {/* DATA DIRIGENT ROUTES (NEW)                */}
    {/* ========================================== */}
    <Route path="data-dirigent" element={<AdminGuard><Outlet /></AdminGuard>}>
      <Route path="convert" element={<ConvertPage />} />
      <Route path="activate" element={<ActivatePage />} />
      <Route path="promote" element={<PromotePage />} />
      <Route path="enrich" element={<EnrichPage />} />
    </Route>
    
    {/* ========================================== */}
    {/* LEVERANCIERS ROUTES                       */}
    {/* ========================================== */}
    <Route path="supplier-catalog" element={<AdminGuard><SupplierCatalogPage /></AdminGuard>} />
    
    {/* ========================================== */}
    {/* MIJN ASSORTIMENT ROUTES                   */}
    {/* ========================================== */}
    <Route path="products" element={<ProductsListPage />} />
    <Route path="products/new" element={<CreateProductPage />} />
    <Route path="products/:styleId" element={<ProductDetailPage />} />
    
    {/* ========================================== */}
    {/* EXPORT & INTEGRATIE ROUTES (NEW)          */}
    {/* ========================================== */}
    <Route path="export" element={<AdminGuard><Outlet /></AdminGuard>}>
      <Route path="channels" element={<ExportChannelsPage />} />
      <Route path="jobs" element={<ExportJobsPage />} />
      <Route path="readiness" element={<ExportReadinessPage />} />
    </Route>
    
    {/* ========================================== */}
    {/* INRICHTING ROUTES (STAMDATA HERNOEMD)     */}
    {/* ========================================== */}
    <Route path="inrichting" element={<AdminGuard><Outlet /></AdminGuard>}>
      <Route path="pim-fields" element={<PimFieldsPage />} />
      <Route path="suppliers" element={<SuppliersPage />} />
      <Route path="brands" element={<BrandsPage />} />
      <Route path="colors" element={<ColorFamiliesPage />} />
      <Route path="decoration" element={<DecorationPage />} />
      <Route path="categories" element={<CategoriesPage />} />
      <Route path="sizing" element={<SizingPage />} />
    </Route>
    
    {/* User Management Routes */}
    <Route path="users" element={<UsersPage />} />
    <Route path="profile/change-password" element={<ChangePasswordPage />} />
    
    {/* Fixes Route */}
    <Route path="fixes" element={<FixesPage />} />
    
    {/* Documentation Routes */}
    <Route path="handleiding">
      <Route index element={<DocumentationPage />} />
      <Route path=":section" element={<DocumentationPage />} />
      <Route path=":section/:page" element={<DocumentationPage />} />
    </Route>
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

### 2.4 Route Mapping Overzicht

| OLD Route | NEW Route | Status | Wijziging |
|-----------|-----------|--------|-----------|
| `/import` (5-step wizard) | `/import` (simplified) | ⚠️ GEWIJZIGD | Alleen file upload |
| `/import` Step 2-4 | `/data-dirigent/convert` | 🆕 NIEUW | AI mapping + creatie |
| `/import` Step 5 | `/data-dirigent/activate` | 🆕 NIEUW | Quality + activatie |
| Modal: PromotionWizard | `/data-dirigent/promote` | 🆕 NIEUW | Dedicated page |
| `/quality/*` (3 pages) | `/data-dirigent/enrich` | 🆕 SAMENGEVOEGD | Unified page |
| N/A | `/export/channels` | 🆕 NIEUW | Export config |
| N/A | `/export/jobs` | 🆕 NIEUW | Export history |
| N/A | `/export/readiness` | 🆕 NIEUW | Export check |
| `/ai-engine/pim-fields` | `/inrichting/pim-fields` | 🔄 VERPLAATST | Van AI → Inrichting |
| `/stamdata/*` | `/inrichting/*` | 🔄 HERNOEMD | Betere naam |

---

## 3. APPSIDEBAR UPDATES

### 3.1 Huidige Menu Structuur (OLD)

```typescript
// Huidige structuur
- Hoofdfuncties
  - Producten
  - Datakwaliteit
  - Export (disabled)
- Leveranciers
  - Catalogus
  - Databeheer
- AI Engine (collapsible)
  - Dataset Intelligence
  - Mapping Insights
  - Dataset Kwaliteit
  - PIM Velden
  - Pattern Learning
- Quality (collapsible)
  - Quality Dashboard
  - Quality Reports
  - Bulk Enrichment
  - Quality Rules
- Systeembeheer
  - Stamdata (collapsible)
  - Gebruikersbeheer
  - Handleiding
```

### 3.2 Nieuwe Menu Structuur (NEW)

```typescript
// src/components/layout/AppSidebar.tsx - NIEUWE STRUCTUUR

import { 
  Upload, ArrowRightLeft, CheckCircle, TrendingUp, 
  Sparkles, Package, ShoppingBag, Share2, Send, 
  History, CheckSquare, Settings, Users, BookOpen,
  Factory, Cog, FileText, Tag, Tags, Palette, Ruler
} from 'lucide-react';

const navigationItems = [
  // ========================================
  // IMPORT (Standalone)
  // ========================================
  {
    title: "IMPORT",
    icon: Upload,
    path: "/import",
    description: "Upload Excel/CSV bestanden",
    adminOnly: true
  },

  // ========================================
  // DATA DIRIGENT (Main Section)
  // ========================================
  {
    title: "DATA DIRIGENT",
    icon: Sparkles,
    collapsible: true,
    items: [
      {
        title: "Converteren",
        path: "/data-dirigent/convert",
        icon: ArrowRightLeft,
        description: "AI Kolom Mapping: Leverancier Data → PIM Schema",
        adminOnly: true
      },
      {
        title: "Activeren",
        path: "/data-dirigent/activate",
        icon: CheckCircle,
        description: "Kwaliteitscontrole & Activatie: INACTIEF → ACTIEF",
        adminOnly: true
      },
      {
        title: "Promoveren",
        path: "/data-dirigent/promote",
        icon: TrendingUp,
        description: "Creëer Master Producten: Leverancier → Assortiment",
        adminOnly: true
      },
      {
        title: "Verrijken",
        path: "/data-dirigent/enrich",
        icon: Sparkles,
        description: "AI Verrijking & Kwaliteitsverbetering"
      }
    ]
  },

  // ========================================
  // LEVERANCIERS
  // ========================================
  {
    title: "LEVERANCIERS",
    icon: Factory,
    items: [
      {
        title: "Catalogus",
        path: "/supplier-catalog",
        icon: Package,
        badge: "ACTIEF only",
        adminOnly: true
      }
    ]
  },

  // ========================================
  // MIJN ASSORTIMENT
  // ========================================
  {
    title: "MIJN ASSORTIMENT",
    icon: ShoppingBag,
    items: [
      {
        title: "Producten",
        path: "/products",
        icon: Package
      }
    ]
  },

  // ========================================
  // EXPORT & INTEGRATIE
  // ========================================
  {
    title: "EXPORT & INTEGRATIE",
    icon: Share2,
    collapsible: true,
    items: [
      {
        title: "Export Channels",
        path: "/export/channels",
        icon: Send,
        description: "Configureer export doelen",
        adminOnly: true
      },
      {
        title: "Export Jobs",
        path: "/export/jobs",
        icon: History,
        description: "Bekijk export geschiedenis",
        adminOnly: true
      },
      {
        title: "Export Gereedheid",
        path: "/export/readiness",
        icon: CheckSquare,
        description: "Check product export gereedheid",
        adminOnly: true
      }
    ]
  },

  // ========================================
  // INRICHTING (Stamdata hernoemd)
  // ========================================
  {
    title: "INRICHTING",
    icon: Settings,
    collapsible: true,
    adminOnly: true,
    items: [
      {
        title: "PIM Velddefinities",
        path: "/inrichting/pim-fields",
        icon: FileText,
        badge: "Admin",
        adminOnly: true
      },
      {
        title: "Leveranciers",
        path: "/inrichting/suppliers",
        icon: Factory
      },
      {
        title: "Merken",
        path: "/inrichting/brands",
        icon: Tag
      },
      {
        title: "Categorieën",
        path: "/inrichting/categories",
        icon: Tags
      },
      {
        title: "Kleuren",
        path: "/inrichting/colors",
        icon: Palette
      },
      {
        title: "Maten",
        path: "/inrichting/sizing",
        icon: Ruler
      },
      {
        title: "Decoratie",
        path: "/inrichting/decoration",
        icon: Sparkles
      }
    ]
  },

  // ========================================
  // SYSTEEM
  // ========================================
  {
    title: "SYSTEEM",
    icon: Cog,
    items: [
      {
        title: "Gebruikers",
        path: "/users",
        icon: Users,
        adminOnly: true
      },
      {
        title: "Documentatie",
        path: "/handleiding",
        icon: BookOpen
      }
    ]
  }
];
```

### 3.3 Menu Wijzigingen Overzicht

| Item | OLD Locatie | NEW Locatie | Wijziging |
|------|-------------|-------------|-----------|
| Import | Leveranciers → Databeheer | Standalone menu item | ⬆️ Promoted |
| ~~Converteren~~ | ~~N/A~~ | ~~DATA DIRIGENT → Converteren~~ | ❌ VERWIJDERD - Geïntegreerd in Import |
| Activeren | N/A | DATA DIRIGENT → Activeren | 🆕 NIEUW |
| Promoveren | N/A | DATA DIRIGENT → Promoveren | 🆕 NIEUW |
| Verrijken | N/A | DATA DIRIGENT → Verrijken | 🆕 NIEUW |
| Catalogus | Leveranciers → Catalogus | Blijft zelfde plek | ✅ Blijft |
| Export Channels | N/A | EXPORT & INTEGRATIE → Export Channels | 🆕 NIEUW |
| Export Jobs | N/A | EXPORT & INTEGRATIE → Export Jobs | 🆕 NIEUW |
| Export Gereedheid | N/A | EXPORT & INTEGRATIE → Export Gereedheid | 🆕 NIEUW |
| PIM Velden | AI Engine → PIM Velden | INRICHTING → PIM Velddefinities | 🔄 VERPLAATST |
| Stamdata | Systeembeheer → Stamdata | INRICHTING (hernoemd) | 🔄 HERNOEMD |
| AI Engine sectie | Zelfstandige sectie | ❌ VERWIJDERD | Functionaliteit verspreid |
| Quality sectie | Zelfstandige sectie | ❌ VERWIJDERD | Samengevoegd in Verrijken |

---

## 4. FILE MOVE CHECKLIST

### 4.1 Files te Creëren (NIEUW)

**Pages:**
```
✅ src/pages/data-dirigent/ConvertPage.tsx
✅ src/pages/data-dirigent/ActivatePage.tsx
✅ src/pages/data-dirigent/PromotePage.tsx
✅ src/pages/data-dirigent/EnrichPage.tsx
✅ src/pages/export/ExportChannelsPage.tsx
✅ src/pages/export/ExportJobsPage.tsx
✅ src/pages/export/ExportReadinessPage.tsx
✅ src/pages/inrichting/PimFieldsPage.tsx
```

**Components - Data Dirigent:**
```
✅ src/components/data-dirigent/convert/DatasetSelector.tsx
✅ src/components/data-dirigent/convert/ValidationPreview.tsx
✅ src/components/data-dirigent/activate/ActivationConfirmDialog.tsx
✅ src/components/data-dirigent/enrich/EnrichmentDashboard.tsx
```

**Components - Export:**
```
✅ src/components/export/ChannelConfigCard.tsx
✅ src/components/export/ExportJobRow.tsx
✅ src/components/export/ReadinessCheckTable.tsx
```

### 4.2 Files te Verplaatsen (MOVE)

```
❌ Van: src/pages/ai-engine/PimFieldsManagementPage.tsx
✅ Naar: src/pages/inrichting/PimFieldsPage.tsx

❌ Van: src/components/quality/BulkEnrichmentWorkflow.tsx
✅ Naar: src/components/data-dirigent/enrich/BulkEnrichmentWorkflow.tsx

❌ Van: src/components/quality/QualityReportsList.tsx
✅ Naar: src/components/data-dirigent/enrich/QualityReportsManager.tsx
```

### 4.3 Files te Hergebruiken (REUSE - Copy Pattern)

**Van import/ → convert/:**
```
🔄 src/components/import/steps/MappingStep1Required.tsx
   → src/components/data-dirigent/convert/ColumnMappingWizard.tsx
   
🔄 src/components/import/DatasetCreationProgress.tsx
   → src/components/data-dirigent/convert/DatasetCreationProgress.tsx
```

**Van import/steps/ → activate/:**
```
🔄 src/components/import/DatasetQualityScore.tsx
   → src/components/data-dirigent/activate/DatasetQualityReview.tsx
   
🔄 src/components/import/steps/ImpactPreview.tsx
   → src/components/data-dirigent/activate/ImpactPreview.tsx
   
🔄 src/components/import/steps/DatasetPrioritySelector.tsx
   → src/components/data-dirigent/activate/PrioritySelector.tsx
```

### 4.4 Files te Wijzigen (MODIFY)

```
⚠️ src/pages/import/ImportPage.tsx
   - VERWIJDER: Steps 2-5 wizard logic
   - BEHOUD: Step 1 file upload
   - TOEVOEGEN: Redirect naar /data-dirigent/convert

⚠️ src/pages/supplier-catalog/SupplierCatalogPage.tsx
   - TOEVOEGEN: Filter product_status='ACTIVE'
   - TOEVOEGEN: Badge indicator "ACTIEF"
   - WIJZIGEN: Promoveren button → redirect naar /data-dirigent/promote

⚠️ src/components/layout/AppSidebar.tsx
   - TOEVOEGEN: DATA DIRIGENT sectie (4 items)
   - TOEVOEGEN: EXPORT & INTEGRATIE sectie (3 items)
   - VERWIJDEREN: AI Engine sectie (5 items)
   - VERWIJDEREN: Quality sectie (4 items)
   - HERNOEMEN: Stamdata → INRICHTING
   - VERPLAATSEN: PIM Velden naar INRICHTING
```

### 4.5 Files te Verwijderen (DELETE - Na Migratie)

```
❌ src/pages/ai-engine/DatasetMappingPage.tsx (functionaliteit verspreid)
❌ src/pages/ai-engine/DatasetQualityPage.tsx (functionaliteit verspreid)
❌ src/pages/ai-engine/DatasetIntelligencePage.tsx (functionaliteit verspreid)
❌ src/pages/ai-engine/PatternLearningPage.tsx (functionaliteit verspreid)
❌ src/pages/quality/QualityOverviewPage.tsx (samengevoegd in Enrich)
❌ src/pages/quality/QualityReportsPage.tsx (samengevoegd in Enrich)
❌ src/pages/quality/BulkEnrichmentPage.tsx (samengevoegd in Enrich)
```

**BELANGRIJK:** Deze files EERST migreren naar nieuwe locaties, testen, en DAN verwijderen!

---

## 5. DATABASE MIGRATIE

### 5.1 Nieuwe Kolommen

```sql
-- Migration 1: Add is_temp column to import_supplier_dataset_jobs
ALTER TABLE import_supplier_dataset_jobs
ADD COLUMN is_temp BOOLEAN DEFAULT true;

CREATE INDEX idx_import_jobs_is_temp ON import_supplier_dataset_jobs(is_temp);
CREATE INDEX idx_import_jobs_tenant_temp ON import_supplier_dataset_jobs(tenant_id, is_temp);

COMMENT ON COLUMN import_supplier_dataset_jobs.is_temp IS 
'true = In IMPORT fase (nog niet geconverteerd), false = Geconverteerd naar supplier_products';
```

```sql
-- Migration 2: Add product_status column to supplier_products
ALTER TABLE supplier_products
ADD COLUMN product_status TEXT DEFAULT 'INACTIVE' 
CHECK (product_status IN ('INACTIVE', 'ACTIVE', 'PROMOTED'));

CREATE INDEX idx_supplier_products_status ON supplier_products(product_status);
CREATE INDEX idx_supplier_products_tenant_status ON supplier_products(tenant_id, product_status);

COMMENT ON COLUMN supplier_products.product_status IS 
'INACTIVE = Aangemaakt in Convert (niet zichtbaar in catalogus)
ACTIVE = Geactiveerd in Activate (zichtbaar in catalogus)
PROMOTED = Gepromoveerd naar master producten (toekomstig gebruik)';
```

### 5.2 Nieuwe Tabellen (Export Systeem)

```sql
-- Migration 3: Create export_channels table
CREATE TABLE export_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL, -- 'gripp', 'calculated', 'shopify', etc.
  channel_type TEXT NOT NULL, -- 'ERP', 'KMS', 'ECOMMERCE'
  is_active BOOLEAN DEFAULT true,
  config JSONB, -- Channel-specific configuration
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, channel_name)
);

CREATE INDEX idx_export_channels_tenant ON export_channels(tenant_id);
CREATE INDEX idx_export_channels_active ON export_channels(tenant_id, is_active);

COMMENT ON TABLE export_channels IS 'Configureerbare export doelen (ERP, KMS, E-commerce)';
```

```sql
-- Migration 4: Create export_channel_requirements table
CREATE TABLE export_channel_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES export_channels(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL, -- PIM field name
  is_required BOOLEAN DEFAULT true,
  validation_rule JSONB, -- Custom validation rules
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_export_requirements_channel ON export_channel_requirements(channel_id);

COMMENT ON TABLE export_channel_requirements IS 'Verplichte velden per export channel';
```

```sql
-- Migration 5: Create export_jobs table
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES export_channels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  total_products INTEGER,
  exported_products INTEGER,
  failed_products INTEGER,
  error_log JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_export_jobs_tenant ON export_jobs(tenant_id);
CREATE INDEX idx_export_jobs_channel ON export_jobs(channel_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);

COMMENT ON TABLE export_jobs IS 'Export geschiedenis en tracking';
```

---

## 6. EDGE FUNCTIONS WIJZIGINGEN

### 6.1 Edge Functions te Wijzigen

```typescript
// ⚠️ WIJZIGEN: supabase/functions/execute-mapping/index.ts
// Toevoegen: product_status = 'INACTIVE' bij INSERT

// OLD
const { data, error } = await supabase
  .from('supplier_products')
  .insert(mappedProducts);

// NEW
const { data, error } = await supabase
  .from('supplier_products')
  .insert(mappedProducts.map(p => ({
    ...p,
    product_status: 'INACTIVE' // ⭐ NIEUW
  })));
```

```typescript
// ⚠️ WIJZIGEN: supabase/functions/create-dataset-atomic/index.ts
// Toevoegen: is_temp = false update na dataset creatie

// NEW - Na succesvolle dataset creatie
await supabase
  .from('import_supplier_dataset_jobs')
  .update({ is_temp: false }) // ⭐ NIEUW
  .eq('id', import_job_id);
```

### 6.2 Edge Functions te Creëren

```typescript
// ⭐ NIEUW: supabase/functions/activate-dataset/index.ts
/**
 * Activate dataset: INACTIVE → ACTIVE
 * Handles priority logic (REPLACE vs DOMINATE)
 */
export async function activateDataset(
  datasetId: string, 
  priority: 'low' | 'medium' | 'high'
) {
  // 1. Update dataset priority
  await supabase
    .from('datasets')
    .update({ priority, status: 'active' })
    .eq('id', datasetId);
  
  // 2. Execute priority logic
  if (priority === 'high') {
    // REPLACE: Deactivate other datasets
    await deactivateConflictingDatasets(datasetId);
  }
  
  // 3. Update product_status
  await supabase
    .from('supplier_products')
    .update({ product_status: 'ACTIVE' })
    .eq('dataset_id', datasetId);
}
```

```typescript
// ⭐ NIEUW: supabase/functions/deactivate-dataset/index.ts
/**
 * Deactivate dataset: ACTIVE → INACTIVE
 */
export async function deactivateDataset(datasetId: string) {
  await supabase
    .from('supplier_products')
    .update({ product_status: 'INACTIVE' })
    .eq('dataset_id', datasetId);
}
```

```typescript
// ⭐ NIEUW: supabase/functions/export-generic/index.ts
/**
 * Generic export function
 * Handles any channel based on export_channels config
 */
export async function exportGeneric(
  channelId: string,
  productIds: string[]
) {
  // 1. Fetch channel config
  const { data: channel } = await supabase
    .from('export_channels')
    .select('*, export_channel_requirements(*)')
    .eq('id', channelId)
    .single();
  
  // 2. Validate products against requirements
  const validationResults = await validateProducts(productIds, channel);
  
  // 3. Transform data based on channel config
  const exportData = await transformData(productIds, channel);
  
  // 4. Create export job
  const { data: job } = await supabase
    .from('export_jobs')
    .insert({
      channel_id: channelId,
      status: 'running',
      total_products: productIds.length
    })
    .select()
    .single();
  
  // 5. Execute export (channel-specific logic)
  await executeExport(exportData, channel, job.id);
}
```

---

## 7. IMPLEMENTATIE VOLGORDE (Stappenplan)

### Week 1: Foundation & Database
1. ✅ Database migraties uitvoeren (is_temp, product_status)
2. ✅ Export tabellen creëren (export_channels, export_jobs, etc.)
3. ✅ Edge Functions wijzigen (execute-mapping, create-dataset-atomic)
4. ✅ Nieuwe Edge Functions maken (activate-dataset, deactivate-dataset)

### Week 2: Import Split & Convert
5. ✅ ImportPage.tsx vereenvoudigen (alleen file upload)
6. ✅ ConvertPage.tsx + components maken
7. ✅ DatasetSelector component
8. ✅ ColumnMappingWizard hergebruiken
9. ✅ ValidationPreview component
10. ✅ Test flow: Import → Convert

### Week 3: Activate & Catalogus Update
11. ✅ ActivatePage.tsx + components maken
12. ✅ DatasetQualityReview hergebruiken
13. ✅ ActivationConfirmDialog component
14. ✅ SupplierCatalogPage.tsx wijzigen (filter ACTIVE)
15. ✅ Test flow: Convert → Activate → Catalogus

### Week 4: Promote & Enrich
16. ✅ PromotePage.tsx maken (wrapper rond PromotionWizard)
17. ✅ EnrichPage.tsx maken (merge quality pages)
18. ✅ EnrichmentDashboard component
19. ✅ Test flow: Catalogus → Promote → Products

### Week 5: Export Systeem
20. ✅ ExportChannelsPage.tsx + components
21. ✅ ExportJobsPage.tsx + components
22. ✅ ExportReadinessPage.tsx + components
23. ✅ export-generic Edge Function
24. ✅ Test export flows

### Week 6: Navigation & Inrichting
25. ✅ AppSidebar.tsx updaten (nieuwe menu structuur)
26. ✅ App.tsx routes updaten
27. ✅ PimFieldsPage verplaatsen naar Inrichting
28. ✅ Stamdata → Inrichting hernoemen
29. ✅ Test alle navigatie flows

### Week 7: Testing & Cleanup
30. ✅ End-to-end testing hele funnel flow
31. ✅ Performance testing (100k+ rows)
32. ✅ Oude AI Engine pages verwijderen
33. ✅ Oude Quality pages verwijderen
34. ✅ Documentation updaten

---

## 8. RISICO'S & MITIGATIE

### Hoog Risico
- **Data Loss**: Product_status niet correct gezet → Products verdwijnen
  - **Mitigatie**: Database backup + rollback procedure
  
- **Broken Navigation**: Routes niet correct → 404 errors
  - **Mitigatie**: Redirects voor oude URLs

### Medium Risico
- **User Confusion**: Nieuwe flow is anders dan verwacht
  - **Mitigatie**: Tooltips + in-app guidance
  
- **Performance**: Filtering op product_status vertraagt queries
  - **Mitigatie**: Indexes op nieuwe kolommen

### Laag Risico
- **Edge Function Timeouts**: Activatie duurt te lang
  - **Mitigatie**: Batch processing

---

## 9. SUCCESS CRITERIA

### Functioneel
- ✅ User kan bestand uploaden in `/import`
- ✅ User wordt automatisch doorgestuurd naar `/data-dirigent/convert`
- ✅ AI mapping werkt correct in Convert
- ✅ Products worden aangemaakt met status='INACTIVE'
- ✅ Quality check toont correcte scores in Activate
- ✅ Activatie zet product_status='ACTIVE'
- ✅ Catalogus toont alleen ACTIVE products
- ✅ Promoveren wizard werkt vanuit dedicated page
- ✅ Export channels zijn configureerbaar

### Technisch
- ✅ Alle database migraties succesvol
- ✅ Alle nieuwe Edge Functions gedeployed
- ✅ Alle routes werkend zonder 404s
- ✅ Sidebar navigatie correct
- ✅ Geen data loss tijdens migratie

### Performance
- ✅ Import flow < 5 seconden voor 1000 rows
- ✅ Activatie < 3 seconden voor 1000 products
- ✅ Catalogus laadtijd < 2 seconden
- ✅ Queries met product_status filter < 500ms

---

## 10. DOCUMENTATIE UPDATES

Na implementatie deze docs updaten:
- ✅ `docs/ui-ux/navigation-strategy.md`
- ✅ `docs/ui-ux/user-flows.md`
- ✅ `docs/technical/import-architecture.md` (v6.0)
- ✅ `docs/technical/export-architecture.md` (v2.0)
- ✅ `docs/technical/database-schema.md`
- ✅ `docs/gebruikershandleiding/03-import-proces/*` (split in 3)

---

## 11. TAALGEBRUIK VALIDATIE CHECKLIST

Voor het finaliseren:
- [ ] Alle file namen zijn Engels (`ConvertPage.tsx`, `ActivatePage.tsx`)
- [ ] Alle folder namen zijn Engels (`convert/`, `activate/`, `promote/`, `enrich/`)
- [ ] Alle database kolommen/tabellen zijn Engels (`product_status`, `is_temp`)
- [ ] Alle routes zijn Engels (`/data-dirigent/convert`, `/export/channels`)
- [ ] Alle TypeScript interfaces zijn Engels (`ConvertPageProps`, `ActivationResult`)
- [ ] Alle function names zijn Engels (`activateDataset()`, `convertProducts()`)
- [ ] Edge Functions zijn Engels (`activate-dataset`, `export-generic`)
- [ ] Database comments zijn Nederlands (voor developer reference)
- [ ] Alle menu items zijn Nederlands ("Converteren", "Activeren")
- [ ] Alle button texts zijn Nederlands ("Dataset Activeren", "Nu Converteren")
- [ ] Alle page titles zijn Nederlands ("Dataset Converteren")
- [ ] Alle beschrijvingen zijn Nederlands ("AI Kolom Mapping uitvoeren")
- [ ] Alle error messages zijn Nederlands ("Dataset kon niet worden geactiveerd")
- [ ] Alle toast messages zijn Nederlands ("Dataset succesvol geactiveerd!")
- [ ] Alle tooltips zijn Nederlands ("Upload Excel of CSV bestand")
- [ ] Alle table headers zijn Nederlands ("Status", "Naam", "Aangemaakt op")
- [ ] Alle dialog titles zijn Nederlands ("Dataset Activeren Bevestigen")
- [ ] Alle form labels zijn Nederlands ("Leverancier", "Merk", "Prioriteit")
- [ ] Alle help texts zijn Nederlands ("Kies een prioriteit voor deze dataset")
- [ ] Alle status labels in UI zijn Nederlands ("ACTIEF", "INACTIEF")

---

**Completion Date:** 2025-01-16  
**Next Phase:** UI/UX Implementation → Code Refactoring

# Priority Architecture V2.0

**Status:** ✅ ACTIVE (Implemented 2025-11-13)  
**Supersedes:** Priority system in `pim_field_definitions` (deprecated)

---

## 🎯 Core Principle

**Databundels zijn de master source voor priority bepaling.**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────┐         ┌──────────────────┐       │
│  │ data_bundles  │────────▶│ data_bundle_     │       │
│  │               │         │    fields        │       │
│  │ - SUPPLIER_   │         │                  │       │
│  │   PRODUCT_MVP │         │ - priority_level │       │
│  │ - MASTER_DATA │         │   (P0/P1/P2/P3)  │       │
│  └───────────────┘         └──────────────────┘       │
│         │                           │                  │
│         │ Master Source             │                  │
│         └───────────────┬───────────┘                  │
│                         │                              │
│                         ▼                              │
│         ┌──────────────────────────────┐              │
│         │ pim_field_priorities_        │              │
│         │   aggregated VIEW            │              │
│         │                              │              │
│         │ - effective_priority         │              │
│         │   (highest from all bundles) │              │
│         │ - bundle_count               │              │
│         │ - bundle_priorities[]        │              │
│         └──────────────────────────────┘              │
│                         │                              │
│                         ▼                              │
│         ┌──────────────────────────────┐              │
│         │ Priority Tab (READ-ONLY)     │              │
│         │ Quality Score Calculator     │              │
│         │ Export Validators            │              │
│         └──────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  DEPRECATED (kept for AI recognition only)              │
│                                                         │
│  ┌───────────────────────────────────────┐             │
│  │ pim_field_definitions                 │             │
│  │                                       │             │
│  │ - priority (DEPRECATED)               │             │
│  │   └─ Used ONLY for AI mapping context│             │
│  │   └─ Do NOT use for display/logic    │             │
│  └───────────────────────────────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### **Master Source: `data_bundle_fields`**

```sql
CREATE TABLE data_bundle_fields (
  id INTEGER PRIMARY KEY,
  bundle_id INTEGER NOT NULL REFERENCES data_bundles(id),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  field_key TEXT REFERENCES pim_field_definitions(field_key), -- NEW!
  priority_level TEXT CHECK (priority_level IN ('P0', 'P1', 'P2', 'P3')),
  is_required_converteren BOOLEAN DEFAULT false,
  is_required_promotie BOOLEAN DEFAULT false,
  is_required_verrijken BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  -- ... other fields
);
```

**Key Points:**
- `priority_level` = **Master source** voor priority
- Een veld kan in meerdere bundels zitten met **verschillende priorities**
- `field_key` linkt naar `pim_field_definitions` voor AI recognition metadata

### **Aggregated View: `pim_field_priorities_aggregated`**

```sql
CREATE OR REPLACE VIEW pim_field_priorities_aggregated AS
SELECT 
  pfd.id,
  pfd.field_key,
  pfd.field_label_nl,
  -- Neem de HOOGSTE priority (laagste P-nummer) uit alle bundles
  MIN(dbf.priority_level) as effective_priority,
  -- Aantal bundles waar dit veld in zit
  COUNT(DISTINCT dbf.bundle_id) as bundle_count,
  -- Array van bundle priorities
  JSONB_AGG(DISTINCT jsonb_build_object(
    'bundle_id', db.id,
    'bundle_code', db.bundle_code,
    'bundle_name', db.bundle_name_nl,
    'priority', dbf.priority_level
  )) as bundle_priorities
FROM pim_field_definitions pfd
LEFT JOIN data_bundle_fields dbf ON pfd.field_key = dbf.field_key
LEFT JOIN data_bundles db ON db.id = dbf.bundle_id
WHERE pfd.is_active = true
GROUP BY pfd.id, pfd.field_key;
```

**Use Cases:**
- ✅ Read-only Priority tab display
- ✅ Dashboard widgets
- ✅ Reporting

### **Deprecated: `pim_field_definitions.priority`**

```sql
-- ⚠️ DEPRECATED COLUMN
-- Used ONLY for AI recognition context
-- Do NOT use for display, validation, or business logic

COMMENT ON COLUMN pim_field_definitions.priority IS 
  'DEPRECATED: Priority is now managed in data_bundle_fields per bundle. 
   This column is kept for backwards compatibility but should not be used in new code.';
```

---

## 🔧 Code Migration Guide

### ❌ OLD (Deprecated)

```typescript
// DON'T DO THIS ANYMORE
import { usePimFieldDefinitions } from '@/hooks/use-pim-field-definitions';

const { data: pimFields } = usePimFieldDefinitions();
const p0Fields = pimFields?.filter(f => f.priority === 'P0'); // ❌ WRONG
```

### ✅ NEW (Correct)

```typescript
// For read-only display (Priority tab)
import { usePimFieldPrioritiesAggregated } from '@/hooks/use-pim-field-priorities-aggregated';

const { data: aggregatedFields } = usePimFieldPrioritiesAggregated();
const p0Fields = aggregatedFields?.filter(f => f.effective_priority === 'P0'); // ✅ CORRECT

// For priority management (Data Bundles tab)
import { useBundleFields } from '@/hooks/use-bundle-fields';

const { data: bundleFields } = useBundleFields(bundleId);
const p0FieldsInBundle = bundleFields?.filter(f => f.priority_level === 'P0'); // ✅ CORRECT
```

### Quality Score Calculator

**✅ UPDATED (2025-11-13)** - Now uses `data_bundle_fields.priority_level`

#### Database Function
The PostgreSQL function `calculate_dataset_quality()` has been updated to:
- Query `data_bundle_fields.priority_level` via `field_key` join
- Use `MIN(priority_level)` when a field appears in multiple bundles
- Match quality weights: P0=45%, P1=30%, P2=15%, P3=10%

```sql
-- Architecture V2: Priorities from data bundles
WITH bundle_field_priorities AS (
  SELECT 
    pfd.field_key,
    MIN(dbf.priority_level) as effective_priority,
    COALESCE(pfd.quality_weight, 5) as quality_weight
  FROM data_bundle_fields dbf
  INNER JOIN pim_field_definitions pfd ON pfd.field_key = dbf.field_key
  WHERE pfd.is_active = true
    AND dbf.priority_level IS NOT NULL
  GROUP BY pfd.field_key, pfd.quality_weight
)
-- ... rest of calculation
```

#### Frontend Usage
The `quality-score-calculator.ts` receives priorities through typed results that already contain correct priorities:

```typescript
// Quality score calculator receives correct priorities via types
export function calculateQualityScore(
  fieldGroupResults: FieldGroupValidationResult[], // Already has correct priority from field_groups table
  individualFieldResults?: IndividualFieldValidationResult[], // Already has correct priority from data_bundle_fields
  brandId?: number | null,
  supplierId?: number | null
): QualityScoreResult {
  // Uses priorities passed in via results, no direct DB query needed
}
```

### Import Flow

```typescript
// AI Mapping uses pim_field_definitions for recognition (OK)
const { data: pimFields } = usePimFieldDefinitions();
const aiMappingSuggestions = await mapColumnsWithAI(pimFields); // ✅ OK (AI context)

// After mapping, assign to bundle with priority
await supabase.from('data_bundle_fields').insert({
  bundle_id: SUPPLIER_PRODUCT_MVP_BUNDLE_ID,
  table_name: 'supplier_products',
  column_name: 'ean',
  field_key: 'ean',
  priority_level: 'P0', // ✅ Set priority in bundle
});
```

---

## 📁 Files Modified

### Core Infrastructure
- ✅ `src/hooks/use-pim-field-priorities-aggregated.ts` - **NEW**
- ✅ `src/types/pim-fields.ts` - **NEW**
- ✅ `src/hooks/use-pim-field-definitions.ts` - Deprecated warnings added
- ✅ `src/hooks/use-pim-field-column-links.ts` - Deprecated warnings added
- ✅ `src/pages/ai-engine/PimFieldsManagementPage.tsx` - **REFACTORED** (read-only)

### Database
- ✅ Migration: Added `field_key` to `data_bundle_fields`
- ✅ Migration: Created `pim_field_priorities_aggregated` view
- ✅ Migration: Added deprecation comment to `pim_field_definitions.priority`

### Components (No Changes Needed)
- ✅ Data Bundles components already use `priority_level` correctly
- ✅ Field Groups components use field group priorities (separate system)
- ✅ Validators use field group priorities (separate system)

---

## 🎯 Use Cases

### 1. **Display Priority Overview** (Read-Only)
**Use:** `pim_field_priorities_aggregated` view

```typescript
const { data: aggregatedFields } = usePimFieldPrioritiesAggregated();
```

**When to use:**
- Priority tab display
- Dashboard widgets
- Reports

### 2. **Manage Priority per Bundle**
**Use:** `data_bundle_fields` table

```typescript
const { data: bundleFields } = useBundleFields(bundleId);
const { updateFieldProperties } = useBundleFieldMutations();

updateFieldProperties.mutate({
  fieldId: field.id,
  updates: { priority_level: 'P0' }
});
```

**When to use:**
- Data Bundles detail page
- Priority assignment during import
- Bundle configuration

### 3. **Calculate Quality Score** ✅ DONE
**Use:** Database function `calculate_dataset_quality()` which queries `data_bundle_fields`

```typescript
// Frontend: use RPC function (automatically uses data_bundle_fields)
const { data } = await supabase
  .rpc('calculate_dataset_quality', { 
    p_import_job_id: importJobId 
  })
  .single();

// Result includes priorities from data_bundle_fields via field_key join
```

**When to use:**
- Product quality assessment
- Import validation
- Export readiness checks

### 4. **AI Recognition** (Legacy OK)
**Use:** `pim_field_definitions.priority` (still OK for this use case)

```typescript
const { data: pimFields } = usePimFieldDefinitions();
// AI uses priority for context about field importance
const suggestions = await aiMapColumns(fileColumns, pimFields);
```

**When to use:**
- Column mapping AI suggestions
- Import wizard initial mapping
- Confidence score calculation

---

## 🚨 Migration Checklist

### For Developers

- [ ] Check all uses of `pim_field_definitions.priority` in your code
- [ ] Replace with `data_bundle_fields.priority_level` for business logic
- [ ] Use `pim_field_priorities_aggregated` for read-only displays
- [ ] Update quality score calculations to use bundle priorities
- [ ] Keep `pim_field_definitions.priority` ONLY for AI recognition context

### For System

- [x] Database migration executed
- [x] Aggregated view created
- [x] `field_key` populated in existing `data_bundle_fields`
- [x] Deprecation warnings added to code
- [x] Priority tab refactored to read-only
- [x] Quality score calculator updated (`calculate_dataset_quality` function)
- [ ] Import flow updated to assign to bundles (TODO)
- [ ] Export validators updated (TODO)
- [x] Documentation updated

---

## 🔮 Future Work

### Phase 1: Core Refactoring (DONE)
- [x] Create aggregated view
- [x] Refactor Priority tab to read-only
- [x] Add deprecation warnings

### Phase 2: Business Logic Migration (IN PROGRESS)
- [x] Update quality score calculator (PostgreSQL function + frontend)
- [ ] Update import flow to assign to bundles
- [ ] Update export validators

### Phase 3: Complete Deprecation (FUTURE)
- [ ] Remove all business logic uses of `pim_field_definitions.priority`
- [ ] Consider removing column (breaking change)
- [ ] Update all documentation

---

## ❓ FAQ

### Q: Can a field have different priorities in different bundles?
**A:** Yes! That's the whole point. Example:
- `ean` is **P0** in "Supplier Product MVP" bundle
- `ean` is **P1** in "Master Data Complete" bundle

### Q: What is "effective priority"?
**A:** The **highest** priority (lowest P-number) from all bundles. If `ean` is P0 in one bundle and P1 in another, effective priority = **P0**.

### Q: Should I still use `pim_field_definitions.priority`?
**A:** **ONLY** for AI recognition context. For all display, validation, and business logic, use databundle priorities.

### Q: How do I add a field to a bundle?
**A:** Use the Data Bundles detail page. Drag a field into a priority group.

### Q: How do I change a field's priority?
**A:** Go to Data Bundles → Select bundle → Drag field to different priority group OR click Edit on the field.

---

**Last Updated:** 2025-11-13  
**Version:** 2.0  
**Status:** Active

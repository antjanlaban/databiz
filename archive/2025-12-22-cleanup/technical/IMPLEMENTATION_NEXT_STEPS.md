# Progressive Quality Ladder - Volgende Stappen

**Status:** ✅ Database Foundation & Core Logic Geïmplementeerd (Stappen 1-5)

**Datum:** 2025-11-10

---

## ✅ Voltooide Stappen

### Stap 1: Database Migration ✅
**Status:** Compleet
- ✅ `pim_field_groups` tabel aangemaakt
- ✅ `field_group_id` kolom toegevoegd aan `pim_field_definitions`
- ✅ 4 Field Groups geseed: color, style, size, ean
- ✅ Bestaande velden gekoppeld aan Field Groups
- ✅ Quality weights gecorrigeerd naar 50/30/15/5

**Verificatie:**
```sql
-- Field Groups check
SELECT * FROM pim_field_groups ORDER BY field_group_id;
-- Result: 4 rows (color, ean, size, style) ✅

-- Field mappings check
SELECT field_key, field_group_id, priority, quality_weight 
FROM pim_field_definitions 
WHERE field_group_id IS NOT NULL 
ORDER BY field_group_id;
-- Result: 6 velden correct gekoppeld ✅
-- Quality weights: 50 (P0), 30 (P1), 15 (P2), 5 (P3) ✅
```

### Stap 2: TypeScript Type Definitions ✅
**Status:** Compleet
- ✅ `src/types/field-groups.ts` aangemaakt
- ✅ Interfaces: `PriorityLevel`, `ValidationPhase`, `FieldGroup`, `FieldGroupValidationResult`, `ProductValidationResult`, `QualityScoreResult`

### Stap 3: Core Validation Logic ✅
**Status:** Compleet
- ✅ `src/lib/validation/field-group-validator.ts` - OR-logic validatie
- ✅ `src/lib/validation/quality-score-calculator.ts` - Correcte weights (50/30/15/5)

**Key Functions:**
- `validateFieldGroup()` - Valideert 1 Field Group met OR-logic
- `validateProduct()` - Valideert compleet product
- `getFieldGroupsForPhase()` - Phase-aware filtering
- `calculateQualityScore()` - Met correcte weights

### Stap 4: DatasetQualityScore Component Update ✅
**Status:** Compleet
- ✅ Quality weights gecorrigeerd (45→50, 10→5)
- ✅ Info text bijgewerkt met correcte weights
- ✅ Display labels bijgewerkt

### Stap 5: FieldGroupCard Component ✅
**Status:** Compleet
- ✅ Nieuwe reusable component aangemaakt
- ✅ Shows OR-logic indicator
- ✅ Visual field status (present/missing)
- ✅ Warning messages voor partial matches
- ✅ Priority badges

### Stap 6: useFieldGroups Hook ✅
**Status:** Compleet
- ✅ `src/hooks/use-field-groups.ts` aangemaakt
- ✅ Fetches Field Groups from database
- ✅ Phase-aware filtering
- ✅ Caching met React Query

---

## 🔄 Volgende Stappen (Prioriteit Volgorde)

### STAP 7: MappingStep2Optional Refactor (HIGH PRIORITY)
**Doel:** Toon Field Groups als logische units tijdens import mapping

**Wat moet er gebeuren:**
1. Fetch Field Groups met `useFieldGroups()` hook
2. Group fields by `field_group_id`
3. Render Field Groups met header en OR-logic indicator
4. Show "Minimaal 1 veld vereist" per Field Group
5. Highlight Field Groups zonder mapped fields (warning)

**Aanpak:**
```tsx
// In MappingStep2Optional.tsx
import { useFieldGroups } from '@/hooks/use-field-groups';
import { FieldGroupCard } from '../FieldGroupCard';

// Fetch Field Groups
const { data: fieldGroups } = useFieldGroups();

// Group mappings by Field Group
const fieldGroupMappings = fieldGroups?.map(group => ({
  group,
  mappedFields: group.fields.filter(f => mappings[f]),
  unmappedFields: group.fields.filter(f => !mappings[f])
}));

// Render per Field Group
{fieldGroupMappings?.map(({ group, mappedFields, unmappedFields }) => (
  <Card key={group.groupId}>
    <CardHeader>
      <div className="flex items-center gap-2">
        <span className="font-medium">{group.label.nl}</span>
        <Badge>OR-logica: Min. {group.minRequired} veld</Badge>
        {mappedFields.length === 0 && <AlertTriangle className="text-orange-500" />}
      </div>
    </CardHeader>
    <CardContent>
      {group.fields.map(field => (
        <ColumnSelectWithPreview
          key={field}
          value={mappings[field]}
          onValueChange={(v) => onMappingChange(field, v)}
          availableColumns={availableColumns}
          columnSamples={columnSamples}
        />
      ))}
    </CardContent>
  </Card>
))}
```

**Geschatte tijd:** 45 minuten

---

### STAP 8: Dataset Creation - Field Group Validation (MEDIUM PRIORITY)
**Doel:** Valideer Field Groups tijdens dataset creatie

**Wat moet er gebeuren:**
1. Update `DatasetCreationContent.tsx` om Field Groups te gebruiken
2. Gebruik `validateProduct()` voor elke rij
3. Toon Field Group validation feedback
4. Update `ValidationStatsAlert.tsx` voor Field Group messaging

**Bestand:** `src/components/import/DatasetCreationContent.tsx`

**Aanpak:**
```tsx
// In DatasetCreationContent.tsx
import { validateProduct } from '@/lib/validation/field-group-validator';
import { useFieldGroups } from '@/hooks/use-field-groups';

const { data: fieldGroups } = useFieldGroups();

// Tijdens validatie van elke rij
const validationResult = validateProduct(
  productData, 
  fieldGroups || [], 
  'converteren'
);

if (!validationResult.canProceed) {
  // Show blocking issues
  console.error('Validation failed:', validationResult.blockingIssues);
}
```

**Geschatte tijd:** 1 uur

---

### STAP 9: Import Wizard Validation Step (LOW PRIORITY)
**Doel:** Toon phase-aware validation results in import wizard

**Optie 1: Nieuwe ValidationStep Component**
- Create `src/components/import/steps/ValidationStep.tsx`
- Show validation results per priority (P0, P1, P2)
- Field Group specific messages
- Phase indicator (converteren vs promotie)

**Optie 2: Integreer in bestaande Step5EindcontroleStep**
- Add Field Group validation display
- Show warnings voor partial Field Groups

**Geschatte tijd:** 1.5 uur

---

### STAP 10: Backend Integration (MEDIUM PRIORITY)
**Doel:** Update Edge Functions voor Field Group awareness

**Edge Functions om te updaten:**
1. `analyze-dataset-quality` - Gebruik Field Groups in quality calculation
2. `calculate-dataset-completeness` - Field Group basis completeness
3. `analyze-supplier-file` - Field Group detection

**Geschatte tijd:** 2 uur

---

### STAP 11: Promotion Wizard Integration (LOW PRIORITY)
**Doel:** Field Groups in promotie wizard

**Bestand:** `src/pages/data-dirigent/PromotePage.tsx`

**Wat moet er gebeuren:**
1. Validate Field Groups tijdens promotie
2. Show "Promotie: Alle velden vereist" warnings
3. Block promotie if P1 Field Groups niet compleet

**Geschatte tijd:** 1 uur

---

### STAP 12: Testing & Documentation (LOW PRIORITY)
**Doel:** Comprehensive testing en gebruikersdocumentatie

**Taken:**
1. Unit tests voor `validateFieldGroup()` en `calculateQualityScore()`
2. Integration tests voor import wizard met Field Groups
3. Update gebruikershandleiding met Field Group concept
4. Screenshot examples van Field Group UI

**Geschatte tijd:** 2 uur

---

## 🎯 Aanbevolen Volgorde

**Deze week (High Priority):**
1. ✅ Stap 7: MappingStep2Optional Refactor
2. ✅ Stap 8: Dataset Creation Validation

**Volgende week (Medium Priority):**
3. Stap 10: Backend Integration (Edge Functions)
4. Stap 9: Validation Step UI

**Toekomst (Low Priority):**
5. Stap 11: Promotion Wizard
6. Stap 12: Testing & Docs

---

## 📊 Huidige Impact

**Database:**
- ✅ 1 nieuwe tabel (`pim_field_groups`)
- ✅ 1 nieuwe kolom (`field_group_id` in `pim_field_definitions`)
- ✅ 4 Field Groups geseed
- ✅ 6 velden gekoppeld

**Code:**
- ✅ 3 nieuwe files (types, validator, calculator)
- ✅ 1 nieuwe component (FieldGroupCard)
- ✅ 1 nieuwe hook (use-field-groups)
- ✅ 1 updated component (DatasetQualityScore)
- ⏳ 1 component te updaten (MappingStep2Optional)

**User Experience:**
- ✅ Correctere quality scores (50/30/15/5 weights)
- ⏳ Duidelijkere validation messages (OR-logic)
- ⏳ Betere mapping guidance tijdens import

---

## 🔗 Gerelateerde Documentatie

- ✅ `docs/technical/progressive-quality-ladder.md` - Master document
- ✅ `docs/technical/field-group-validation.md` - Validation logic
- ✅ `docs/technical/pim-field-definitions.md` - Database schema
- ✅ `docs/vibe-coding/development-workflow.md` - Development patterns
- ✅ `docs/technical/import-architecture.md` - Import flow

---

## 🚨 Belangrijke Notities

### Breaking Changes
- ⚠️ Quality score calculation veranderd (oude scores niet meer geldig)
- ⚠️ Bestaande datasets moeten herberekend worden met nieuwe formula
- ✅ Database migrations backwards compatible

### Performance
- ✅ Field Groups cached in React Query (5 min)
- ✅ Validation logic efficiënt (O(n) per Field Group)
- ⚠️ TODO: Test performance met 10,000+ producten

### Security
- ✅ RLS policies blijven onveranderd
- ✅ Tenant isolation gehandhaafd
- ✅ Field Groups tenant-agnostic (stamdata)

---

**Laatste update:** 2025-11-10
**Volgende review:** Na voltooiing Stap 7 & 8

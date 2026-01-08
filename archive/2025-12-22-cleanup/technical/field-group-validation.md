# Field Group Validation - Technical Implementation

**Last Updated:** 2025-01-16  
**Version:** 1.0 - Progressive Quality Ladder System  
**Related:** `progressive-quality-ladder.md`, `validation-rules.md`

---

## 🎯 Purpose

This document defines the **TypeScript interfaces**, **validation logic**, and **UI patterns** for implementing **Field Groups** with **OR-logic validation** across the Van Kruiningen PIM import/promotion workflow.

**Core Concept:**  
Field Groups allow suppliers to provide data using alternative field names for the same concept (e.g., "Color Name" OR "Color Code"). The system validates that **at least one field** in the group is present and valid.

---

## 🏗️ TypeScript Interfaces

### Core Data Structures

```typescript
/**
 * Field Group Definition
 * Represents a logical grouping of alternative PIM fields
 */
interface FieldGroup {
  /** Unique identifier for this field group */
  groupId: string;
  
  /** Display label (NL/EN) */
  label: { nl: string; en: string };
  
  /** Array of PIM field keys that belong to this group */
  fields: string[];
  
  /** Minimum number of fields required to satisfy this group */
  minRequired: number; // Default: 1 (OR-logic)
  
  /** Priority level for this group (P0/P1/P2/P3) */
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  
  /** Phase when this group becomes required */
  requiredForPhase: 'converteren' | 'promotie' | 'verrijken';
  
  /** Description explaining the purpose of this group */
  description: string;
  
  /** Icon for UI display (optional) */
  icon?: string;
}

/**
 * Field Group Validation Result
 * Result of validating a single field group against product data
 */
interface FieldGroupValidationResult {
  /** Group identifier */
  groupId: string;
  
  /** Whether the group validation passed */
  satisfied: boolean;
  
  /** Number of fields present in the product data */
  fieldsPresent: number;
  
  /** Number of fields required */
  fieldsRequired: number;
  
  /** List of field keys that were found */
  presentFields: string[];
  
  /** List of field keys that were missing */
  missingFields: string[];
  
  /** Priority level of this group */
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  
  /** Error message if validation failed (null if satisfied) */
  errorMessage: string | null;
  
  /** Suggested action for the user */
  suggestion?: string;
}

/**
 * Complete Validation Result for a Product
 * Aggregates all field group validations + quality score
 */
interface ProductValidationResult {
  /** Product identifier (SKU or row number) */
  productId: string;
  
  /** Overall quality score (0-100) */
  qualityScore: number;
  
  /** Completeness level */
  completenessLevel: 'excellent' | 'good' | 'basic' | 'poor';
  
  /** Array of field group validation results */
  fieldGroupResults: FieldGroupValidationResult[];
  
  /** Can this product proceed to next phase? */
  canProceed: boolean;
  
  /** Blocking issues (P0 failures) */
  blockingIssues: string[];
  
  /** Warnings (P1 failures) */
  warnings: string[];
  
  /** Recommendations (P2/P3 missing) */
  recommendations: string[];
  
  /** Current phase context */
  phase: 'converteren' | 'promotie' | 'verrijken';
}
```

---

## 📋 Standard Field Groups

### Field Group Definitions

```typescript
const STANDARD_FIELD_GROUPS: FieldGroup[] = [
  {
    groupId: 'color_group',
    label: { nl: 'Kleur Identificatie', en: 'Color Identification' },
    fields: ['supplier_color', 'supplier_color_code'],
    minRequired: 1,
    priority: 'P1',
    requiredForPhase: 'converteren',
    description: 'Leverancier moet kleur leveren via naam OF code',
    icon: '🎨'
  },
  {
    groupId: 'style_group',
    label: { nl: 'Stijl Identificatie', en: 'Style Identification' },
    fields: ['supplier_style', 'supplier_style_code'],
    minRequired: 1,
    priority: 'P1',
    requiredForPhase: 'converteren',
    description: 'Leverancier moet stijl leveren via naam OF artikelnummer',
    icon: '👕'
  },
  {
    groupId: 'size_group',
    label: { nl: 'Maat Identificatie', en: 'Size Identification' },
    fields: ['supplier_size', 'supplier_size_code'],
    minRequired: 1,
    priority: 'P1',
    requiredForPhase: 'converteren',
    description: 'Leverancier moet maat leveren via waarde OF code',
    icon: '📏'
  },
  {
    groupId: 'ean_group',
    label: { nl: 'EAN Identificatie', en: 'EAN Identification' },
    fields: ['ean_supplier', 'ean_master'],
    minRequired: 1,
    priority: 'P2',
    requiredForPhase: 'promotie',
    description: 'EAN leverancier OF master EAN (verplicht voor export)',
    icon: '📊'
  }
];
```

---

## 🔍 Validation Logic

### Core Validation Function

```typescript
/**
 * Validate a single field group against product data
 */
function validateFieldGroup(
  fieldGroup: FieldGroup,
  productData: Record<string, any>,
  currentPhase: 'converteren' | 'promotie' | 'verrijken'
): FieldGroupValidationResult {
  const presentFields: string[] = [];
  const missingFields: string[] = [];
  
  // Check which fields are present and valid
  for (const fieldKey of fieldGroup.fields) {
    const value = productData[fieldKey];
    const isPresent = value !== null && value !== undefined && value !== '';
    
    if (isPresent) {
      presentFields.push(fieldKey);
    } else {
      missingFields.push(fieldKey);
    }
  }
  
  const fieldsPresent = presentFields.length;
  const satisfied = fieldsPresent >= fieldGroup.minRequired;
  
  // Generate error message if not satisfied
  let errorMessage: string | null = null;
  let suggestion: string | undefined;
  
  if (!satisfied) {
    const fieldNames = fieldGroup.fields.map(f => `'${f}'`).join(' OF ');
    errorMessage = `Field Group '${fieldGroup.groupId}' niet voldaan: minimaal ${fieldGroup.minRequired} van [${fieldNames}] vereist.`;
    
    // Phase-specific suggestions
    if (currentPhase === 'converteren' && fieldGroup.requiredForPhase === 'converteren') {
      suggestion = '⚠️ Aanbevolen om te corrigeren voor activatie';
    } else if (currentPhase === 'promotie' && fieldGroup.requiredForPhase === 'promotie') {
      suggestion = '🚫 Verplicht voor promotie naar master catalogus';
    }
  }
  
  return {
    groupId: fieldGroup.groupId,
    satisfied,
    fieldsPresent,
    fieldsRequired: fieldGroup.minRequired,
    presentFields,
    missingFields,
    priority: fieldGroup.priority,
    errorMessage,
    suggestion
  };
}

/**
 * Validate all field groups for a product
 */
function validateProduct(
  productData: Record<string, any>,
  fieldGroups: FieldGroup[],
  currentPhase: 'converteren' | 'promotie' | 'verrijken'
): ProductValidationResult {
  const fieldGroupResults: FieldGroupValidationResult[] = [];
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Validate each field group
  for (const group of fieldGroups) {
    const result = validateFieldGroup(group, productData, currentPhase);
    fieldGroupResults.push(result);
    
    if (!result.satisfied) {
      // Categorize by priority
      if (result.priority === 'P0') {
        blockingIssues.push(result.errorMessage!);
      } else if (result.priority === 'P1') {
        warnings.push(result.errorMessage!);
      } else {
        recommendations.push(result.errorMessage!);
      }
    }
  }
  
  // Calculate quality score
  const qualityScore = calculateQualityScore(fieldGroupResults, productData);
  
  // Determine completeness level
  let completenessLevel: 'excellent' | 'good' | 'basic' | 'poor';
  if (qualityScore >= 90) completenessLevel = 'excellent';
  else if (qualityScore >= 70) completenessLevel = 'good';
  else if (qualityScore >= 50) completenessLevel = 'basic';
  else completenessLevel = 'poor';
  
  // Can proceed if no P0 blocking issues
  const canProceed = blockingIssues.length === 0;
  
  return {
    productId: productData.supplier_sku || 'unknown',
    qualityScore,
    completenessLevel,
    fieldGroupResults,
    canProceed,
    blockingIssues,
    warnings,
    recommendations,
    phase: currentPhase
  };
}

/**
 * Calculate weighted quality score
 */
function calculateQualityScore(
  fieldGroupResults: FieldGroupValidationResult[],
  productData: Record<string, any>
): number {
  const weights = {
    P0: 40, // Critical
    P1: 30, // Required
    P2: 20, // Recommended
    P3: 10  // Optional
  };
  
  let totalWeight = 0;
  let earnedWeight = 0;
  
  for (const result of fieldGroupResults) {
    const weight = weights[result.priority];
    totalWeight += weight;
    
    if (result.satisfied) {
      earnedWeight += weight;
    }
  }
  
  // Additional checks for non-group fields (P0: SKU, Name, Category)
  // ... (add similar logic for individual P0 fields)
  
  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}
```

---

## 🎨 UI Patterns

### Field Group Card Component

```tsx
interface FieldGroupCardProps {
  group: FieldGroup;
  result: FieldGroupValidationResult;
}

function FieldGroupCard({ group, result }: FieldGroupCardProps) {
  const priorityColors = {
    P0: 'destructive',
    P1: 'default',
    P2: 'secondary',
    P3: 'outline'
  } as const;
  
  return (
    <Card className={result.satisfied ? 'border-green-500' : 'border-amber-500'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{group.icon}</span>
            <CardTitle className="text-sm">{group.label.nl}</CardTitle>
          </div>
          <Badge variant={priorityColors[group.priority]}>
            {group.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {group.description}
        </p>
        
        {/* Field Status */}
        <div className="space-y-2">
          {group.fields.map(fieldKey => {
            const isPresent = result.presentFields.includes(fieldKey);
            return (
              <div key={fieldKey} className="flex items-center gap-2">
                {isPresent ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300" />
                )}
                <span className={cn(
                  "text-sm",
                  isPresent ? "text-foreground" : "text-muted-foreground"
                )}>
                  {fieldKey}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* OR Logic Indicator */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Minimaal {group.minRequired} veld vereist (OR-logica)
          </p>
          {result.satisfied ? (
            <p className="text-xs text-green-600 font-medium mt-1">
              ✓ Voldoet aan eis ({result.fieldsPresent}/{group.fields.length} aanwezig)
            </p>
          ) : (
            <p className="text-xs text-amber-600 font-medium mt-1">
              ⚠ Onvoldoende ({result.fieldsPresent}/{group.fields.length} aanwezig)
            </p>
          )}
        </div>
        
        {/* Suggestion */}
        {result.suggestion && (
          <Alert className="mt-3">
            <AlertDescription className="text-xs">
              {result.suggestion}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

### Quality Score Summary

```tsx
interface QualityScoreSummaryProps {
  result: ProductValidationResult;
}

function QualityScoreSummary({ result }: QualityScoreSummaryProps) {
  const completenessConfig = {
    excellent: { color: 'text-green-600', label: 'Excellent', icon: '🌟' },
    good: { color: 'text-blue-600', label: 'Goed', icon: '✓' },
    basic: { color: 'text-amber-600', label: 'Basis', icon: '⚠' },
    poor: { color: 'text-red-600', label: 'Onvoldoende', icon: '✗' }
  };
  
  const config = completenessConfig[result.completenessLevel];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dataset Kwaliteitsscore</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Score Display */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-4xl font-bold">{result.qualityScore}</p>
            <p className="text-sm text-muted-foreground">van 100</p>
          </div>
          <div className={cn("text-right", config.color)}>
            <p className="text-2xl">{config.icon}</p>
            <p className="text-sm font-medium">{config.label}</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <Progress value={result.qualityScore} className="mb-4" />
        
        {/* Issue Summary */}
        <div className="space-y-2">
          {result.blockingIssues.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>🔴 Kritieke fouten (P0)</AlertTitle>
              <AlertDescription>
                {result.blockingIssues.length} blokkerende problemen gevonden
              </AlertDescription>
            </Alert>
          )}
          
          {result.warnings.length > 0 && (
            <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>🟡 Waarschuwingen (P1)</AlertTitle>
              <AlertDescription>
                {result.warnings.length} verplichte Field Groups niet voldaan
              </AlertDescription>
            </Alert>
          )}
          
          {result.recommendations.length > 0 && (
            <Alert variant="default" className="border-blue-500">
              <Info className="h-4 w-4" />
              <AlertTitle>🔵 Aanbevelingen (P2/P3)</AlertTitle>
              <AlertDescription>
                {result.recommendations.length} optionele velden ontbreken
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Can Proceed? */}
        <div className="mt-4 pt-4 border-t">
          {result.canProceed ? (
            <p className="text-sm text-green-600 font-medium">
              ✓ Kan doorgaan naar volgende fase
            </p>
          ) : (
            <p className="text-sm text-red-600 font-medium">
              ✗ Kritieke fouten moeten eerst worden opgelost
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🔄 Phase-Aware Validation Matrix

### Converteren Phase (Import)

```typescript
const CONVERTEREN_VALIDATION: FieldGroup[] = [
  // P0 (Critical) - Always required
  { groupId: 'sku', priority: 'P0', ... },
  { groupId: 'name', priority: 'P0', ... },
  { groupId: 'category', priority: 'P0', ... },
  
  // P1 (Required) - Field Groups with OR-logic
  { groupId: 'color_group', priority: 'P1', requiredForPhase: 'converteren', ... },
  { groupId: 'style_group', priority: 'P1', requiredForPhase: 'converteren', ... },
  { groupId: 'size_group', priority: 'P1', requiredForPhase: 'converteren', ... },
  
  // P2 (Recommended) - Optional in Converteren
  { groupId: 'ean_group', priority: 'P2', requiredForPhase: 'promotie', ... },
];
```

### Promotie Phase (to Master Catalog)

```typescript
const PROMOTIE_VALIDATION: FieldGroup[] = [
  // P0/P1 from Converteren (stricter enforcement)
  ...CONVERTEREN_VALIDATION,
  
  // P2 becomes stricter - EAN now required
  { groupId: 'ean_group', priority: 'P1', requiredForPhase: 'promotie', ... },
  
  // Additional P2 requirements
  { groupId: 'price_group', priority: 'P2', ... },
  { groupId: 'image_group', priority: 'P2', ... },
];
```

---

## 🧪 Usage Examples

### Example 1: Validate Single Product

```typescript
import { STANDARD_FIELD_GROUPS } from '@/lib/field-groups';
import { validateProduct } from '@/lib/validation/field-group-validator';

const productData = {
  supplier_sku: 'ABC-123',
  supplier_name: 'T-Shirt Navy',
  category_id: 5,
  supplier_color: 'Navy',          // ✓ Color group satisfied
  // supplier_color_code: MISSING   // Not needed (OR-logic)
  supplier_style_code: 'TS-001',   // ✓ Style group satisfied
  // supplier_style: MISSING        // Not needed (OR-logic)
  supplier_size: 'L',              // ✓ Size group satisfied
  // ean_supplier: MISSING          // ⚠ Warning (P2 in Converteren)
};

const result = validateProduct(
  productData,
  STANDARD_FIELD_GROUPS,
  'converteren'
);

console.log(result);
// {
//   productId: 'ABC-123',
//   qualityScore: 85,
//   completenessLevel: 'good',
//   canProceed: true,
//   blockingIssues: [],
//   warnings: [],
//   recommendations: ['EAN group not satisfied'],
//   fieldGroupResults: [...]
// }
```

### Example 2: Batch Validation

```typescript
const products = await supabase
  .from('supplier_datasets')
  .select('*')
  .eq('import_job_id', jobId);

const results = products.data.map(product =>
  validateProduct(product, STANDARD_FIELD_GROUPS, 'converteren')
);

// Summary statistics
const summary = {
  total: results.length,
  canProceed: results.filter(r => r.canProceed).length,
  blocked: results.filter(r => !r.canProceed).length,
  avgQualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length
};

console.log(summary);
// { total: 1000, canProceed: 950, blocked: 50, avgQualityScore: 82.5 }
```

---

## 📚 Related Documentation

- **Progressive Quality Ladder Master:** `docs/technical/progressive-quality-ladder.md`
- **Validation Rules:** `docs/data-model/validation-rules.md`
- **Import Architecture:** `docs/technical/import-architecture.md`
- **User Guide (Convert):** `docs/gebruikershandleiding/03-import-proces/02-converteren.md`

---

## 🔄 Migration Notes

**Database Changes Required:**
```sql
-- Add field_group_id to pim_field_definitions
ALTER TABLE pim_field_definitions
ADD COLUMN field_group_id TEXT;

-- Create pim_field_groups table
CREATE TABLE pim_field_groups (
  group_id TEXT PRIMARY KEY,
  label_nl TEXT NOT NULL,
  label_en TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  required_for_phase TEXT NOT NULL CHECK (required_for_phase IN ('converteren', 'promotie', 'verrijken')),
  min_required INTEGER DEFAULT 1,
  description TEXT,
  icon TEXT
);

-- Seed standard field groups
INSERT INTO pim_field_groups VALUES
  ('color_group', 'Kleur Identificatie', 'Color Identification', 'P1', 'converteren', 1, 'Leverancier moet kleur leveren via naam OF code', '🎨'),
  ('style_group', 'Stijl Identificatie', 'Style Identification', 'P1', 'converteren', 1, 'Leverancier moet stijl leveren via naam OF artikelnummer', '👕'),
  ('size_group', 'Maat Identificatie', 'Size Identification', 'P1', 'converteren', 1, 'Leverancier moet maat leveren via waarde OF code', '📏'),
  ('ean_group', 'EAN Identificatie', 'EAN Identification', 'P2', 'promotie', 1, 'EAN leverancier OF master EAN', '📊');
```

**Component Updates Required:**
- ✅ `MappingStep2Optional.tsx` - Display Field Groups visually
- ✅ `ValidationStatsAlert.tsx` - Show Field Group satisfaction
- ✅ `DatasetQualityScore.tsx` - Use new quality calculation
- ✅ `QualityScoreDialog.tsx` - Detailed Field Group breakdown

---

**End of Document**

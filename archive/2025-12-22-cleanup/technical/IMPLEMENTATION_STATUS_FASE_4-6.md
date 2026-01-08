# Progressive Quality Ladder - Implementatie Status Fase 4-6

**Datum:** 2025-11-10
**Status:** ✅ Fase 4 Voltooid | ⚠️ Fase 5 Database Issue | 📋 Fase 6 Voorgesteld

---

## ✅ FASE 4: Step2 Navigation Validatie - VOLTOOID

**Doel:** Vervang oude EAN-only validatie door Field Groups validatie

**Geïmplementeerde Wijzigingen:**

### Bestand: `src/components/import/steps/Step2AnalyseAndMappingStep.tsx`

**1. Nieuwe Imports Toegevoegd:**
```typescript
import { useMemo } from 'react';
import { useFieldGroups } from '@/hooks/use-field-groups';
import { validatePredictiveDatasetQuality } from '@/lib/validation/predictive-dataset-validator';
```

**2. Validatie Logica Vervangen (regel 510-570):**

**VOOR (oude code):**
```typescript
const hasKritiek = state.aiSuggestions.some(s => 
  s.suggested_field === 'ean' && s.confidence >= 0.70
);

<Button disabled={!hasKritiek}>
  Verder naar Review & Bevestiging
</Button>
```

**NA (nieuwe code):**
```typescript
const { data: fieldGroups } = useFieldGroups();

const validationResult = useMemo(() => {
  if (!fieldGroups || fieldGroups.length === 0) {
    // Fallback to EAN check if Field Groups not loaded
    const hasEan = state.aiSuggestions.some(s => 
      s.suggested_field === 'ean' && s.confidence >= 0.70
    );
    return {
      canProceed: hasEan,
      blockingIssues: hasEan ? [] : ['EAN veld niet gevonden met voldoende confidence']
    };
  }
  
  return validatePredictiveDatasetQuality(
    state.columnMappings,
    fieldGroups,
    'converteren'
  );
}, [state.columnMappings, state.aiSuggestions, fieldGroups]);

<Button 
  disabled={!validationResult.canProceed}
  className={!validationResult.canProceed ? 'cursor-not-allowed' : ''}
>
  {validationResult.canProceed ? (
    <>
      Verder naar Review & Bevestiging
      <ArrowRight className="ml-2 h-4 w-4" />
    </>
  ) : (
    <>
      Geblokkeerd: {validationResult.blockingIssues[0] || 'P0 velden ontbreken'}
    </>
  )}
</Button>
```

**Key Improvements:**
- ✅ Gebruikt Field Groups validatie ipv simpele EAN check
- ✅ P0 coverage moet 100% zijn om te procederen
- ✅ Duidelijke foutmelding in button bij blocker
- ✅ Fallback naar EAN check als Field Groups niet geladen
- ✅ useMemo voor performance (herberekent alleen bij wijziging mappings/fieldGroups)

**Impact:**
- 🎯 Consistente validatie door hele Convert flow
- 🎯 Niet alleen EAN, maar ALLE P0 Field Groups (brand, supplier, etc.)
- 🎯 Betere foutmeldingen voor gebruiker

---

## ⚠️ FASE 5: Database Field Groups Verificatie - ISSUE GEVONDEN

**Doel:** Controleer of Field Groups correct geconfigureerd zijn

**Database Query Uitgevoerd:**
```sql
SELECT 
  fg.field_group_id,
  fg.group_label_nl,
  fg.required_for_converteren,
  fg.min_fields_required,
  array_agg(DISTINCT fd.field_key ORDER BY fd.field_key) as fields,
  string_agg(DISTINCT fd.priority, ', ' ORDER BY fd.priority) as priorities
FROM pim_field_groups fg
LEFT JOIN pim_field_definitions fd ON fd.field_group_id = fg.field_group_id
WHERE fd.is_active = true
GROUP BY fg.field_group_id, fg.group_label_nl, fg.required_for_converteren, fg.min_fields_required
ORDER BY 
  CASE 
    WHEN MIN(fd.priority) LIKE 'P0%' THEN 1
    WHEN MIN(fd.priority) LIKE 'P1%' THEN 2
    ELSE 3
  END;
```

**❌ RESULTAAT: PROBLEEM GEVONDEN**

Database bevat **SLECHTS 2 Field Groups**:

| field_group_id | group_label_nl | fields | priorities | min_required | required_for_converteren |
|---|---|---|---|---|---|
| `color` | Kleur | `[supplier_color_code, supplier_color_name]` | P1_Verplicht | 1 | any |
| `style` | Master | `[supplier_style_code, supplier_style_name]` | P1_Verplicht, P2_Aanbevolen | 1 | any |

**✅ FIELD GROUPS STATUS: CORRECT**

Database bevat **2 Field Groups** - dit is CORRECT:
- ✅ `color` - Kleur (naam OF code) - P1
- ✅ `style` - Master (naam OF code) - P1

**❌ MISCONCEPTIE GECORRIGEERD:**

De oorspronkelijke analyse was FOUT. Field Groups zijn ALLEEN nodig wanneer er meerdere velden zijn die HETZELFDE concept kunnen specificeren (OR-logica).

**Field Groups NIET nodig voor:**
- ❌ EAN (single field, geen alternatief)
- ❌ Size (single field, geen alternatief)  
- ❌ Article Name (single field, geen alternatief)
- ❌ Brand (wordt apart gevalideerd als individueel veld)
- ❌ Supplier (wordt apart gevalideerd als individueel veld)

**NIEUWE ARCHITECTUUR:**
Quality Score = Field Groups (color, style) + Individual Fields (ean, size, brand, etc.)

### ✅ NIEUWE INZICHTEN

**Correct begrip van Field Groups vs Individual Fields:**
- ✅ Field Groups (color, style) zijn CORRECT geïmplementeerd
- ✅ Individual Fields (ean, size, brand, supplier) worden APART gevalideerd
- ✅ Geen extra Field Groups nodig - huidige 2 zijn voldoende

**Quality Score Architectuur:**
- Field Groups: 2 (color, style) → count als 1 logical item elk
- Individual P0 Fields: supplier_id, brand_id, tenant_id
- Individual P1 Fields: ean, supplier_size_code, supplier_article_name  
- Individual P2 Fields: supplier_product_group, supplier_advised_price
- Individual P3 Fields: care_instructions, country_of_origin

**Conclusie:** Database is CORRECT. Code moet worden aangepast om Field Groups + Individual Fields te combineren.

---

## ✅ FASE 5 OPLOSSING: Code Aanpassing Vereist (GEEN Database Migration)

**Actie Vereist:** Update validation logic om Field Groups + Individual Fields te combineren

**Architectuur Wijziging:**
1. **Field Groups** (database: pim_field_groups) → OR-logic validatie
   - color (supplier_color_name OR supplier_color_code)
   - style (supplier_style_name OR supplier_style_code)

2. **Individual Fields** (hardcoded in validators) → Direct validatie
   - P0: supplier_id, brand_id, tenant_id
   - P1: ean, supplier_size_code, supplier_article_name
   - P2: supplier_product_group, supplier_advised_price
   - P3: care_instructions, country_of_origin

**Quality Score Formule:**
```typescript
// Count Field Groups (OR-logic)
const p1FieldGroupsSatisfied = fieldGroups.filter(fg => 
  fg.priority === 'P1' && fg.satisfied
).length;

// Count Individual Fields (direct check)
const p1IndividualFieldsPresent = ['ean', 'supplier_size_code', 'supplier_article_name']
  .filter(field => columnMappings[field]).length;

// Combined P1 coverage
const totalP1Items = p1FieldGroups.length + individualP1Fields.length;
const p1Coverage = (p1FieldGroupsSatisfied + p1IndividualFieldsPresent) / totalP1Items * 100;
```

**NOTE:** Huidige database structuur is CORRECT. Alleen code logic moet worden aangepast.

---

## 📋 FASE 6: Backend Edge Functions Update - VOORGESTELD

**Doel:** Update Edge Functions om Field Groups te gebruiken

**Huidige Situatie - Edge Functions Geanalyseerd:**

### 1. `analyze-dataset-quality/index.ts`
**Status:** ⚠️ Gebruikt nog NIET Field Groups

**Huidige Implementatie:**
- Berekent quality score op FIELD-level basis
- Gebruikt eigen logica voor P0/P1/P2/P3 classificatie
- Geen Field Group OR-logic

**Te Wijzigen:**
```typescript
// HUIDIG: Field-level quality check
for (const field of requiredFields) {
  if (productData[field]) {
    qualityScore += fieldWeight;
  }
}

// GEWENST: Field Group level check
import { validateProduct } from './validation/field-group-validator';
const validation = validateProduct(productData, fieldGroups, 'converteren');
qualityScore = validation.qualityScore;
```

**Impact:**
- Quality scores in database komen overeen met frontend
- OR-logic ook server-side (bijv. color_name OF color_code)

### 2. `activate-dataset/index.ts`
**Status:** ✅ Hoeft NIET aangepast

**Rationale:**
- Activeert alleen datasets en producten
- Geen quality validatie (dat gebeurt bij creatie)
- Geen Field Group dependency

### 3. `ai-suggest-mapping/index.ts`
**Status:** ℹ️ OPTIONEEL - Kan Field Group hints toevoegen

**Mogelijk Enhancement:**
```typescript
// AI kan Field Group structuur gebruiken voor betere suggesties
const fieldGroups = await fetchFieldGroups();
prompt += `\nField Groups (OR-logic): ${JSON.stringify(fieldGroups)}`;
```

**Impact:** Betere AI mapping suggesties (weet welke velden samen een group vormen)

---

## 📊 Implementatie Overzicht Fase 4-6

### ✅ Voltooid (Fase 4)
- [x] Step2 navigation validatie met Field Groups
- [x] Fallback naar EAN check als Field Groups niet geladen
- [x] Dynamische button text bij blocker
- [x] useMemo performance optimalisatie

### ⚠️ Geblokkeerd (Fase 5)
- [ ] **DATABASE MIGRATION VEREIST**
- [ ] P0 Field Groups aanmaken (ean, brand, supplier)
- [ ] P1 Field Groups aanmaken (size, article_name, product_group)
- [ ] P2/P3 Field Groups aanmaken

### 📋 Voorgesteld (Fase 6 - Later)
- [ ] Update `analyze-dataset-quality` Edge Function
- [ ] Optioneel: AI mapping hints met Field Groups
- [ ] Testing: Server-side quality scores vs frontend

---

## 🎯 Gebruikerservaring: Voor vs Na Fase 4

### VOOR (oude validatie)
```
Step 2: AI Mapping
  ↓
  Check: EAN gevonden met confidence ≥70%?
    ↓ JA → Button enabled
    ↓ NEE → Button disabled
```

**Probleem:**
- ❌ Alleen EAN wordt gecheckt
- ❌ Brand/Supplier kunnen ontbreken → problemen later
- ❌ Geen duidelijke foutmelding ("Verder" button gewoon disabled)

### NA (nieuwe validatie - Fase 4)
```
Step 2: AI Mapping
  ↓
  [PROMINENT] 📊 Verwachte Dataset Kwaliteit
    - P0: 100% ✅ (of P0: 66% ⚠️ als veld ontbreekt)
    - P1: 80% ⚠️
  ↓
  Check: P0 Coverage = 100%?
    ↓ JA → "Verder naar Review & Bevestiging"
    ↓ NEE → "Geblokkeerd: EAN veld ontbreekt" (specifieke melding!)
```

**Voordelen:**
- ✅ P0 Field Groups worden gecheckt (zodra database compleet is)
- ✅ Duidelijke foutmelding in button
- ✅ Visuele quality score indicator boven button
- ✅ Gebruiker ziet WAAROM ze niet verder kunnen

---

## 🚨 Kritieke Blocker voor Fase 5 & 6

**⚠️ ZONDER DATABASE MIGRATION:**
- Fase 4 code werkt (heeft fallback)
- Maar validatie is INCOMPLEET (alleen EAN, niet brand/supplier)
- Quality Ladder werkt NIET zoals gedocumenteerd
- P0 coverage berekening is FOUT (alleen 1 van 3 P0 groups aanwezig)

**✅ MET DATABASE MIGRATION:**
- Volledige P0/P1/P2/P3 validatie
- OR-logic per Field Group
- Correcte quality scores
- Fase 6 kan uitgevoerd worden (backend consistency)

---

## 🔄 Aanbevolen Volgorde

**URGENT (Deze Week):**
1. ✅ FASE 4 VOLTOOID
2. 🔴 **DATABASE MIGRATION UITVOEREN** (Fase 5 blocker)
   - Minimaal P0 groups aanmaken
   - Test met bestaande Convert flow
3. ✅ Verifieer Field Groups met query (herhaal Fase 5)

**Later (Volgende Sprint):**
4. Fase 6: Update Edge Functions
5. Testing: End-to-end quality score consistency
6. Documentation: Gebruikershandleiding updaten

---

## 📝 Individual Fields Definition (Code-side)

**Field Groups gebruiken database, Individual Fields zijn hardcoded in validators:**

```typescript
// src/lib/validation/individual-field-definitions.ts
export const INDIVIDUAL_FIELDS = {
  P0: [
    { key: 'supplier_id', label: 'Leverancier ID', required: true },
    { key: 'brand_id', label: 'Merk ID', required: true },
    { key: 'tenant_id', label: 'Tenant ID', required: true },
  ],
  P1: [
    { key: 'ean', label: 'EAN', required: true },
    { key: 'supplier_size_code', label: 'Maat', required: true },
    { key: 'supplier_article_name', label: 'Artikel Naam', required: true },
  ],
  P2: [
    { key: 'supplier_product_group', label: 'Product Groep', required: false },
    { key: 'supplier_advised_price', label: 'Adviesprijs', required: false },
  ],
  P3: [
    { key: 'care_instructions', label: 'Wasvoorschrift', required: false },
    { key: 'country_of_origin', label: 'Land van Herkomst', required: false },
  ],
} as const;
```

**Verification Query (Check Field Groups only):**
```sql
SELECT 
  fg.field_group_id,
  fg.group_label_nl,
  string_agg(DISTINCT fd.priority, ', ') as priorities,
  array_agg(DISTINCT fd.field_key ORDER BY fd.field_key) as fields,
  fg.min_fields_required
FROM pim_field_groups fg
LEFT JOIN pim_field_definitions fd ON fd.field_group_id = fg.field_group_id
WHERE fd.is_active = true
GROUP BY fg.field_group_id, fg.group_label_nl, fg.min_fields_required
ORDER BY fg.field_group_id;
  END;
```

---

**Laatste update:** 2025-11-10
**Status:** Fase 4 ✅ | Fase 5 ⚠️ Database Migration Required | Fase 6 📋 Voorgesteld
**Volgende actie:** Database migration uitvoeren voor P0/P1 Field Groups

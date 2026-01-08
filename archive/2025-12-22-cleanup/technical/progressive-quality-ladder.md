# 🎯 Progressive Quality Ladder - Van Kruiningen PIM

**Versie:** 1.0  
**Datum:** Januari 2025  
**Status:** MASTER REFERENTIE - Centraal begrippenkader voor data kwaliteit

---

## Executive Summary

Dit document definieert het **Progressive Quality Ladder** systeem: een uniform begrippenkader voor PIM Field Requirements met Field Groups en phase-aware validatie.

**Doel:**
- ✅ Uniforme terminologie door ALLE documentatie (MVP/Good/Better/Best)
- ✅ Strikt MVP-focus: Alleen P0 velden zijn verplicht voor import
- ✅ Field Groups met OR-logica voor alternatieve velden
- ✅ Transparante kwaliteitsscore voor gebruikers

**Kernprincipe:**  
> "MVP (P0) definieert het Minimum Viable Product - alleen deze velden zijn verplicht voor import naar de catalogus. Good (P1), Better (P2) en Best (P3) velden zijn optioneel en verhogen alleen de kwaliteitsscore."

---

## 🎯 Priority Levels: MVP/Good/Better/Best

### Uniforme Terminologie

| Code | NL Label | EN Label | Database Value | Quality Weight |
|------|----------|----------|----------------|----------------|
| **P0** | MVP | MVP | `P0_Kritiek` | 50% |
| **P1** | Good | Good | `P1_Verplicht` | 30% |
| **P2** | Better | Better | `P2_Aanbevolen` | 15% |
| **P3** | Best | Best | `P3_Optioneel` | 5% |

**BELANGRIJKSTE WIJZIGING:**  
Alleen **P0 (MVP)** velden zijn verplicht voor import. Alle voormalige P1 velden zijn naar P0 verplaatst. P1/P2/P3 (Good/Better/Best) zijn nu puur optioneel en beïnvloeden alleen de kwaliteitsscore.

---

### P0: MVP (Minimum Viable Product)

**Definitie:** Absolute minimumvereisten voor opname in de catalogus. Dit zijn ALLE velden die verplicht zijn voor import.

**Criteria:**
- ✅ Product kan **niet geïmporteerd** worden zonder dit veld
- ✅ Essentieel voor product identificatie en differentiatie (SKU, kleur, maat, naam)
- ✅ Basis voor alle workflows (promotie, enrichment, export)
- ✅ Database integrity (foreign keys, unique constraints)

**Voorbeelden:**
- `supplier_id` - Welke leverancier? (foreign key, verplicht)
- `brand_id` - Welk merk? (foreign key, verplicht voor KERN products)
- `tenant_id` - Multi-tenancy isolation (security critical)
- **Kleur Group:** `supplier_color_name` OF `supplier_color_code` (min. 1 vereist)
- **Stijl Group:** `supplier_style_name` OF `supplier_style_code` (min. 1 vereist)
- **Maat:** `supplier_size_code` (geen alternatief - direct verplicht)
- **EAN:** `ean` (unieke barcode - geen alternatief)

**Validatie:**
- **Converteren:** HARD BLOCKER - Geen P0 fouten toegestaan, import wordt geblokkeerd
- **Promotie:** HARD BLOCKER
- **Verrijken:** HARD BLOCKER

**Quality Impact:** 50% van dataset quality score  
**UI Indicator:** 🚨 Rood - "MVP"

---

### P1: Good (Waardevolle Metadata)

**Definitie:** Waardevolle extra data die producten verrijkt maar NIET verplicht is voor import.

**Criteria:**
- ✅ Verbetert gebruikservaring of data rijkheid
- ✅ Helpt bij categorisatie, filtering of search
- ✅ Ondersteunt besluitvorming (prijzen, categorieën)
- ✅ Geen blocker voor import

**Voorbeelden:**
- `supplier_product_group` - Helpt bij automatische categorisatie
- `supplier_advised_price` - Basis voor prijsstrategie
- `fabric_weight_gsm` - Technische spec voor kwaliteitsbeoordeling

**Validatie:**
- **Converteren:** OPTIONAL - Geen blocker, verhoogt alleen kwaliteitsscore
- **Promotie:** OPTIONAL - Geen blocker
- **Verrijken:** ENCOURAGED - Actief proberen te verrijken

**Quality Impact:** 30% van dataset quality score  
**UI Indicator:** 🔴 Oranje - "Good"

---

### P2: Better (Uitgebreide Metadata)

**Definitie:** Uitgebreide metadata die product kwaliteit verder verbetert.

**Criteria:**
- ✅ Verbetert product beschrijving en SEO
- ✅ Ondersteunt geavanceerde filtering
- ✅ Technische specificaties

**Voorbeelden:**
- `material_composition` - Verbetert product beschrijving en SEO
- `washing_instructions` - Wasvoorschrift voor klantenservice

**Validatie:**
- **Converteren:** OPTIONAL - Geen impact
- **Promotie:** OPTIONAL - Geen impact
- **Verrijken:** ENCOURAGED - Actief proberen te verrijken

**Quality Impact:** 15% van dataset quality score  
**UI Indicator:** 🔵 Blauw - "Better"

---

### P3: Best (Premium Metadata)

**Definitie:** Premium metadata voor maximale data kwaliteit.

**Criteria:**
- ✅ Niche use cases (specifieke filters, advanced search)
- ✅ Marketing/SEO verrijking
- ✅ Toekomstige features die nog niet actief zijn

**Voorbeelden:**
- `country_of_origin` - Herkomst, relevant voor duurzaamheid filters
- `certification_marks` - ISO norms, OEKO-TEX, etc.
- `fit_type` - Regular/Slim/Loose, fashion-specifieke metadata

**Validatie:**
- **Converteren:** IGNORED - Geen impact
- **Promotie:** IGNORED
- **Verrijken:** NICE TO HAVE - Laagste prioriteit

**Quality Impact:** 5% van dataset quality score  
**UI Indicator:** ⚪ Grijs - "Best"

---

## 🔗 Field Groups - OR-Logic voor Alternatieven

### Concept

**Probleem:**  
Leveranciers gebruiken verschillende veldnamen voor hetzelfde concept:
- Leverancier A: "Kleurnaam" (bijv. "Navy")
- Leverancier B: "Kleurcode" (bijv. "NVY")

**Oude aanpak (FOUT):**
- `supplier_color_name` = P0 (MVP)
- `supplier_color_code` = P3 (Best)
- **Probleem:** Leverancier B faalt MVP validatie (heeft geen kleurnaam)

**Nieuwe aanpak (CORRECT - Field Groups):**
- Field Group "Kleur": `supplier_color_name` OF `supplier_color_code`
- **Beide velden** = P0 (MVP niveau)
- **OR-logic:** Minimaal 1 van de 2 vereist voor import
- **Waarschuwing:** Bij enkel kleurcode → "Conversie naar kleurnaam aanbevolen"

---

### Field Group Definitie

```typescript
interface FieldGroup {
  groupId: string;                      // 'color', 'style', 'size'
  groupLabel: string;                   // 'Kleur (Naam of Code)'
  fields: string[];                     // ['supplier_color_name', 'supplier_color_code']
  requiredForPhase: {
    converteren: 'any' | 'all' | 'none';  // OR-logic (min 1)
    promotie: 'any' | 'all' | 'none';     // AND-logic (alle velden)
    verrijken: 'any' | 'all' | 'none';
  };
  minFieldsRequired: number;            // Voor converteren: 1, promotie: 2
  warningIfPartial?: {
    message: string;
    recommendation: string;
  };
}
```

---

### Standaard Field Groups

#### 1. Kleur Group (Color)

**Fields:** `supplier_color_name`, `supplier_color_code`  
**Priority:** Beide P0 (MVP)  
**OR-logic:** Minimaal 1 vereist

**Validatie per fase:**
- **Converteren:** `any` - Min 1 veld OK voor import, maar waarschuwing bij enkel code
- **Promotie:** `all` - Beide velden vereist (conversie naar master kleurnaam)
- **Verrijken:** `all` - Beide velden + Pantone match ideaal

**Waarschuwing:**
```
⚠️ Enkel kleurcode aanwezig (geen kleurnaam)

Een kleurnaam is beter voor leesbaarheid. Kleurcode vereist conversie 
bij promotie naar master data.

Aanbeveling: Voeg kolom 'Kleurnaam' toe in volgende import.
```

---

#### 2. Stijl/Model Group (Style)

**Fields:** `supplier_style_name`, `supplier_style_code`  
**Priority:** Beide P0 (MVP)  
**OR-logic:** Minimaal 1 vereist

**Validatie per fase:**
- **Converteren:** `any` - Min 1 veld OK voor import
- **Promotie:** `all` - Beide velden aanbevolen voor zekerheid
- **Verrijken:** `all` - Beide velden voor master product creatie

**Geen waarschuwing** (style code is redelijk geaccepteerd)

---

#### 3. Maat Group (Size)

**Fields:** `supplier_size_code`  
**Priority:** P0 (MVP)  
**OR-logic:** N/A (maar 1 veld, geen alternatief)

**Validatie per fase:**
- **Converteren:** Verplicht (hard blocker voor import)
- **Promotie:** Verplicht
- **Verrijken:** Verplicht

**Geen Field Group** (geen alternatief beschikbaar)

---

#### 4. EAN (Barcode)

**Fields:** `ean`  
**Priority:** P0 (MVP)  
**OR-logic:** N/A

**Speciale validatie:**
- Exact 13 cijfers
- EAN-13 checksum valid
- Uniqueness: Context-afhankelijk (supplier_products: composite, product_variants: global)

---

## 🎯 Phase-Aware Validation

### Concept

**Probleem:**  
Niet alle data is even kritiek in elke fase:
- Bij **converteren** willen we alleen MVP (P0) velden controleren
- Bij **promotie** willen we strenger zijn (AND-logic, alle velden vereist)
- Bij **verrijken** willen we maximaal zijn (Good/Better/Best ook actief verbeteren)

**Oplossing:**  
Alleen **MVP (P0)** velden worden gecontroleerd tijdens import. Good/Better/Best velden beïnvloeden alleen de kwaliteitsscore.

---

### Validatie Matrix

| Priority | CONVERTEREN<br/>(Import) | PROMOTIE<br/>(Activatie) | VERRIJKEN<br/>(AI) |
|----------|--------------------------|----------------------|------------------------|
| **P0 (MVP)** | HARD BLOCK<br/>(OR-logic: min 1 per group) | HARD BLOCK<br/>(AND-logic: alle velden) | HARD BLOCK |
| **P1 (Good)** | OPTIONAL<br/>(score impact only) | OPTIONAL<br/>(score impact) | ENCOURAGED<br/>(AI actief proberen) |
| **P2 (Better)** | OPTIONAL<br/>(score impact only) | OPTIONAL<br/>(score impact) | ENCOURAGED<br/>(AI actief proberen) |
| **P3 (Best)** | IGNORED | OPTIONAL | NICE TO HAVE |

---

### FASE 1: CONVERTEREN (Import → supplier_products ACTIVE)

**Doel:** Alleen MVP (P0) velden zijn verplicht, rest beïnvloedt alleen kwaliteitsscore

**Acceptance Criteria:**
```typescript
{
  canConvert: boolean,  // TRUE als ALLEEN P0 OK (field groups min 1 per group)
  mvpFieldsOk: boolean,
  
  P0_validation: {
    supplier_id: true,     // Auto-filled
    brand_id: true,        // User selected
    tenant_id: true        // Auth context
  },
  
  P0_field_groups: [  // Voorheen P1, nu allemaal P0
    {
      groupId: 'color',
      groupLabel: 'Kleur (Naam of Code)',
      isValid: true,       // Min 1 veld gemapped
      mappedFields: ['supplier_color_code'],  // Enkel code
      warning: '⚠️ Enkel kleurcode - conversie aanbevolen'
    },
    {
      groupId: 'style',
      isValid: true,
      mappedFields: ['supplier_style_name', 'supplier_style_code']  // Beide!
    },
    {
      groupId: 'size',
      isValid: true,
      mappedFields: ['supplier_size_code']
    },
    {
      groupId: 'ean',
      isValid: true,
      mappedFields: ['ean'],
      checksumValid: true,
      allUnique: true
    }
  ],
  
  qualityScore: 78,  // 0-100 weighted score
  completeness: 'GOOD',  // BASIC/GOOD/EXCELLENT
  
  warnings: [
    '⚠️ Enkel kleurcode aanwezig - kleurnaam aanbevolen'
  ]
}
```

**GO/NO-GO Beslissing:**
```typescript
canConvert = (
  P0_all_present &&                      // supplier_id, brand_id, tenant_id
  P0_field_groups_min_1_per_group &&     // OR-logic: min 1 veld per group
  P0_ean_valid_checksum &&               // EAN checksum correct
  P0_ean_unique_within_supplier          // Geen duplicates binnen dataset
)

// P1/P2/P3 (Good/Better/Best) hebben GEEN invloed op import blokkade
```

---

### FASE 2: PROMOTIE (supplier_products → product_variants)

**Doel:** Alleen hoogwaardige data naar master catalogus

**Acceptance Criteria:**
```typescript
{
  canPromote: boolean,  // TRUE als P0 ALL velden + Good/Better/Best recommended
  
  P0_validation: {
    // Zelfde als converteren, maar nu AND-logic (alle velden vereist)
  },
  
  P0_field_groups: [  // NU ALLE velden per group vereist
    {
      groupId: 'color',
      isValid: true,       // NU BEIDE velden vereist!
      mappedFields: ['supplier_color_name', 'supplier_color_code'],
      warning: null        // Geen warning meer
    },
    // ... rest
  ],
  
  P1_good_fields: [  // Optioneel, verhoogt kwaliteit
    {
      field: 'supplier_product_group',
      present: true
    },
    {
      field: 'supplier_advised_price',
      present: false,      // Ontbreekt
      warning: '⚠️ Prijs ontbreekt - overwegen handmatig toe te voegen'
    }
  ],
  
  qualityScore: 85,
  completeness: 'EXCELLENT'
}
```

**GO/NO-GO Beslissing:**
```typescript
canPromote = (
  P0_all_present &&
  P0_field_groups_ALL_fields &&          // AND-logic: alle velden per group
  P0_ean_globally_unique &&              // EAN mag nog niet in master catalogus
  qualityScore >= 50                     // Minimum kwaliteitsscore (P0 moet 100% zijn)
)
```

---

### FASE 3: VERRIJKEN (product_variants + AI enrichment)

**Doel:** Maximale data kwaliteit via AI verrijking

**Acceptance Criteria:**
- P0 (MVP): HARD BLOCK
- P1 (Good): ENCOURAGED - AI actief proberen te verrijken
- P2 (Better): ENCOURAGED - AI actief proberen te verrijken
- P3 (Best): NICE TO HAVE - Laagste prioriteit

**AI Enrichment Strategie:**
```typescript
// Prioriteit volgorde voor AI enrichment
const enrichmentPriority = [
  { fields: P1_fields, priority: 'HIGH' },    // Good velden eerst
  { fields: P2_fields, priority: 'MEDIUM' },  // Better velden daarna
  { fields: P3_fields, priority: 'LOW' }      // Best velden als laatste
];
```

---

## 📊 Quality Score Calculation

### Weighted Formula

```typescript
qualityScore = (
  (P0_present_count / P0_total) * 0.50 +  // 50% weight
  (P1_present_count / P1_total) * 0.30 +  // 30% weight
  (P2_present_count / P2_total) * 0.15 +  // 15% weight
  (P3_present_count / P3_total) * 0.05    // 5% weight
) * 100;
```

### Completeness Levels

| Score | Level | Label | Kleur | Beschrijving |
|-------|-------|-------|--------|--------------|
| **90-100** | EXCELLENT | Uitstekend | 🟢 Groen | MVP + meeste Good/Better/Best velden aanwezig |
| **70-89** | GOOD | Goed | 🟡 Geel | MVP + basis Good velden |
| **50-69** | BASIC | Basis | 🟠 Oranje | Alleen MVP velden, weinig metadata |
| **0-49** | POOR | Slecht | 🔴 Rood | MVP incomplete (zou niet mogelijk moeten zijn na import) |

---

## 🎨 UI Patterns

### Field Group Display

**Converteren/Import (OR-logic, MVP vereist):**
```
✅ MVP - Kleur (Naam of Code): 1/2 velden gemapped
   ├─ supplier_color_name: ❌ Niet gemapped
   └─ supplier_color_code: ✅ Gemapped naar kolom "Kleur code"
   
   ⚠️ Enkel kleurcode - conversie naar kleurnaam aanbevolen voor betere kwaliteit
```

**Promotie (AND-logic, alle velden vereist):**
```
❌ MVP - Kleur (Naam of Code): 1/2 velden aanwezig
   ├─ supplier_color_name: ❌ VEREIST voor promotie
   └─ supplier_color_code: ✅ Aanwezig
   
   🔴 BLOCKER: Kleurnaam vereist voor master data creatie
```

---

### Dataset Quality Card

```
┌─────────────────────────────────────────────┐
│ 📊 Dataset Kwaliteit                        │
│                                             │
│ Score: 78/100 🟡 GOED                       │
│                                             │
│ P0 MVP:     10/10 ✅ (100%)                 │
│ P1 Good:     8/10 🟡 (80%)                  │
│ P2 Better:   4/7  🔵 (57%)                  │
│ P3 Best:     1/5  ⚪ (20%)                  │
│                                             │
│ ℹ️ Import Status: ✅ TOEGESTAAN             │
│                                             │
│ 💡 Kwaliteitsverbetering:                   │
│ • Enkel kleurcode (geen kleurnaam)          │
│ • Prijs ontbreekt voor 15% van producten    │
└─────────────────────────────────────────────┘
```

---

## 📖 Terminologie Matrix (Code vs UI)

| Context | P0 | P1 | P2 | P3 |
|---------|----|----|----|----|
| **Database** | `P0_Kritiek` | `P1_Verplicht` | `P2_Aanbevolen` | `P3_Optioneel` |
| **Code (TypeScript)** | `P0` | `P1` | `P2` | `P3` |
| **UI (NL/EN)** | MVP 🚨 | Good 🔴 | Better 🔵 | Best ⚪ |
| **Betekenis** | Minimum Viable Product | Waardevolle metadata | Uitgebreide metadata | Premium metadata |
| **Import Impact** | HARD BLOCKER | Score only | Score only | Score only |
| **Logs/Errors** | `[MVP-ERROR]` | `[GOOD-INFO]` | `[BETTER-INFO]` | `[BEST-INFO]` |

---

## 🔄 Migration Path (Voor Bestaande Docs)

### Oude Terminologie → Nieuwe Terminologie

| OUD | NIEUW | Rationale |
|-----|-------|-----------|
| P0: "Kritiek" | P0: "MVP" | Duidelijker: Minimum Viable Product voor import |
| P1: "Verplicht" | P1: "Good" | Nu optioneel, alleen score impact |
| P2: "Aanbevolen" | P2: "Better" | Nu optioneel, alleen score impact |
| P3: "Optioneel" | P3: "Best" | Onveranderd concept |
| P1 fields | → P0 (MVP) | Alle voormalige P1 velden naar P0 verplaatst |
| Import blocker | P0 + P1 | → Alleen P0 (MVP) blokkeert import |
| Quality weights | 50/30/15/5 | Onveranderd |

### Te Updaten Documenten

1. ✅ **docs/technical/progressive-quality-ladder.md** (NIEUW - dit document)
2. 🔄 **docs/technical/pim-field-definitions.md** (UPDATE - stap 2)
3. 🔄 **docs/data-model/validation-rules.md** (UPDATE - stap 3)
4. 🔄 **docs/gebruikershandleiding/03-import-proces/02-converteren.md** (UPDATE - stap 4)
5. 🔄 **docs/technical/import-architecture.md** (UPDATE - stap 5)
6. 🔄 **docs/vibe-coding/development-workflow.md** (UPDATE - stap 6)
7. ✅ **docs/technical/field-group-validation.md** (NIEUW - stap 7)

---

## 📚 Gerelateerde Documentatie

- **Database Schema:** `docs/technical/database-schema.md`
- **Validation Rules:** `docs/data-model/validation-rules.md`
- **PIM Field Definitions:** `docs/technical/pim-field-definitions.md`
- **Import Architecture:** `docs/technical/import-architecture.md`
- **Field Group Validation:** `docs/technical/field-group-validation.md` (nieuw)
- **User Guide - Converteren:** `docs/gebruikershandleiding/03-import-proces/02-converteren.md`

---

## ✅ Implementatie Checklist

- [x] Database migratie: Verplaats alle P1 velden naar P0
- [x] TypeScript: Update priority labels naar MVP/Good/Better/Best
- [x] UI: Update alle componenten met nieuwe terminologie
- [x] UI: Verberg P1/P2/P3 accordions in import validatie
- [x] UI: Alleen P0 (MVP) coverage controleert import blokkade
- [x] Docs: Update `progressive-quality-ladder.md` met nieuwe terminologie
- [ ] Docs: Update `pim-field-definitions.md` 
- [ ] Docs: Update `validation-rules.md`
- [ ] Tests: Unit tests voor MVP-only validatie
- [ ] Tests: Integration tests voor import flow

---

**END OF DOCUMENT**  
**Next Steps:** Stap 2 - Update `pim-field-definitions.md`

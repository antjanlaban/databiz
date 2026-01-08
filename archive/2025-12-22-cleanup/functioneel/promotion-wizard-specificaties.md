# Promotion Wizard - Functionele Specificaties

**Versie:** 1.0  
**Laatst bijgewerkt:** 2025-11-14  
**Status:** ✅ Geïmplementeerd  
**Product Owner:** [Naam]

---

## 📋 Executive Summary

De **Promotion Wizard** automatiseert het proces van het converteren van ruwe leveranciersproducten naar een gestandaardiseerde Master/Variant productstructuur. Dit elimineert handmatig datawerk en zorgt voor consistente productnormalisatie volgens bedrijfsstandaarden.

### Business Value
- ⏱️ **Tijdsbesparing:** Van 2 uur handmatig werk naar 5 minuten geautomatiseerd proces per 100 producten
- 📊 **Data Kwaliteit:** 95%+ matching accuracy door intelligente algoritmes
- 🎯 **Schaalbaarheid:** Verwerk duizenden producten per dag vs. honderden handmatig
- ✅ **Consistentie:** Gestandaardiseerde kleuren en maten uit stamdata
- 🔗 **Traceerbaarheid:** Volledige koppeling tussen supplier data en PIM producten

### Key Metrics (Target)
- **Processing Time:** <5 minuten voor 100 producten
- **Auto-Match Rate:** >80% voor kleuren, >90% voor maten
- **Manual Intervention:** <10% van de matches
- **Error Rate:** <2% na validatie

---

## 🎯 Business Context

### Probleem Definitie

**Huidige Situatie:**
Leveranciers leveren productdata in verschillende formaten:
- Verschillende Excel/CSV structuren
- Inconsistente kleurbenaming ("Navy" vs "Marine" vs "Donkerblauw")
- Verschillende maatformaten ("XL" vs "52" vs "EU-52")
- Geen standaard productstructuur (alles is "flat" data)

**Pijnpunten:**
1. **Handmatig werk:** Medewerkers moeten elke kleur en maat handmatig mappen
2. **Fouten:** Typefouten en inconsistenties bij handmatige invoer
3. **Tijd:** 2+ uur per 100 producten
4. **Niet-schaalbaar:** Bij groei onhaalbaar om handmatig bij te houden

**Impact:**
- Vertraagde time-to-market voor nieuwe producten
- Inconsistente product data in webshops
- Foute exports naar externe systemen (Gripp, Calculated)
- Hoge kosten door FTE-uren

### Oplossing

**Geautomatiseerd Promotie Proces:**
1. Selecteer leveranciersproducten in bulk
2. Intelligente matching naar standaard kleuren en maten
3. Groupeer automatisch naar Master (style level)
4. Genereer variants (alle color × size combinaties)
5. Preview + validate voor finale submit

**Voordelen:**
- 🚀 **90% sneller** dan handmatig proces
- 🎯 **Hogere accuracy** door machine matching
- 📈 **Schaalbaar** naar duizenden producten
- 🔁 **Herhaalbaar** via templates (toekomstig)
- ✅ **Validatie** voorkomt fouten

---

## 👥 User Stories

### Epic: Product Promotie naar Master/Variant

#### Story 1: Bulk Selectie
**Als** Product Manager  
**Wil ik** meerdere leveranciersproducten tegelijk kunnen selecteren  
**Zodat** ik efficiënt batches kan promoveren

**Acceptatie Criteria:**
- [ ] Selecteer producten via checkboxes in supplier catalog
- [ ] Toon totaal aantal geselecteerde producten
- [ ] "Promoveer" button verschijnt bij selectie >0
- [ ] Only deletable (niet-promoted) producten kunnen worden geselecteerd

---

#### Story 2: Style Mapping
**Als** Product Manager  
**Wil ik** de style details van een Master product definiëren  
**Zodat** de Master correcte metadata heeft

**Acceptatie Criteria:**
- [ ] Vul Master Name in (verplicht, 3-255 chars)
- [ ] Selecteer Brand uit dropdown (verplicht)
- [ ] Selecteer Supplier uit dropdown (verplicht, auto-detect mogelijk)
- [ ] Selecteer Category uit dropdown (verplicht)
- [ ] Selecteer Gender: Unisex/Heren/Dames (optioneel, default: Unisex)
- [ ] Vul Description in (optioneel, multi-line)
- [ ] Vul Material Composition in (optioneel, bijv. "65% Polyester, 35% Katoen")
- [ ] Vul Care Instructions in (optioneel, bijv. "Wasbaar op 40°C")
- [ ] Vul Weight in grams in (optioneel, numeriek)
- [ ] Valideer alle verplichte velden voor "Volgende" mogelijk is

---

#### Story 3: Automatische Kleur Matching
**Als** Product Manager  
**Wil ik** dat het systeem automatisch leverancierskleuren matcht naar standaard kleuren  
**Zodat** ik niet handmatig alle kleuren hoef te mappen

**Acceptatie Criteria:**
- [ ] Systeem haalt unieke kleuren uit geselecteerde producten
- [ ] Voor elke kleur: automatische matching naar `color_family_options`
- [ ] Toon confidence indicator per match:
  - ✓ Groen = Exact match
  - ⚠ Geel = Medium/Low confidence
  - ✗ Rood = Geen match (manual select vereist)
- [ ] Toon gematchte kleur naam + type (bijv. "Navy (MONO)")
- [ ] Als confidence < High: toon waarschuwing
- [ ] Alle kleuren moeten mapped zijn voor volgende stap mogelijk is

---

#### Story 4: Manual Kleur Override
**Als** Product Manager  
**Wil ik** automatische kleur matches kunnen overrulen  
**Zodat** ik controle heb bij lage confidence matches

**Acceptatie Criteria:**
- [ ] Elke kleur heeft een dropdown met alle beschikbare `color_family_options`
- [ ] Dropdown is searchable (type om te filteren)
- [ ] Grouped by color_type (MONO, DUO, TRIO, MULTI)
- [ ] Geselecteerde kleur overschrijft auto-match
- [ ] Visuele indicatie dat override is toegepast

---

#### Story 5: Automatische Maat Matching
**Als** Product Manager  
**Wil ik** dat het systeem automatisch leveranciersmaten matcht naar standaard maten  
**Zodat** ik niet handmatig alle maten hoef te mappen

**Acceptatie Criteria:**
- [ ] Systeem haalt unieke maten uit geselecteerde producten
- [ ] Voor elke maat: automatische matching naar `size_options`
- [ ] Normalisatie: "XXXL" → "3XL", "EU-48" → "48", "W32/L34" → "32-34"
- [ ] Toon confidence indicator per match (zelfde als kleuren)
- [ ] Toon gematchte maat code + label (bijv. "XL - Extra Large")
- [ ] Alle maten moeten mapped zijn voor volgende stap mogelijk is

---

#### Story 6: Manual Maat Override
**Als** Product Manager  
**Wil ik** automatische maat matches kunnen overrulen  
**Zodat** ik controle heb bij lage confidence matches

**Acceptatie Criteria:**
- [ ] Elke maat heeft een dropdown met alle beschikbare `size_options`
- [ ] Dropdown is searchable
- [ ] Sorted by `sort_order` (XS → 5XL, 44 → 60, etc.)
- [ ] Geselecteerde maat overschrijft auto-match

---

#### Story 7: Preview voor Bevestiging
**Als** Product Manager  
**Wil ik** een complete preview zien van wat wordt aangemaakt  
**Zodat** ik fouten kan detecteren voor submission

**Acceptatie Criteria:**
- [ ] Toon Master product preview met alle metadata
- [ ] Toon Variants matrix (kleuren × maten)
- [ ] Toon Variant Display Name format: "Brand | Master | Color | Size"
- [ ] Toon totaal aantal te creëren variants
- [ ] Toon expandable list van alle variant namen
- [ ] Toon aantal gekoppelde supplier products
- [ ] "Terug" button om aanpassingen te maken
- [ ] "Promoveer" button voor finale submit

---

#### Story 8: Succesvolle Promotie
**Als** Product Manager  
**Wil ik** een bevestiging zien dat promotie is gelukt  
**Zodat** ik weet dat het proces succesvol was

**Acceptatie Criteria:**
- [ ] Loading state tijdens processing (spinner + "Producten Promoveren...")
- [ ] Success toast: "🎉 Promotie succesvol! X variants aangemaakt"
- [ ] Automatische redirect naar Master detail page
- [ ] Gepromoveerde producten zijn niet meer selecteerbaar in supplier catalog
- [ ] Badge "is_promoted = true" zichtbaar in supplier catalog

---

## 🔄 Proces Flow

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Supplier Catalog                                            │
│ [✓ Product 1] [✓ Product 2] [✓ Product 3] ...             │
│                                                             │
│ [ Promoveer naar Master/Variant (15) ]  ← Button verschijnt│
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 🧙 Promotion Wizard (5 Stappen)                             │
│                                                             │
│ Step 1: Selectie Overzicht                                 │
│   → Grouped view: 1 style, 3 colors, 5 sizes              │
│                                                             │
│ Step 2: Style Mapping                                      │
│   → Master Name: "Premium Polo"                            │
│   → Brand: "Russell"                                       │
│   → Category: "Polo's"                                     │
│                                                             │
│ Step 3: AI Enrichment (optioneel)                         │
│   → [ Skip ] [ Use AI ]                                    │
│                                                             │
│ Step 4: Color & Size Matching                             │
│   → Auto-match: Navy ✓, Black ✓, Grey ⚠ (manual select)  │
│   → Auto-match: XS-XL ✓ (all exact)                       │
│                                                             │
│ Step 5: Preview & Bevestiging                             │
│   → Master: Russell Premium Polo                           │
│   → 15 Variants (3 colors × 5 sizes)                      │
│   → [ ← Terug ] [ ✓ Promoveer 15 Producten ]              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend Processing (promote-products Edge Function)         │
│                                                             │
│ 1. Create Master record                                    │
│ 2. Create Master Content Extension                         │
│ 3. Create Master Category Link                             │
│ 4. Create 15 Variant records                               │
│ 5. Create 15 Dataset Rule Links                            │
│ 6. Update supplier_products.is_promoted = true             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Success!                                                    │
│ 🎉 15 variants aangemaakt                                   │
│ → Redirect naar Master Detail Page                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Business Rules

### BR-001: Selectie Restricties
**Regel:** Alleen niet-gepromoveerde producten kunnen worden geselecteerd  
**Reden:** Voorkomen van duplicaten en data inconsistentie  
**Implementatie:** Filter `is_promoted = false` in catalog query

### BR-002: Minimum Selectie
**Regel:** Minimaal 1 product moet geselecteerd zijn om wizard te openen  
**Reden:** Zinloze promotie van 0 producten voorkomen  
**Implementatie:** "Promoveer" button disabled als `selectedCount === 0`

### BR-003: Category Verplicht
**Regel:** Category moet altijd worden ingevuld in Step 2  
**Reden:** Master zonder category is onbruikbaar voor exports  
**Implementatie:** Zod validatie `category_id: z.number().positive()`

### BR-004: Unieke Master Code
**Regel:** Elke Master krijgt een unieke code bij aanmaak  
**Reden:** Identificatie en voorkomen van duplicaten  
**Implementatie:** Backend genereert code: `[BRAND-PREFIX]-[CATEGORY]-[INCREMENT]`  
**Voorbeeld:** `RUS-POLO-001`, `RUS-POLO-002`

### BR-005: Volledige Color Mapping Vereist
**Regel:** Alle unieke kleuren moeten gemapped zijn voor submit mogelijk is  
**Reden:** Incomplete data leidt tot foutieve exports  
**Implementatie:** Validatie in Step 4: `allColorsMapped = true` voor "Volgende" enabled

### BR-006: Volledige Size Mapping Vereist
**Regel:** Alle unieke maten moeten gemapped zijn voor submit mogelijk is  
**Reden:** Incomplete data leidt tot foutieve exports  
**Implementatie:** Validatie in Step 4: `allSizesMapped = true` voor "Volgende" enabled

### BR-007: Variant Display Name Standaard
**Regel:** Alle variant names volgen format: `Brand | Master | Color | Size`  
**Reden:** Consistente naamgeving voor exports en webshops  
**Voorbeeld:** `Russell | Premium Polo | Navy | XL`

### BR-008: Dataset Rule Link
**Regel:** Elke variant wordt gekoppeld aan supplier product via `dataset_rule_link`  
**Reden:** Traceerbaarheid en voorkomen van herhaalde promotie  
**Implementatie:** Insert in `dataset_rule_link` met `variant_id` + `supplier_product_id`

### BR-009: Supplier Product Status Update
**Regel:** Na promotie wordt `is_promoted = true` gezet op supplier products  
**Reden:** Voorkomen van dubbele promotie en visuele feedback  
**Implementatie:** Batch update na succesvolle variant creatie

### BR-010: Gender Default
**Regel:** Als gender niet wordt ingevuld, default naar "Unisex"  
**Reden:** Meeste producten zijn unisex, scheelt input  
**Implementatie:** Form default value: `gender: 'Unisex'`

---

## 🎨 UX Requirements

### Wizard Navigation
- **Stepper UI:** Toon 5 stappen met visuele indicator van huidige stap
- **Completed Steps:** Groene checkmarks voor voltooide stappen
- **Terug Navigatie:** Altijd mogelijk (behalve in stap 1)
- **Vooruit Navigatie:** Alleen mogelijk als huidige stap valide is
- **Progress Persistentie:** Data blijft bewaard bij terug navigeren

### Visual Feedback
- **Loading States:** Spinners tijdens data fetching (matching, preview loading)
- **Success Indicators:** ✓ voor successful matches, bevestigingen
- **Warning Indicators:** ⚠ voor medium/low confidence matches
- **Error Indicators:** ✗ voor failed matches, validation errors
- **Confidence Colors:**
  - Groen: Exact/High confidence
  - Geel: Medium confidence
  - Oranje: Low confidence
  - Rood: Geen match (actie vereist)

### Error Handling
- **Inline Validation:** Real-time feedback op form velden
- **Blocking Errors:** Voorkom volgende stap bij incomplete data
- **Clear Messaging:** Duidelijke foutmeldingen in gebruikerstaal
- **Recovery:** Mogelijkheid om fouten te herstellen zonder wizard te sluiten

### Accessibility
- **Keyboard Navigation:** Tab door form velden, Enter voor submit
- **Screen Reader:** Aria labels op alle interactieve elementen
- **Focus Management:** Duidelijke focus indicators
- **Color Contrast:** WCAG AA compliant voor alle tekst

---

## 📈 Success Criteria

### Functional Requirements (Must Have)
- [x] Bulk selectie van supplier products
- [x] 5-stappen wizard met persistente state
- [x] Automatische color matching (>80% accuracy target)
- [x] Automatische size matching (>90% accuracy target)
- [x] Manual override voor alle matches
- [x] Preview van Master + alle Variants
- [x] Edge function call voor backend processing
- [x] Success/error feedback naar gebruiker

### Non-Functional Requirements
- **Performance:** <3s voor matching van 100 producten
- **Usability:** Gemiddeld 5 minuten per promotie van 100 producten
- **Reliability:** <1% failure rate bij valide input
- **Scalability:** Support voor 1000+ producten per batch

### KPIs
- **Adoption Rate:** >80% van Product Managers gebruikt wizard binnen 1 maand
- **Time Savings:** >50% reductie in time-to-promote vs handmatig proces
- **Error Reduction:** >60% minder fouten in gepromoveerde data
- **User Satisfaction:** NPS score >8/10

---

## 🚀 Release Plan

### Phase 1: MVP (Current)
**Features:**
- ✅ Basis wizard flow (5 stappen)
- ✅ Automatische matching (color + size)
- ✅ Manual override
- ✅ Preview + submit
- ✅ Edge function integration

**Status:** ✅ **Deployed**

### Phase 2: Enhancements (Q1 2025)
**Features:**
- [ ] Template functionaliteit (save + load mappings)
- [ ] Bulk undo / demote functionaliteit
- [ ] Smart grouping detection (AI suggestie om te splitsen)
- [ ] Conflict resolution (detecteer bestaande masters)
- [ ] Performance dashboard (success rate, avg time, etc.)

### Phase 3: Advanced (Q2 2025)
**Features:**
- [ ] Machine learning voor keyword extraction
- [ ] User feedback loop (improve matching over time)
- [ ] Supplier-specific mapping templates
- [ ] Visual color matching via hex codes
- [ ] Multi-language support

---

## 📚 Gerelateerde Documentatie

- [Technische Architectuur](../technical/promotion-wizard-architecture.md)
- [Gebruikershandleiding](../gebruikershandleiding/04-promotion-wizard/README.md)
- [Database Schema](../technical/database-schema.md)
- [Color Matching System](../technical/color-matching-system.md)
- [Size Matching System](../technical/size-matching-system.md)

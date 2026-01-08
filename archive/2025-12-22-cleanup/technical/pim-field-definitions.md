# 🎯 PIM Veldspecificaties - Data Kwaliteit Register

**Project:** Van Kruiningen PIM - Field Specifications System  
**Versie:** 4.0 (Progressive Quality Ladder)  
**Datum:** Januari 2025  
**Focus:** P0/P1/P2/P3 + Field Groups + Phase-aware validatie

---

## Executive Summary

Dit document beschrijft het **PIM Field Specifications System**: het centrale register van alle velden die belangrijk zijn voor **onze eigen data kwaliteit**, nu met **Progressive Quality Ladder** (P0/P1/P2/P3) en **Field Groups** voor OR-logica.

**Belangrijkste wijzigingen v4.0:**
- ✅ Uniforme P0/P1/P2/P3 terminologie (was: Verplicht/Aanbevolen/Optioneel)
- ✅ Field Groups voor OR-logic (bijv. kleur naam OF kleur code)
- ✅ Phase-aware validatie (converteren vs promotie)
- ✅ Quality weights: 50/30/15/5% (was: 50/30/20%)

**LEES EERST:** `docs/technical/progressive-quality-ladder.md` voor het volledige begrippenkader.

---

### Wat Dit Systeem NIET Is
❌ Export-focused field requirements  
❌ Technische database schema documentatie  
❌ External system integration specs

### Wat Dit Systeem WEL Is
✅ **Data completeness criteria** - Welke velden MOETEN aanwezig zijn?  
✅ **AI herkenning configuratie** - Hoe herkent AI deze velden in supplier data?  
✅ **Quality scoring basis** - Hoe berekenen we dataset kwaliteit?  
✅ **Supplier feedback generator** - Wat ontbreekt en hoe communiceren we dat?  
✅ **Field Groups** - OR-logic voor alternatieve velden (NEW in v4.0)

**Kernwaarde:** Eén centrale plek waar wordt gedefinieerd wat "complete" en "kwalitatieve" product data betekent voor het PIM systeem.

---

## 🎯 Conceptueel Model

### Van Export-Readiness naar Progressive Quality

**OUD DENKEN (FOUT):**
```
"Is dit veld nodig voor Gripp export?" 
→ Ja → Verplicht
→ Nee → Optioneel
```
**Probleem:** Te beperkt, te specifiek, mist de grotere context.

**NIEUW DENKEN (CORRECT - v4.0):**
```
"Hoe belangrijk is dit veld voor onze eigen data kwaliteit?"
→ Systeem kan niet werken zonder dit veld → P0 (Kritiek)
→ Product onbruikbaar zonder dit veld → P1 (Verplicht)
→ Kwaliteit significant beter met dit veld → P2 (Aanbevolen)  
→ Luxe metadata, niet kritisch → P3 (Optioneel)
```
**Voordeel:** Generiek, toekomstbestendig, onafhankelijk van externe systemen, escaleert per fase.

---

## 📊 Priority Levels: P0/P1/P2/P3

**Zie ook:** `docs/technical/progressive-quality-ladder.md` voor volledig begrippenkader.

### P0 MVP (Minimum Viable Product) 🚨

**Definitie:** Minimum Viable Product - minimale vereisten voor opname in de catalogus. Zonder deze data kan het product NIET geïmporteerd worden.

**Criteria:**
- ✅ Product kan **niet geïmporteerd** worden zonder dit veld
- ✅ Essentieel voor product identificatie en differentiatie
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

**Quality Impact:** 50% van dataset quality score  
**UI Indicator:** 🚨 Rood - "MVP"

---

### P1 Good (Waardevolle Metadata) 🟡

**Definitie:** Waardevolle extra data die producten verrijkt maar NIET verplicht is voor import.

**Criteria:**
- ✅ Verbetert gebruikservaring of data rijkheid
- ✅ Helpt bij categorisatie, filtering of search
- ✅ Ondersteunt besluitvorming (prijzen, categorieën)
- ✅ **GEEN BLOCKER** voor import

**Voorbeelden:**
- `supplier_product_group` - Helpt bij automatische categorisatie
- `supplier_advised_price` - Basis voor prijsstrategie
- `fabric_weight_gsm` - Technische spec voor kwaliteitsbeoordeling

**Quality Impact:** 30% van dataset quality score  
**UI Indicator:** 🟡 Geel - "GOOD"

---

### P2 Better (Uitgebreide Metadata) 🔵

**Definitie:** Uitgebreide metadata die product kwaliteit verder verbetert.

**Criteria:**
- ✅ Verbetert product beschrijving en SEO
- ✅ Ondersteunt geavanceerde filtering
- ✅ Technische specificaties

**Voorbeelden:**
- `material_composition` - Verbetert product beschrijving en SEO
- `fabric_weight_gsm` - Technische spec
- `washing_instructions` - Wasvoorschrift voor klantenservice

**Quality Impact:** 15% van dataset quality score  
**UI Indicator:** 🔵 Blauw - "BETTER"

---

### P3 Best (Premium Metadata) ⚪

**Definitie:** Premium metadata voor maximale data kwaliteit.

**Criteria:**
- ✅ Niche use cases (specifieke filters, advanced search)
- ✅ Marketing/SEO verrijking
- ✅ Toekomstige features die nog niet actief zijn

**Voorbeelden:**
- `care_instructions` - Wasvoorschrift, handig maar niet kritisch
- `country_of_origin` - Herkomst, relevant voor duurzaamheid filters
- `certification_marks` - ISO norms, OEKO-TEX, etc.
- `fit_type` - Regular/Slim/Loose, fashion-specifieke metadata

**Quality Impact:** 5% van dataset quality score  
**UI Indicator:** ⚪ Grijs - "BEST"

---

## 🔗 Field Groups (NEW in v4.0)

**Concept:** Accepteer alternatieve velden via OR-logic (minimaal 1 van de 2).

**Probleem opgelost:**  
Leverancier A heeft "Kleurnaam", Leverancier B heeft alleen "Kleurcode". Beide moeten geaccepteerd worden.

**Oplossing:**  
- Verhoog BEIDE velden naar P1 (gelijk niveau)
- Implementeer Field Group met OR-logic (min 1 vereist)
- Waarschuwing bij "partial mapping" (bijv. enkel kleurcode)

**Zie:** `docs/technical/progressive-quality-ladder.md` → Field Groups sectie voor volledige uitleg en TypeScript interfaces.

### Field Group 1: Kleur (Color)

**Velden:** `supplier_color_name`, `supplier_color_code`  
**Priority:** Beide P0 (MVP) 🚨  
**OR-logic:** Minimaal 1 vereist

**Phase-aware validatie:**
- **Import:** `any` - Min 1 veld OK, waarschuwing bij enkel code
- **Promotie:** `all` - Beide velden vereist

**Waarschuwing:**
```
⚠️ Enkel kleurcode aanwezig (geen kleurnaam)
Aanbeveling: Kleurcode vereist conversie bij promotie naar master data.
```

---

### Field Group 2: Stijl/Model (Style)

**Velden:** `supplier_style_name`, `supplier_style_code`  
**Priority:** Beide P0 (MVP) 🚨  
**OR-logic:** Minimaal 1 vereist

**Phase-aware validatie:**
- **Import:** `any` - Min 1 veld OK
- **Promotie:** `all` - Beide velden aanbevolen

**Geen waarschuwing** (style code redelijk geaccepteerd)

---

### Field Group 3: Maat (Size)

**Velden:** `supplier_size_code`  
**Priority:** P1 🟡  
**OR-logic:** N/A (maar 1 veld)

**Geen alternatief beschikbaar**

---

## 🗄️ Database Schema

### Core Table: `pim_field_definitions` (v4.0)

**MIGRATED:** Priority values updated to P0/P1/P2/P3 format.

```sql
CREATE TABLE pim_field_definitions (
  id BIGSERIAL PRIMARY KEY,
  field_key TEXT UNIQUE NOT NULL, -- 'supplier_color_name'
  
  -- Display namen
  field_label_nl TEXT NOT NULL, -- 'Kleur Naam of Code' (was: display_name_nl)
  field_label_en TEXT NOT NULL, -- 'Color Name or Code' (was: display_name_en)
  description_nl TEXT, -- Uitleg wat dit veld representeert
  description_en TEXT,
  
  -- Priority & Quality Impact (UPDATED v4.0)
  priority TEXT NOT NULL CHECK (priority IN ('P0_Kritiek', 'P1_Verplicht', 'P2_Aanbevolen', 'P3_Optioneel')),
  priority_description TEXT, -- Waarom dit priority level? Bijv. "Alternatief voor kleur naam"
  data_quality_impact TEXT NOT NULL, -- Waarom is dit veld belangrijk voor ONZE kwaliteit?
  is_required_for_variants BOOLEAN DEFAULT false, -- Blokkeert variant creatie?
  quality_weight INTEGER DEFAULT 50, -- 50/30/15/5 voor P0/P1/P2/P3
  
  -- Field Groups (NEW v4.0)
  field_group_id TEXT, -- 'color', 'style', 'size', NULL (indien geen group)
  field_group_label_nl TEXT, -- 'Kleur (Naam of Code)'
  field_group_label_en TEXT, -- 'Color (Name or Code)'
  
  -- AI Recognition (gebruikt door ai-suggest-mapping)
  ai_recognition_prompt TEXT NOT NULL, -- "Detecteer kolommen met kleur informatie..."
  ai_negative_rules TEXT, -- "Negeer kolommen met alleen kleurcodes"
  example_column_names TEXT[] DEFAULT '{}', -- ["Kleur", "Color", "Colour"]
  
  -- Supplier Advice (voor dataset quality feedback)
  supplier_advice_template TEXT, -- Template voor ontbrekend veld advies
  supplier_advice_examples TEXT[] DEFAULT '{}', -- Voorbeeld waarden
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pim_fields_priority ON pim_field_definitions(priority);
CREATE INDEX idx_pim_fields_field_group ON pim_field_definitions(field_group_id);
CREATE INDEX idx_pim_fields_active ON pim_field_definitions(is_active);
```

---

### Field Groups Table (NEW v4.0)

**Purpose:** Define OR-logic groups for alternative fields.

```sql
CREATE TABLE pim_field_groups (
  field_group_id TEXT PRIMARY KEY, -- 'color', 'style', 'size'
  group_label_nl TEXT NOT NULL,
  group_label_en TEXT NOT NULL,
  
  -- Phase-specific validation rules
  required_for_converteren TEXT NOT NULL CHECK (required_for_converteren IN ('any', 'all', 'none')),
  required_for_promotie TEXT NOT NULL CHECK (required_for_promotie IN ('any', 'all', 'none')),
  required_for_verrijken TEXT NOT NULL CHECK (required_for_verrijken IN ('any', 'all', 'none')),
  
  min_fields_required INTEGER DEFAULT 1,
  
  -- Warning template (indien partial mapping)
  warning_message_nl TEXT,
  warning_message_en TEXT,
  recommendation_nl TEXT,
  recommendation_en TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data for Field Groups
INSERT INTO pim_field_groups (field_group_id, group_label_nl, group_label_en, required_for_converteren, required_for_promotie, required_for_verrijken, warning_message_nl, recommendation_nl) VALUES
('color', 'Kleur (Naam of Code)', 'Color (Name or Code)', 'any', 'all', 'all', 
 'Enkel kleurcode aanwezig (geen kleurnaam)', 
 'Een kleurnaam is beter voor leesbaarheid. Kleurcode vereist conversie bij promotie naar master data.'),
('style', 'Model (Naam of Code)', 'Style (Name or Code)', 'any', 'all', 'all', NULL, NULL),
('size', 'Maat', 'Size', 'any', 'all', 'all', NULL, NULL),
('ean', 'EAN Barcode', 'EAN Barcode', 'any', 'all', 'all', NULL, NULL);
```

---

## 📋 Seed Data: Complete Field Definitions (v4.0)

**MIGRATION NOTE:** Priority values updated to P0/P1/P2/P3 format.

---

### P0 Velden (MVP - Systeem Requirements)

#### 0. Supplier ID (System)
```json
{
  "field_key": "supplier_id",
  "field_label_nl": "Leverancier",
  "field_label_en": "Supplier",
  "priority": "P0_Kritiek",
  "priority_description": "Foreign key naar suppliers tabel - database integrity",
  "quality_weight": 50,
  "field_group_id": null,
  "data_quality_impact": "CRITICAL - Supplier ID is verplicht voor multi-tenancy en data isolation. Zonder supplier_id kunnen we geen traceability garanderen en raken datasets vermengd."
}
```

#### 0. Brand ID (System)
```json
{
  "field_key": "brand_id",
  "field_label_nl": "Merk",
  "field_label_en": "Brand",
  "priority": "P0_Kritiek",
  "priority_description": "Foreign key naar brands tabel - database integrity",
  "quality_weight": 50,
  "field_group_id": null,
  "data_quality_impact": "CRITICAL - Brand ID is verplicht voor KERN products. Zonder brand kunnen we geen product classificatie en EAN prefix validatie uitvoeren."
}
```

---

### P1 Velden (Good - Business Requirements)

#### 1. EAN (Barcode)
```json
{
  "field_key": "ean",
  "field_label_nl": "EAN Barcode",
  "field_label_en": "EAN Barcode",
  "priority": "P1_Verplicht",
  "priority_description": "Unieke variant identifier - geen alternatief beschikbaar",
  "quality_weight": 30,
  "field_group_id": "ean",
  "field_group_label_nl": "EAN Barcode",
  "field_group_label_en": "EAN Barcode",
  "data_quality_impact": "CRITICAL - EAN is de primaire unieke identifier voor product variants. Zonder EAN kunnen we geen traceability garanderen, geen voorraad bijhouden, en geen sync met externe systemen (POS, webshops). Dit is het fundament van product data management.",
  "is_required_for_variants": true,
  "quality_weight": 3,
  "ai_recognition_prompt": "Detecteer kolommen met 13-cijferige barcodes. EAN codes zijn ALTIJD exact 13 numerieke karakters. Kolomnamen bevatten vaak 'EAN', 'Barcode', 'GTIN', 'Article Number'. Let op: supplier SKU is GEEN EAN (vaak alfanumeriek of korter).",
  "ai_negative_rules": "Negeer kolommen met:\n- Alfanumerieke codes (bijv. 'ABC-12345')\n- Codes korter dan 13 cijfers\n- Kolommen genaamd 'SKU', 'Artikelnummer' zonder cijfer pattern\n- Interne codes (vaak prefix zoals 'VK-' of 'INT-')",
  "example_column_names": ["EAN", "Barcode", "EAN-13", "GTIN", "EAN Code", "Barcode EAN"],
  "supplier_advice_template": "⚠️ KRITIEK: Ontbrekend veld EAN BARCODE\n\nDeze dataset bevat geen EAN barcodes. Zonder EAN kunnen we:\n- Geen unieke product variants identificeren\n- Geen voorraad tracking uitvoeren\n- Geen sync met kassasystemen/webshops\n\nToevoegen in Excel:\n- Kolom naam: 'EAN' of 'Barcode'\n- Format: Exact 13 cijfers (bijv. 8712345678901)\n- Per variant één unieke EAN",
  "supplier_advice_examples": ["8712345678901", "5412345678900", "4012345678909"]
}
```

#### 2. Supplier Style Name (Field Group: Style)
```json
{
  "field_key": "supplier_style_name",
  "field_label_nl": "Model Naam of Code",
  "field_label_en": "Style Name or Code",
  "priority": "P1_Verplicht",
  "priority_description": "Alternatief voor stijl/model code - beide samen is ideaal",
  "quality_weight": 30,
  "field_group_id": "style",
  "field_group_label_nl": "Model (Naam of Code)",
  "field_group_label_en": "Style (Name or Code)",
  "data_quality_impact": "CRITICAL - Style naam is de basis voor product master creatie. Zonder naam kunnen we geen leesbare product titels tonen, geen SEO uitvoeren, en geen menselijke herkenning van producten. Elke style (productfamilie) moet een unieke, betekenisvolle naam hebben.",
  "is_required_for_variants": false,
  "quality_weight": 3,
  "ai_recognition_prompt": "Detecteer kolommen met product/model namen. Dit zijn GEEN variant-specifieke namen (die bevatten kleur/maat), maar de algemene productfamilie naam. Voorbeelden: 'Polo Leeds', 'Werkbroek Stretch', 'Softshell Jack'. Kolomnamen: 'Productnaam', 'Artikel', 'Style Name', 'Model'.",
  "ai_negative_rules": "Negeer kolommen met:\n- Volledige variant namen inclusief kleur/maat (bijv. 'Polo Zwart XL')\n- Technische codes zonder beschrijving (bijv. 'PL-001')\n- Categorieën in plaats van namen (bijv. 'T-Shirts')\n- Merknamen alleen (zonder product)",
  "example_column_names": ["Productnaam", "Artikel", "Style Name", "Model", "Product Name", "Omschrijving"],
  "supplier_advice_template": "⚠️ KRITIEK: Ontbrekend veld PRODUCTNAAM\n\nDeze dataset bevat geen product namen. Zonder naam kunnen we:\n- Geen leesbare product titels tonen\n- Geen SEO optimalisatie uitvoeren\n- Geen menselijke herkenning in lijsten\n\nToevoegen in Excel:\n- Kolom naam: 'Productnaam' of 'Artikel'\n- Format: Beschrijvende naam ZONDER kleur/maat\n- Voorbeelden: 'Polo Classic', 'Werkbroek Stretch', 'Softshell Jack Premium'",
  "supplier_advice_examples": ["Polo Classic", "Werkbroek Stretch Pro", "Softshell Jack Premium", "T-Shirt V-neck", "Fleece Vest"]
}
```

#### 3. Supplier Color Name (Field Group: Color)
```json
{
  "field_key": "supplier_color_name",
  "field_label_nl": "Kleur Naam of Code",
  "field_label_en": "Color Name or Code",
  "priority": "P1_Verplicht",
  "priority_description": "Primaire kleur identifier - kleurnaam preferred over kleurcode",
  "quality_weight": 30,
  "field_group_id": "color",
  "field_group_label_nl": "Kleur (Naam of Code)",
  "field_group_label_en": "Color (Name or Code)",
  "data_quality_impact": "CRITICAL - Kleur is variant optie 1 en essentieel voor product differentiatie. Zonder kleur kunnen we geen unieke SKU's genereren, geen kleur-opties tonen aan klanten, en geen variant matrix bouwen. Elke variant MOET een kleur hebben (desnoods 'Neutraal' of 'One Color').",
  "is_required_for_variants": true,
  "quality_weight": 3,
  "ai_recognition_prompt": "Detecteer kolommen met kleurnamen zoals 'Zwart', 'Navy', 'Red', 'Blue Ink'. Kleuren kunnen zijn: enkele kleuren, duo kleuren (met / of -), safety kleuren (hi-vis), of kleurcodes. Kolomnamen: 'Kleur', 'Color', 'Colour', 'Farbe', 'Couleur'.",
  "ai_negative_rules": "Negeer kolommen met:\n- Alleen numerieke kleurcodes (bijv. '001', '305') zonder namen\n- Hex codes (bijv. '#FF0000') zonder namen\n- Pantone codes alleen\n- Kolommen genaamd 'Kleurgroep' (te abstract)\n- 'Kleurafwijking' of 'Kleurkwaliteit' (QA velden)",
  "example_column_names": ["Kleur", "Color", "Colour", "Farbe", "Couleur", "Coloris"],
  "supplier_advice_template": "⚠️ KRITIEK: Ontbrekend veld KLEUR\n\nDeze dataset bevat geen kleur informatie. Zonder kleur kunnen we:\n- Geen product variants onderscheiden\n- Geen kleur-opties tonen in webshop\n- Geen unieke SKU's genereren\n\nToevoegen in Excel:\n- Kolom naam: 'Kleur' of 'Color'\n- Format: Kleurnaam in Nederlands of Engels\n- Duo kleuren: Gebruik '/' (bijv. 'Zwart/Grijs')\n- Voorbeelden: 'Zwart', 'Navy', 'Wit', 'Rood', 'Grijs/Zwart'",
  "supplier_advice_examples": ["Zwart", "Navy", "Wit", "Rood", "Grijs/Zwart", "Hi-vis Geel", "Royal Blue"]
}
```

#### 4. Supplier Size Code (Field Group: Size)
```json
{
  "field_key": "supplier_size_code",
  "field_label_nl": "Maat",
  "field_label_en": "Size",
  "priority": "P1_Verplicht",
  "priority_description": "Maatcode - geen alternatief beschikbaar",
  "quality_weight": 30,
  "field_group_id": "size",
  "field_group_label_nl": "Maat",
  "field_group_label_en": "Size",
  "data_quality_impact": "CRITICAL - Maat is variant optie 2 en essentieel voor product differentiatie. Zonder maat kunnen we geen complete variant matrix tonen, geen voorraad per maat bijhouden, en geen juiste sizing info aan klanten geven. Elke variant MOET een maat hebben (desnoods 'ONE SIZE' voor universele items).",
  "is_required_for_variants": true,
  "quality_weight": 3,
  "ai_recognition_prompt": "Detecteer kolommen met maatcodes. Maten kunnen zijn: letter maten (XS-5XL), numerieke maten (38-60 voor broeken, 39-48 voor schoenen), of speciale maten (92-164 voor kinderen). Kolomnamen: 'Maat', 'Size', 'Größe', 'Taille'.",
  "ai_negative_rules": "Negeer kolommen met:\n- Maatgroepen in plaats van specifieke maten (bijv. 'Small-Medium-Large' als één waarde)\n- Kolommen genaamd 'Maattabel' (referentie, geen werkelijke maat)\n- 'Pasvorm' of 'Fit' (slim/regular/loose, niet maat)\n- Volume of gewicht (liters, kg)",
  "example_column_names": ["Maat", "Size", "Größe", "Taille", "Talla", "Maat code"],
  "supplier_advice_template": "⚠️ KRITIEK: Ontbrekend veld MAAT\n\nDeze dataset bevat geen maat informatie. Zonder maat kunnen we:\n- Geen product variants onderscheiden\n- Geen sizing opties tonen in webshop\n- Geen voorraad per maat bijhouden\n\nToevoegen in Excel:\n- Kolom naam: 'Maat' of 'Size'\n- Format: Letter maten (S, M, L) OF numeriek (44, 46, 48)\n- Voorbeelden: 'S', 'M', 'L', 'XL', '2XL' OF '44', '46', '48'",
  "supplier_advice_examples": ["S", "M", "L", "XL", "XXL", "3XL", "44", "46", "48", "50", "39", "42"]
}
```

#### 5. Supplier Color Code (Field Group: Color - ALTERNATIVE)

**NEW v4.0:** Verhoogd van P3 naar P1 voor Field Group OR-logic.

```json
{
  "field_key": "supplier_color_code",
  "field_label_nl": "Kleur Naam of Code",
  "field_label_en": "Color Name or Code",
  "priority": "P1_Verplicht",
  "priority_description": "Alternatief voor kleur naam - converteren naar kleurnaam aanbevolen",
  "quality_weight": 30,
  "field_group_id": "color",
  "field_group_label_nl": "Kleur (Naam of Code)",
  "field_group_label_en": "Color (Name or Code)",
  "data_quality_impact": "IMPORTANT - Kleurcode is acceptabel als alternatief voor kleurnaam, maar vereist conversie bij promotie naar master data. Enkel code = waarschuwing, maar geen blocker.",
  "ai_recognition_prompt": "Detecteer kolommen met kleurcodes zoals 'NVY', 'BLK', 'WHT', '001', '305'. Dit zijn CODES, niet volledige namen. Vaak korte alfanumerieke waarden of numeriek. Kolomnamen: 'Kleurcode', 'Color Code', 'Colour Code', 'Farbcode'.",
  "ai_negative_rules": "Negeer kolommen met volledige kleurnamen (bijv. 'Navy', 'Zwart'). Dit moeten CODES zijn.",
  "example_column_names": ["Kleurcode", "Color Code", "Farbcode", "Colour Code"],
  "supplier_advice_template": "ℹ️ ALTERNATIEF AANWEZIG: Kleurcode (geen kleurnaam)\n\nDeze dataset bevat kleurcodes maar geen kleurnamen. Dit is acceptabel voor import, maar:\n- Kleurnamen zijn leesbaarder voor gebruikers\n- Conversie vereist bij promotie naar master catalogus\n\nAanbeveling:\n- Voeg kolom 'Kleurnaam' toe in volgende import\n- Format: Volledige kleurnamen (bijv. 'Navy', 'Zwart', 'Rood')",
  "supplier_advice_examples": ["NVY", "BLK", "WHT", "RD", "GRY"]
}
```

#### 6. Supplier Style Code (Field Group: Style - ALTERNATIVE)

**NEW v4.0:** Verhoogd van P2 naar P1 voor Field Group OR-logic.

```json
{
  "field_key": "supplier_style_code",
  "field_label_nl": "Model Naam of Code",
  "field_label_en": "Style Name or Code",
  "priority": "P1_Verplicht",
  "priority_description": "Alternatief voor stijl/model naam - beide samen is ideaal",
  "quality_weight": 30,
  "field_group_id": "style",
  "field_group_label_nl": "Model (Naam of Code)",
  "field_group_label_en": "Style (Name or Code)",
  "data_quality_impact": "IMPORTANT - Style code is acceptabel als alternatief voor style naam. Beide samen is ideaal voor master product matching.",
  "ai_recognition_prompt": "Detecteer kolommen met product/model codes zoals 'PL-001', 'WB-1234', 'POLO-CLASSIC'. Dit zijn CODES, vaak alfanumeriek met dashes of voorvoegsels. Kolomnamen: 'Artikelcode', 'Style Code', 'Model Code', 'Product Code'.",
  "ai_negative_rules": "Negeer kolommen met volledige productnamen zonder codes (bijv. 'Polo Classic', 'Werkbroek Stretch'). Dit moeten CODES zijn.",
  "example_column_names": ["Artikelcode", "Style Code", "Model Code", "Product Code"],
  "supplier_advice_template": "ℹ️ ALTERNATIEF AANWEZIG: Style code (geen style naam)\n\nDeze dataset bevat style codes maar geen style namen. Dit is acceptabel, maar beide samen is ideaal voor master product matching.",
  "supplier_advice_examples": ["PL-001", "WB-1234", "POLO-CLASSIC", "SFT-500"]
}
```

---

### P2 Velden (Aanbevolen)

#### 7. Supplier Product Group
```json
{
  "field_key": "supplier_product_group",
  "field_label_nl": "Productgroep",
  "field_label_en": "Product Group",
  "priority": "P2_Aanbevolen",
  "priority_description": "Helpt bij automatische categorisatie - geen alternatief",
  "quality_weight": 15,
  "field_group_id": null,
  "data_quality_impact": "IMPORTANT - Productgroep helpt bij automatische categorisatie en filtering. Zonder productgroep moeten we handmatig categoriseren (10+ min per product). Met productgroep kan AI in 80% van gevallen automatisch de juiste categorie voorstellen. Verbetert search en navigation significant.",
  "is_required_for_variants": false,
  "quality_weight": 2,
  "ai_recognition_prompt": "Detecteer kolommen met productgroep/categorie namen zoals 'T-Shirts', 'Werkbroeken', 'Jassen', 'Polos'. Dit zijn brede categorieën die meerdere producten groeperen. Kolomnamen: 'Productgroep', 'Category', 'Product Type', 'Categorie'.",
  "ai_negative_rules": "Negeer kolommen met:\n- Te brede categorieën ('Kleding' - niet specifiek genoeg)\n- Te smalle categorieën (style namen in plaats van groepen)\n- Merknamen in plaats van productgroepen\n- Technische classificaties (bijv. 'Class 2 PPE')",
  "example_column_names": ["Productgroep", "Category", "Product Group", "Categorie", "Product Type", "Artikelgroep"],
  "supplier_advice_template": "ℹ️ AANBEVOLEN: Ontbrekend veld PRODUCTGROEP\n\nDeze dataset bevat geen productgroep informatie. Zonder productgroep:\n- Moet elke categorie handmatig toegewezen worden (tijdrovend)\n- Kan AI niet leren van patronen\n- Zijn filters/search minder effectief\n\nToevoegen in Excel:\n- Kolom naam: 'Productgroep' of 'Category'\n- Format: Brede categorieën (niet te specifiek)\n- Voorbeelden: 'T-Shirts', 'Werkbroeken', 'Jassen', 'Poloshirts', 'Veiligheidsschoenen'",
  "supplier_advice_examples": ["T-Shirts", "Werkbroeken", "Jassen", "Poloshirts", "Sweaters", "Schoenen", "Handschoenen"]
}
```

#### 8. Supplier Advised Price
```json
{
  "field_key": "supplier_advised_price",
  "field_label_nl": "Adviesprijs",
  "field_label_en": "Advised Price",
  "priority": "P2_Aanbevolen",
  "priority_description": "Basis voor prijsstrategie - geen alternatief",
  "quality_weight": 15,
  "field_group_id": null,
  "data_quality_impact": "IMPORTANT - Adviesprijs is basis voor prijsstrategie en marge berekening. Zonder prijs kunnen we geen kostprijs schatten, geen verkoopprijzen berekenen, en geen winstgevendheid analyseren. Hoewel prijzen later handmatig aangepast kunnen worden, versnelt initiële prijs data het proces enorm.",
  "is_required_for_variants": false,
  "quality_weight": 2,
  "ai_recognition_prompt": "Detecteer kolommen met prijzen in EUR formaat. Prijzen kunnen zijn: 12.50, 12,50, €12.50, 12.50 EUR. Let op: dit is ADVIESPRIJS van leverancier (retail price), NIET inkoopprijs. Kolomnamen: 'Adviesprijs', 'Price', 'RRP', 'Retail Price', 'Verkoopprijs'.",
  "ai_negative_rules": "Negeer kolommen met:\n- Inkoopprijzen of groothandelsprijzen (tenzij duidelijk advised)\n- Prijs bereiken (bijv. '10-15 EUR') zonder specifieke waarde\n- Oude prijzen of kortingen (tenzij huidige prijs)\n- Kolommen met 'Actieprijs' (tijdelijk, niet standaard)",
  "example_column_names": ["Adviesprijs", "Price", "RRP", "Retail Price", "Verkoopprijs", "Consumentenprijs"],
  "supplier_advice_template": "ℹ️ AANBEVOLEN: Ontbrekend veld ADVIESPRIJS\n\nDeze dataset bevat geen prijs informatie. Zonder prijzen:\n- Moeten alle prijzen handmatig ingevoerd worden\n- Kunnen we geen kostprijs schatten\n- Kunnen we geen winstgevendheid analyseren\n\nToevoegen in Excel:\n- Kolom naam: 'Adviesprijs' of 'Price'\n- Format: Numeriek met 2 decimalen (bijv. 12.50)\n- Valuta: EUR (Euro)\n- Dit is RETAIL prijs (consumentenprijs), niet inkoopprijs",
  "supplier_advice_examples": ["12.50", "24.95", "89.00", "125.50", "15.99"]
}
```

#### 9. Material Composition
```json
{
  "field_key": "material_composition",
  "field_label_nl": "Materiaal Samenstelling",
  "field_label_en": "Material Composition",
  "priority": "P2_Aanbevolen",
  "priority_description": "Verbetert product beschrijving en SEO - geen alternatief",
  "quality_weight": 15,
  "field_group_id": null,
  "data_quality_impact": "IMPORTANT - Materiaal info verbetert product beschrijvingen, SEO, en filtering (bijv. '100% katoen' filter). Klanten maken aankoopbeslissingen obv materiaal (comfort, duurzaamheid, onderhoud). Zonder materiaal missen we kans op conversion en waardevolle metadata.",
  "is_required_for_variants": false,
  "quality_weight": 2,
  "ai_recognition_prompt": "Detecteer kolommen met materiaal samenstelling zoals '100% Katoen', '65% Polyester 35% Katoen', 'Cotton/Polyester blend'. Vaak inclusief percentages. Kolomnamen: 'Materiaal', 'Material', 'Composition', 'Fabric', 'Stof'.",
  "ai_negative_rules": "Negeer kolommen met:\n- Alleen stofgewicht (bijv. '180 GSM') zonder materiaal\n- Alleen weeftechniek (bijv. 'Jersey', 'Twill') zonder materiaal\n- Kwaliteitsbeoordelingen (bijv. 'Premium fabric')\n- Kolommen genaamd 'Materiaaltype' als dit categorieën zijn",
  "example_column_names": ["Materiaal", "Material", "Composition", "Fabric", "Stof", "Materiaalsamenstelling"],
  "supplier_advice_template": "ℹ️ AANBEVOLEN: Ontbrekend veld MATERIAAL\n\nDeze dataset bevat geen materiaal informatie. Zonder materiaal:\n- Missen product beschrijvingen waardevolle details\n- Kunnen klanten niet filteren op materiaal voorkeur\n- Is SEO minder effectief\n\nToevoegen in Excel:\n- Kolom naam: 'Materiaal' of 'Fabric'\n- Format: Percentage + materiaal naam\n- Voorbeelden: '100% Katoen', '65% Polyester 35% Katoen', 'Cotton/Polyester blend'",
  "supplier_advice_examples": ["100% Katoen", "65% Polyester 35% Katoen", "80% Cotton 20% Polyester", "100% Polyester", "Cotton/Elastane blend"]
}
```

---

### P3 Velden (Optioneel)

#### 10. Care Instructions
```json
{
  "field_key": "care_instructions",
  "field_label_nl": "Wasvoorschrift",
  "field_label_en": "Care Instructions",
  "priority": "P3_Optioneel",
  "priority_description": "Luxe metadata - niet kritisch",
  "quality_weight": 5,
  "field_group_id": null,
  "data_quality_impact": "NICE TO HAVE - Wasvoorschriften zijn handig voor klanten maar niet kritisch voor basis product data. Meeste kledingstukken hebben standaard wasvoorschriften obv materiaal. Luxe metadata die conversion kan verhogen maar geen basis requirement.",
  "is_required_for_variants": false,
  "quality_weight": 1,
  "ai_recognition_prompt": "Detecteer kolommen met was- en onderhouds instructies zoals '40°C wassen', 'Niet bleken', 'Strijken laag'. Vaak als vrije tekst of icoon codes. Kolomnamen: 'Wasvoorschrift', 'Care', 'Washing', 'Onderhoud'.",
  "ai_negative_rules": "Negeer kolommen met:\n- Alleen temperaturen zonder context\n- Product garantie info (niet wasvoorschrift)\n- Opslag instructies (niet onderhoud)",
  "example_column_names": ["Wasvoorschrift", "Care Instructions", "Washing", "Onderhoud", "Verzorging"],
  "supplier_advice_template": "💡 OPTIONEEL: Ontbrekend veld WASVOORSCHRIFT\n\nDeze dataset bevat geen wasvoorschrift. Dit is optioneel maar kan product pagina's verrijken.\n\nToevoegen in Excel (optioneel):\n- Kolom naam: 'Wasvoorschrift' of 'Care'\n- Format: Vrije tekst of icoon codes\n- Voorbeelden: '40°C wassen', 'Niet bleken', 'Strijken op laag'",
  "supplier_advice_examples": ["40°C wassen", "60°C wassen, niet bleken", "Machine wash 30°C", "Handwash only", "Droogkast geschikt"]
}
```

---

## 🧮 Quality Scoring Algoritme

### Dataset Quality Score Berekening

```sql
CREATE VIEW v_dataset_quality_scores AS
SELECT 
  d.dataset_id,
  s.supplier_name,
  b.brand_name,
  
  -- Verplichte velden (50% van score)
  COUNT(CASE 
    WHEN pfd.priority = 'Verplicht' 
    AND d.raw_data ? pfd.field_key 
    AND d.raw_data->>pfd.field_key IS NOT NULL
    AND d.raw_data->>pfd.field_key != ''
    THEN 1 
  END) as required_fields_present,
  COUNT(CASE WHEN pfd.priority = 'Verplicht' THEN 1 END) as total_required_fields,
  
  -- Aanbevolen velden (30% van score)
  COUNT(CASE 
    WHEN pfd.priority = 'Aanbevolen' 
    AND d.raw_data ? pfd.field_key 
    AND d.raw_data->>pfd.field_key IS NOT NULL
    AND d.raw_data->>pfd.field_key != ''
    THEN 1 
  END) as recommended_fields_present,
  COUNT(CASE WHEN pfd.priority = 'Aanbevolen' THEN 1 END) as total_recommended_fields,
  
  -- Optionele velden (20% van score)
  COUNT(CASE 
    WHEN pfd.priority = 'Optioneel' 
    AND d.raw_data ? pfd.field_key 
    AND d.raw_data->>pfd.field_key IS NOT NULL
    AND d.raw_data->>pfd.field_key != ''
    THEN 1 
  END) as optional_fields_present,
  COUNT(CASE WHEN pfd.priority = 'Optioneel' THEN 1 END) as total_optional_fields,
  
  -- Quality Score (0-100)
  ROUND(
    -- Verplichte velden: 50 punten max
    (COUNT(CASE WHEN pfd.priority = 'Verplicht' AND d.raw_data ? pfd.field_key AND d.raw_data->>pfd.field_key IS NOT NULL AND d.raw_data->>pfd.field_key != '' THEN 1 END)::NUMERIC / 
     GREATEST(COUNT(CASE WHEN pfd.priority = 'Verplicht' THEN 1 END), 1)) * 50 +
    
    -- Aanbevolen velden: 30 punten max
    (COUNT(CASE WHEN pfd.priority = 'Aanbevolen' AND d.raw_data ? pfd.field_key AND d.raw_data->>pfd.field_key IS NOT NULL AND d.raw_data->>pfd.field_key != '' THEN 1 END)::NUMERIC / 
     GREATEST(COUNT(CASE WHEN pfd.priority = 'Aanbevolen' THEN 1 END), 1)) * 30 +
    
    -- Optionele velden: 20 punten max
    (COUNT(CASE WHEN pfd.priority = 'Optioneel' AND d.raw_data ? pfd.field_key AND d.raw_data->>pfd.field_key IS NOT NULL AND d.raw_data->>pfd.field_key != '' THEN 1 END)::NUMERIC / 
     GREATEST(COUNT(CASE WHEN pfd.priority = 'Optioneel' THEN 1 END), 1)) * 20
  , 0) as quality_score
  
FROM supplier_datasets d
CROSS JOIN pim_field_definitions pfd
JOIN suppliers s ON d.supplier_id = s.supplier_id
LEFT JOIN brands b ON d.brand_id = b.brand_id
WHERE pfd.is_active = true
GROUP BY d.dataset_id, s.supplier_name, b.brand_name;
```

### Quality Score Interpretatie

| Score | Label | Betekenis | Actie |
|-------|-------|-----------|-------|
| **95-100%** | 🟢 Excellent | Vrijwel complete data, alle kritische velden aanwezig | Ready for promotie, minimale review |
| **85-94%** | 🟢 Goed | Goede data kwaliteit, enkele optionele velden ontbreken | Ready for promotie |
| **70-84%** | 🟡 Voldoende | Basis kwaliteit, enkele aanbevolen velden ontbreken | Review aanbevolen velden |
| **50-69%** | 🟠 Matig | Incomplete data, aanbevolen velden ontbreken | Supplier feedback nodig |
| **<50%** | 🔴 Onvoldoende | Kritieke velden ontbreken | Blokkeer import, supplier contact |

---

## 🤖 AI Herkenning: Gebruik in ai-suggest-mapping

### Hoe Field Definitions AI Herkenning Sturen

**Edge Function:** `ai-suggest-mapping`

**Proces:**
1. Fetch alle actieve `pim_field_definitions` (priority = Verplicht eerst)
2. Build AI prompt met field definitions:
```typescript
const systemPrompt = `
Je bent een expert in product data mapping.

BESCHIKBARE PIM VELDEN (prioriteit: Verplicht → Aanbevolen → Optioneel):

${pimFields.map(field => `
VELD: ${field.field_key}
- Display naam: ${field.display_name_nl}
- Priority: ${field.priority}
- Herkenning: ${field.ai_recognition_prompt}
- Negeer: ${field.ai_negative_rules}
- Voorbeelden: ${field.example_column_names.join(', ')}
`).join('\n---\n')}

MAPPING STRATEGIE:
1. Match Verplichte velden eerst (hoogste impact)
2. Match Aanbevolen velden indien aanwezig
3. Skip Optionele velden met lage confidence
`;
```

3. AI analyseert supplier kolommen obv prompts
4. Return suggesties met confidence per veld

**Voorbeeld Output:**
```json
{
  "suggestions": [
    {
      "source_column": "Barcode",
      "suggested_field": "ean",
      "confidence": 0.98,
      "priority": "Verplicht",
      "reasoning": "Kolom bevat 13-cijferige codes matching EAN pattern"
    },
    {
      "source_column": "Productnaam",
      "suggested_field": "supplier_style_name",
      "confidence": 0.92,
      "priority": "Verplicht",
      "reasoning": "Kolom bevat product namen zonder variant details"
    },
    {
      "source_column": "Prijs EUR",
      "suggested_field": "supplier_advised_price",
      "confidence": 0.85,
      "priority": "Aanbevolen",
      "reasoning": "Kolom bevat numerieke prijzen in EUR format"
    }
  ]
}
```

---

## 📢 Supplier Advice Generator

### Automatische Feedback voor Ontbrekende Velden

**Edge Function:** `generate-supplier-advice` (nieuw)

**Input:** `dataset_id`

**Proces:**
1. Check welke Verplichte/Aanbevolen velden ontbreken via quality score view
2. Voor elk ontbrekend veld: fetch `supplier_advice_template` + `supplier_advice_examples`
3. Genereer rapport met prioriteit (Verplicht eerst)

**Output Template:**
```markdown
# 📊 Dataset Kwaliteit Rapport: {supplier_name} - {brand_name}

**Quality Score: {score}% ({label})**

---

## ⚠️ KRITIEKE VELDEN (Verplicht)

{missing_required_fields.map(field => field.supplier_advice_template).join('\n\n')}

---

## ℹ️ AANBEVOLEN VELDEN  

{missing_recommended_fields.map(field => field.supplier_advice_template).join('\n\n')}

---

## 💡 OPTIONELE VELDEN

{missing_optional_fields.map(field => field.supplier_advice_template).join('\n\n')}

---

## ✅ VOLGENDE STAPPEN

1. Voeg ontbrekende KRITIEKE velden toe (zie boven)
2. Overweeg AANBEVOLEN velden toe te voegen (verhoogt kwaliteit 30%)
3. Upload bijgewerkt bestand via PIM Import Wizard

**Hulp nodig?** Neem contact op met uw account manager.
```

---

## 🔄 Continuous Improvement: Learning Loop

### Hoe Field Definitions Evolueren

**Feedback Bronnen:**
1. **Mapping Feedback:** User corrigeert AI suggestie → update `ai_recognition_prompt`
2. **Quality Issues:** Veel fout-positieven → update `ai_negative_rules`
3. **New Suppliers:** Nieuwe kolom patterns → toevoegen aan `example_column_names`

**Update Proces:**
```typescript
// In Velddefinities UI
function updateFieldDefinition(fieldKey, updates) {
  // User past ai_recognition_prompt aan
  await supabase
    .from('pim_field_definitions')
    .update({
      ai_recognition_prompt: updates.ai_recognition_prompt,
      ai_negative_rules: updates.ai_negative_rules,
      example_column_names: updates.example_column_names,
      updated_at: now()
    })
    .eq('field_key', fieldKey);
  
  // Invalidate mapping cache voor dit veld
  await invalidateMappingCache(fieldKey);
}
```

**Monitoring KPI's:**
- **Acceptance Rate per veld:** % keer dat AI suggestie voor dit veld geaccepteerd wordt
- **False Positive Rate:** % keer dat AI verkeerde kolom suggereert
- **Coverage Rate:** % imports waar dit veld succesvol herkend wordt

**Target:** >90% acceptance rate voor Verplichte velden na 20 imports

---

## 🎯 Implementatie Checklist

### Database Setup
- [ ] Create `pim_field_definitions` table
- [ ] Seed met Verplichte velden (EAN, style_name, color, size)
- [ ] Seed met Aanbevolen velden (product_group, price, material)
- [ ] Seed met Optionele velden (care_instructions, certifications)
- [ ] Create `v_dataset_quality_scores` view
- [ ] Test quality score berekening met sample data

### AI Integration
- [ ] Update `ai-suggest-mapping` to use field definitions
- [ ] Build AI prompt generator from field definitions
- [ ] Implement confidence filtering (Verplicht >70%, Aanbevolen >80%)
- [ ] Test mapping met diverse supplier files

### UI Components
- [ ] Update Velddefinities page met nieuwe focus
- [ ] Remove export-centric language
- [ ] Add "Data Quality Impact" display
- [ ] Add "Supplier Advice Preview" per veld
- [ ] Test CRUD operaties op field definitions

### Quality Dashboard (toekomstig)
- [ ] Create Dataset Quality page `/ai-engine/dataset-quality`
- [ ] Show quality scores per supplier/brand
- [ ] Highlight missing Verplichte velden
- [ ] Button "Generate Supplier Advice"
- [ ] Export quality rapport als PDF

---

## 📚 Gerelateerde Documentatie

- `docs/technical/ai-engine-architecture.md` - Complete AI systeem overzicht
- `docs/technical/ai-mapping-system.md` - Mapping engine details
- `docs/data-model/validation-rules.md` - Validatie regels per veld type
- `docs/supplier-analysis/` - Leverancier-specifieke data patronen

---

## 🚀 Future Enhancements

### ML-Based Field Recognition (Q2 2025)
Train classification model op basis van:
- Historische mapping feedback
- Column name patterns
- Sample data patterns
→ Reduce dependency on hand-crafted prompts

### Multi-Language Support (Q3 2025)
Extend field definitions met:
- `display_name_de` (Duits)
- `display_name_fr` (Frans)
- `ai_recognition_prompt_en` (English prompts)
→ Support internationale suppliers

### Context-Aware Priorities (Q4 2025)
Dynamic priority obv context:
- Fashion brands → `fit_type` = Aanbevolen
- Safety workwear → `certification_marks` = Verplicht
- Premium brands → `care_instructions` = Aanbevolen
→ Adaptive quality criteria per supplier type

# 🗄️ DATABASE MODEL VOORSTEL - Assortment Management

> **Status:** VOORSTEL TER REVIEW (v1.1)  
> **Auteurs:** [AI-ARCHITECT] + [BA]  
> **Datum:** December 20, 2025  
> **Laatst Bijgewerkt:** December 20, 2025  
> **Context:** MVP Happy Path - Fase 5-6 (Promotion → Assortment)

---

## 📋 Executive Summary

Dit document presenteert het database model voor **Assortment Masters** en **Assortment Variants** - de genormaliseerde producten die gebruikers van de eigen business beheren in hun assortiment na promotie vanuit leverancierscatalogi.

**Kernprincipes:**

- ✅ **Traceability:** Behoud link naar originele supplier producten (mogelijk meerdere bronnen)
- ✅ **Smart Normalisatie:** Intelligente color/size codes met behoud van raw data
- ✅ **Auditability:** Track wie, wanneer, waarom gepromoveerd
- ✅ **Flexibiliteit:** Gebruikers kunnen eigen data toevoegen/wijzigen
- ✅ **Consistentie:** Volg bestaande DataBiz patterns

---

## 🏗️ Architectuur Context

### Huidige Database Structuur

```
┌─────────────────────────────────────────────────────────────────┐
│ SUPPLIER DATA (Raw - Fase 1-4)                                  │
├─────────────────────────────────────────────────────────────────┤
│ suppliers              → Leveranciers                           │
│ datasets               → Geüploade bestanden                    │
│ supplier_products      → Raw master producten (niet genormaliseerd) │
│ supplier_variants      → Raw varianten (EAN, color_raw, size_raw)  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MASTER DATA (Normalisatie)                                      │
├─────────────────────────────────────────────────────────────────┤
│ brands                 → Merken (BJO, PRO, GRI, etc.)           │
│ colors                 → Kleuren (genormaliseerd, met hex)      │
│ sizes                  → Maten (EU/US/UK conversies)            │
│ categories             → Productcategorieën (hiërarchisch)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ASSORTMENT (Nieuw - Fase 5-6) ⬅️ DIT VOORSTEL                  │
├─────────────────────────────────────────────────────────────────┤
│ assortment_masters     → Genormaliseerde business producten     │
│ assortment_variants    → Varianten (gekoppeld aan master)       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
[Supplier CSV]
    → [Dataset Upload]
    → [SupplierProduct + SupplierVariant] (raw data)
    → [Browse Catalog] (user bekijkt supplier data)
    → **[PROMOTION]** ✨ (user selecteert product)
    → [AssortmentMaster + AssortmentVariant] (genormaliseerd + raw)
    → [Enrichment] (prijzen, externe links - Fase 7)
    → [Export] (naar webshop/marketplace - Fase 8)
```

---

## 📐 Voorgesteld Database Schema

### Tabel 1: `assortment_masters` (Business Master Producten)

**Doel:** Genormaliseerde product masters die gebruikers van de eigen business beheren in hun assortiment.

#### Kolommen

| Kolom           | Type         | Constraints        | Beschrijving                                 |
| --------------- | ------------ | ------------------ | -------------------------------------------- |
| **id**          | UUID         | PRIMARY KEY        | Uniek identifier                             |
| **name**        | VARCHAR(255) | NOT NULL           | Product naam (door gebruikers aan te passen) |
| **brand_id**    | UUID         | FK → brands.id     | Genormaliseerd merk (verplicht)              |
| **category_id** | UUID         | FK → categories.id | Productcategorie (verplicht)                 |
| **description** | TEXT         | NULL               | Uitgebreide productbeschrijving              |
| **promoted_at** | TIMESTAMP    | NOT NULL           | Wanneer gepromoveerd                         |
| **promoted_by** | UUID         | FK → users.id      | Wie heeft gepromoveerd (audit)               |
| **is_active**   | BOOLEAN      | DEFAULT TRUE       | Status (actief/gearchiveerd)                 |
| **created_at**  | TIMESTAMP    | DEFAULT NOW()      | Record aanmaak                               |
| **updated_at**  | TIMESTAMP    | DEFAULT NOW()      | Laatste wijziging                            |

#### Indexen

```sql
CREATE INDEX idx_assortment_masters_brand ON assortment_masters(brand_id);
CREATE INDEX idx_assortment_masters_category ON assortment_masters(category_id);
CREATE INDEX idx_assortment_masters_active ON assortment_masters(is_active);
CREATE INDEX idx_assortment_masters_name ON assortment_masters(name); -- Voor search
```

#### Business Rules

1. **Multi-Source Support:** Een assortment master kan uit meerdere supplier bronnen bestaan

   - Traceability via aparte junction tabel (zie onder)
   - Geen UNIQUE constraint op supplier product ID

2. **Referential Integrity:**

   - `brand_id` MOET bestaan in `brands` table
   - `category_id` MOET bestaan in `categories` table
   - `promoted_by` MOET bestaan in `users` table

3. **Soft Delete:**
   - `is_active = FALSE` voor archiveren (GEEN CASCADE DELETE)
   - Hiermee blijven audit trails intact

---

### Tabel 2: `assortment_variants` (Business Varianten)

**Doel:** Specifieke varianten (kleur/maat combinaties) binnen een AssortmentMaster.

#### Kolommen

| Kolom                    | Type         | Constraints                          | Beschrijving                                        |
| ------------------------ | ------------ | ------------------------------------ | --------------------------------------------------- |
| **id**                   | UUID         | PRIMARY KEY                          | Uniek identifier                                    |
| **assortment_master_id** | UUID         | FK → assortment_masters.id, NOT NULL | Hoort bij dit master product                        |
| **ean**                  | VARCHAR(13)  | UNIQUE, NOT NULL                     | Barcode (EAN-13)                                    |
| **color_code**           | VARCHAR(50)  | NOT NULL                             | Samengestelde kleurcode (geen FK!)                  |
| **color_raw**            | VARCHAR(100) | NULL                                 | Originele leverancier kleur (bijv. "Smaragd Green") |
| **size_code**            | VARCHAR(10)  | NOT NULL                             | Directe link naar sizes tabel                       |
| **size_raw**             | VARCHAR(50)  | NULL                                 | Originele leverancier maat                          |
| **image_url**            | TEXT         | NULL                                 | Product afbeelding URL (geen fallback)              |
| **is_active**            | BOOLEAN      | DEFAULT TRUE                         | Status (actief/niet leverbaar)                      |
| **created_at**           | TIMESTAMP    | DEFAULT NOW()                        | Record aanmaak                                      |
| **updated_at**           | TIMESTAMP    | DEFAULT NOW()                        | Laatste wijziging                                   |

#### Indexen

```sql
CREATE INDEX idx_assortment_variants_master ON assortment_variants(assortment_master_id);
CREATE INDEX idx_assortment_variants_ean ON assortment_variants(ean); -- Voor barcode lookup
CREATE INDEX idx_assortment_variants_color_code ON assortment_variants(color_code); -- Voor filters
CREATE INDEX idx_assortment_variants_size_code ON assortment_variants(size_code); -- FK naar sizes
CREATE INDEX idx_assortment_variants_active ON assortment_variants(is_active);
```

#### Business Rules

1. **Uniciteit EAN:**

   - Elke variant heeft een UNIEKE EAN (barcode) **OVER ALLE ASSORTMENT VARIANTS**
   - Implementatie: `UNIQUE CONSTRAINT` op `ean` kolom
   - **BLOKKERENDE VALIDATIE:** Als EAN al bestaat → 409 Conflict bij promotie

2. **Cascade Delete:**

   - Bij verwijderen van `assortment_master`: CASCADE delete van alle varianten
   - Implementatie: `ON DELETE CASCADE` in foreign key

3. **Color Code Strategie:**

   - `color_code` is een **samengestelde code** (GEEN FK naar colors tabel)
   - Opbouw: Color family + Karakteristieken (fluorescent, etc.)
   - Voorbeeld: `RED-FLU` (rood, fluoriserend) of `BLUE-GREEN-PATTERN-70-30` (patroon)
   - Extractie van color families mogelijk voor filtering
   - **📄 Volledige specificatie:** [COLOR_CODE_SPECIFICATION.md](./specifications/COLOR_CODE_SPECIFICATION.md)

4. **Size Code Strategie:**

   - `size_code` is directe link naar `sizes.size_code` (WEL FK relatie)
   - Size type wordt bepaald op basis van:
     - Sexe (Man/Vrouw/Unisex)
     - Artikelgroep (Jas/Broek/Shirt)
     - Product omschrijvingen
   - Voorbeeld: DAMESJAS XL ≠ HERENJAS XL (verschillende size_codes)
   - **📄 Volledige specificatie:** [SIZE_CODE_SPECIFICATION.md](./specifications/SIZE_CODE_SPECIFICATION.md)

5. **Raw Data Behoud:**
   - `color_raw` en `size_raw` bevatten originele leverancier waarden
   - Waardevol voor gebruikersherkenning ("Smaragd Green" vs "GRN")
   - Wordt getoond in UI naast genormaliseerde waarden

---

### Tabel 3: `assortment_master_sources` (Leverancier Traceability)

**Doel:** Junction tabel voor many-to-many relatie tussen assortment masters en supplier producten.

**Rationale:** Meerdere leveranciers kunnen hetzelfde product leveren → flexibele traceability.

#### Kolommen

| Kolom                    | Type      | Constraints                     | Beschrijving                  |
| ------------------------ | --------- | ------------------------------- | ----------------------------- |
| **id**                   | UUID      | PRIMARY KEY                     | Uniek identifier              |
| **assortment_master_id** | UUID      | FK → assortment_masters.id      | Het assortiment product       |
| **supplier_id**          | UUID      | FK → suppliers.id               | Leverancier                   |
| **dataset_id**           | UUID      | FK → datasets.id, NULL          | Originele dataset (optioneel) |
| **supplier_product_id**  | UUID      | FK → supplier_products.id, NULL | Origineel supplier product    |
| **is_primary**           | BOOLEAN   | DEFAULT FALSE                   | Is dit de primaire bron?      |
| **added_at**             | TIMESTAMP | DEFAULT NOW()                   | Wanneer toegevoegd            |
| **added_by**             | UUID      | FK → users.id                   | Wie heeft toegevoegd          |

#### Indexen

```sql
CREATE INDEX idx_ams_master ON assortment_master_sources(assortment_master_id);
CREATE INDEX idx_ams_supplier ON assortment_master_sources(supplier_id);
CREATE INDEX idx_ams_supplier_product ON assortment_master_sources(supplier_product_id);
```

#### Business Rules

1. **Meerdere Bronnen:** Één assortment master kan uit meerdere supplier producten bestaan
2. **Primary Source:** Slechts één bron kan `is_primary = TRUE` per master
3. **Audit Trail:** Behoud wie en wanneer een bron is toegevoegd

---

## 🔗 Relationships & Constraints

### Entity Relationship Diagram

```
┌──────────────────┐
│   suppliers      │
│  (bestaand)      │
└────────┬─────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│   datasets       │          │   brands         │
│  (bestaand)      │          │  (bestaand)      │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         ▼                             │
┌──────────────────┐                  │
│supplier_products │                  │
│  (bestaand)      │                  │
└────────┬─────────┘                  │
         │                             │
         │  (via junction tabel)       │
         ▼                             │
┌─────────────────────┐               │
│assortment_master_   │               │
│sources (NIEUW)      │               │
│ (many-to-many)      │               │
└─────────┬───────────┘               │
          │                            │
          ▼                            │
┌──────────────────┐                  │
│assortment_masters│◄─────────────────┤
│     (NIEUW)      │  brand_id        │
└────────┬─────────┘                  │
         │                             │
         │ assortment_master_id        ▼
         ▼                    ┌──────────────────┐
┌──────────────────┐          │   categories     │
│assortment_       │          │  (bestaand)      │
│variants (NIEUW)  │          └──────────────────┘
└────────┬─────────┘
         │                    ┌──────────────────┐
         │ size_code (FK)     │   sizes          │
         └────────────────────│  (bestaand)      │
                              └──────────────────┘

                              ┌──────────────────┐
         color_code (NO FK!)  │   colors         │
         [computed/extracted] │  (bestaand)      │
                              └──────────────────┘

FOREIGN KEY DETAILS:
─────────────────────────────────────────────────────────────
assortment_masters.brand_id              → brands.id
assortment_masters.category_id           → categories.id
assortment_masters.promoted_by           → users.id

assortment_master_sources.assortment_master_id → assortment_masters.id
assortment_master_sources.supplier_id          → suppliers.id
assortment_master_sources.dataset_id           → datasets.id
assortment_master_sources.supplier_product_id  → supplier_products.id
assortment_master_sources.added_by             → users.id

assortment_variants.assortment_master_id → assortment_masters.id (CASCADE)
assortment_variants.size_code            → sizes.size_code (FK)
assortment_variants.color_code           → NO FK (samengestelde code)
```

---

## 💡 Design Beslissingen & Rationale

### 1. **Waarom Smart Normalisatie? (Hybrid Approach)**

**Beslissing:**

- **Brands:** Gebruik FK naar `brands` tabel
- **Sizes:** Gebruik `size_code` string met FK relatie naar `sizes` tabel
- **Colors:** Gebruik samengestelde `color_code` ZONDER FK (+ behoud raw)

**Rationale:**

- ✅ **Brands:** Simpel, stabiel, één-op-één mapping
- ✅ **Sizes:** Complex matching op basis van kledingtype (DAMESJAS ≠ HERENJAS)
  - Size_code bevat context: `WOM-JAC-XL` vs `MEN-JAC-XL`
  - FK relatie voor validatie en conversies (EU/US/UK)
- ✅ **Colors:** Zeer complex, meerdere dimensies:
  - Color family (RED, BLUE, etc.)
  - Karakteristieken (fluorescent, high-vis)
  - Patronen (multi-color, verhoudingen)
  - Voorbeeld: `RED-FLU-HV` of `BLUE-GREEN-PATTERN-70-30`
  - Geen FK omdat dit dynamisch gegenereerd wordt
- ✅ **Raw Behoud:** `color_raw` en `size_raw` voor gebruikersherkenning

**Voorbeeld:**

```sql
-- Brand (simpel)
assortment_masters.brand_id → brands(id=uuid, code='BJO')

-- Size (complex matching)
assortment_variants.size_code = 'WOM-JAC-XL' → sizes.size_code (FK)
assortment_variants.size_raw = 'XL Ladies'   -- origineel

-- Color (meest complex)
assortment_variants.color_code = 'RED-FLU-HV'  -- geen FK!
assortment_variants.color_raw = 'Smaragd Green' -- origineel
```

### 2. **Waarom Junction Tabel voor Traceability?**

**Beslissing:** Aparte `assortment_master_sources` tabel voor many-to-many relatie.

**Rationale:**

- ✅ **Multi-Supplier:** Meerdere leveranciers kunnen hetzelfde product leveren
  - Voorbeeld: Bjornson hoodie van Gripp EN Van Laack
- ✅ **Flexible:** Later extra leveranciers toevoegen zonder schema wijziging
- ✅ **Audit Trail:** Track wanneer en door wie elke bron is toegevoegd
- ✅ **Primary Source:** Markeer één leverancier als primair (voor prijzen/voorraad)
- ✅ **Rapportage:** "Hoeveel producten van leverancier X?"
- ✅ **Updates:** Als supplier data wijzigt, kies welke bron te synchroniseren

### 3. **Waarom `promoted_by` User Tracking?**

**Beslissing:** Track welke gebruiker het product heeft gepromoveerd.

**Rationale:**

- ✅ **Accountability:** Wie heeft dit besluit genomen?
- ✅ **Workflow:** Future: goedkeuringsflows (manager moet accorderen)
- ✅ **Analytics:** Welke user is het meest actief?

### 4. **Waarom GEEN Price in Base Model?**

**Beslissing:** Geen `price` kolom in `own_masters` of `own_variants`.

**Rationale:**

- ✅ **Complexity:** Prijzen zijn complex (inkoopprijs, verkoopprijs, BTW, kortingen)
- ✅ **Separation of Concerns:** Prijzen horen in Fase 7 (Enrichment Domain)
- ✅ **Future-Proof:** Prijzen verschillen per channel (webshop vs. marketplace)

**Future:** Aparte `own_variant_prices` tabel in Enrichment Domain.

### 5. **Waarom Cascade Delete voor Varianten?**

**Beslissing:** `ON DELETE CASCADE` van `own_masters` naar `own_variants`.

**Rationale:**

- ✅ **Logical Dependency:** Varianten kunnen NIET bestaan zonder master
- ✅ **Data Integrity:** Voorkomt "orphaned" varianten
- ✅ **Simplicity:** Verwijder master → automatisch alle varianten weg

**Alternatief overwogen:** Soft delete (`is_active=false`). Conclusie: Cascade is beter voor master-variant relatie.

### 6. **Waarom GEEN Voorraad in V1?**

**Beslissing:** Geen `stock_quantity` of voorraad velden in initiële versie.

**Rationale:**

- ✅ **Scope:** MVP focust op product data management, niet voorraad
- ✅ **Complexity:** Voorraad is een apart domein met eigen regels:
  - Locaties (magazijn, winkel, etc.)
  - Mutaties (in/uit, reserveringen)
  - Tellingsprocessen
- ✅ **External System:** Mogelijk gebruik van externe voorraadtelling (export bestand)
- ✅ **Future-Proof:** Als voorraad nodig is, bouwen we een simpel voorraadsysteem
  - Aparte tabel: `inventory` of `stock_levels`
  - Koppeling via EAN naar `assortment_variants`

**Toekomstig Scenario (Fase 7+):**

```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY,
    variant_ean VARCHAR(13) REFERENCES assortment_variants(ean),
    location_id UUID, -- magazijn/winkel
    quantity INTEGER,
    last_counted_at TIMESTAMP
);
```

---

## 🧪 Data Flow Scenario's

### Scenario 1: Normaal Promotion Flow

**Stappen:**

1. User bekijkt Supplier Catalog (Fase 4)
2. User klikt "Promoveer naar Assortiment" op een product
3. **Backend Actie:**

   ```sql
   -- 1. Maak AssortmentMaster
   INSERT INTO assortment_masters (
       name, brand_id, category_id, promoted_by
   ) VALUES (
       'Bjornson Hoodie',
       (SELECT id FROM brands WHERE code = 'BJO'),
       (SELECT id FROM categories WHERE category_code = 'ALG-KLD-...'),
       <current_user_id>
   );

   -- 2. Link naar supplier bron
   INSERT INTO assortment_master_sources (
       assortment_master_id, supplier_id, supplier_product_id,
       is_primary, added_by
   ) VALUES (
       <new_assortment_master_id>,
       <supplier_id>,
       <supplier_product_id>,
       TRUE,  -- eerste bron is primary
       <current_user_id>
   );

   -- 3. Kopieer alle varianten met smart normalisatie
   INSERT INTO assortment_variants (
       assortment_master_id, ean,
       color_code, color_raw,
       size_code, size_raw,
       image_url
   )
   SELECT
       <new_assortment_master_id>,
       sv.ean,
       generate_color_code(sv.color_raw),  -- AI functie
       sv.color_raw,
       match_size_code(sp.productgroup_raw, sv.size_raw),  -- AI functie
       sv.size_raw,
       sv.image_url
   FROM supplier_variants sv
   JOIN supplier_products sp ON sv.supplier_product_id = sp.id
   WHERE sv.supplier_product_id = <source_supplier_product_id>;
   ```

4. **Response:** Frontend toont succes, navigeert naar Assortiment page

**Nota:** `generate_color_code()` en `match_size_code()` zijn AI-functies die later worden uitgewerkt.

---

### Scenario 2: Duplicate Detection (Optioneel Gedrag)

**Situatie:** User probeert hetzelfde supplier product te promoveren.

**Check:**

```sql
SELECT am.id, am.name
FROM assortment_masters am
JOIN assortment_master_sources ams ON am.id = ams.assortment_master_id
WHERE ams.supplier_product_id = <target_id>;
```

**Mogelijke Resultaten:**

- ✅ Als NIET bestaat: Proceed met promotie
- ⚠️ Als bestaat: Twee opties:
  1. **Blokkeer (stricte mode):** Return `409 Conflict`  
     _"Dit product is al in je assortiment. Bekijk [link]."_
  2. **Toestaan (flexibele mode):** Voeg tweede bron toe
     _"Product bestaat al. Toevoegen als alternatieve leverancier?"_

**Nota:** Business beslissing nodig welke strategie te gebruiken.

---

### Scenario 3: Query - Toon Alle Assortiment Producten van Merk X

```sql
SELECT
    am.id,
    am.name,
    b.name AS brand_name,
    c.name_nl AS category,
    COUNT(av.id) AS variant_count,
    am.promoted_at,
    STRING_AGG(s.name, ', ') AS suppliers  -- meerdere leveranciers
FROM assortment_masters am
JOIN brands b ON am.brand_id = b.id
LEFT JOIN categories c ON am.category_id = c.id
LEFT JOIN assortment_variants av ON am.id = av.assortment_master_id
LEFT JOIN assortment_master_sources ams ON am.id = ams.assortment_master_id
LEFT JOIN suppliers s ON ams.supplier_id = s.id
WHERE b.code = 'BJO'
  AND am.is_active = TRUE
GROUP BY am.id, am.name, b.name, c.name_nl, am.promoted_at
ORDER BY am.promoted_at DESC;
```

---

### Scenario 4: Query - Zoek Product op EAN (Barcode Scan)

```sql
SELECT
    am.name AS product_name,
    b.name AS brand,
    av.color_code,
    av.color_raw AS original_color,  -- toon beide
    s.eu_size AS size,
    av.size_raw AS original_size,    -- toon beide
    av.image_url
FROM assortment_variants av
JOIN assortment_masters am ON av.assortment_master_id = am.id
JOIN brands b ON am.brand_id = b.id
JOIN sizes s ON av.size_code = s.size_code  -- FK relatie
WHERE av.ean = '8719326782744'
  AND av.is_active = TRUE;
```

**UI Display:**

- Kleur: "RED-FLU" (genormaliseerd) + "Smaragd Green" (origineel)
- Maat: "XL" (EU size) + "XL Ladies" (origineel)

---

## ⚠️ Risico's & Mitigaties

| Risico                                  | Impact | Mitigatie                                    |
| --------------------------------------- | ------ | -------------------------------------------- |
| **Incomplete Master Data**              | HOOG   | Validatie bij promotie: check FK constraints |
| (color_raw niet in colors tabel)        |        | Error message: "Kleur niet herkend"          |
| **Performance bij Grote Assortimenten** | MEDIUM | Indexen op frequently queried kolommen       |
| (1000+ products x 50 variants)          |        | Pagination op API endpoints                  |
| **Orphaned Source Data**                | LAAG   | Soft delete op suppliers/datasets            |
| (supplier product verwijderd)           |        | FK constraint blijft intact (niet cascade)   |
| **Concurrent Promotions**               | LAAG   | Database UNIQUE constraint voorkomt dupes    |
| (2 users promoveren zelfde product)     |        | Tweede poging krijgt 409 Conflict            |

---

## 📊 Data Volume Estimaties

**Assumptie:** Gemiddelde retailer

| Entiteit         | Volume   | Groei/Maand | Storage |
| ---------------- | -------- | ----------- | ------- |
| **own_masters**  | 500-2000 | +50-200     | ~500 KB |
| **own_variants** | 10K-50K  | +1K-5K      | ~5 MB   |

**Conclusie:** Geen performance issues verwacht tot 100K+ variants.

---

## 🚀 Implementatie Checklist

### Database Migrations

- [ ] Create Alembic migration file
- [ ] Define `assortment_masters` table met FK constraints
- [ ] Define `assortment_variants` table met cascade delete
- [ ] Define `assortment_master_sources` junction tabel
- [ ] Add indexes (zie boven)
- [ ] Add UNIQUE constraint op `assortment_variants.ean`
- [ ] Add FK constraint: `assortment_variants.size_code` → `sizes.size_code`
- [ ] Test migration: `alembic upgrade head`
- [ ] Test rollback: `alembic downgrade -1`

### SQLAlchemy Models

- [ ] Create `backend/src/domains/assortment/models.py`
- [ ] Define `AssortmentMaster` class
- [ ] Define `AssortmentVariant` class
- [ ] Define `AssortmentMasterSource` class (junction)
- [ ] Configure relationships (bidirectional)
- [ ] Add `__repr__` methods voor debugging
- [ ] Import in `__init__.py`

### Seed Data (Development)

- [ ] Create seed script: `backend/seed_assortment.py`
- [ ] Seed 5-10 assortment_masters uit bestaande supplier data
- [ ] Seed bijbehorende variants met mock color_codes
- [ ] Seed source traceability links
- [ ] Documenteer in README

### AI Normalisatie Functies (Toekomstig)

- [ ] Documenteer `generate_color_code()` strategie in apart document
- [ ] Documenteer `match_size_code()` strategie in apart document
- [ ] MVP: Gebruik simpele mapping (later AI uitbreiden)

### Testing

- [ ] Test migration up/down
- [ ] Test FK constraints (invalid brand_id → error)
- [ ] Test UNIQUE constraints (duplicate promotion → error)
- [ ] Test cascade delete (delete master → variants gone)
- [ ] Test queries (zie scenario's boven)

---

## 🔄 Alternatieve Designs Overwogen

### Alternatief A: Denormalized (Copy-Paste)

**Idee:** Kopieer rauwe strings uit `supplier_products` naar `own_masters`.

```sql
own_masters.brand_raw VARCHAR(255)
own_masters.category_raw VARCHAR(255)
```

**Afgewezen omdat:**

- ❌ Data duplication (opslagverspilling)
- ❌ Inconsistente data (typo's, verschillende schrijfwijzen)
- ❌ Moeilijk te querien (string matching)
- ❌ Geen multilingual support

---

### Alternatief B: Polymorphic Products

**Idee:** Eén `products` tabel voor ZOWEL supplier als own producten.

```sql
products (
    id, type, -- 'supplier' of 'own'
    ...
)
```

**Afgewezen omdat:**

- ❌ Single Table Inheritance → veel NULL kolommen
- ❌ Onduidelijke business meaning
- ❌ Moeilijk om toegangsrechten te managen
- ❌ Complexe queries (WHERE type = 'own')

**DDD Principe:** Supplier en Own zijn verschillende bounded contexts → aparte tabellen.

---

### Alternatief C: EAV (Entity-Attribute-Value)

**Idee:** Flexibele attributes tabel voor custom velden.

```sql
own_master_attributes (
    own_master_id, attribute_key, attribute_value
)
```

**Afgewezen omdat:**

- ❌ Anti-pattern voor structured data
- ❌ Performance nightmare
- ❌ Geen type safety
- ❌ Overkill voor MVP

**Future:** Eventueel voor custom fields in Enrichment fase.

---

## 📚 Referenties & Gerelateerde Documenten

### Specificaties

- **[COLOR_CODE_SPECIFICATION.md](./specifications/COLOR_CODE_SPECIFICATION.md)** - Volledige kleurcode conversie strategie
- **[SIZE_CODE_SPECIFICATION.md](./specifications/SIZE_CODE_SPECIFICATION.md)** - Volledige size code matching strategie

### Project Documenten

- **[MVP_HAPPY_PATH.md](.ai/project/MVP_HAPPY_PATH.md)** - Volledige MVP flow
- **[DOMAIN_REGISTRY.yaml](.ai/project/DOMAIN_REGISTRY.yaml)** - Feature registry
- **[DDD_WORKFLOW_MAP.md](.ai/project/DDD_WORKFLOW_MAP.md)** - Architectuur principes

### Code Referenties

- **[Imports Models](backend/src/domains/imports/models.py)** - Bestaande supplier models
- **[Sizes Table](backend/src/domains/imports/models.py)** - Bestaande sizes master data

---

## ✅ Goedkeurings Sectie

### Stakeholder Sign-Off

| Rol                 | Naam   | Datum | Status | Opmerkingen |
| ------------------- | ------ | ----- | ------ | ----------- |
| **[ARCHITECT]**     | [Naam] | -     | ⏳     |             |
| **[BA]**            | [Naam] | -     | ⏳     |             |
| **[TECH LEAD]**     | [Naam] | -     | ⏳     |             |
| **[PRODUCT OWNER]** | [Naam] | -     | ⏳     |             |

### Beslissingen (Gereviewd)

1. **Categorie Verplicht?**  
   ✅ **BESLUIT:** `category_id NOT NULL` is geaccepteerd  
   → Elke assortment master MOET een categorie hebben

2. **Duplicate Promotion Strategie?**  
   ✅ **BESLUIT:** EAN-based blocking (strikte controle)  
   → Als EAN al bestaat in `assortment_variants`: **409 Conflict**  
   → Error message: _"Deze EAN bestaat al in je assortiment. Product: [naam]"_  
   → Voorkomt duplicate varianten over verschillende masters

3. **Image Storage Strategy?**  
   ✅ **BESLUIT:** URLs voor nu (externe links)  
   → `image_url TEXT` blijft zoals voorgesteld  
   → Toekomstige MinIO integratie mogelijk (Fase 7+)

4. **Soft Delete Strategie?**  
   ✅ **BESLUIT:** `is_active=false` geaccepteerd  
   → Soft delete behoud audit trails  
   → Geen CASCADE DELETE voor master/variant relaties

5. **Color/Size Normalisatie Details?**  
   ✅ **BESLUIT:** AI-based conversie vanaf start  
   → Specificaties gedocumenteerd:

   - [COLOR_CODE_SPECIFICATION.md](./specifications/COLOR_CODE_SPECIFICATION.md)
   - [SIZE_CODE_SPECIFICATION.md](./specifications/SIZE_CODE_SPECIFICATION.md)
     → Implementeer AI matching voor `generate_color_code()` en `match_size_code()`  
     → Fallback naar raw waarden bij lage confidence

6. **Primary Source Logic?**  
   ✅ **BESLUIT:** Orphan products toegestaan  
   → Product kan bestaan zonder primary supplier (wees)  
   → Komt in praktijk weinig voor  
   → Geen automatische primary reassignment

7. **Variant Attributes?**  
   ✅ **BESLUIT:** MVP Scope = Color + Size alleen  
   → `material`, `fit`, `sustainability_label` zijn **NIET** variant attributes  
   → Deze horen bij **Product Attributes** (Fase 7: Enrichment/Verrijking)  
   → Variant blijft simpel: EAN + color + size + image

---

## 🎯 Next Steps (Na Goedkeuring)

1. **Stakeholder Review:** Presentatie van dit document aan team
2. **Feedback Verwerking:** Wijzigingen op basis van opmerkingen
3. **Final Approval:** Sign-off van ARCHITECT + BA
4. **Implementation:**
   - Dag 1: Alembic migration + SQLAlchemy models
   - Dag 2: Seed data + Unit tests
5. **Merge to `dev`:** PR met migration + models

---

**Document Status:** � BESLISSINGEN VASTGELEGD - READY FOR IMPLEMENTATION  
**Laatst Gewijzigd:** December 20, 2025  
**Versie:** 1.1 (Reviewed)

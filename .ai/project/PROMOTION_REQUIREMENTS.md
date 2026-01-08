# 🎯 PROMOTION REQUIREMENTS - MVP Happy Path Dag 2

> **Status:** ACTIVE SPECIFICATION  
> **Date:** December 20, 2025  
> **Context:** User-defined promotion workflow requirements  
> **Phase:** MVP Happy Path - Dag 2 (Backend Promotion Service)

---

## 📋 Executive Summary

Dit document definieert de **exacte requirements** voor de promotie workflow zoals gespecificeerd door de gebruiker. Deze requirements zijn leidend voor de implementatie van Dag 2.

---

## 🎯 Core Principle: Master-Level Promotion

### Requirement 1: Promotie Per Master (NIET Per Variant)

**Rule:** Wanneer een gebruiker een product promoveert, gebeurt dit ALTIJD op master-niveau.

**Betekenis:**

- ✅ User selecteert 1 supplier master product
- ✅ ALLE varianten van die master worden mee gepromoveerd
- ❌ Het is NIET mogelijk om individuele varianten te promoveren

**Rationale:**

- Consistent assortiment (niet gedeeltelijke producten)
- Simpelere UX (één klik, alles mee)
- Voorkomt incomplete product data

**Implementation Impact:**

```python
# Service signature
async def promote_product(
    supplier_product_id: UUID,  # Master ID
    user_id: UUID
) -> AssortmentMaster:
    """
    Promotes a supplier master product with ALL its variants.

    Creates:
    - 1 AssortmentMaster
    - N AssortmentVariants (all supplier variants)
    - 1 AssortmentMasterSource (traceability)
    """
```

---

## 🤖 AI-Suggested Promotion Workflow

### Requirement 2: Systeem Stelt Voor, Gebruiker Valideert

**Flow:**

```
[Supplier Catalog]
    │
    ├─ User clicks "Preview Promotie" (☆ button)
    │
    ▼
[AI Suggestion Screen]
    │
    ├─ Systeem toont voorgestelde mapping:
    │  • Brand: "Bjornson" → BJO (confidence: 95%)
    │  • Category: "Hoodies" → ALG-KLD-HOO-001 (confidence: 88%)
    │  • Colors: "Rood" → RED-SOLID, "Blauw" → BLUE-SOLID
    │  • Sizes: "XL" → WOM-TOP-XL (detected: dames)
    │
    ├─ User actions:
    │  [Accepteren] → Direct promoveren
    │  [Aanpassen] → Wijzig brand/category/mappings
    │  [Annuleren] → Terug naar catalog
    │
    ▼
[Promotie Uitvoeren]
    │
    ▼
[Assortiment] (★ product now visible)
```

**Key Points:**

- ✅ AI doet het werk (mapping suggesties)
- ✅ User heeft controle (kan alles aanpassen)
- ✅ Confidence scores worden getoond
- ✅ User kan direct accepteren (snelle flow)

---

## 🎨 Two Modes: Simple vs. Detailed

### Requirement 3: Flexibele Detail Level

**Mode 1: Simple (Default - Snel & Efficiënt)**

Toon alleen:

- ✅ Voorgestelde brand
- ✅ Voorgestelde category
- ✅ Aantal varianten
- ✅ Accept/Adjust buttons

```
┌─────────────────────────────────────┐
│ Promoveer: Bjornson Hoodie          │
├─────────────────────────────────────┤
│ Merk: Bjornson (BJO)         ✓ 95% │
│ Categorie: Hoodies           ✓ 88% │
│ Varianten: 24 kleuren/maten         │
│                                     │
│ [Accepteren]  [Aanpassen]  [Cancel]│
└─────────────────────────────────────┘
```

**Mode 2: Detailed (Op Verzoek - Volledige Transparantie)**

Extra informatie:

- ✅ AI prompt die gebruikt is
- ✅ AI response (volledige JSON)
- ✅ Dataset informatie (bestandsnaam, upload datum)
- ✅ Velden uit dataset (kolommen)
- ✅ Voorbeeldwaarden uit dataset (eerste 3 rijen)
- ✅ Confidence scores per mapping
- ✅ Alternative suggestions

```
┌────────────────────────────────────────────┐
│ Promoveer: Bjornson Hoodie [Details ▼]    │
├────────────────────────────────────────────┤
│ Merk: Bjornson (BJO)              ✓ 95%   │
│   Alternatief: Björnson (BRN)     ○ 78%   │
│                                            │
│ Categorie: Hoodies                ✓ 88%   │
│   Alternatief: Sweaters           ○ 65%   │
│                                            │
│ Varianten: 24 (expand voor details)       │
│                                            │
│ 📊 Dataset Info:                           │
│   Bestand: gripp_catalog_2025.csv         │
│   Upload: 2025-12-15 14:30                │
│   Rijen: 1.245 producten                  │
│                                            │
│ 📋 Velden:                                 │
│   brand_raw, productgroup_raw, color_raw, │
│   size_raw, ean, image_url                │
│                                            │
│ 🔍 Voorbeelden (3 varianten):              │
│   EAN           Color    Size   Image     │
│   8712...901    Rood     XL     [preview] │
│   8712...902    Blauw    L      [preview] │
│   8712...903    Zwart    M      [preview] │
│                                            │
│ 🤖 AI Prompt:                              │
│   "Match brand 'Bjornson' to brand code..." │
│   [Show full prompt]                       │
│                                            │
│ 🤖 AI Response:                            │
│   { "brand_code": "BJO", ... }            │
│   [Show full JSON]                         │
│                                            │
│ [Accepteren]  [Aanpassen]  [Cancel]       │
└────────────────────────────────────────────┘
```

**Toggle:**

- Button "Toon Details" / "Verberg Details"
- Preference opgeslagen in user settings (default: simple)

---

## ⭐ Star Visualization

### Requirement 4: Promoted Status Indicator

**Visual Design:**

```
┌─────────────────────────────────────┐
│  [★ Gepromoveerd]                   │  ← Gevulde ster
│                                     │
│  Bjornson Hoodie                    │
│  BJO • 24 varianten                 │
│                                     │
│  [Bekijk in Assortiment] →          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [☆ Promoveer]                      │  ← Lege ster
│                                     │
│  ProActive Werkbroek                │
│  PRO • 18 varianten                 │
│                                     │
│  [Preview Promotie] →               │
└─────────────────────────────────────┘
```

**States:**

| Status           | Icon | Button Text          | Action                        |
| ---------------- | ---- | -------------------- | ----------------------------- |
| Not Promoted     | ☆    | "Promoveer"          | Open promotion preview        |
| Promotion Active | ⏳   | "Aan het promoveren" | Disabled (loading)            |
| Promoted         | ★    | "Bekijk Assortiment" | Navigate to assortment detail |

**Frontend Component:**

```tsx
<PromotionStatus
  isPromoted={product.is_promoted}
  onPromote={() => openPromotionPreview(product.id)}
  loading={promotionMutation.isLoading}
/>
```

**Backend Support:**

```python
# SupplierProduct model extension
@property
def is_promoted(self) -> bool:
    """Check if this product has been promoted to assortment."""
    return db.query(AssortmentMasterSource).filter(
        AssortmentMasterSource.supplier_product_id == self.id
    ).first() is not None
```

---

## 🔍 Traceability Requirements

### Requirement 5: Herkenbare Promoted Status

**Backend:**

- ✅ `AssortmentMasterSource.supplier_product_id` linkt terug naar origineel
- ✅ Query helper: `SupplierProduct.is_promoted` computed property
- ✅ Efficient index op `assortment_master_sources.supplier_product_id`

**Frontend:**

- ✅ API response bevat `is_promoted: boolean`
- ✅ Catalog list toont star icon (★/☆)
- ✅ Filter optie: "Alleen niet-gepromoveerde producten"

**API Contract:**

```yaml
GET /api/v2/catalog/supplier-products
Response:
  items:
    - id: UUID
      name: string
      brand_raw: string
      variants_count: integer
      is_promoted: boolean        # ← NIEUW
      promoted_at: datetime|null  # ← NIEUW
      assortment_master_id: UUID|null  # ← NIEUW (for navigation)
```

---

## 📊 Implementation Priority

### Phase 1: Core Promotion (Dag 2a)

1. ✅ Master-level promotion service
2. ✅ Basic API endpoint (`POST /promote`)
3. ✅ `is_promoted` property on SupplierProduct
4. ✅ Simple color/size normalization

### Phase 2: AI Preview (Dag 2b)

5. ✅ `GET /promotion-preview` endpoint
6. ✅ AI suggestion logic (brand/category matching)
7. ✅ Confidence scores
8. ✅ Dataset metadata in response

### Phase 3: Frontend Integration (Dag 3)

9. ✅ Star visualization (★/☆)
10. ✅ Promotion preview modal (simple mode)
11. ✅ Accept/Adjust workflow
12. ✅ Details toggle (simple ↔ detailed)

### Phase 4: Polish (Dag 4)

13. ✅ Loading states
14. ✅ Error handling
15. ✅ Toast notifications
16. ✅ Navigation to promoted product

---

## 🚫 Explicit Non-Requirements (NOT in MVP)

- ❌ Partial promotion (select individual variants)
- ❌ Bulk promotion (multiple masters at once)
- ❌ Scheduled promotion (promote later)
- ❌ Promotion undo/rollback (soft delete only)
- ❌ Promotion history/audit trail (basic tracking only)

---

## ✅ Acceptance Criteria

**User Story:**

> Als gebruiker wil ik een supplier product kunnen promoveren naar mijn assortiment,
> zodat ik het kan beheren en exporteren naar mijn verkoopkanalen.

**Given:** Een supplier catalog met meerdere producten  
**When:** Ik klik op "Promoveer" bij een product  
**Then:**

- ✅ Ik zie een preview met AI-suggesties
- ✅ Ik kan de suggesties accepteren of aanpassen
- ✅ Bij acceptatie wordt het volledige product (master + alle varianten) gepromoveerd
- ✅ Het product krijgt een ★ icon in de catalog
- ✅ Ik kan navigeren naar het gepromoveerde product in Assortiment
- ✅ Als ik opnieuw probeer te promoveren, krijg ik een melding "Al gepromoveerd"

---

## 🎯 Success Metrics

**MVP is succesvol als:**

1. ✅ 90%+ promoties slagen zonder errors
2. ✅ AI suggesties hebben 80%+ acceptance rate
3. ✅ Users kunnen binnen 10 seconden promoveren (simple mode)
4. ✅ Detailed mode wordt gebruikt in <20% van gevallen (expert users)
5. ✅ Geen duplicate promoties door validation

---

## 📚 Related Documents

- [DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md](./DATABASE_MODEL_PROPOSAL_OWN_ASSORTMENT.md) - Database schema
- [MVP_HAPPY_PATH.md](./MVP_HAPPY_PATH.md) - Overall MVP plan
- [COLOR_CODE_SPECIFICATION.md](./specifications/COLOR_CODE_SPECIFICATION.md) - Color normalization
- [SIZE_CODE_SPECIFICATION.md](./specifications/SIZE_CODE_SPECIFICATION.md) - Size normalization

---

**Status:** ✅ REQUIREMENTS APPROVED - READY FOR IMPLEMENTATION  
**Next Step:** Start Dag 2 implementation with these requirements  
**Owner:** [AI-ARCHITECT] + User

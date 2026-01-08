# Intelligent Product Promotie Systeem

## 🎯 Overzicht

Het Intelligent Product Promotie Systeem transformeert `supplier_products` naar de VK product hiërarchie (`product_master` → `product_variants`) met maximale automatisering en minimale handmatige invoer door gebruik te maken van stamdata en zelflerend template systeem.

---

## 📊 Product Hiërarchie

```
product_master (Style/Model niveau)
├── product_categories (Koppeling met ALG categorie - VERPLICHT)
└── product_variants (SKU/EAN niveau)
    ├── option1_id → color_options (VERPLICHT, uit stamdata)
    ├── option2_id → size_options (VERPLICHT, uit stamdata)
    └── ean (VERPLICHT, uit supplier_products)
```

### Kernregels

1. **Color Options:** ALTIJD uit bestaande `color_options` tabel (stamdata)
   - Geen nieuwe kleuren aanmaken tijdens promotie
   - Gebruiker selecteert uit beschikbare color_options
   - Fuzzy matching voor intelligent voorstel

2. **Size Options:** ALTIJD uit bestaande `size_options` tabel (stamdata)
   - Geen nieuwe maten aanmaken tijdens promotie
   - Gebruiker selecteert uit beschikbare size_options
   - Optional: Filter op categorie (category_clothing_types)

3. **ALG Categorie:** VERPLICHT voor product_master
   - Selectie uit `categories` met `taxonomy_id` = ALG
   - Koppeling via `product_categories` tabel
   - Helpt bij content verrijking (bijv. relevante maten per categorie)

---

## 🔄 Promotie Wizard Flow (4 Stappen)

### **Stap 1: Product Selectie binnen Style**

**Doel:** Bepaal welke kleuren en maten van een supplier style worden gepromoveerd.

**Functionaliteit:**
- Groepeer supplier_products op `supplier_style_code`
- Toon unieke kleuren (via `supplier_color_name`)
- Toon unieke maten (via `supplier_size_code`)
- Live telling van te promoveren EAN's
- Validatie: waarschuw bij ontbrekende EAN's

**Output:**
```typescript
{
  selectedProductIds: number[], // EAN's binnen selectie
  supplierStyleCode: string,
  selectedColors: string[],     // supplier_color_name values
  selectedSizes: string[]        // supplier_size_code values
}
```

---

### **Stap 2: Master Details & Categorie (VERPLICHT)**

**Doel:** Definieer product master eigenschappen.

**Verplichte Velden:**
- **Style Naam:** Automatisch voorgesteld uit `supplier_style_name`
- **Merk:** Uit `brands` (via `mapped_brand_id`)
- **ALG Categorie:** VERPLICHT dropdown uit `categories` (taxonomy = ALG)

**Optionele Velden:**
- Gender
- Description
- Material composition
- Care instructions

**Output:**
```typescript
{
  styleMapping: {
    style_name: string,
    brand_id: number,
    category_id: number,        // VERPLICHT (ALG)
    gender?: string,
    description?: string,
    material_composition?: string,
    care_instructions?: string
  }
}
```

---

### **Stap 3: Color Mapping (Stamdata)**

**Doel:** Map leverancierskleuren naar bestaande `color_options`.

**Kritische Regels:**
- ❌ **GEEN** QuickAddColorDialog meer
- ✅ Dropdown met ALLE `color_options` (is_active = true)
- ✅ Visual preview: hex_code, display_name_nl, color_type (SOLID/DUOTONE)
- ✅ Intelligent voorstel via fuzzy matching op `display_name_nl`

**Fuzzy Matching Algoritme:**
```typescript
// 1. Exact match (confidence: 100%)
color_options.find(co => 
  co.display_name_nl.toLowerCase() === supplier_color_name.toLowerCase()
)

// 2. Keyword match via colors.search_keywords (confidence: 80-95%)
color_options.find(co => 
  co.primary_color.search_keywords?.some(kw => 
    supplier_color_name.toLowerCase().includes(kw.toLowerCase())
  )
)

// 3. Manual selection (confidence: 0%)
```

**Output:**
```typescript
{
  colorMappings: {
    [supplier_color_name: string]: {
      color_option_id: number    // Direct FK naar color_options
    }
  }
}
```

**UI Voorbeeld:**
```
Supplier Kleur    →  Master Color Option                 Confidence
─────────────────────────────────────────────────────────────────────
Blue Ink          →  [Blauw / Blauw (#0000FF)] ▼        ✅ 95%
Mokkabruin        →  [Bruin / Bruin (#8B4513)] ▼        ✅ 88%
Bosgroen          →  [Groen / Groen (#008000)] ▼        ✅ 100%
```

---

### **Stap 4: Size Mapping (Stamdata)**

**Doel:** Map leveranciersmaten naar bestaande `size_options`.

**Kritische Regels:**
- ❌ **GEEN** QuickAddSizeDialog meer
- ✅ Dropdown met ALLE `size_options` (is_active = true)
- ✅ Optional: Filter op categorie via `category_clothing_types`
- ✅ Intelligent voorstel via exact match op `size_display_nl`

**Matching Algoritme:**
```typescript
// 1. Exact match (confidence: 100%)
size_options.find(so => 
  so.size_display_nl === supplier_size_code ||
  so.size_code === supplier_size_code
)

// 2. Normalized match (bijv. "XXL" → "2XL")
// 3. Manual selection
```

**Output:**
```typescript
{
  sizeMappings: {
    [supplier_size_code: string]: {
      size_option_id: number     // Direct FK naar size_options
    }
  }
}
```

**UI Voorbeeld:**
```
Supplier Maat  →  Master Size Option     Confidence
───────────────────────────────────────────────
XS             →  [XS] ▼                 ✅ 100%
S              →  [S] ▼                  ✅ 100%
M              →  [M] ▼                  ✅ 100%
2XL            →  [XXL] ▼                ⚠️ 85%
```

---

### **Stap 5: Preview & Execute**

**Doel:** Valideer en voer promotie uit.

**Validatie Checks:**
- ✅ Alle kleuren gemapt naar bestaande `color_option_id`
- ✅ Alle maten gemapt naar bestaande `size_option_id`
- ✅ Alle EAN's aanwezig (13 cijfers)
- ✅ ALG categorie geselecteerd
- ✅ Style naam en merk ingevuld

**Preview Weergave:**
```
Product Master:
├─ Style: "Engel Extend Grandad T-shirt"
├─ Merk: Engel Workwear
├─ Categorie: T-shirts (ALG)
└─ Varianten: 24

Product Variants:
├─ Blauw / XS  (EAN: 1234567890123)
├─ Blauw / S   (EAN: 1234567890124)
├─ ...
└─ Groen / 4XL (EAN: 1234567890147)
```

**Output:**
- `product_master` record aangemaakt
- `product_categories` koppeling aangemaakt
- 24× `product_variants` records aangemaakt
- Template opgeslagen/bijgewerkt

---

## 🧠 Template Systeem (Zelflerend)

### Template Structuur

```typescript
interface PromotionTemplate {
  id: number;
  template_name: string;
  supplier_id: number;
  brand_id: number;
  
  // Nieuwe velden:
  style_mapping: {
    default_category_id?: number,  // ALG categorie standaard
    default_gender?: string
  };
  
  color_mappings: {
    [supplier_color_name: string]: {
      color_option_id: number
    }
  };
  
  size_mappings: {
    [supplier_size_code: string]: {
      size_option_id: number
    }
  };
  
  // Tracking:
  usage_count: number;
  last_used_at: timestamp;
  auto_match_stats: {
    color_accuracy: number,      // Percentage auto-match succes
    size_accuracy: number,
    avg_manual_adjustments: number
  };
}
```

### Template Matching Score

```typescript
function calculateTemplateScore(template, currentPromotion) {
  let score = 0;
  
  // 1. Exact supplier + brand match: +100
  if (template.supplier_id === currentPromotion.supplier_id && 
      template.brand_id === currentPromotion.brand_id) {
    score += 100;
  }
  
  // 2. Alleen supplier match: +50
  if (template.supplier_id === currentPromotion.supplier_id) {
    score += 50;
  }
  
  // 3. Recentie bonus: max +30
  const daysSince = daysBetween(template.last_used_at, now());
  score += Math.max(0, 30 - daysSince);
  
  // 4. Gebruik frequentie: max +50
  score += Math.min(50, template.usage_count * 5);
  
  // 5. Auto-match accuracy bonus: max +20
  if (template.auto_match_stats) {
    const avgAccuracy = (template.auto_match_stats.color_accuracy + 
                         template.auto_match_stats.size_accuracy) / 2;
    score += avgAccuracy * 0.2;
  }
  
  return score;
}
```

### Template Evolutie

**1e Promotie (Engel Blue Ink T-shirt):**
- Gebruiker: 10 min handmatig mappen
- Template: Opslaan met 3 kleuren, 8 maten
- Auto-match accuracy: 0%

**2e Promotie (Engel Navy Polo):**
- Template match score: 150
- System: 2 kleuren auto-match (Navy, Blue Ink), 8 maten auto-match
- Gebruiker: 2 min controleren + 1 nieuwe kleur toevoegen
- Template update: +1 usage_count, +1 color mapping
- Auto-match accuracy: 85%

**3e Promotie (Engel Dark Green Trui):**
- Template match score: 185
- System: 100% auto-match (alle kleuren en maten bekend)
- Gebruiker: 30 sec accepteren
- Template update: +1 usage_count
- Auto-match accuracy: 98%

---

## 🔌 Database Schema Impact

### Nieuwe Kolommen in `promotion_templates`

```sql
ALTER TABLE promotion_templates
ADD COLUMN style_mapping JSONB DEFAULT '{}'::jsonb,
ADD COLUMN auto_match_stats JSONB DEFAULT '{}'::jsonb;
```

### Verplichte Koppeling: `product_categories`

```sql
-- Bij product master creatie:
INSERT INTO product_categories (product_id, category_id)
VALUES (new_product_master_id, alg_category_id);
```

### Product Variants met Stamdata FK's

```sql
INSERT INTO product_variants (
  product_style_id,
  sku_code,
  ean,
  option1_id,      -- FK naar color_options
  option2_id,      -- FK naar size_options
  option3_id       -- NULL (reserved voor toekomst)
) VALUES (
  master_id,
  'ENG-EXT-001-BL-S',
  '1234567890123',
  42,              -- color_option_id uit mapping
  15,              -- size_option_id uit mapping
  NULL
);
```

---

## 🎯 Success Metrics

### KPI's

1. **Tijd per promotie:**
   - 1e keer: ~10 minuten (handmatig)
   - 2e keer: ~2 minuten (80% auto-match)
   - 3e keer: ~30 seconden (95%+ auto-match)

2. **Template hergebruik rate:**
   - Doel: 70%+ bij 3e promotie van dezelfde leverancier/merk

3. **Auto-match accuracy:**
   - Kleuren: 85%+ confidence bij 2e promotie
   - Maten: 95%+ confidence bij 2e promotie

4. **Data consistentie:**
   - 100% van product_variants hebben valide color_option_id
   - 100% van product_variants hebben valide size_option_id
   - 100% van product_master hebben ALG categorie koppeling

### Validatie Scenario

**Promotie Engel 9257-565:**
```
Input:
- 24 supplier_products (3 kleuren × 8 maten)
- Kleuren: "Blue Ink", "Mokkabruin", "Bosgroen"
- Maten: XS, S, M, L, XL, 2XL, 3XL, 4XL

Template Match:
- Score: 0 (eerste keer)
- Auto-match: 0%

Output:
- 1× product_master ("Engel Extend Grandad T-shirt")
- 1× product_categories koppeling (categorie: "T-shirts")
- 24× product_variants (color_option_id + size_option_id uit stamdata)
- 1× promotion_template opgeslagen

Validatie:
✅ Alle 24 variants hebben bestaande color_option_id
✅ Alle 24 variants hebben bestaande size_option_id
✅ Geen nieuwe color_options aangemaakt
✅ Geen nieuwe size_options aangemaakt
✅ Product master heeft ALG categorie koppeling
```

---

## 🚫 Wat NIET Meer Gebeurt

1. ❌ **Geen QuickAddColorDialog:** Kleuren MOETEN uit stamdata komen
2. ❌ **Geen QuickAddSizeDialog:** Maten MOETEN uit stamdata komen
3. ❌ **Geen color_families direct insert:** Altijd via color_options
4. ❌ **Geen international_sizes direct insert:** Altijd via size_options
5. ❌ **Geen promotie zonder ALG categorie:** Categorie is VERPLICHT

---

## ✅ Acceptatiecriteria

### Functioneel

- [ ] Stap 1: Kleur/maat filtering met realtime EAN-telling
- [ ] Stap 2: ALG categorie is verplicht veld
- [ ] Stap 3: Color mapping ALLEEN uit color_options stamdata
- [ ] Stap 4: Size mapping ALLEEN uit size_options stamdata
- [ ] Stap 5: Preview toont categorie, kleuren, maten
- [ ] Template match score berekening werkt
- [ ] Incrementele template updates bij hergebruik

### Technisch

- [ ] product_variants.option1_id FK naar color_options
- [ ] product_variants.option2_id FK naar size_options
- [ ] product_categories koppeling wordt aangemaakt
- [ ] promotion_templates heeft style_mapping en auto_match_stats
- [ ] Edge function valideert color_option_id en size_option_id bestaan

### Data Kwaliteit

- [ ] 0 nieuwe color_options aangemaakt tijdens promotie
- [ ] 0 nieuwe size_options aangemaakt tijdens promotie
- [ ] 100% product_master heeft ALG categorie
- [ ] 100% product_variants hebben valide option1_id en option2_id

---

## 🔮 Toekomstige Uitbreidingen

### V2.0: Content Verrijking
- Automatische afbeelding koppeling (supplier_image_urls → color_variant_media)
- Material composition extraction uit supplier raw_data
- Care instructions mapping
- Categorie-specifieke validaties

### V3.0: AI-Powered
- GPT-4 Vision voor kleur herkenning uit productfoto's
- NLP voor style naam normalisatie
- Predictive mapping suggesties

---

## 📚 Gerelateerde Documentatie

- [Database Schema](../technical/database-schema.md)
- [Promotion Strategy](../technical/promotion-strategy.md)
- [Stamdata Beheer](./stamdata-beheer.md)
- [Validation Rules](../data-model/validation-rules.md)

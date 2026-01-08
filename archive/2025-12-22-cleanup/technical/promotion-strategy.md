# Product Promotie Strategie
**PIM - Supplier naar Master Product Transformatie**

---

## 🎯 Visie & Doelstelling

**Hoofddoel:** Transformeer `supplier_products` naar Master producten (`product_styles` → `color_variants` → `product_skus`) met **minimale handmatige invoer** en **maximale consistentie**.

**Kritische Succesfactoren:**
1. ✅ **Gestandaardiseerde kleur- en maatcodering** (leveranciers gebruiken inconsistente notaties)
2. ✅ **Etalage-ready producten** (zonder verplichte prijzen/gewicht voor showcase)
3. ✅ **Toekomstbestendige data-structuur** (klaar voor Pricing Service en Shopify sync)
4. ✅ **Intelligente data-verrijking** vanuit `supplier_products`

---

## 🚨 KRITISCH: Kleur- en Maatstandardisatie

### Probleem
Leveranciers gebruiken **inconsistente notaties**:
- **Kleuren:** "Navy" vs "Marine" vs "Donkerblauw" vs "Dark Blue"
- **Maten:** "XS-5XL" vs "44-64" vs "S-XXXL" vs "Small-X-Large"

### Oplossing: Mapping Systemen

#### **1. Kleurmapping Strategie**

**Doel:** Alle leverancierskleuren mappen naar:
- `color_family_id` (stamdata: "Blauw", "Rood", "Groen", etc.)
- `color_name_nl` (gestandaardiseerde Nederlandse naam: "Donkerblauw")
- `color_name_en` (optioneel Engels equivalent: "Navy")
- `hex_code` (visuele representatie: "#001f3f")
- `accent_color_name_nl` + `accent_color_family_id` (voor tweekleurige artikelen)

**Implementatie:**

```typescript
interface ColorMapping {
  // Input: Leverancier kleur
  supplier_color_name: string;  // "Navy", "Marine", "DarkBlue"
  
  // Output: VK gestandaardiseerd
  color_family_id: number;      // FK naar color_families (stamdata)
  color_code: string;           // Korte code: "NVY", "DBL"
  color_name_nl: string;        // "Donkerblauw"
  color_name_en?: string;       // "Navy"
  hex_code?: string;            // "#001f3f"
  
  // Accent kleur (optioneel)
  accent_color_name_nl?: string;
  accent_color_family_id?: number;
}
```

**Gebruikerservaring tijdens promotie:**
1. Systeem detecteert unieke leverancierskleuren (bijv. "Navy", "Red", "Charcoal")
2. Gebruiker mapt deze **één keer** naar VK-standaard:
   - "Navy" → Kleurenfamilie: "Blauw", Naam: "Donkerblauw", Code: "NVY", Hex: "#001f3f"
3. Mapping wordt **opgeslagen als template** voor deze leverancier
4. Volgende import: **automatische hergebruik** van mappings

**Database aanpassingen nodig:**
- ✅ `color_variants` tabel heeft al correcte structuur
- ⚠️ **TODO:** Mappings opslaan in `promotion_templates.color_mappings` (JSONB)

---

#### **2. Maatmapping Strategie**

**Doel:** Alle leveranciersmaatcodes mappen naar:
- `size_display_nl` (gestandaardiseerde weergave: "XS", "M", "XXL")
- `international_size_id` (optioneel: FK naar `international_sizes` stamdata)
- `size_order` (sorteervolgorde: 1=XS, 5=XL, 9=5XL)

**Implementatie:**

```typescript
interface SizeMapping {
  // Input: Leverancier maat
  supplier_size_code: string;    // "44", "Small", "M", "2XL"
  
  // Output: VK gestandaardiseerd
  size_code: string;             // "XS", "M", "XXL", "3XL"
  size_order: number;            // 1-11 (sorting)
  international_size_id?: number; // FK naar international_sizes (optioneel)
}
```

**Voorbeelden van conversie:**

| Leverancier Input | VK Standaard Output | Size Order |
|-------------------|---------------------|------------|
| "44", "Small", "XS" | "XS" | 1 |
| "46", "Medium", "S" | "S" | 2 |
| "52", "X-Large" | "XL" | 5 |
| "54", "2XL", "XXL" | "XXL" | 6 |
| "56", "XXXL" | "3XL" | 7 |
| "60", "5XL" | "5XL" | 9 |
| "ONE-SIZE", "VRIJ" | "ONE-SIZE" | 10 |

**Gebruikerservaring tijdens promotie:**
1. Systeem detecteert unieke leveranciersmaatcodes (bijv. "44", "46", "52")
2. Gebruiker mapt deze **één keer** naar VK-standaard:
   - "44" → "XS"
   - "46" → "S"
   - "52" → "XL"
3. Mapping wordt **opgeslagen als template**
4. Volgende import: **automatische conversie**

**Database aanpassingen nodig:**
- ✅ `product_skus` heeft al `supplier_size_code` + `size_display_nl` + `size_order`
- ⚠️ **TODO:** Mappings opslaan in `promotion_templates.size_mappings` (JSONB)

---

### **3. Template Systeem voor Hergebruik**

**Doel:** Éénmalige mapping, oneindig hergebruik per leverancier/merk combinatie.

**Database structuur:**

```sql
-- Bestaande tabel (promotion_templates)
CREATE TABLE promotion_templates (
  id SERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  brand_id INTEGER REFERENCES brands(id),
  
  -- KRITISCH: Kleur- en maatmappings (JSONB)
  color_mappings JSONB NOT NULL,  -- Record<supplier_color_name, ColorMapping>
  size_mappings JSONB NOT NULL,   -- Record<supplier_size_code, SizeMapping>
  
  -- Optioneel: Default category
  category_default_id INTEGER REFERENCES categories(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0
);
```

**Voorbeeld JSONB data:**

```json
{
  "color_mappings": {
    "Navy": {
      "color_family_id": 2,
      "color_code": "NVY",
      "color_name_nl": "Donkerblauw",
      "color_name_en": "Navy",
      "hex_code": "#001f3f"
    },
    "Red": {
      "color_family_id": 1,
      "color_code": "RD",
      "color_name_nl": "Rood",
      "color_name_en": "Red",
      "hex_code": "#ff0000"
    }
  },
  "size_mappings": {
    "44": { "size_code": "XS", "international_size_id": 1 },
    "46": { "size_code": "S", "international_size_id": 2 },
    "52": { "size_code": "XL", "international_size_id": 5 }
  }
}
```

---

## 📋 Minimale Vereisten per Fase

### **Fase 1: Etalage (Showcase) - "Price on Request"**

**Doel:** Producten tonen zonder verplichte prijzen/gewicht.

**Verplichte velden:**
- ✅ `ean` (EAN-13 barcode)
- ✅ `sku_code` (auto-generated: `VK-{BRAND}-{STYLE}-{COLOR}-{SIZE}`)
- ✅ `size_display_nl` (gestandaardiseerde maat: "M", "XL")
- ✅ `color_name_nl` (gestandaardiseerde kleur: "Donkerblauw")

**Optionele velden (nog niet nodig):**
- ⚠️ `cost_price` → `NULL` (wordt later gevuld door Pricing Service)
- ⚠️ `selling_price_excl_vat` → `NULL` (idem)
- ⚠️ `weight_grams` → `NULL` (alleen nodig voor Shopify shipping)

**Resultaat:**
- Product is **zichtbaar** in PIM
- Product is **niet verkoopbaar** (geen prijs)
- Klant kan **info opvragen** ("Prijs op aanvraag")

---

### **Fase 2: Actieve Verkoop (Shopify-ready)**

**Doel:** Producten verkoopbaar maken via Shopify.

**Extra verplichte velden:**
- ✅ `selling_price_excl_vat` (minimaal €0.01 / 1 cent)
- ✅ `weight_grams` (minimaal 1 gram, voor verzendkosten)
- ✅ `color_variant_media` (minimaal 1 afbeelding per kleur)

**Trigger:** Gebruiker klikt "Activeer voor Verkoop" → roept Pricing Service aan.

---

## 🔄 Promotie Wizard Flow (Nieuwe Aanpak)

### **Stap 1: Model Selectie**
- Gebruiker selecteert `supplier_products` (gefilterd op style/kleur/maat combinaties)
- Systeem toont preview: "Je promoveert 12 producten in 3 kleuren en 4 maten"

### **Stap 2: Style Mapping**
- **Merk selecteren** (dropdown van `brands`)
- **Style naam invoeren** (bijv. "Polosweater Contrast")
- **Category kiezen** (optioneel)
- **Extra metadata:** Gender, materiaal, wasvoorschriften (uit `supplier_products.raw_data` en `supplier_datasets.raw_data`)

### **Stap 3: Kleurmapping (KRITISCH)**
- Systeem detecteert unieke `supplier_color_name` waarden (bijv. "Navy", "Red", "Grey")
- **Voor elke kleur:**
  1. Kleurenfamilie kiezen (dropdown: "Blauw", "Rood", "Grijs")
  2. Nederlandse naam invoeren ("Donkerblauw", "Rood", "Lichtgrijs")
  3. Kleurcode genereren (auto: "NVY", "RD", "LGRY")
  4. Hex-code kiezen (color picker, optioneel)
  5. Accent kleur toevoegen (optioneel, voor tweekleurige artikelen)

**Template hergebruik:**
- Als leverancier+merk combinatie al eerder gebruikt: **pre-fill mappings**
- Gebruiker kan aanpassen indien nodig

### **Stap 4: Maatmapping (KRITISCH)**
- Systeem detecteert unieke `supplier_size_code` waarden (bijv. "44", "46", "52", "54")
- **Voor elke maat:**
  1. VK-standaard kiezen (dropdown: "XS", "S", "M", "L", "XL", "XXL", "3XL", etc.)
  2. Internationale maat koppelen (optioneel: "EU 44", "US Small")

**Template hergebruik:**
- Als leverancier al eerder gebruikt: **pre-fill conversies**

### **Stap 5: Preview & Execute**
- Toon volledige product tree:
  ```
  ✅ Product Style: "Polosweater Contrast" (BRAND-POL-001)
     ├─ Kleur: "Donkerblauw" (NVY) - 4 SKU's
     ├─ Kleur: "Rood" (RD) - 4 SKU's
     └─ Kleur: "Lichtgrijs" (LGRY) - 4 SKU's
  
  Totaal: 12 SKU's aangemaakt
  ```
- **Checkbox:** "Sla mapping op als template voor toekomstige imports"
- **Button:** "Promoveer Producten"

---

## 🛠️ Edge Function Updates (`promote-products`)

### **Huidige implementatie:**
- ✅ Maakt `product_styles` aan
- ✅ Maakt `color_variants` aan
- ✅ Maakt `product_skus` aan
- ❌ Laat `cost_price`, `selling_price_excl_vat`, `weight_grams` leeg
- ❌ Linkt GEEN afbeeldingen aan `color_variant_media`

### **Nieuwe implementatie (TODO):**

```typescript
interface PromotePayload {
  supplier_product_ids: number[];
  style_mapping: StyleMapping;
  color_mappings: Record<string, ColorMapping>;  // ✅ NIEUW
  size_mappings: Record<string, SizeMapping>;    // ✅ NIEUW
  template_id?: number;                          // Voor hergebruik
  save_as_template?: {                           // ✅ NIEUW
    template_name: string;
    supplier_id: number;
  };
}
```

**Nieuwe logica:**

1. **Kleurconversie:**
   ```typescript
   for (const [supplierColorName, products] of colorGroups.entries()) {
     const colorMapping = payload.color_mappings[supplierColorName];
     
     // Maak color_variant met gestandaardiseerde data
     await supabase.from('color_variants').insert({
       product_style_id: createdStyle.id,
       color_code: colorMapping.color_code,        // "NVY"
       color_name_nl: colorMapping.color_name_nl,  // "Donkerblauw"
       color_name_en: colorMapping.color_name_en,  // "Navy"
       color_family_id: colorMapping.color_family_id,
       hex_code: colorMapping.hex_code,
       accent_color_name_nl: colorMapping.accent_color_name_nl,
       accent_color_family_id: colorMapping.accent_color_family_id,
     });
   }
   ```

2. **Maatconversie:**
   ```typescript
   for (const product of products) {
     const sizeMapping = payload.size_mappings[product.supplier_size_code];
     
     // Maak SKU met gestandaardiseerde maat
     await supabase.from('product_skus').insert({
       color_variant_id: colorVariant.id,
       sku_code: `VK-${brandCode}-${styleCode}-${colorCode}-${sizeMapping.size_code}`,
       ean: product.ean,
       supplier_size_code: product.supplier_size_code,  // Origineel: "44"
       size_display_nl: sizeMapping.size_code,          // VK-standaard: "XS"
       international_size_id: sizeMapping.international_size_id,
       size_order: getSizeOrder(sizeMapping.size_code), // Voor sorting
       
       // Prijzen/gewicht: NULL voor etalage
       cost_price: null,
       selling_price_excl_vat: null,
       weight_grams: null,
     });
   }
   ```

3. **Template opslaan:**
   ```typescript
   if (payload.save_as_template) {
     await supabase.from('promotion_templates').insert({
       template_name: payload.save_as_template.template_name,
       supplier_id: payload.save_as_template.supplier_id,
       brand_id: payload.style_mapping.brand_id,
       color_mappings: payload.color_mappings,
       size_mappings: payload.size_mappings,
       category_default_id: payload.style_mapping.category_id,
     });
   }
   ```

4. **Template hergebruik:**
   ```typescript
   if (payload.template_id) {
     // Update last_used_at en usage_count
     await supabase
       .from('promotion_templates')
       .update({
         last_used_at: new Date().toISOString(),
         usage_count: supabase.rpc('increment', { row_id: payload.template_id }),
       })
       .eq('id', payload.template_id);
   }
   ```

---

## 🎨 UI/UX Verbeteringen

### **Wizard Component Updates**

**Huidige situatie:**
- ❌ Geen kleurmapping interface
- ❌ Geen maatmapping interface
- ❌ Geen template hergebruik

**Nieuwe componenten (TODO):**

1. **`ColorMappingStep.tsx`**
   - Toon alle unieke leverancierskleuren
   - Voor elke kleur: kleurenfamilie dropdown, namen invoeren, hex picker
   - Preview van gekozen kleuren met visuele feedback

2. **`SizeMappingStep.tsx`**
   - Toon alle unieke leveranciersmaatcodes
   - Dropdown per maat met VK-standaarden ("XS" t/m "5XL")
   - Optioneel: internationale maat koppeling

3. **`TemplateSelectorDialog.tsx`**
   - Toon beschikbare templates voor huidige leverancier/merk
   - Preview van mappings
   - Optie om template te gebruiken of nieuwe te maken

4. **`PromotionPreview.tsx`**
   - Toon product tree structuur
   - Highlight: aantal styles, kleuren, SKU's
   - Checkbox: "Sla op als template"

---

## 🚀 Implementatie Roadmap

### **Prioriteit 1: Kleur- en Maatstandardisatie (KRITISCH)**

**Database:**
- [x] `color_variants` tabel heeft correcte structuur
- [x] `product_skus` heeft `supplier_size_code` + `size_display_nl`
- [ ] `promotion_templates` heeft `color_mappings` + `size_mappings` (JSONB)
  - **SQL Migration nodig**

**Edge Function:**
- [ ] Update `promote-products` om kleur/maat mappings te accepteren
- [ ] Implementeer template opslag logica
- [ ] Implementeer template hergebruik logica

**Frontend:**
- [ ] Bouw `ColorMappingStep` component
- [ ] Bouw `SizeMappingStep` component
- [ ] Bouw `TemplateSelectorDialog` component
- [ ] Update `PromotionWizard` met nieuwe stappen

**Testing:**
- [ ] Test met diverse leveranciers (TEE JAYS, Santino, ELKA)
- [ ] Valideer consistentie van kleuren/maten na promotie
- [ ] Test template hergebruik

---

### **Prioriteit 1B: Data-verrijking uit Supplier Datasets**

**Databronnen bij promotie:**

Bij het promoveren van producten hebben we toegang tot **twee databronnen** met raw informatie:

1. **`supplier_products` tabel** (genormaliseerde data):
   - `supplier_advised_price` → Basis voor `cost_price`
   - `supplier_fabric_weight_gsm` → Basis voor `weight_grams`
   - `supplier_image_urls` (TEXT[]) → Basis voor `color_variant_media`
   - `supplier_short_description` + `supplier_long_description` → Basis voor `product_styles.description`
   - `raw_data` (JSONB) → Bevat **genormaliseerde** raw data na mapping

2. **`supplier_datasets` tabel** (originele import data):
   - `raw_data` (JSONB) → Bevat **originele, onbewerkte** leverancierdata
   - `source_staging_id` → Link naar originele rij in dataset
   - Vaak **rijker** aan metadata dan genormaliseerde `supplier_products`
   - Bevat mogelijk extra velden die niet zijn gemapped (bijv. materiaal samenstelling, land van herkomst, care labels)

**Relatie tussen beide tabellen:**
```sql
supplier_products.source_staging_id → supplier_datasets.id
```

**Gebruik tijdens promotie:**

**Edge Function strategie:**
```typescript
// 1. Ophalen supplier_products (geselecteerd voor promotie)
const { data: supplierProducts } = await supabase
  .from('supplier_products')
  .select('*, source_staging_id')
  .in('id', payload.supplier_product_ids);

// 2. Ophalen originele raw data uit supplier_datasets
const stagingIds = supplierProducts.map(p => p.source_staging_id).filter(Boolean);
const { data: stagingData } = await supabase
  .from('supplier_datasets')
  .select('id, raw_data')
  .in('id', stagingIds);

// 3. Verrijken met beide databronnen
for (const product of supplierProducts) {
  const originalRawData = stagingData.find(s => s.id === product.source_staging_id)?.raw_data;
  
  // Voorbeeld: Material composition uit originele data
  const materialComposition = 
    originalRawData?.material_composition || 
    product.raw_data?.material_composition ||
    null;
  
  // Voorbeeld: Care instructions uit originele data
  const careInstructions = 
    originalRawData?.care_instructions ||
    originalRawData?.washing_instructions ||
    product.raw_data?.care_instructions ||
    null;
}
```

**Voordelen van beide bronnen gebruiken:**
- ✅ **Completere data:** `supplier_datasets.raw_data` bevat vaak velden die niet gemapped zijn naar `supplier_products`
- ✅ **Fallback mechanisme:** Als normalized data leeg is, terugvallen op originele data
- ✅ **Flexibiliteit:** Per leverancier kunnen verschillende velden relevant zijn

**TODO:**
- [ ] Update `promote-products` edge function om beide databronnen te gebruiken
- [ ] Voeg fallback logica toe voor materiaal, care instructions, customs codes
- [ ] Documenteer per leverancier welke extra velden beschikbaar zijn in `supplier_datasets.raw_data`

---

### **Prioriteit 2: Etalage-ready Producten (Optionele Prijzen)**

**Database:**
- [ ] `DROP NOT NULL` constraint op `product_variants.selling_price_excl_vat`
  - **SQL Migration nodig**
- [ ] Zod schema update: `selling_price_excl_vat.optional().nullable()`

**Edge Function:**
- [ ] Set `cost_price = null` bij promotie
- [ ] Set `selling_price_excl_vat = null` bij promotie
- [ ] Set `weight_grams = null` bij promotie

**Frontend:**
- [ ] Toon "Prijs op aanvraag" badge voor producten zonder prijs
- [ ] Blokkeer Shopify sync voor producten zonder prijs/gewicht

---

### **Prioriteit 3: Afbeeldingen Koppelen**

**Database:**
- [x] `color_variant_media` tabel bestaat
- [x] `supplier_products.supplier_image_urls` bestaat (TEXT[])

**Edge Function:**
- [ ] Bij promotie: lees `supplier_image_urls` uit `supplier_products`
- [ ] Maak `color_variant_media` records aan per kleur
- [ ] Set eerste afbeelding als `is_primary = true`

**Voorbeeld logica:**
```typescript
// Na color_variant aanmaak
const firstProduct = products[0]; // Eerste product van deze kleur
if (firstProduct.supplier_image_urls?.length > 0) {
  const mediaRecords = firstProduct.supplier_image_urls.map((url, idx) => ({
    color_variant_id: colorVariant.id,
    image_url: url,
    display_order: idx + 1,
    is_primary: idx === 0,
    media_type: 'image',
  }));
  
  await supabase.from('color_variant_media').insert(mediaRecords);
}
```

---

### **Prioriteit 4: Toekomstige Pricing Service**

**Doel:** Automatische prijsberekening op basis van:
- Inkoopprijzen (uit `supplier_advised_price`)
- Marges per categorie/merk
- Seizoensgebonden prijsstrategieën
- Concurrentie-analyse

**Architectuur (toekomstig):**
- Dedicated edge function: `calculate-pricing`
- Input: `color_variant_id[]` of `product_style_id`
- Output: `cost_price` + `selling_price_excl_vat` updates

**Flow:**
1. Gebruiker selecteert producten in PIM
2. Klikt "Bereken Prijzen"
3. Pricing Service analyseert:
   - Leveranciersprijs (`supplier_advised_price`)
   - Categorie marges (uit `categories.default_margin`)
   - Merk positiegebruikeringen (premium vs budget)
4. Updates `product_skus` met berekende prijzen
5. Producten worden "Shopify-ready"

---

## 📊 Succes Metrics

### **KPI's:**
1. **Promotie Tijd:** < 2 minuten per model (inclusief alle kleuren/maten)
2. **Template Hergebruik:** 80% van promoties gebruikt bestaande templates
3. **Data Consistentie:** 100% van gepromoveerde producten heeft gestandaardiseerde kleuren/maten
4. **Etalage Coverage:** 95% van producten heeft minimaal 1 afbeelding
5. **Zero Blokkers:** Geen verplichte prijzen/gewicht voor showcase

### **Before/After:**

| Metric | Huidige situatie | Na implementatie |
|--------|------------------|------------------|
| Promotie tijd per model | 10+ minuten | < 2 minuten |
| Kleurenconsistentie | 40% (willekeurig) | 100% (gestandaardiseerd) |
| Maatconsistentie | 30% (leverancier notatie) | 100% (VK-standaard) |
| Template hergebruik | 0% (handmatig) | 80% (automatisch) |
| Afbeeldingen gekoppeld | 10% | 95% |
| Shopify-ready zonder prijzen | Impossible | 100% (etalage) |

---

## 🎯 Samenvatting Action Items

### **KRITISCH (Deze week):**
1. [ ] SQL Migration: `promotion_templates` toevoegen van `color_mappings` + `size_mappings` (JSONB)
2. [ ] SQL Migration: `DROP NOT NULL` op `product_variants.selling_price_excl_vat`
3. [ ] Edge Function: Update `promote-products` met kleur/maat mapping logica
4. [ ] Frontend: Bouw `ColorMappingStep` + `SizeMappingStep`

### **Belangrijk (Deze sprint):**
5. [ ] Edge Function: Implementeer template opslag + hergebruik
6. [ ] Frontend: Bouw `TemplateSelectorDialog`
7. [ ] Edge Function: Link `supplier_image_urls` naar `color_variant_media`
8. [ ] Zod Schema: Update validatie voor optionele prijzen

### **Toekomst (Volgende sprint):**
9. [ ] Ontwerp Pricing Service architectuur
10. [ ] Bouw "Activeer voor Verkoop" flow
11. [ ] Implementeer bulk pricing updates
12. [ ] Shopify sync validatie (check prijzen/gewicht/afbeeldingen)

---

**Document Status:** DRAFT v1.0
**Laatste Update:** 2025-01-16
**Owner:** Van Kruiningen PIM Development Team

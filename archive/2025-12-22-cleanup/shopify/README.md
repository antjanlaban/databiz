# Shopify Integration Documentation

**Last Updated:** 2025-11-02  
**Status:** 📐 **Design Complete - Ready for Implementation**

---

## Overview

Deze folder bevat alle documentatie voor de Shopify integratie van het Van Kruiningen PIM systeem. Het Master datamodel is ontworpen met Shopify-compatibiliteit in gedachten en kan direct synchroniseren zonder database wijzigingen.

---

## 📚 Documents in this Folder

### 1. `shopify-product-variant-model.md`

**Purpose:** Uitgebreide analyse van Shopify's Product Variant structuur  
**Contents:**
- Shopify's 3-layer model (Product → ProductOption → ProductVariant)
- Core concepten en limitaties
- GraphQL API voorbeelden
- Best practices voor variant management

**Use Case:** Technische referentie voor developers die Shopify API implementeren

---

### 2. `master-shopify-mapping.md` ⭐ **START HERE**

**Purpose:** Complete mapping strategie tussen Master PIM en Shopify
**Contents:**
- Conceptual alignment Master ↔ Shopify
- Option Layer Mapping (Color = Option 1, Size = Option 2)
- Field-level mapping (alle velden)
- Sync strategie (initial bulk + incremental)
- Code voorbeelden (TypeScript + SQL)
- Implementation checklist

**Use Case:** Hoofddocument voor implementatie van Shopify sync

---

## 🎯 Key Insights

### Master Structure is Already Shopify-Compatible! ✅

```
Master PIM Structure               Shopify Equivalent
══════════════════════════════════════════════════════════
product_styles                  →  Shopify Product
  ├─ style_code                 →  Product.handle
  ├─ style_name                 →  Product.title
  └─ description                →  Product.descriptionHtml

color_variants                  →  ProductOption[0] (name: "Color")
  ├─ color_name_nl              →  OptionValue.name
  └─ display_order              →  Option value sort order

international_sizes             →  ProductOption[1] (name: "Size")
  ├─ size_label_nl              →  OptionValue.name
  └─ sort_order                 →  Option value sort order

product_variants                   →  ProductVariant
  ├─ sku_code                   →  Variant.sku (Master-nummer)
  ├─ ean                        →  Variant.barcode (EAN-13 - VERPLICHT)
  ├─ selling_price_excl_vat     →  Variant.price (cents → euros)
  ├─ color_variant.color_name_nl→  Variant.option1
  └─ international_size.size_label_nl → Variant.option2
```

---

## 🚀 Quick Start Guide

### For Product Managers

**What you need to know:**
1. Alleen **KERN producten** worden naar Shopify gesynchroniseerd
2. Elk product moet minimaal 1 kleur en 1 maat hebben
3. Shopify gebruikt Nederlandse namen: `color_name_nl`, `size_label_nl`
4. Producten zonder `international_size_id` gebruiken `supplier_size_code` als fallback

**Checklist voor Shopify-ready product:**
- ✅ `product_type` = `'KERN'`
- ✅ Minimaal 1 actieve `color_variant`
- ✅ Minimaal 1 actieve `product_sku`
- ✅ `selling_price_excl_vat` ingevuld (> 0)
- ✅ `ean` code aanwezig (13 cijfers)
- ✅ Primaire afbeelding gekoppeld aan kleurvariant

---

### For Developers

**Implementation Steps:**

1. **Read Documentation**
   - Start: `master-shopify-mapping.md` (complete mapping guide)
   - Reference: `shopify-product-variant-model.md` (Shopify API details)

2. **Setup Shopify Integration**
   - Enable Shopify in Lovable (voeg Shopify secrets toe)
   - Setup GraphQL client
   - Implement rate limiting (2 req/sec)

3. **Build Sync Logic**
   - Create `sync-to-shopify` Edge Function
   - Implement `mapProductToShopify()` function
   - Add error handling + retry logic

4. **Test & Deploy**
   - Test single product sync (1 style, 3 colors, 4 sizes)
   - Test bulk sync (10 products)
   - Setup daily cron job (3 AM)

**Code Snippet (Quick Reference):**
```typescript
// Sync Master product to Shopify
async function syncProductToShopify(styleId: number) {
  // 1. Fetch Master data
  const style = await fetchProductStyle(styleId);
  const colors = await fetchColorVariants(styleId);
  const skus = await fetchSKUs(styleId);
  
  // 2. Build Shopify payload
  const shopifyProduct = {
    title: style.style_name,
    handle: style.style_code.toLowerCase(),
    vendor: style.brand.brand_name,
    options: [
      { name: "Color", position: 1, values: colors.map(c => c.color_name_nl) },
      { name: "Size", position: 2, values: extractUniqueSizes(skus) }
    ],
    variants: skus.map(sku => ({
      sku: sku.sku_code,
      barcode: sku.ean,
      price: (sku.selling_price_excl_vat / 100).toFixed(2),
      option1: sku.color_variant.color_name_nl,
      option2: sku.international_size?.size_label_nl || sku.supplier_size_code
    }))
  };
  
  // 3. Push to Shopify
  await shopifyClient.mutate({ mutation: CREATE_PRODUCT, variables: shopifyProduct });
}
```

---

## 📊 Sync Scenarios

### Scenario 1: Initial Bulk Sync

**Trigger:** One-time migration van bestaande KERN producten  
**Process:**
1. Query alle `product_styles` WHERE `product_type = 'KERN'` AND `is_active = TRUE`
2. Voor elk product: create Shopify Product + Options + Variants
3. Store `shopify_product_id` in Master database (optional)
4. Log sync results

**Estimated Time:** 50-100 products per minuut (Shopify rate limit: 2 req/sec)

---

### Scenario 2: Daily Incremental Sync

**Trigger:** Cron job (every day at 3 AM)  
**Process:**
1. Find modified products: `updated_at > last_synced_to_shopify`
2. Sync changes: prijs updates, stock updates, nieuwe kleuren/maten
3. Update `last_synced_to_shopify` timestamp

**Estimated Time:** < 5 minuten voor typical daily changes

---

### Scenario 3: Real-Time Sync (Advanced)

**Trigger:** Database trigger op `product_variants` UPDATE  
**Process:**
1. Detect change (price/stock/active status)
2. Push to sync queue
3. Background worker processes queue
4. Update Shopify via GraphQL mutation

**Use Case:** E-commerce webshops die real-time voorraad updates nodig hebben

---

## ⚠️ Known Limitations

### Shopify Constraints

- **Max 3 options per product** (Master uses 2: Color + Size, ruimte voor 1 extra future option)
- **Max 2048 variants per product** (Master: gemiddeld 20-50 variants per style, ruim binnen limiet)
- **Rate limit: 2 requests/second** (sync in batches, implement exponential backoff)

### Master Data Quality Issues

1. **Incomplete Size Matrices:**
   - Probleem: Style heeft Navy in S/M/L maar niet XL
   - Oplossing: Sync alleen bestaande SKUs (geen placeholder variants)

2. **Missing `international_size_id`:**
   - Probleem: Oude SKUs zonder size mapping
   - Oplossing: Fallback naar `supplier_size_code`

3. **Duplicate Color Names:**
   - Probleem: "Donkerblauw" vs "Navy" vs "Marine"
   - Oplossing: Normalize via `color_families` JOIN

---

## 🧪 Testing Checklist

### Before Production Sync

- [ ] Test product met 1 kleur, 1 maat → 1 Shopify variant
- [ ] Test product met 3 kleuren, 4 maten → 12 Shopify variants
- [ ] Test product zonder `international_size_id` → fallback werkt
- [ ] Test price update: Master €29.99 → Shopify €29.99 (cents conversion correct)
- [ ] Test EAN sync: Master `ean` → Shopify `barcode`
- [ ] Test image sync: primary color_variant_media → variant image
- [ ] Test deactivation: Master `is_active = FALSE` → Shopify `status: DRAFT`

### Edge Cases

- [ ] Product zonder color_variants → sync fails gracefully
- [ ] Product zonder SKUs → sync skips product
- [ ] Product met >100 variants → batch processing werkt
- [ ] Duplicate SKU code → error handling + logging

---

## 📞 Support & Questions

**For Technical Issues:**
- Check logs in Edge Function: `supabase functions logs sync-to-shopify`
- Check Shopify Admin: Settings → Notifications → Webhooks (error logs)

**For Data Quality Issues:**
- Run data validation query: `SELECT * FROM v_shopify_sync_readiness`
- Fix incomplete products in PIM first, then retry sync

**For Feature Requests:**
- Document in: `docs/requirements/user-stories.md`
- Discuss with product owner before implementation

---

## 🎓 Learning Resources

### Shopify API Documentation
- [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)
- [Product Object](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product)
- [ProductVariant Object](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant)

### Master PIM Documentation
- Database Schema: `docs/technical/database-schema.md`
- Data Dictionary: `docs/data-model/data-dictionary.md`
- Validation Rules: `docs/data-model/validation-rules.md`

---

**Next Steps:** Read `master-shopify-mapping.md` voor complete implementation guide! 🚀

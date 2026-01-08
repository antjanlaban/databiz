# Variant Display Names

**Status:** Planned  
**Last Updated:** 2025-01-13

---

## Overview

Dit document beschrijft het systeem voor het genereren van **samengestelde display names** voor product variants. Het doel is om een consistente, menselijk leesbare identificatie te creëren die alle cruciale informatie van een variant weergeeft.

---

## Display Name Formaat

### Standaard Formaat

```
Merknaam | Masternaam | Kleurnaam | MAAT
```

### Voorbeelden

```
Russell | Premium Polo | Navy | M
Tricorp | Softshell Jas | Zwart/Grijs | XL
Projob | Werkbroek 5-pocket | Donkerblauw | 52
Havep | Overall Basic | Oranje | 3XL
```

---

## Databronnen

De vier onderdelen komen uit verschillende tabellen:

| Onderdeel | Tabel | Kolom | Via Relatie |
|-----------|-------|-------|-------------|
| **Merknaam** | `brands` | `brand_name` | `master.brand_id` → `brands.id` |
| **Masternaam** | `master_product` | `master_name` | `variant.master_id` → `master_product.master_id` |
| **Kleurnaam** | `color_options` | `display_name_nl` | `variant.color_option_id` → `color_options.id` |
| **Maat** | `size_options` | `size_code` | `variant.size_option_id` → `size_options.id` |

---

## Implementatie

### 1. Type Definitie

```typescript
// src/types/master-variant.ts

export interface VariantDisplayParts {
  brandName: string;
  masterName: string;
  colorName: string;
  sizeCode: string;
}

export interface VariantWithExtensions {
  // ... existing fields
  master: {
    master_id: number;
    master_code: string;
    master_name: string;
    brand_id: number;
    brand?: {
      id: number;
      brand_name: string;
    };
  };
  color_option: {
    id: number;
    display_name_nl: string;
  };
  size_option: {
    id: number;
    size_code: string;
  };
}
```

### 2. Data Ophalen - Extend `useVariants` Hook

**File:** `src/hooks/use-variants.ts`

Het brand object moet worden toegevoegd aan de query:

```typescript
.select(`
  *,
  master:master_product!inner(
    master_id,
    master_code,
    master_name,
    brand_id,
    brand:brands!brand_id(
      id,
      brand_name
    )
  ),
  color_option:color_options!color_option_id(
    id,
    display_name_nl
  ),
  size_option:size_options!size_option_id(
    id,
    size_code
  )
`)
```

### 3. Utility Functies

**File:** `src/lib/utils/variant-display-name.ts`

```typescript
import type { VariantWithExtensions, VariantDisplayParts } from '@/types/master-variant';

/**
 * Haalt de onderdelen op voor een variant display name
 */
export function getVariantDisplayParts(variant: VariantWithExtensions): VariantDisplayParts {
  return {
    brandName: variant.master?.brand?.brand_name || 'Onbekend Merk',
    masterName: variant.master?.master_name || 'Onbekend Product',
    colorName: variant.color_option?.display_name_nl || 'Onbekende Kleur',
    sizeCode: variant.size_option?.size_code || '?',
  };
}

/**
 * Formatteert een volledige variant display name
 * 
 * @example
 * formatVariantDisplayName(variant)
 * // Returns: "Russell | Premium Polo | Navy | M"
 */
export function formatVariantDisplayName(variant: VariantWithExtensions): string {
  const parts = getVariantDisplayParts(variant);
  return `${parts.brandName} | ${parts.masterName} | ${parts.colorName} | ${parts.sizeCode}`;
}

/**
 * Batch formatter voor meerdere variants
 */
export function formatVariantDisplayNames(variants: VariantWithExtensions[]): Map<number, string> {
  const displayNames = new Map<number, string>();
  
  variants.forEach(variant => {
    displayNames.set(variant.variant_id, formatVariantDisplayName(variant));
  });
  
  return displayNames;
}
```

### 4. React Hook

**File:** `src/hooks/use-variant-display-name.ts`

```typescript
import { useMemo } from 'react';
import type { VariantWithExtensions, VariantDisplayParts } from '@/types/master-variant';
import { 
  formatVariantDisplayName, 
  getVariantDisplayParts,
  formatVariantDisplayNames 
} from '@/lib/utils/variant-display-name';

/**
 * Hook voor het genereren van een variant display name
 */
export function useVariantDisplayName(variant: VariantWithExtensions | undefined) {
  return useMemo(() => {
    if (!variant) return 'Geen variant';
    return formatVariantDisplayName(variant);
  }, [variant]);
}

/**
 * Hook voor het ophalen van display name parts
 */
export function useVariantDisplayParts(variant: VariantWithExtensions | undefined) {
  return useMemo(() => {
    if (!variant) return null;
    return getVariantDisplayParts(variant);
  }, [variant]);
}

/**
 * Hook voor meerdere variants
 */
export function useVariantDisplayNames(variants: VariantWithExtensions[]) {
  return useMemo(() => {
    return formatVariantDisplayNames(variants);
  }, [variants]);
}
```

---

## Integratiepunten

### 1. Master Detail Page - Variant Lijst

```tsx
import { useVariantDisplayName } from '@/hooks/use-variant-display-name';

function VariantRow({ variant }: { variant: VariantWithExtensions }) {
  const displayName = useVariantDisplayName(variant);
  
  return (
    <TableRow>
      <TableCell className="font-medium">{displayName}</TableCell>
      {/* ... rest of row */}
    </TableRow>
  );
}
```

### 2. Promotion Wizard - Variant Preview

```tsx
function VariantPreview({ variant }: { variant: VariantWithExtensions }) {
  const displayName = useVariantDisplayName(variant);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{displayName}</CardTitle>
      </CardHeader>
      {/* ... rest */}
    </Card>
  );
}
```

### 3. Export Functies

Voor Gripp/Calculated/Shopify exports kan de display name worden gebruikt als `product_description` of `title`:

```typescript
interface GrippExportRow {
  productcode: string;
  productomschrijving: string; // <- Gebruik formatVariantDisplayName()
  verkoopprijs: number;
  // ...
}
```

### 4. Search/Filter Resultaten

```tsx
function VariantSearchResult({ variant }: { variant: VariantWithExtensions }) {
  const displayName = useVariantDisplayName(variant);
  
  return (
    <div className="search-result">
      <p className="font-semibold">{displayName}</p>
      <p className="text-sm text-muted-foreground">
        EAN: {variant.ean_code || 'Geen EAN'}
      </p>
    </div>
  );
}
```

---

## Performance Overwegingen

### 1. Memoization in React

Alle hooks gebruiken `useMemo` om onnodige herberekeningen te voorkomen.

### 2. Database Query Optimalisatie

De `useVariants` hook haalt alle benodigde data op in **één query** via Supabase joins:

```typescript
// ✅ CORRECT - Eén query met joins
.select(`
  *,
  master:master_product!inner(
    master_name,
    brand:brands!brand_id(brand_name)
  ),
  color_option:color_options!color_option_id(display_name_nl),
  size_option:size_options!size_option_id(size_code)
`)

// ❌ WRONG - Meerdere queries
const variants = await supabase.from('master_product_variant').select('*');
for (const variant of variants) {
  const brand = await supabase.from('brands').select('brand_name').eq('id', variant.brand_id);
  // Dit is EXTREEM traag!
}
```

### 3. Export Performance

Voor grote exports (1000+ variants) gebruik je de batch functie:

```typescript
const displayNamesMap = formatVariantDisplayNames(variants);

const exportRows = variants.map(variant => ({
  sku: variant.ean_code,
  name: displayNamesMap.get(variant.variant_id),
  // ... rest
}));
```

---

## Database View (Optioneel)

Voor **zeer frequente queries** kun je een materialized view maken:

```sql
CREATE MATERIALIZED VIEW variant_display_names AS
SELECT 
  v.variant_id,
  CONCAT(
    b.brand_name, ' | ',
    m.master_name, ' | ',
    co.display_name_nl, ' | ',
    so.size_code
  ) AS display_name
FROM master_product_variant v
INNER JOIN master_product m ON v.master_id = m.master_id
INNER JOIN brands b ON m.brand_id = b.id
INNER JOIN color_options co ON v.color_option_id = co.id
INNER JOIN size_options so ON v.size_option_id = so.id;

CREATE UNIQUE INDEX idx_variant_display_names_id ON variant_display_names(variant_id);
```

**Refresh na grote imports:**

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY variant_display_names;
```

---

## Test Cases

### Unit Tests

```typescript
import { formatVariantDisplayName, getVariantDisplayParts } from '@/lib/utils/variant-display-name';
import type { VariantWithExtensions } from '@/types/master-variant';

describe('formatVariantDisplayName', () => {
  it('should format complete variant display name', () => {
    const variant: VariantWithExtensions = {
      variant_id: 1,
      master: {
        master_id: 10,
        master_code: 'RUS-001',
        master_name: 'Premium Polo',
        brand_id: 5,
        brand: {
          id: 5,
          brand_name: 'Russell'
        }
      },
      color_option: {
        id: 20,
        display_name_nl: 'Navy'
      },
      size_option: {
        id: 30,
        size_code: 'M'
      }
    } as VariantWithExtensions;

    expect(formatVariantDisplayName(variant)).toBe('Russell | Premium Polo | Navy | M');
  });

  it('should handle missing brand gracefully', () => {
    const variant: VariantWithExtensions = {
      variant_id: 1,
      master: {
        master_id: 10,
        master_code: 'XXX-001',
        master_name: 'Test Product',
        brand_id: 999,
        brand: undefined
      },
      color_option: { id: 20, display_name_nl: 'Blauw' },
      size_option: { id: 30, size_code: 'L' }
    } as VariantWithExtensions;

    expect(formatVariantDisplayName(variant)).toBe('Onbekend Merk | Test Product | Blauw | L');
  });
});
```

---

## Checklist Implementatie

- [ ] Type definitie `VariantDisplayParts` toevoegen aan `src/types/master-variant.ts`
- [ ] `useVariants` hook uitbreiden met `brand:brands!brand_id(id, brand_name)` in query
- [ ] `src/lib/utils/variant-display-name.ts` aanmaken met utility functies
- [ ] `src/hooks/use-variant-display-name.ts` aanmaken met React hooks
- [ ] Integreren in Master Detail Page variant lijst
- [ ] Integreren in Promotion Wizard variant preview
- [ ] Toevoegen aan export functies (Gripp/Calculated)
- [ ] (Optioneel) Materialized view `variant_display_names` aanmaken
- [ ] Unit tests schrijven voor `formatVariantDisplayName`

---

## Volgende Stappen

1. **Fase 1:** Utility functies + React hooks implementeren
2. **Fase 2:** Integreren in bestaande UI componenten
3. **Fase 3:** Export functies aanpassen om display names te gebruiken
4. **Fase 4:** (Optioneel) Database view voor performance bij grote datasets

---

**Gerelateerde Documentatie:**
- [Database Schema](./database-schema.md)
- [Master-Variant Architecture](./master-variant-architecture.md)
- [Export Architecture](./export-architecture.md)

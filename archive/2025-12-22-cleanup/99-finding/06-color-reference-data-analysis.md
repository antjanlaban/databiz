# 📊 Frontend Color Reference Data Analysis
## `/reference-data/colors` - Complete Flow

**Date:** December 22, 2025  
**Scope:** ColorFamiliesPage.tsx + Database Tables + React Hooks  
**Purpose:** Understand how color families and combinations work in the UI

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND: React Component                                           │
│ File: src/pages/reference-data/ColorFamiliesPage.tsx               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────┐      ┌──────────────────────────┐    │
│  │ TAB 1: Kleurenfamilies   │      │ TAB 2: Combinaties       │    │
│  │ (families & colors)       │      │ (mono/duo/trio/multi)    │    │
│  │                           │      │                          │    │
│  │ Hook: useColor...WithColors    │ Hook: useColorFamilyOpt  │    │
│  │ ↓                        │      │ ↓                        │    │
│  │ DB: colors table          │      │ DB: color_family_options │    │
│  └──────────────────────────┘      └──────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────────────────┐
│ DATABASE: PostgreSQL (Supabase)                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TABLE 1: colors (Tabel voor individuele kleuren)                  │
│  ├─ id (PK)                                                         │
│  ├─ color_name_nl, color_name_en                                   │
│  ├─ hex_code (#RRGGBB)                                             │
│  ├─ color_family (TEXT) → BLAUW, ROOD, GROEN, etc.               │
│  ├─ search_keywords (TEXT[]) → Synoniemen/keywords                │
│  ├─ is_high_visibility, is_fluorescent (BOOLEAN)                  │
│  ├─ display_order (INTEGER)                                        │
│  └─ is_active (BOOLEAN)                                            │
│                                                                      │
│  TABLE 2: color_family_options (Voorgemaakte combinaties)          │
│  ├─ id (PK)                                                         │
│  ├─ primary_family (TEXT) → BLAUW                                  │
│  ├─ secondary_family (TEXT) → ROOD (null voor MONO)                │
│  ├─ tertiary_family (TEXT) → GROEN (null voor MONO/DUO)           │
│  ├─ color_type (ENUM) → MONO|DUO|TRIO|MULTI                       │
│  ├─ primary_hex_code, secondary_hex_code, tertiary_hex_code       │
│  ├─ color_code (TEXT) → BLU-RED (unique combination)              │
│  ├─ display_name_nl, display_name_en                              │
│  ├─ is_active (BOOLEAN)                                            │
│  └─ Constraints: UNIQUE(primary_family, secondary_family, tertiary_family) │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: TAB 1 - Kleurenfamilies

### Step 1: Component Mounts
**File:** `ColorFamiliesPage.tsx` line 340-348

```tsx
const { data: families, isLoading: familiesLoading, error: familiesError } 
  = useColorFamiliesWithColors();
```

### Step 2: Hook Query
**File:** `src/hooks/use-color-families-with-colors.ts` line 48-115

```typescript
// Hook Signature
export function useColorFamiliesWithColors() {
  return useQuery({
    queryKey: ['color_families_with_colors'],
    queryFn: async () => {
      // Query database table: colors
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('is_active', true)
        .not('color_family', 'is', null)  // ← Filter: only grouped colors
        .order('display_order', { ascending: true });

      // Process response...
    }
  });
}
```

**Query Details:**
- **From:** `colors` table
- **Filters:** `is_active = true` AND `color_family IS NOT NULL`
- **Ordering:** By `display_order` ascending
- **Result:** Array of `ColorFamilyWithColors` objects

### Step 3: Data Transformation

**Input from Database:**
```json
[
  {
    "id": 1,
    "color_name_nl": "Donkerblauw",
    "color_name_en": "Navy Blue",
    "hex_code": "#001F3F",
    "color_family": "BLUE",
    "search_keywords": ["navy", "marineblauw"],
    "is_high_visibility": false,
    "is_fluorescent": false,
    "display_order": 1
  },
  {
    "id": 2,
    "color_name_nl": "Hemelsblauw",
    "color_name_en": "Sky Blue",
    "hex_code": "#0074D9",
    "color_family": "BLUE",
    "search_keywords": null,
    "is_high_visibility": false,
    "is_fluorescent": false,
    "display_order": 2
  },
  {
    "id": 3,
    "color_name_nl": "Donkerrood",
    "color_name_en": "Dark Red",
    "hex_code": "#85144B",
    "color_family": "RED",
    "search_keywords": ["maroon", "bordeaux"],
    "is_high_visibility": false,
    "is_fluorescent": false,
    "display_order": 10
  }
]
```

**Transformation Logic** (lines 66-110):
```typescript
// 1. Group by color_family (BLUE, RED, GREEN, etc.)
const familyMap = new Map<string, ColorFamilyWithColors>();

data.forEach((color) => {
  if (!familyMap.has(color.color_family)) {
    // Use hardcoded FAMILY_NAMES mapping
    const familyInfo = FAMILY_NAMES[color.color_family] || {...};
    
    familyMap.set(color.color_family, {
      family_code: color.color_family,        // "BLUE"
      name_nl: familyInfo.nl,                 // "Blauw"
      name_en: familyInfo.en,                 // "Blue"
      hex_code: familyInfo.hex,               // "#0000FF"
      color_count: 0,
      colors: []
    });
  }
  
  // 2. Add individual color to its family
  const family = familyMap.get(color.color_family);
  family.colors.push({
    id: color.id,
    color_name_nl: color.color_name_nl,
    color_name_en: color.color_name_en,
    hex_code: color.hex_code,
    search_keywords: color.search_keywords,
    is_high_visibility: color.is_high_visibility,
    is_fluorescent: color.is_fluorescent,
    display_order: color.display_order
  });
});

// 3. Calculate color_count
familyMap.forEach(family => {
  family.color_count = family.colors.length;
});

return Array.from(familyMap.values());
```

**Output Structure:**
```typescript
[
  {
    family_code: "BLUE",
    name_nl: "Blauw",
    name_en: "Blue",
    hex_code: "#0000FF",
    color_count: 2,              // ← Calculated
    is_high_visibility: false,
    is_fluorescent: false,
    colors: [
      {
        id: 1,
        color_name_nl: "Donkerblauw",
        color_name_en: "Navy Blue",
        hex_code: "#001F3F",
        search_keywords: ["navy", "marineblauw"],
        is_high_visibility: false,
        is_fluorescent: false,
        display_order: 1
      },
      {
        id: 2,
        color_name_nl: "Hemelsblauw",
        color_name_en: "Sky Blue",
        hex_code: "#0074D9",
        search_keywords: null,
        is_high_visibility: false,
        is_fluorescent: false,
        display_order: 2
      }
    ]
  },
  {
    family_code: "RED",
    name_nl: "Rood",
    name_en: "Red",
    hex_code: "#FF0000",
    color_count: 1,
    colors: [...]
  }
]
```

### Step 4: UI Rendering

**Location:** Line 605-671 in ColorFamiliesPage.tsx

```tsx
<Tabs defaultValue="families">
  <TabsContent value="families">
    <Accordion type="multiple" className="space-y-4">
      {families.map((family) => (
        <ColorFamilyAccordion
          key={family.family_code}
          family={family}
          onEditColor={handleEditColor}
          onAddColor={handleAddColor}
          onDeleteColor={handleDeleteColor}
          onAddSynonym={openAddSynonymDialog}
          onDeleteKeyword={openDeleteConfirm}
        />
      ))}
    </Accordion>
  </TabsContent>
</Tabs>
```

**Accordion Item** (lines 31-189):
```
┌─────────────────────────────────────────────────────────────────┐
│ ▼ BLAUW (Blauw • 2 kleuren)                 [+ Kleur toevoegen] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────┬──────────────────┬──────────────┬──────────┬─────┐  │
│  │ Kleur│ Nederlandse Naam │ Engelse Naam │ HEX Code │ ... │  │
│  ├──────┼──────────────────┼──────────────┼──────────┼─────┤  │
│  │ ■    │ Donkerblauw      │ Navy Blue    │ #001F3F  │ ... │  │
│  │ ■    │ Hemelsblauw      │ Sky Blue     │ #0074D9  │ ... │  │
│  └──────┴──────────────────┴──────────────┴──────────┴─────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Table Header** (line 106-113):
- Kleur (Visual swatch)
- Nederlandse Naam
- Engelse Naam
- HEX Code
- Synoniemen (search_keywords badges + add button)
- Eigenschappen (is_high_visibility, is_fluorescent badges)
- Acties (Edit, Delete buttons)

---

## 🎨 Data Flow: TAB 2 - Combinaties

### Step 1: Component Renders Multiple Sub-Tabs

**Location:** Line 625-723 in ColorFamiliesPage.tsx

```tsx
<TabsContent value="combinations">
  <Tabs defaultValue="all">
    <TabsList>
      <TabsTrigger value="all">Alles ({allCombinations?.length || 0})</TabsTrigger>
      <TabsTrigger value="mono">Mono ({monoOptions?.length || 0})</TabsTrigger>
      <TabsTrigger value="duo">Duo ({duoOptions?.length || 0})</TabsTrigger>
      <TabsTrigger value="trio">Trio ({trioOptions?.length || 0})</TabsTrigger>
      <TabsTrigger value="multi">Multi ({multiOptions?.length || 0})</TabsTrigger>
    </TabsList>
    
    <TabsContent value="all">
      <StamdataTable data={allCombinations} columns={combinationColumns} />
    </TabsContent>
    // ... more tabs
  </Tabs>
</TabsContent>
```

### Step 2: Hook Queries (5 separate queries)

**Location:** Line 340-345 in ColorFamiliesPage.tsx

```tsx
// Query ALL combinations
const { data: allCombinations } = useColorFamilyOptions();

// Query filtered by color_type
const { data: monoOptions } = useColorFamilyOptions({ color_type: 'MONO' });
const { data: duoOptions } = useColorFamilyOptions({ color_type: 'DUO' });
const { data: trioOptions } = useColorFamilyOptions({ color_type: 'TRIO' });
const { data: multiOptions } = useColorFamilyOptions({ color_type: 'MULTI' });
```

### Step 3: Hook Implementation

**File:** `src/hooks/use-color-family-options.ts` line 31-60

```typescript
export function useColorFamilyOptions(filters?: UseColorFamilyOptionsFilters) {
  return useQuery({
    queryKey: ['color_family_options', filters],  // ← Cache key includes filters
    queryFn: async () => {
      let query = supabase
        .from('color_family_options')
        .select('*')
        .limit(10000)
        .order('color_type', { ascending: true })
        .order('primary_family', { ascending: true })
        .order('secondary_family', { ascending: true });

      // Apply filters
      if (filters?.color_type) {
        query = query.eq('color_type', filters.color_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ColorFamilyOption[];
    }
  });
}
```

**Example Database Data:**

```sql
SELECT * FROM color_family_options
ORDER BY color_type, primary_family;

-- Output:
┌────┬──────────────┬───────────────┬──────────────┬────────────┬──────────────────┐
│ id │ color_type   │ primary_family│ secondary... │ color_code │ display_name_nl  │
├────┼──────────────┼───────────────┼──────────────┼────────────┼──────────────────┤
│ 1  │ MONO         │ BLUE          │ NULL         │ BLU        │ Eenkleurig Blauw │
│ 2  │ MONO         │ RED           │ NULL         │ RED        │ Eenkleurig Rood  │
│ 3  │ MONO         │ GREEN         │ NULL         │ GRN        │ Eenkleurig Groen │
│ 47 │ DUO          │ BLUE          │ RED          │ BLU-RED    │ Blauw-Rood       │
│ 48 │ DUO          │ BLUE          │ GREEN        │ BLU-GRN    │ Blauw-Groen      │
│ 89 │ TRIO         │ BLUE          │ RED          │ B-R-G      │ Blauw-Rood-Groen │
│ 90 │ MULTI        │ NULL          │ NULL         │ VAR-001    │ Veelkleurig      │
└────┴──────────────┴───────────────┴──────────────┴────────────┴──────────────────┘
```

### Step 4: UI Rendering

**Table Structure** (line 197-248):

```typescript
const combinationColumns = [
  {
    key: 'color_type',
    label: 'Type',
    render: (option) => <Badge>{option.color_type}</Badge>  // MONO|DUO|TRIO|MULTI
  },
  {
    key: 'color_code',
    label: 'Kleurcode',
    render: (option) => <span>{option.color_code}</span>   // BLU-RED
  },
  {
    key: 'color_swatches',
    label: 'Kleuren',
    render: (option) => (
      <div className="flex gap-1">
        <div style={{ backgroundColor: option.primary_hex_code }} />
        {option.secondary_hex_code && <div style={{ backgroundColor: option.secondary_hex_code }} />}
        {option.tertiary_hex_code && <div style={{ backgroundColor: option.tertiary_hex_code }} />}
      </div>
    )
  },
  {
    key: 'families',
    label: 'Families',
    render: (option) => (
      <span>
        {option.primary_family}
        {option.secondary_family && ` / ${option.secondary_family}`}
        {option.tertiary_family && ` / ${option.tertiary_family}`}
      </span>
    )
  },
  {
    key: 'display_name_nl',
    label: 'Nederlandse Naam',
  },
  {
    key: 'display_name_en',
    label: 'Engelse Naam',
  },
];
```

**Visual Table:**
```
┌──────┬──────────┬───────────────┬──────────────────┬──────────────────┐
│ Type │ Kluurcode│ Kleuren       │ Families         │ Nederlandse Naam │
├──────┼──────────┼───────────────┼──────────────────┼──────────────────┤
│ MONO │ BLU      │ ■             │ BLUE             │ Eenkleurig Blauw │
│ MONO │ RED      │ ■             │ RED              │ Eenkleurig Rood  │
│ DUO  │ BLU-RED  │ ■ ■           │ BLUE / RED       │ Blauw-Rood       │
│ DUO  │ BLU-GRN  │ ■ ■           │ BLUE / GREEN     │ Blauw-Groen      │
│ TRIO │ B-R-G    │ ■ ■ ■         │ BLUE / RED / GREEN │ Blauw-Rood-... │
│ MULTI│ VAR-001  │ ■ ■ ■ ■       │ -                │ Veelkleurig      │
└──────┴──────────┴───────────────┴──────────────────┴──────────────────┘
```

---

## 🔧 CRUD Operations (Data Mutations)

### CREATE: Kleur Toevoegen
**Location:** Line 500-535 in ColorFamiliesPage.tsx

```tsx
const handleSaveNew = async () => {
  const { error } = await supabase
    .from('colors')
    .insert({
      color_name_nl: formData.color_name_nl,
      color_name_en: formData.color_name_en || null,
      hex_code: formData.hex_code,
      color_family: addDialog.familyCode,  // ← Links to family
      is_high_visibility: formData.is_high_visibility,
      is_fluorescent: formData.is_fluorescent,
      is_active: true,
    });

  // Invalidate cache → UI re-fetches data
  queryClient.invalidateQueries({ queryKey: ['color_families_with_colors'] });
};
```

**Database Operation:**
```sql
INSERT INTO colors (
  color_name_nl, color_name_en, hex_code, color_family,
  is_high_visibility, is_fluorescent, is_active
) VALUES (
  'Hemelsblauw', 'Sky Blue', '#0074D9', 'BLUE',
  false, false, true
);
```

### READ: Synoniem Validatie
**Location:** Line 415-435 in ColorFamiliesPage.tsx

```tsx
const validateSynonymUniqueness = async (synonym: string) => {
  const trimmedLower = synonym.trim().toLowerCase();
  
  const { data: colors } = await supabase
    .from('colors')
    .select('id, color_name_nl, search_keywords')
    .eq('is_active', true);
  
  // Check if synonym already exists in any color's search_keywords
  for (const color of colors || []) {
    if (color.search_keywords?.some((kw: string) => 
      kw.toLowerCase() === trimmedLower
    )) {
      return { isUnique: false, existingColor: color.color_name_nl };
    }
  }
  return { isUnique: true };
};
```

### UPDATE: Kleur Bewerken
**Location:** Line 480-510 in ColorFamiliesPage.tsx

```tsx
const handleSaveEdit = async () => {
  const { error } = await supabase
    .from('colors')
    .update({
      color_name_nl: formData.color_name_nl,
      color_name_en: formData.color_name_en || null,
      hex_code: formData.hex_code,
      is_high_visibility: formData.is_high_visibility,
      is_fluorescent: formData.is_fluorescent,
    })
    .eq('id', editDialog.color.id);

  queryClient.invalidateQueries({ queryKey: ['color_families_with_colors'] });
};
```

### UPDATE: Synoniem Toevoegen
**Location:** Line 440-475 in ColorFamiliesPage.tsx

```tsx
const handleAddSynonym = async () => {
  const { data: color } = await supabase
    .from('colors')
    .select('search_keywords')
    .eq('id', addSynonymDialog.colorId)
    .single();

  const currentKeywords = color?.search_keywords || [];

  const { error } = await supabase
    .from('colors')
    .update({ 
      search_keywords: [...currentKeywords, trimmedSynonym]  // ← Array append
    })
    .eq('id', addSynonymDialog.colorId);

  queryClient.invalidateQueries({ queryKey: ['color_families_with_colors'] });
};
```

### DELETE: Synoniem Verwijderen
**Location:** Line 390-412 in ColorFamiliesPage.tsx

```tsx
const handleDeleteKeyword = async () => {
  const { data, error } = await supabase.functions.invoke(
    'remove-color-keyword',  // ← Edge Function
    {
      body: {
        color_id: deleteConfirm.colorId,
        keyword_to_remove: deleteConfirm.keyword
      }
    }
  );

  queryClient.invalidateQueries({ queryKey: ['color_families_with_colors'] });
};
```

### DELETE: Kleur Verwijderen
**Location:** Line 555-580 in ColorFamiliesPage.tsx

```tsx
const handleDeleteColor = async () => {
  const { error } = await supabase
    .from('colors')
    .delete()
    .eq('id', deleteColorDialog.color.id);

  queryClient.invalidateQueries({ queryKey: ['color_families_with_colors'] });
};
```

---

## 🗄️ Database Schema Details

### Table: colors

```sql
CREATE TABLE public.colors (
    id SERIAL PRIMARY KEY,
    
    -- Naming
    color_name_nl TEXT NOT NULL,
    color_name_en TEXT,
    
    -- Visual
    hex_code TEXT NOT NULL
      CHECK (hex_code ~* '^#[0-9A-F]{6}$'),  -- Regex: #RRGGBB
    rgb_r INTEGER CHECK (rgb_r >= 0 AND rgb_r <= 255),
    rgb_g INTEGER CHECK (rgb_g >= 0 AND rgb_g <= 255),
    rgb_b INTEGER CHECK (rgb_b >= 0 AND rgb_b <= 255),
    
    -- Classification
    color_family TEXT,  -- "BLUE", "RED", "GREEN", etc.
    is_family_default BOOLEAN DEFAULT false,
    
    -- Attributes
    is_high_visibility BOOLEAN DEFAULT false,
    is_fluorescent BOOLEAN DEFAULT false,
    swatch_type TEXT,
    
    -- Metadata
    search_keywords TEXT[],           -- ["navy", "marineblauw"]
    common_secondary_colors TEXT[],   -- ["red", "gray"]
    color_description TEXT,
    application_context TEXT,
    
    -- Lifecycle
    display_order INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: color_family_options

```sql
CREATE TABLE public.color_family_options (
    id SERIAL PRIMARY KEY,
    
    -- Family References (not FK to colors!)
    primary_family TEXT NOT NULL,        -- "BLUE"
    secondary_family TEXT,               -- "RED" (NULL for MONO)
    tertiary_family TEXT,                -- "GREEN" (NULL for MONO/DUO)
    
    -- Visual
    primary_hex_code TEXT NOT NULL,
    secondary_hex_code TEXT,
    tertiary_hex_code TEXT,
    
    -- Type Constraint
    color_type TEXT NOT NULL
      CHECK (color_type IN ('MONO', 'DUO', 'TRIO', 'MULTI')),
    
    -- Business Logic Constraints
    CONSTRAINT mono_no_secondary 
      CHECK (color_type != 'MONO' OR (secondary_family IS NULL AND tertiary_family IS NULL)),
    CONSTRAINT duo_has_secondary_no_tertiary
      CHECK (color_type != 'DUO' OR (secondary_family IS NOT NULL AND tertiary_family IS NULL)),
    CONSTRAINT trio_needs_three
      CHECK (color_type != 'TRIO' OR (secondary_family IS NOT NULL AND tertiary_family IS NOT NULL)),
    CONSTRAINT multi_no_families
      CHECK (color_type != 'MULTI' OR (secondary_family IS NULL AND tertiary_family IS NULL)),
    
    -- Display
    display_name_nl TEXT NOT NULL,
    display_name_en TEXT NOT NULL,
    color_code TEXT,  -- "BLU-RED", "VAR-001"
    
    -- Uniqueness
    UNIQUE (primary_family, secondary_family, tertiary_family),
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 Data Example: Complete Flow

### Input: Raw Data in Database

```sql
-- colors table
INSERT INTO colors VALUES
  (1, 'Donkerblauw', 'Navy Blue', '#001F3F', 0, false, false, true, 'BLUE', ARRAY['navy', 'marineblauw']),
  (2, 'Hemelsblauw', 'Sky Blue', '#0074D9', 0, false, false, true, 'BLUE', null),
  (3, 'Donkerrood', 'Dark Red', '#85144B', 0, false, false, true, 'RED', ARRAY['maroon']),
  (4, 'Helder rood', 'Bright Red', '#FF4136', 0, false, false, true, 'RED', null);

-- color_family_options table
INSERT INTO color_family_options VALUES
  (1, 'BLUE', null, null, 'MONO', '#0000FF', null, null, 'Eenkleurig Blauw', 'Solid Blue', 'BLU'),
  (2, 'RED', null, null, 'MONO', '#FF0000', null, null, 'Eenkleurig Rood', 'Solid Red', 'RED'),
  (47, 'BLUE', 'RED', null, 'DUO', '#0000FF', '#FF0000', null, 'Blauw-Rood', 'Blue-Red', 'BLU-RED');
```

### Processing in Frontend

```typescript
// Hook: useColorFamiliesWithColors
// Input: All colors with is_active=true
// Processing: Group by color_family, add hex from FAMILY_NAMES
// Output: Nested structure

[
  {
    family_code: "BLUE",
    name_nl: "Blauw",              // ← from FAMILY_NAMES mapping
    name_en: "Blue",
    hex_code: "#0000FF",           // ← from FAMILY_NAMES mapping
    color_count: 2,
    colors: [
      { id: 1, color_name_nl: "Donkerblauw", ... },
      { id: 2, color_name_nl: "Hemelsblauw", ... }
    ]
  },
  {
    family_code: "RED",
    name_nl: "Rood",
    colors: [...]
  }
]

// Hook: useColorFamilyOptions({ color_type: 'DUO' })
// Input: color_family_options filtered by DUO
// Output: Direct from database (minimal processing)

[
  {
    id: 47,
    primary_family: "BLUE",
    secondary_family: "RED",
    color_type: "DUO",
    primary_hex_code: "#0000FF",
    secondary_hex_code: "#FF0000",
    display_name_nl: "Blauw-Rood",
    color_code: "BLU-RED"
  }
]
```

### Rendering

**Tab 1: Kleurenfamilies**
```
▼ BLAUW (Blauw • 2 kleuren)

│ ■ │ Donkerblauw      │ Navy Blue  │ #001F3F │ navy, marineblauw │
│ ■ │ Hemelsblauw      │ Sky Blue   │ #0074D9 │ -                 │

▼ ROOD (Rood • 2 kleuren)

│ ■ │ Donkerrood       │ Dark Red   │ #85144B │ maroon            │
│ ■ │ Helder rood      │ Bright Red │ #FF4136 │ -                 │
```

**Tab 2: Combinaties (DUO)**
```
│ DUO  │ BLU-RED │ ■ ■           │ BLUE / RED       │ Blauw-Rood │
```

---

## 🎯 Key Insights

### 1. **Two Separate Data Structures**

- **TAB 1 (Kleurenfamilies):** Driven by `colors` table, grouped by `color_family` column
- **TAB 2 (Combinaties):** Driven by `color_family_options` table, pre-defined combinations

### 2. **Family Naming**

The family name (e.g., "Blauw") comes from a hardcoded mapping in the hook:

```typescript
const FAMILY_NAMES: Record<string, { nl: string; en: string; hex: string }> = {
  BLACK: { nl: 'Zwart', en: 'Black', hex: '#000000' },
  BLUE: { nl: 'Blauw', en: 'Blue', hex: '#0000FF' },
  // etc.
};
```

This mapping is **NOT** from the database—it's hardcoded in JavaScript!

### 3. **Search Keywords vs Combinations**

- **search_keywords:** Stored in `colors.search_keywords` (TEXT array)
  - Used for autocomplete/search functionality
  - Example: "navy" → matches "Donkerblauw"

- **Combinations:** Stored in `color_family_options` table
  - Pre-generated for known use cases (MONO/DUO/TRIO/MULTI)
  - Example: BLUE + RED = "Blauw-Rood"

### 4. **Data Consistency**

When colors are added/updated:
- Only the `colors` table is modified
- `color_family_options` remains static (pre-defined)
- To add a new combination, manually INSERT into `color_family_options`

### 5. **CRUD Operations**

All mutations use React Query's `invalidateQueries`:
```typescript
queryClient.invalidateQueries({ queryKey: ['color_families_with_colors'] });
```

This triggers a fresh query, ensuring UI stays in sync with database.

---

## 💡 For Data Import

If you want to import color data, here's the sequence:

### Step 1: Insert into `colors`
```sql
INSERT INTO colors (color_name_nl, color_name_en, hex_code, color_family, is_active)
VALUES 
  ('Donkerblauw', 'Navy Blue', '#001F3F', 'BLUE', true),
  ('Hemelsblauw', 'Sky Blue', '#0074D9', 'BLUE', true),
  ('Donkerrood', 'Dark Red', '#85144B', 'RED', true);
```

### Step 2: Define Family Names (Update FAMILY_NAMES in Hook)
If you have new families like 'TEAL', 'VIOLET':
```typescript
// src/hooks/use-color-families-with-colors.ts
const FAMILY_NAMES = {
  // ... existing ...
  TEAL: { nl: 'Teal', en: 'Teal', hex: '#008080' },
  VIOLET: { nl: 'Violet', en: 'Violet', hex: '#EE82EE' },
};
```

### Step 3: (Optional) Create Combinations
```sql
INSERT INTO color_family_options (
  primary_family, secondary_family, color_type,
  primary_hex_code, secondary_hex_code,
  display_name_nl, display_name_en, color_code
)
VALUES
  ('BLUE', 'RED', 'DUO', '#0000FF', '#FF0000', 'Blauw-Rood', 'Blue-Red', 'BLU-RED'),
  ('BLUE', 'TEAL', 'DUO', '#0000FF', '#008080', 'Blauw-Teal', 'Blue-Teal', 'BLU-TEA');
```

---

## 📋 Summary Table

| Aspect | TAB 1: Kleurenfamilies | TAB 2: Combinaties |
|--------|------------------------|--------------------|
| **Database Table** | `colors` | `color_family_options` |
| **Hook** | `useColorFamiliesWithColors` | `useColorFamilyOptions` |
| **Grouping** | By `color_family` column | By `color_type` (MONO/DUO/TRIO/MULTI) |
| **Family Name Source** | Hardcoded `FAMILY_NAMES` mapping | N/A (combinations, not families) |
| **Data Count** | ~25 families + 500+ colors | ~169 combinations |
| **CRUD** | Full (Create, Edit, Delete colors) | Read-only (pre-defined combinations) |
| **Mutations** | Invalidates `color_families_with_colors` | N/A |

---

**End of Analysis Document**

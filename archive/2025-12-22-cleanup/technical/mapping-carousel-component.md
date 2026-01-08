# Mapping Carousel Component - Technical Documentation

**Version:** 1.0  
**Date:** 2025-01-16  
**Component:** `src/components/import/MappingCarousel.tsx`

---

## 🎯 Purpose

The **MappingCarousel** is a carousel-based UI component for mapping Excel/CSV columns to PIM fields during the CONVERT phase of dataset import. It replaces the previous vertical list approach (`InteractiveMappingEditor`) with a focused, one-field-at-a-time interface.

---

## 🏗️ Architecture

### Component Structure

```
MappingCarousel.tsx (Main Container)
├── FieldProgressIndicator.tsx (Visual progress with clickable dots)
├── Carousel (shadcn/ui)
│   ├── CarouselContent
│   │   ├── CarouselItem: ContextFieldsSlide (supplier/brand selection)
│   │   ├── CarouselItem: IndividualFieldSlide (P0 ordered fields)
│   │   ├── CarouselItem: FieldGroupSlide (P0 field groups)
│   │   ├── CarouselItem: IndividualFieldSlide (P0 remaining)
│   │   ├── CarouselItem: FieldGroupSlide (P1 field groups)
│   │   ├── CarouselItem: IndividualFieldSlide (P1 fields)
│   │   └── CarouselItem: SummarySlide (final overview)
│   ├── CarouselPrevious (left arrow)
│   └── CarouselNext (right arrow)
└── Keyboard Navigation Handler
```

### Slide Types

1. **ContextFieldsSlide**: Supplier and brand selection (if not already provided)
2. **IndividualFieldSlide**: Single PIM field mapping with optional fallback
3. **FieldGroupSlide**: Field group with OR-logic (at least 1 field required)
4. **SummarySlide**: Overview of completion status and quick jump to incomplete fields

---

## 📊 Slide Building Logic

Slides are dynamically built based on available fields and groups:

```typescript
const slides = useMemo(() => {
  const result: MappingSlide[] = [];
  
  // 1. Context fields (if supplier/brand not provided)
  if (supplierId === null || brandId === null) {
    result.push({ type: 'context', fields: ['supplier_id', 'brand_id'], ... });
  }
  
  // 2. P0 Ordered individual fields (EAN, Size, Image)
  orderedP0Fields.forEach(field => {
    result.push({ type: 'individual', field, priority: 'P0', ... });
  });
  
  // 3. P0 Field groups (Style, Color)
  orderedP0FieldGroups.forEach(group => {
    result.push({ type: 'group', group, priority: 'P0', ... });
  });
  
  // 4. P0 Remaining fields
  remainingP0Fields.forEach(field => {
    result.push({ type: 'individual', field, priority: 'P0', ... });
  });
  
  // 5. P1 Field groups
  p1FieldGroups.forEach(group => {
    result.push({ type: 'group', group, priority: 'P1', ... });
  });
  
  // 6. P1 Individual fields
  p1IndividualFields.forEach(field => {
    result.push({ type: 'individual', field, priority: 'P1', ... });
  });
  
  // 7. Summary slide
  result.push({ type: 'summary', label: 'Samenvatting', ... });
  
  return result;
}, [orderedP0Fields, orderedP0FieldGroups, ...]);
```

---

## 🎨 Visual Progress Indicator

### Status Calculation

Each slide has a status: `complete`, `partial`, or `incomplete`.

```typescript
const getSlideStatus = (slide: MappingSlide): 'complete' | 'partial' | 'incomplete' => {
  if (slide.type === 'individual') {
    const mapped = currentMappings[slide.field.field_key];
    const fallback = fallbackSelections[slide.field.field_key];
    return (mapped || fallback) ? 'complete' : 'incomplete';
  }
  
  if (slide.type === 'group') {
    const mappedCount = slide.group.fields.filter(key => currentMappings[key]).length;
    const fallback = fallbackSelections[slide.group.groupId];
    
    if (fallback || mappedCount >= slide.group.minRequired) return 'complete';
    if (mappedCount > 0) return 'partial';
    return 'incomplete';
  }
  
  // Context and summary handled separately
  return 'incomplete';
};
```

### Visual Representation

- **🟢 Green dot**: Complete (mapped or fallback)
- **🟠 Orange dot**: Partial (some fields in group mapped, but not enough)
- **🔴 Red dot**: Incomplete (not mapped)

Dots are **clickable** to jump directly to specific fields.

---

## ⌨️ Keyboard Navigation

### Shortcuts

- **←** (Left Arrow): Navigate to previous slide
- **→** (Right Arrow): Navigate to next slide
- **Enter**: Auto-advance to next incomplete field

### Implementation

```typescript
useEffect(() => {
  if (!carouselApi) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && carouselApi.canScrollPrev()) {
      e.preventDefault();
      carouselApi.scrollPrev();
    }
    if (e.key === 'ArrowRight' && carouselApi.canScrollNext()) {
      e.preventDefault();
      carouselApi.scrollNext();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const nextIncomplete = slides.findIndex((s, i) => 
        i > currentSlideIndex && getSlideStatus(s) === 'incomplete'
      );
      if (nextIncomplete !== -1) {
        carouselApi.scrollTo(nextIncomplete);
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [carouselApi, currentSlideIndex, slides]);
```

---

## 🔄 State Management

### Props

```typescript
interface MappingCarouselProps {
  availableColumns: string[];              // Parsed columns from Excel/CSV
  columnSamples: Record<string, string[]>; // Sample data for preview
  brandId: number | null;                  // Pre-selected brand (if any)
  supplierId: number | null;               // Pre-selected supplier (if any)
  brandName?: string;                      // Brand name for display
  supplierName?: string;                   // Supplier name for display
  initialMappings: Record<string, string>; // Pre-filled mappings (e.g., from template)
  onMappingsChange: (mappings: Record<string, string>) => void;
  onFallbackChange: (fallbacks: Record<string, boolean>) => void;
  onValidationChange?: (result: ValidationResult) => void;
}
```

### Internal State

```typescript
const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
const [carouselApi, setCarouselApi] = useState<CarouselApi>();
const [currentMappings, setCurrentMappings] = useState(initialMappings);
const [fallbackSelections, setFallbackSelections] = useState<Record<string, boolean>>({});
```

---

## 🧩 Slide Components

### 1. ContextFieldsSlide

Allows user to select supplier and brand (if not already provided).

**Features:**
- Dropdown selectors for supplier and brand
- Sample data preview
- Validation feedback

### 2. IndividualFieldSlide

Maps a single PIM field to an Excel/CSV column.

**Features:**
- Column selector with sample data preview
- Optional fallback checkbox (if `allow_fallback = true`)
- Real-time validation (green checkmark if complete)

### 3. FieldGroupSlide

Maps a field group (e.g., Color, Style) with OR-logic.

**Features:**
- Shows all fields in the group
- Highlights which fields are mapped
- Shows progress: "2 van 3 velden gemapped"
- Optional group-level fallback

### 4. SummarySlide

Final overview before proceeding.

**Features:**
- P0 completion status (must be 100%)
- P1 completion status (optional)
- Quick jump buttons to incomplete fields
- Overall quality score preview

---

## 🔍 Validation Integration

The carousel integrates with the validation system (`validateMappingsForPhase`) to:

1. **Real-time feedback**: Shows which fields are complete/incomplete
2. **Blocking logic**: P0 fields must be complete to proceed
3. **Warnings**: P1 incomplete fields show warnings but don't block

```typescript
const validationResult = useMemo(() => {
  return validateMappingsForPhase({
    mappings: currentMappings,
    fallbackSelections,
    fieldGroups: fieldGroupDefinitions,
    pimFields: pimFieldDefinitions,
    phase: 'Convert',
    brandId: brandId ?? undefined,
    supplierId: supplierId ?? undefined,
  });
}, [currentMappings, fallbackSelections, ...]);
```

---

## 📐 Design Specifications

### Dialog Size
- **Width**: 70% of viewport
- **Height**: 80% of viewport
- **Responsive**: Adjusts on smaller screens

### Slide Content
- **Min Height**: 400px (ensures consistent slide height)
- **Padding**: 6 (1.5rem) for comfortable spacing

### Progress Indicator
- **Dot Size**: 32px × 32px
- **Active Highlight**: Ring with 4px width
- **Hover Effect**: Scale 1.1 with transition

---

## 🚀 Usage Example

```tsx
import { MappingCarousel } from '@/components/import/MappingCarousel';

function ConvertStep() {
  const [mappings, setMappings] = useState({});
  const [fallbacks, setFallbacks] = useState({});
  
  return (
    <MappingCarousel
      availableColumns={['SKU', 'Product Name', 'Price', 'Color']}
      columnSamples={{
        'SKU': ['ABC-001', 'ABC-002'],
        'Product Name': ['T-Shirt Blauw', 'Polo Rood'],
        'Price': ['29.99', '39.99'],
        'Color': ['Blauw', 'Rood'],
      }}
      brandId={10}
      supplierId={5}
      brandName="Nike"
      supplierName="Leverancier X"
      initialMappings={{}}
      onMappingsChange={setMappings}
      onFallbackChange={setFallbacks}
      onValidationChange={(result) => console.log('Validation:', result)}
    />
  );
}
```

---

## ✅ Testing Checklist

### Functional
- [ ] Carousel loads with correct number of slides
- [ ] Left/right arrows navigate between slides
- [ ] Keyboard shortcuts work (← → Enter)
- [ ] Clicking progress dots jumps to specific slide
- [ ] Progress dots show correct colors (green/orange/red)
- [ ] Auto-advance works after field completion
- [ ] Summary slide shows accurate statistics
- [ ] Field groups use OR-logic correctly
- [ ] Fallback checkboxes toggle state
- [ ] Validation blocks proceed if P0 incomplete

### Visual
- [ ] Progress indicator visible at top
- [ ] Slides have consistent height (min 400px)
- [ ] Navigation arrows clearly visible
- [ ] Active slide has visual highlight
- [ ] Status colors are distinct and accessible
- [ ] Tooltips appear on hover over progress dots
- [ ] Summary slide is visually clear

### UX
- [ ] Smooth transitions between slides
- [ ] No lag when updating slide status
- [ ] Keyboard navigation feels natural
- [ ] Auto-advance not too aggressive
- [ ] User can always navigate back
- [ ] Summary slide reachable as last slide
- [ ] Quick jump buttons work in summary

### Edge Cases
- [ ] Single field → Carousel still works
- [ ] 30+ fields → Performance remains good
- [ ] Context fields optional → Slide skipped correctly
- [ ] All fields complete → Summary shows success
- [ ] Browser refresh → State persists (via parent)

---

## 🔄 Migration from InteractiveMappingEditor

### Key Differences

| Aspect | InteractiveMappingEditor | MappingCarousel |
|--------|--------------------------|-----------------|
| **Layout** | Vertical list (all fields visible) | Carousel (1 field per slide) |
| **Navigation** | Scroll + accordion | Left/right arrows + dots |
| **Focus** | Overview of all fields | Focused on current field |
| **Progress** | Implicit (scroll position) | Explicit (colored dots) |
| **Keyboard** | None | Full support (← → Enter) |
| **Auto-advance** | None | Jump to next incomplete |

### Migration Steps

1. Replace `InteractiveMappingEditor` import with `MappingCarousel`
2. Props remain mostly the same (compatible interface)
3. Update parent components to use `MappingCarousel`
4. Optional: Keep `InteractiveMappingEditor` as fallback for power users

---

## 📚 Related Documentation

- `docs/technical/import-architecture.md` - Overall import flow
- `docs/technical/fallback-feature-implementation.md` - Fallback feature details
- `docs/data-model/validation-rules.md` - Validation logic
- `src/lib/validation/p0-p1-mapping-validator.ts` - Validation implementation

---

## 🐛 Known Limitations

1. **Large datasets (50+ fields)**: Progress indicator may become cluttered. Consider grouping or pagination.
2. **Mobile support**: Carousel works but small screen size may affect UX. Consider vertical list fallback for mobile.
3. **Complex field groups**: Groups with 10+ fields may need scrolling within slide.

---

## 🔮 Future Enhancements

- **Smart ordering**: ML-based field prioritization based on user behavior
- **Bulk mapping**: Map multiple similar fields at once
- **Visual hints**: Show sample data inline with column selectors
- **Undo/redo**: History of mapping changes
- **Templates**: Quick apply of saved mapping templates directly in carousel

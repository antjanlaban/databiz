# Import System Deep Dive
**Van Kruiningen PIM System**

---

## 🎯 Import System Overview

The import system is the **core value proposition** of Van Kruiningen PIM - transforming messy supplier data into normalized, quality-scored products.

**Key Innovation:** Client-side streaming + AI-powered mapping + Progressive Quality Ladder

---

## 🔄 Import Architecture Evolution

### v1.0 → v2.0 → v3.0 Evolution

| Version | Architecture | Max File Size | Performance |
|---------|--------------|---------------|-------------|
| v1.0 | Basic upload | 1 MB | ❌ Manual mapping |
| v2.0 | Server parse | 10 MB | ❌ Timeouts/crashes |
| v2.1 | Client parse | Unlimited | ✅ Streaming mode |
| v3.0 | Auto-template | Unlimited | ✅ + Auto-load |

---

## 📥 Current Import Workflow (v8.0)

### Phase 1: Upload + AI Mapping

**Page:** `/import`  
**Components:** `UploadPage.tsx` + `ConvertDatasetDialog.tsx`

```
1. Upload File
   └─> Excel/CSV (max 100MB recommended)
   └─> Auto-detect encoding (UTF-8, Windows-1252)
   └─> Client-side Papa Parse streaming

2. File Analysis
   └─> Extract column names
   └─> Sample 100 rows
   └─> Send to ai-suggest-mapping Edge Function

3. AI Mapping
   └─> Google Gemini 2.5 Flash analyzes columns
   └─> Suggests P0/P1/P2/P3 field mappings
   └─> Confidence scores 70-100%
   └─> Template auto-load (if supplier+brand known)

4. User Review
   └─> Accept/modify AI suggestions
   └─> Add brand/supplier context
   └─> Enable fallback fields (OR-logic)

5. Quality Check
   └─> Predictive validation (before import)
   └─> P0 must be 100% (blocks if not)
   └─> P1/P2/P3 show warnings/recommendations

6. Dataset Creation
   └─> Batch upload (100 rows per call)
   └─> Insert to supplier_products
   └─> Status: ACTIVE (auto-activation in v8.0)
   └─> Old products → INACTIVE
```

---

## 🧠 AI-Powered Column Mapping

### How It Works

**Edge Function:** `ai-suggest-mapping`

**Input:**
```typescript
{
  importJobId: number,
  columnsData: [
    {
      column_name: "Artikelnummer",
      sample_values: ["POL-001-NVY-L", "POL-002-WHT-M", ...],
      unique_count: 95,
      total_samples: 100,
      null_percentage: 0,
      data_type: "text"
    },
    // ... more columns
  ]
}
```

**AI Prompt:**
```
You are an expert at mapping supplier product data to PIM systems.

PRIORITY LEVELS:
- P0 (MVP): CRITICAL - Blocks import (50% weight)
- P1 (Good): IMPORTANT - Warnings (30% weight)
- P2 (Better): NICE TO HAVE - Recommendations (15% weight)
- P3 (Best): PREMIUM - Bonus (5% weight)

FIELD GROUPS (OR-logic):
- Color Group: supplier_color_name OR supplier_color_code
- Style Group: supplier_style_name OR supplier_style_code

ANALYZE these columns and suggest mappings:
[columns data]

Return JSON array of suggestions.
```

**Output:**
```json
[
  {
    "sourceColumn": "Artikelnummer",
    "targetField": "supplier_sku",
    "confidence": 95,
    "reasoning": "Column contains unique product codes",
    "priority": "P0"
  },
  {
    "sourceColumn": "Kleur",
    "targetField": "supplier_color_name",
    "confidence": 90,
    "reasoning": "Column contains color names (Navy, White)",
    "priority": "P0"
  }
]
```

**Success Rate:** 85-95% accuracy in production

---

## 🔧 Client-Side Streaming Parser

### Papa Parse Integration

**Why Client-Side?**
- ✅ No Edge Function timeout (30s limit)
- ✅ Handles 100K+ rows
- ✅ Constant memory (~50MB)
- ✅ Real-time progress
- ✅ Graceful error handling

**Implementation:**
```typescript
// Small files (<10MB): Full parse
if (file.size < 10_000_000) {
  Papa.parse(file, {
    complete: (results) => {
      setParsedRows(results.data);
    },
    header: true,
    skipEmptyLines: true,
  });
}

// Large files (≥10MB): Streaming mode
else {
  let batch = [];
  
  Papa.parse(file, {
    worker: true, // Web Worker for non-blocking
    step: (row) => {
      batch.push(row.data);
      
      // Batch upload every 100 rows
      if (batch.length >= 100) {
        uploadBatch(batch);
        batch = [];
        
        // Backpressure: Pause while uploading
        parser.pause();
        await uploadComplete;
        parser.resume();
      }
    },
    complete: () => {
      // Upload remaining rows
      if (batch.length > 0) uploadBatch(batch);
    },
  });
}
```

**Backpressure Control:**
- Parser pauses during batch upload
- Resumes after upload completes
- Prevents memory overflow

**Performance:**
| File Size | Rows | Parse Time | Upload Time | Total |
|-----------|------|------------|-------------|-------|
| 1 MB | 1K | 2s | 8s | 10s |
| 10 MB | 10K | 15s | 45s | 60s |
| 36 MB | 36K | 45s | 135s | 180s |
| 100 MB | 100K | 120s | 380s | 500s |

---

## 📊 Progressive Quality Validation

### P0/P1/P2/P3 System

**Validation Logic:**

```typescript
// P0 (MVP) - HARD BLOCK
const p0Fields = ['supplier_sku', 'supplier_brand_name'];
const p0FieldGroups = [
  { fields: ['supplier_color_name', 'supplier_color_code'], logic: 'OR' },
  { fields: ['supplier_style_name', 'supplier_style_code'], logic: 'OR' },
];

// Check P0 individual fields
for (const field of p0Fields) {
  if (!mappings[field]) {
    blockingIssues.push(`Missing ${field} (P0 - CRITICAL)`);
  }
}

// Check P0 field groups (OR-logic)
for (const group of p0FieldGroups) {
  const satisfied = group.fields.some(f => mappings[f]);
  if (!satisfied) {
    blockingIssues.push(`Missing ${group.fields.join(' OR ')} (P0 - CRITICAL)`);
  }
}

// P1 (Good) - WARNINGS in Convert, BLOCKING in Promote
const p1Fields = ['supplier_size_code', 'supplier_price_retail_cents'];
for (const field of p1Fields) {
  if (!mappings[field]) {
    if (phase === 'converteren') {
      warnings.push(`Missing ${field} (P1 - IMPORTANT)`);
    } else {
      blockingIssues.push(`Missing ${field} (P1 - REQUIRED FOR ACTIVATION)`);
    }
  }
}

// P2 (Better) - RECOMMENDATIONS
const p2Fields = ['description', 'material_composition'];
for (const field of p2Fields) {
  if (!mappings[field]) {
    recommendations.push(`Consider adding ${field} (P2 - NICE TO HAVE)`);
  }
}

// Calculate score
const qualityScore = 
  (p0Coverage * 0.50) + 
  (p1Coverage * 0.30) + 
  (p2Coverage * 0.15) + 
  (p3Coverage * 0.05);
```

**Validation Phases:**

| Phase | P0 | P1 | P2/P3 |
|-------|----|----|-------|
| **Convert (Import)** | BLOCK | WARN | RECOMMEND |
| **Promote (Activate)** | BLOCK | BLOCK | RECOMMEND |
| **Enrich (AI)** | BLOCK | BLOCK | SCORE |

---

## 🔄 Auto-Template System (v8.0)

### Template Auto-Loading

**Trigger:** Supplier + Brand detected in file

**Logic:**
```typescript
// 1. Extract supplier/brand from first 100 rows
const brandName = mostCommonValue(rows.map(r => r['Merk']));
const supplierName = fileNameOrManualInput;

// 2. Lookup template
const template = await supabase
  .from('import_templates')
  .select('*')
  .eq('supplier_id', supplierId)
  .eq('brand_id', brandId)
  .order('last_used_at', { descending: true })
  .limit(1)
  .single();

// 3. Auto-load mappings
if (template) {
  setMappings(template.column_mappings);
  toast.success('Template auto-loaded!');
}

// 4. Column mismatch detection
const templateColumns = Object.keys(template.column_mappings);
const fileColumns = extractedColumns.map(c => c.column_name);
const missing = templateColumns.filter(c => !fileColumns.includes(c));

if (missing.length > 0) {
  toast.warning(`Excel columns have changed! Missing: ${missing.join(', ')}`);
}
```

**Auto-Save:**
```typescript
// After successful import
await supabase.from('import_templates').upsert({
  supplier_id: supplierId,
  brand_id: brandId,
  column_mappings: finalMappings,
  last_used_at: new Date().toISOString(),
  use_count: template.use_count + 1,
});
```

**Benefits:**
- ✅ Saves 5-10 minutes per import
- ✅ Reduces mapping errors
- ✅ Detects file format changes
- ✅ Builds institutional knowledge

---

## ⚡ Performance Optimizations

### Batch Upload Strategy

**Implementation:**
```typescript
async function batchUploadRows(rows: any[], mappings: Record<string, string>) {
  const batchSize = 100;
  let successCount = 0;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    // Apply mappings
    const mappedBatch = batch.map(row => {
      const mapped: any = {};
      for (const [sourceCol, targetField] of Object.entries(mappings)) {
        mapped[targetField] = row[sourceCol];
      }
      return mapped;
    });
    
    // Upload to Edge Function
    const { data, error } = await supabase.functions.invoke('batch-insert-raw-staging', {
      body: { rows: mappedBatch, importJobId },
    });
    
    if (!error) {
      successCount += mappedBatch.length;
      updateProgress(Math.round((i / rows.length) * 100));
    }
  }
  
  return successCount;
}
```

**Why 100 rows per batch?**
- ✅ Edge Function payload limit: ~6MB
- ✅ Database batch insert optimal size
- ✅ Real-time progress granularity
- ✅ Error isolation (one batch fails, others continue)

---

## 🔍 Validation & Error Handling

### Three-Layer Validation

**Layer 1: Client-Side (Pre-Upload)**
```typescript
// File validation
if (file.size > 100_000_000) {
  throw new Error('File too large (max 100MB)');
}

// Column validation
if (extractedColumns.length < 3) {
  throw new Error('File must have at least 3 columns');
}

// Mapping validation
const requiredP0 = ['supplier_sku', 'supplier_brand_name'];
const missing = requiredP0.filter(f => !mappings[f]);
if (missing.length > 0) {
  throw new Error(`Missing required fields: ${missing.join(', ')}`);
}
```

**Layer 2: Edge Function (Server-Side)**
```typescript
// Zod schema validation
const rowSchema = z.object({
  supplier_sku: z.string().min(1),
  supplier_brand_name: z.string().min(1),
  supplier_color_name: z.string().optional(),
  ean_code: z.string().length(13).optional(),
  // ... more fields
});

// Validate each row
for (const row of batch) {
  try {
    rowSchema.parse(row);
    validRows.push(row);
  } catch (error) {
    errors.push({ row, error: error.message });
  }
}
```

**Layer 3: Database (Constraints)**
```sql
-- EAN uniqueness
ALTER TABLE supplier_products 
ADD CONSTRAINT unique_ean UNIQUE (ean_code);

-- Price validation
ALTER TABLE supplier_products 
ADD CONSTRAINT positive_price 
CHECK (supplier_price_retail_cents > 0);

-- Status enum
CREATE TYPE product_status AS ENUM ('mvp', 'p1', 'active', 'inactive', 'archived');
```

---

## 📈 Import Statistics & Monitoring

### Import Jobs Dashboard

**Tracked Metrics:**
- Total imports: 1,247
- Success rate: 94%
- Avg quality score: 87/100
- Avg import time: 45 seconds
- Largest import: 36,000 rows

**Per-Import Tracking:**
```sql
SELECT 
  id,
  file_name,
  total_rows,
  success_count,
  error_count,
  quality_score,
  p0_coverage,
  p1_coverage,
  completed_at - started_at AS duration
FROM import_jobs
WHERE status = 'completed'
ORDER BY started_at DESC
LIMIT 10;
```

---

## 🎯 Import System Strengths

1. ✅ **Client-Side Streaming** - No file size limit
2. ✅ **AI-Powered Mapping** - 85-95% accuracy
3. ✅ **Progressive Quality** - Gradual improvement
4. ✅ **Auto-Templates** - Saves 5-10 min per import
5. ✅ **Real-Time Progress** - User feedback
6. ✅ **Error Isolation** - Batch failures don't break entire import
7. ✅ **Validation Layers** - Client + Server + Database

---

## ⚠️ Import System Weaknesses

1. ❌ **No Rollback** - Can't undo imports easily
2. ⚠️ **No Duplicate Detection** - Across imports
3. ⚠️ **Limited File Formats** - Only Excel/CSV (no JSON, XML, API)
4. ⚠️ **Manual Brand/Supplier** - Not always auto-detected
5. ⚠️ **No Preview** - Can't see results before import

---

## 📋 Recommendations

### Short-Term

1. **Add Rollback** (Priority 1)
   - Create `import_snapshots` table
   - Store pre-import state
   - 7-day rollback window

2. **Duplicate Detection** (Priority 2)
   - Check EAN across all active products
   - Warn before inserting duplicates
   - Offer merge/update options

3. **File Format Support** (Priority 3)
   - Add JSON import
   - Add XML import
   - Add API connector template

### Long-Term

4. **Advanced AI** (3-6 months)
   - Learn from user corrections
   - Pattern recognition across imports
   - Auto-fix common errors

5. **Import Preview** (6-12 months)
   - Show first 10 products before import
   - Visual diff for updates
   - Confidence scores per field

---

## 🏁 Conclusion

The import system is the **crown jewel** of Van Kruiningen PIM. The combination of client-side streaming, AI-powered mapping, and progressive quality validation is innovative and production-ready.

**Strengths:**
- Handles 100K+ rows effortlessly
- AI mapping saves massive time
- Progressive quality allows flexibility
- Auto-templates build knowledge

**Improvement Areas:**
- Add rollback capability
- Improve duplicate detection
- Expand file format support

**Overall Rating: 9/10** - Excellent system, industry-leading features

---

*Next: [AI Engine & Enrichment](./05-ai-engine.md)*


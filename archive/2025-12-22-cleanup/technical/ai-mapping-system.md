# 🤖 AI-Driven Mapping Engine - Systeem Architectuur

**Project:** Van Kruiningen PIM - Intelligente Data Mapping  
**Versie:** 8.0  
**Datum:** December 2024  
**Doel:** Self-learning AI engine voor autonome leveranciers data conversie met P0-only template systeem

---

## 🎯 Visie

**Probleem:**  
Elke leverancier gebruikt unieke kolomnamen, formaten en structuren. Handmatig mapping kost 30-60 min per leverancier per import. Met 50+ leveranciers is dit niet schaalbaar.

**Oplossing:**  
Een AI-gedreven engine die:
- Automatisch kolomkoppen en data patronen analyseert
- Leert van eerdere correcties en succesvolle mappings
- Generiek werkt over alle leveranciers heen
- Steeds slimmer wordt door gebruik

**Resultaat:**  
Van 30 minuten handmatig mappen naar 2 minuten AI-check + approve.

---

## 🏗️ Systeem Architectuur

### High-Level Flow

```
┌────────────────────────────────────────────────────────────────┐
│ 1. IMPORT WIZARD                                               │
│ User uploadt Excel/CSV → Server parst → Temp staging          │
│ Status: File ready for mapping                                 │
└──────────────────┬─────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. AI SUGGEST BUTTON (FASE 1A)                                │
│ User klikt "🤖 AI Mapping Voorstellen"                         │
│ → Trigger: ai-suggest-mapping Edge Function                    │
└──────────────────┬─────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. AI ANALYSE ENGINE                                           │
│ • Haalt kolommen + sample data uit supplier_datasets           │
│ • Laadt bestaande template (indien aanwezig)                   │
│ • Haalt feedback van eerdere imports (via feedback table)      │
│ • Prompt AI met context:                                       │
│   - Standaard PIM velden (ean, style_name, color, size)       │
│   - Supplier historie (wat werkte eerder?)                     │
│   - Cross-supplier patterns (FASE 2+)                          │
│ • AI returneert suggesties met confidence scores               │
└──────────────────┬─────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. USER REVIEW & CORRECTION                                    │
│ Dialog toont AI suggesties in tabel:                           │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Source Column  │ Suggested Field │ Confidence │ Actions    ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ Barcode        │ ean             │ 98%        │ ✅ ❌ ✏️   ││
│ │ Artikelnummer  │ style_code      │ 85%        │ ✅ ❌ ✏️   ││
│ │ Kleur          │ color_name      │ 95%        │ ✅ ❌ ✏️   ││
│ └─────────────────────────────────────────────────────────────┘│
│ User kan:                                                       │
│ • ✅ Accepteren                                                │
│ • ❌ Weigeren                                                  │
│ • ✏️ Aanpassen (dropdown met alternatieve velden)             │
└──────────────────┬─────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. FEEDBACK CAPTURE (Learning Loop)                           │
│ • Sla acceptatie/correctie op in import_mapping_feedback      │
│ • Optionele textarea: "Waarom paste je dit aan?"              │
│ • Link naar import_job_id + supplier_id + brand_id            │
│ • Update template confidence score (success_rate)             │
└──────────────────┬─────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. DATASET CREATION                                            │
│ Mapping toegepast → Staging data omgezet → Supplier products  │
│ Template opgeslagen (optioneel) met nieuwe confidence scores   │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema (FASE 1A)

### Nieuwe Tabel: `import_mapping_feedback`

**Purpose:** Capture alle user correcties op AI suggesties voor continuous learning

```sql
CREATE TABLE import_mapping_feedback (
  id SERIAL PRIMARY KEY,
  
  -- Context
  import_job_id INTEGER NOT NULL REFERENCES import_supplier_dataset_jobs(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  brand_id INTEGER REFERENCES brands(id),
  
  -- Mapping details
  source_column_name TEXT NOT NULL,           -- Raw Excel kolom (bijv. "Barcode")
  suggested_field_key TEXT NOT NULL,          -- AI suggestie (bijv. "ean")
  final_field_key TEXT NOT NULL,              -- User keuze (bijv. "ean" of NULL als weigered)
  ai_confidence NUMERIC(5,2),                 -- AI confidence score (0-100)
  
  -- Feedback
  was_accepted BOOLEAN NOT NULL,              -- TRUE = user accepteerde AI suggestie
  was_modified BOOLEAN NOT NULL,              -- TRUE = user paste aan naar andere field
  correction_reason TEXT,                     -- Optioneel: waarom aangepast?
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes voor snelle queries
CREATE INDEX idx_feedback_supplier_brand ON import_mapping_feedback(supplier_id, brand_id);
CREATE INDEX idx_feedback_source_column ON import_mapping_feedback(source_column_name);
CREATE INDEX idx_feedback_acceptance ON import_mapping_feedback(was_accepted);
```

**Example Data:**
```
| source_column_name | suggested_field_key | final_field_key | was_accepted | was_modified | correction_reason |
|--------------------|---------------------|-----------------|--------------|--------------|-------------------|
| "Barcode"          | "ean"               | "ean"           | TRUE         | FALSE        | NULL              |
| "Artikelnr"        | "style_code"        | "supplier_sku"  | FALSE        | TRUE         | "Dit is SKU, niet style" |
| "Kleur"            | "color_name"        | "color_name"    | TRUE         | FALSE        | NULL              |
```

---

### Simplified Import Templates (v8.0)

**BELANGRIJKE WIJZIGING:** In v8.0 zijn templates drastisch vereenvoudigd naar P0-only:

```sql
-- Nieuwe simplified structuur
CREATE TABLE import_templates (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL,           -- REQUIRED (niet nullable)
  brand_id INTEGER,                       -- NULL = merk uit Excel ('-')
  p0_column_mappings JSONB NOT NULL,      -- Alleen P0 velden
  file_columns TEXT[] NOT NULL,           -- Voor mismatch detectie
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  file_format TEXT DEFAULT 'excel',
  
  UNIQUE(supplier_id, brand_id)  -- Eén template per combinatie
);
```

**Wat wordt OPGESLAGEN:**
- ✅ P0 veldmappings (EAN, SKU, merk, kleur, stijl, maat)
- ✅ File kolommen (voor mismatch detectie)
- ✅ Leverancier + merk combinatie
- ✅ Gebruiksstatistieken

**Wat wordt NIET opgeslagen:**
- ❌ P1/P2/P3 velden (gebruiker mapt deze elke keer handmatig)
- ❌ Transformatie regels (size/color mappings - aparte tabellen)
- ❌ Brand/supplier mappings (stamdata tabellen)
- ❌ Changelog/versioning (geen complexe historie)

**Auto-save Gedrag:**
- Templates worden AUTOMATISCH opgeslagen na succesvolle import
- Gebruiker hoeft GEEN template naam in te voeren
- Bestaande template wordt OVERSCHREVEN bij nieuwe import (geen duplicate check dialog)
- Bij kolom mismatch: gebruiker past mappings aan → nieuwe template wordt opgeslagen

---

## 🔧 Edge Function: `ai-suggest-mapping` (v2.0)

**Purpose:** Analyseer import kolommen en genereer mapping suggesties met AI

**Input:**
```typescript
{
  import_job_id: number,
  supplier_id: number,
  brand_id: number,
  template_id?: number  // Optioneel: gebruik bestaande template als basis
}
```

**Processing Flow:**

### Step 1: Data Collection
```typescript
// 1. Haal kolommen + sample data uit supplier_datasets
const { data: samples } = await supabase
  .from('supplier_datasets')
  .select('raw_data')
  .eq('import_job_id', import_job_id)
  .order('row_number')
  .limit(10);  // Eerste 10 rijen als sample

// Extract kolommen + waarden
const columns = Object.keys(samples[0].raw_data);
const columnSamples = columns.map(col => ({
  column_name: col,
  sample_values: samples.map(s => s.raw_data[col]).filter(v => v),
  existing_mapping: null  // Vul hieronder
}));
```

### Step 2: Load Context (Template + Feedback)
```typescript
// 2A. Als template_id gegeven, laad als "prior knowledge"
let priorMappings = {};
if (template_id) {
  const { data: template } = await supabase
    .from('import_templates')
    .select('column_mappings, confidence_score')
    .eq('id', template_id)
    .single();
  
  priorMappings = template.column_mappings;
}

// 2B. Haal feedback van eerdere imports van deze supplier
const { data: feedback } = await supabase
  .from('import_mapping_feedback')
  .select('*')
  .eq('supplier_id', supplier_id)
  .eq('brand_id', brand_id)
  .order('created_at', { ascending: false })
  .limit(50);  // Laatste 50 feedback items

// Group feedback per source column
const feedbackMap = feedback.reduce((acc, f) => {
  if (!acc[f.source_column_name]) acc[f.source_column_name] = [];
  acc[f.source_column_name].push({
    suggested: f.suggested_field_key,
    final: f.final_field_key,
    accepted: f.was_accepted,
    confidence: f.ai_confidence
  });
  return acc;
}, {});
```

### Step 3: AI Prompt Construction
```typescript
const systemPrompt = `Je bent een expert in product data mapping voor bedrijfskleding leveranciers.

**BELANGRIJK: FOCUS OP P0 VELDEN (v8.0)**
In v8.0 slaan we alleen P0 (verplichte basis) velden op in templates. 
Focus je suggesties daarom EERST op deze velden:

P0 VELDEN (VERPLICHT - Deze worden opgeslagen in templates):
- ean (EAN-13 barcode)
- supplier_sku (Unieke variant code)
- supplier_brand_name (Merk naam) OF uit Excel mapping
- supplier_color_name (Kleur naam)
- supplier_color_code (Kleurcode)
- supplier_style_name (Product/model naam)
- supplier_style_code (Product/model code)
- supplier_size_code (Maatcode)

P1/P2/P3 VELDEN (OPTIONEEL - Niet opgeslagen in templates):
- supplier_product_group (Productgroep)
- supplier_advised_price (Adviesprijs)
- material_composition (Materiaal)
- fabric_weight_gsm (Stofgewicht)
- care_instructions (Wasvoorschrift)
- country_of_origin (Herkomst)

MAPPING REGELS (uit docs/supplier-analysis/_supplier-field-library.md):
1. EAN: 13 cijfers, geen formules, check pattern "8712..."
2. SKU: Unieke variant identifier, bevat vaak size/color suffix
3. Style Code: Model/family code, NIET uniek per variant
4. Article Name/Code: Composite of style + variant info

FEEDBACK HISTORIE voor deze supplier:
${Object.entries(feedbackMap).map(([col, history]) => 
  `- "${col}": ${history.map(h => 
    `${h.accepted ? '✅' : '❌'} ${h.suggested} → ${h.final} (${h.confidence}%)`
  ).join(', ')}`
).join('\n')}

BESTAANDE TEMPLATE (indien beschikbaar):
${JSON.stringify(priorMappings, null, 2)}
`;

const userPrompt = `Analyseer deze kolommen en genereer mapping suggesties:

${columnSamples.map(col => `
KOLOM: "${col.column_name}"
Sample waarden:
${col.sample_values.slice(0, 5).map((v, i) => `  ${i+1}. ${v}`).join('\n')}
`).join('\n---\n')}

Return JSON array met suggesties:
[
  {
    "source_column": "Barcode",
    "suggested_field": "ean",
    "confidence": 98,
    "reasoning": "Contains 13-digit barcodes, matches EAN pattern"
  },
  ...
]`;
```

### Step 4: Call AI (Lovable AI Gateway)
```typescript
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3  // Lower = more deterministic
  })
});

const aiData = await response.json();
const suggestions = JSON.parse(aiData.choices[0].message.content);
```

### Step 5: Return Structured Response
```typescript
return {
  import_job_id,
  supplier_id,
  brand_id,
  suggestions: suggestions.map(s => ({
    source_column: s.source_column,
    suggested_field: s.suggested_field,
    confidence: s.confidence,
    reasoning: s.reasoning,
    based_on_template: priorMappings[s.source_column] === s.suggested_field,
    has_feedback: feedbackMap[s.source_column]?.length > 0
  })),
  recommended_mapping: suggestions.reduce((acc, s) => {
    if (s.confidence >= 80) {
      acc[s.suggested_field] = s.source_column;
    }
    return acc;
  }, {}),
  metadata: {
    template_used: template_id,
    template_confidence: template?.confidence_score,
    feedback_items_count: feedback.length
  }
};
```

---

## 🎨 UI Components (FASE 1A)

### Component 1: AI Suggest Button

**Location:** `src/components/import/steps/MappingStep1Required.tsx`

**Placement:** Boven EAN mapping veld

**UI:**
```tsx
<Card className="mb-4 border-primary/20 bg-primary/5">
  <CardContent className="pt-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-semibold">AI Mapping Assistent</h3>
          <p className="text-sm text-text-secondary">
            Laat AI de kolommen automatisch analyseren en mapping voorstellen
          </p>
        </div>
      </div>
      <Button
        onClick={handleAISuggest}
        disabled={isAnalyzing}
        className="bg-primary"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyseren...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Mapping Voorstellen
          </>
        )}
      </Button>
    </div>
  </CardContent>
</Card>
```

---

### Component 2: AI Suggestions Dialog

**Component:** `src/components/import/AiMappingSuggestDialog.tsx`

**UI Structure:**
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-4xl max-h-[80vh]">
    <DialogHeader>
      <DialogTitle>🤖 AI Mapping Voorstellen</DialogTitle>
      <DialogDescription>
        Bekijk en pas de suggesties aan. Groene suggesties hebben hoge zekerheid.
      </DialogDescription>
    </DialogHeader>
    
    <ScrollArea className="max-h-[50vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source Kolom</TableHead>
            <TableHead>Sample Waarden</TableHead>
            <TableHead>Suggested Field</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((suggestion, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-mono text-sm">
                {suggestion.source_column}
              </TableCell>
              
              <TableCell className="text-xs text-text-tertiary">
                {suggestion.sample_values.slice(0, 2).join(', ')}...
              </TableCell>
              
              <TableCell>
                <Select
                  value={suggestion.suggested_field}
                  onValueChange={(value) => handleFieldChange(idx, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIM_FIELDS.map(field => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              
              <TableCell>
                <Badge 
                  variant={
                    suggestion.confidence >= 85 ? 'success' :
                    suggestion.confidence >= 70 ? 'warning' : 
                    'destructive'
                  }
                >
                  {suggestion.confidence}%
                </Badge>
              </TableCell>
              
              <TableCell>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => acceptSuggestion(idx)}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => rejectSuggestion(idx)}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
    
    {/* Feedback textarea (optional) */}
    <div className="space-y-2">
      <Label>Opmerkingen (optioneel)</Label>
      <Textarea
        value={feedbackNotes}
        onChange={(e) => setFeedbackNotes(e.target.value)}
        placeholder="Waarom paste je deze mapping aan? Dit helpt de AI te leren."
        rows={3}
      />
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Annuleren
      </Button>
      <Button 
        onClick={handleApply}
        disabled={!hasAcceptedAny}
        className="bg-primary"
      >
        Toepassen ({acceptedCount} velden)
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🔄 Learning Loop Workflow

### When User Corrects AI Suggestion

```typescript
// 1. Capture feedback bij elke wijziging
async function saveMappingFeedback(correction: {
  import_job_id: number;
  supplier_id: number;
  brand_id: number;
  source_column: string;
  ai_suggestion: string;
  user_choice: string;
  confidence: number;
  reason?: string;
}) {
  await supabase.from('import_mapping_feedback').insert({
    import_job_id: correction.import_job_id,
    supplier_id: correction.supplier_id,
    brand_id: correction.brand_id,
    source_column_name: correction.source_column,
    suggested_field_key: correction.ai_suggestion,
    final_field_key: correction.user_choice,
    ai_confidence: correction.confidence,
    was_accepted: correction.ai_suggestion === correction.user_choice,
    was_modified: correction.ai_suggestion !== correction.user_choice,
    correction_reason: correction.reason,
    created_by: userId
  });
}
```

### Update Template Confidence Score

```typescript
// 2. Bij voltooien dataset: update template metrics
async function updateTemplateConfidence(template_id: number) {
  // Count feedback items for this template's mappings
  const { data: feedback } = await supabase
    .from('import_mapping_feedback')
    .select('was_accepted')
    .eq('template_id', template_id);  // Assuming we add template_id to feedback
  
  const totalMappings = feedback.length;
  const acceptedMappings = feedback.filter(f => f.was_accepted).length;
  
  const success_rate = (acceptedMappings / totalMappings) * 100;
  
  // Weighted confidence: 70% accuracy + 30% usage popularity
  const usage_factor = Math.min(totalMappings / 10, 1) * 30;  // Max 30 points
  const accuracy_factor = success_rate * 0.7;
  const new_confidence = accuracy_factor + usage_factor;
  
  await supabase
    .from('import_templates')
    .update({
      confidence_score: new_confidence,
      success_rate: success_rate,
      feedback_count: totalMappings,
      updated_at: new Date().toISOString()
    })
    .eq('id', template_id);
}
```

---

## 📈 FASE 2-4 Preview (Future Enhancements)

### FASE 2: Pattern Library (Cross-Supplier Learning)

**Goal:** AI leert van ALL leveranciers, niet alleen per supplier

**New Table:** `mapping_patterns`
```sql
CREATE TABLE mapping_patterns (
  id SERIAL PRIMARY KEY,
  pattern_type VARCHAR(50),  -- 'column_name', 'data_pattern', 'keyword'
  pattern_value TEXT,         -- 'Barcode', '\d{13}', 'EAN'
  target_field_key TEXT,      -- 'ean'
  confidence_score NUMERIC(5,2),
  usage_count INTEGER,
  success_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Patterns:**
- Column name "Barcode" → 98% maps to `ean`
- Data pattern `^\d{13}$` → 99% is `ean`
- Keyword "Kleur" in column → 95% maps to `color_name`

**AI Prompt Enhancement:**
```typescript
const crossSupplierPatterns = await getTopPatterns(100);
// "In 47 eerdere imports werd 'Barcode' kolom 95% van de tijd gemapped naar 'ean'"
```

---

### FASE 3: Confidence Evolution

**Goal:** Templates worden slimmer over tijd

**Metrics per Template:**
- Initial confidence: 70%
- After 5 succesful uses: 85%
- After 20 succesful uses: 95%
- After 3 corrections: 75% (penalty)

**UI Enhancement:**
```tsx
<Badge variant={confidence >= 90 ? 'success' : 'warning'}>
  {confidence >= 90 ? '🟢 Zeer betrouwbaar' : '🟡 Werkend'}
</Badge>
<p className="text-xs">
  Gebruikt: {usage_count} keer | Accuratie: {success_rate}%
</p>
```

---

### FASE 4: Self-Learning Loop

**Goal:** AI leert ZONDER user feedback (automated improvement)

**Triggers:**
1. **After Dataset Activation:**
   - Check if mapping resulted in valid supplier_products
   - If 95%+ rows successfully mapped → Auto-increase template confidence
   - If <80% rows mapped → Flag template for review

2. **Cross-Import Validation:**
   - Compare mapping A vs B for same supplier/brand
   - If both successful → Extract common patterns
   - Store in `mapping_patterns` table

3. **Anomaly Detection:**
   - If column "Barcode" suddenly maps to `style_code` (unusual) → Alert user
   - Suggest reverting to historical pattern

---

## 🎯 Success Metrics (KPIs)

### FASE 1A (Baseline)
- ✅ AI suggest button functional
- ✅ Feedback table capturing corrections
- ✅ Template confidence scores visible
- **Target:** 70% AI suggestions accepted without modification

### FASE 2 (Cross-Supplier Learning)
- **Target:** 85% AI suggestions accepted
- **Metric:** Average time to map: <5 minutes (was 30 min)

### FASE 3 (Confidence Evolution)
- **Target:** 90% AI suggestions accepted for templates used 10+ times
- **Metric:** Templates with 90%+ confidence: >50%

### FASE 4 (Self-Learning)
- **Target:** 95% AI suggestions accepted
- **Metric:** Zero-touch imports: 30% (no user corrections needed)

---

## 🚀 Implementatie Plan FASE 1A

### Week 1: Database & Backend
- ✅ Create `import_mapping_feedback` table
- ✅ Add `confidence_score` to `import_templates`
- ✅ Update `ai-suggest-mapping` Edge Function
- ✅ Add feedback recording endpoint

### Week 2: UI Components
- ✅ AI Suggest Button in MappingStep1Required
- ✅ AiMappingSuggestDialog component
- ✅ Feedback capture flow

### Week 3: Testing & Refinement
- ✅ Test with 5 different suppliers
- ✅ Measure acceptance rates
- ✅ Iterate on AI prompt based on results

---

## 📚 Referenties

- `docs/supplier-analysis/_supplier-field-library.md` - Mapping regels per leverancier
- `docs/supplier-analysis/_methodology.md` - Column analysis methodologie
- `docs/technical/import-architecture.md` - Import wizard flow
- `supabase/functions/ai-suggest-mapping/index.ts` - Huidige AI functie

---

**STATUS:** FASE 1A Ready for Implementation ✅

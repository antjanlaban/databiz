# Development Workflow

## 🔴 MANDATORY: README & DOCUMENTATION-FIRST APPROACH

**BEFORE implementing ANY feature, ALWAYS follow this sequence:**

### Step 0: Start with README.md
**EVERY development task must begin here:**

1. **Read `README.md` first** to understand:
   - Project purpose and context (it's a data transformation hub, NOT a product catalog)
   - Core integrations (Gripp, Calculated KMS, webshops)
   - Tech stack and architecture
   - Business domain (bedrijfskleding industry challenges)
   - Documentation structure and navigation

2. **Use README as navigation map** to find relevant documentation:
   - Business context → `/docs/business/`
   - Technical specs → `/docs/technical/`
   - Data rules → `/docs/data-model/`
   - Feature patterns → `/docs/vibe-coding/`

### Step 1: Identify Relevant Documentation
When user requests feature X, identify which docs to read:

**Authentication/Authorization:**
- `docs/technical/user-authorization.md` (magic link, roles, RLS policies)

**Database/Schema:**
- `docs/technical/database-schema.md` (ERD, tables, relationships)
- `docs/technical/architecture-overview.md` (system design)

**Import Functionality:**
- `docs/technical/import-architecture.md` (import engine design)
- `docs/data-model/mapping-templates.md` (column mappings)
- `docs/data-model/validation-rules.md` (data quality checks)
- `docs/technical/progressive-quality-ladder.md` (P0/P1/P2/P3 priorities, Field Groups)
- `docs/technical/field-group-validation.md` (Field Group validation patterns)

**Export/Sync Functionality:**
- `docs/technical/export-architecture.md` (export engine design)
- `docs/data-model/export-formats.md` (Gripp, Calculated, webshop formats)
- `docs/business/integration-partners.md` (external system specs)

**Product Management:**
- `docs/data-model/business-rules.md` (product rules, variants)
- `docs/data-model/validation-rules.md` (P0/P1/P2/P3 priorities, Field Groups)
- `docs/technical/progressive-quality-ladder.md` (quality score calculation)

**Component Patterns:**
- `docs/vibe-coding/component-patterns.md` (reusable patterns)
- `docs/vibe-coding/feature-templates.md` (CRUD, forms, wizards)

**Business Context:**
- `docs/business/domain-knowledge.md` (bedrijfskleding industry)
- `docs/business/business-requirements.md` (stakeholders, KPIs)

### Step 2: Read Documentation THOROUGHLY
✅ **ALWAYS:**
- Use `lov-view` to read ENTIRE relevant doc file(s)
- Read carefully - do NOT skim
- Note key patterns, rules, and constraints
- Check for related docs mentioned in the file

❌ **NEVER:**
- Assume patterns from general knowledge
- Skip this step "because it's simple"
- Code before reading docs
- Guess implementation details

### Step 3: Present Implementation Plan
**BEFORE writing ANY code, show user:**

```
📖 Documentation Review:
- Read: [list all docs you read]
- Key patterns found:
  • [Pattern 1: e.g., "Use has_role() security definer for authorization"]
  • [Pattern 2: e.g., "Store prices as integer cents, not floats"]
  • [Pattern 3: e.g., "Process imports server-side in Edge Functions"]

🎯 Implementation Plan:
1. [Step 1: e.g., "Create user_roles table with admin/user enum"]
2. [Step 2: e.g., "Add has_role() security definer function"]
3. [Step 3: e.g., "Update RLS policies to use has_role()"]
4. [Step 4: e.g., "Create useUserRole() hook with TanStack Query"]

⏸️ Waiting for your approval to proceed...
```

### Step 4: Only Code After Approval
**Wait for user to confirm:**
- "ga verder"
- "implement"
- "doe het"
- "ja"
- "correct"

**Then and only then:** Start implementing according to the plan.

---

## 📚 Documentation Structure Reference

```
docs/
├── business/
│   ├── business-requirements.md     # Stakeholders, KPIs, scope
│   ├── domain-knowledge.md          # 🔥 Bedrijfskleding industry context
│   ├── integration-partners.md      # 🔥 Gripp, Calculated, webshops specs
│   └── user-personas.md             # Owner vs Employee roles
│
├── technical/
│   ├── architecture-overview.md     # System design, tech stack
│   ├── database-schema.md           # 🔥 ERD, tables, relationships
│   ├── api-specification.md         # API contracts
│   ├── import-architecture.md       # 🔥 Import engine detailed design
│   ├── export-architecture.md       # 🔥 Export/sync detailed design
│   ├── user-authorization.md        # 🔥 RBAC, magic link, RLS policies
│   ├── progressive-quality-ladder.md # 🔥 P0/P1/P2/P3 priorities, Field Groups
│   └── field-group-validation.md    # 🔥 Field Group validation patterns
│
├── requirements/
│   ├── functional-requirements.md   # Feature specifications
│   ├── user-stories.md              # User scenarios
│   └── use-cases.md                 # Workflow descriptions
│
├── data-model/
│   ├── business-rules.md            # Product rules, variants logic
│   ├── validation-rules.md          # 🔥 P0/P1/P2/P3 priorities, Field Groups
│   ├── mapping-templates.md         # 🔥 Import column mapping specs
│   ├── export-formats.md            # 🔥 Gripp, Calculated formats
│   └── data-dictionary.md           # Field definitions
│
├── testing/
│   ├── test-strategy.md             # Testing approach
│   ├── test-cases.md                # Test scenarios
│   └── test-data.md                 # Sample datasets
│
├── ui-ux/
│   ├── design-system.md             # Styling, components
│   ├── user-flows.md                # Screen flows
│   └── wireframes.md                # UI mockups
│
└── vibe-coding/
    ├── development-workflow.md      # 👈 THIS FILE
    ├── component-patterns.md        # 🔥 Reusable component patterns
    ├── feature-templates.md         # 🔥 CRUD, wizard, form templates
    ├── prompts-library.md           # Example Lovable prompts
    └── lovable-prompt-library.md    # Additional prompt examples
```

**🔥 = Critical for implementation**

---

## 🚫 NEVER Do This

❌ **Code before reading documentation**
- "I know how auth works, I'll just implement it" → WRONG
- Always check project-specific patterns first

❌ **Assume standard patterns**
- "Everyone stores prices as floats" → WRONG (we use integer cents)
- "RLS policies use auth.uid() directly" → WRONG (we use has_role())

❌ **Skip documentation verification**
- "This is too simple to need docs" → WRONG
- Even "simple" features may have project-specific rules

❌ **Implement first, ask questions later**
- Always present plan and wait for approval

❌ **Only read one doc when multiple apply**
- Example: Import feature needs BOTH import-architecture.md AND validation-rules.md

---

## ✅ ALWAYS Do This

✅ **Start with README.md**
- Get full context before diving into specific docs

✅ **Read complete documentation files**
- Use `lov-view` to read entire files, not just summaries

✅ **Follow exact patterns from documentation**
- Don't improvise or "improve" documented patterns without discussing

✅ **Present plan before coding**
- Show what you learned from docs
- List your implementation steps
- Wait for approval

✅ **Ask clarifying questions if docs unclear**
- Better to ask than to guess

✅ **Reference docs in your implementation**
- Comment code with: "// Pattern from docs/technical/user-authorization.md"

---

## 🎯 Example Workflow: Adding Authentication

**❌ WRONG APPROACH:**
```
User: "Add authentication to the app"
AI: [immediately starts coding auth forms and Supabase setup]
```

**✅ CORRECT APPROACH:**
```
User: "Add authentication to the app"

AI: "I'll start by reading the authentication documentation."

[Reads README.md for context]
[Reads docs/technical/user-authorization.md]
[Reads docs/technical/database-schema.md for user_roles table]

AI: "📖 Documentation Review:
- Read: README.md, docs/technical/user-authorization.md, docs/technical/database-schema.md

Key patterns found:
• Magic link as primary authentication method (passwordless)
• Email + password as backup authentication
• user_roles table with admin/user enum
• has_role() security definer function for RLS policies
• useUserRole() hook using TanStack Query (NOT useState)
• requireAdmin() function for Edge Functions
• RLS policies use has_role(), not auth.uid() directly

🎯 Implementation Plan:
1. Create user_roles table with RLS policies
2. Create has_role() security definer function
3. Update existing RLS policies to use has_role()
4. Create auth pages with magic link + email/password
5. Create useUserRole() hook with TanStack Query
6. Add requireAdmin() utility for Edge Functions
7. Enable auto-confirm email in Supabase config

⏸️ Waiting for your approval to proceed..."

User: "ga verder"

AI: [Now implements according to plan]
```

---

## 🔍 Field Group Validation Workflow

### What are Field Groups?

**Field Groups** implement OR-logic for alternative fields. Different suppliers use different field names for the same concept (e.g., `supplier_color_code` OR `supplier_color_name` for color data).

### Priority Levels (P0/P1/P2/P3)

**P0 - Critical (Kritiek):**
- Required for system functioning
- Always validated, blocks import if missing
- Weight: 50 points per field
- Examples: `sku`, `name`, `tenant_id`

**P1 - Required (Verplicht):**
- Required for data quality
- Validated in Converteren phase (soft warning), blocks Promotie phase
- Weight: 20 points per field
- Examples: Color Group, Style Group, Size Group, Category

**P2 - Recommended (Aanbevolen):**
- Important for completeness
- Warnings only, doesn't block any phase
- Weight: 5 points per field
- Examples: `description`, `material`, `washing_instructions`

**P3 - Optional:**
- Nice to have
- No validation, quality bonus only
- Weight: 1 point per field
- Examples: `marketing_text`, `seo_keywords`

### Phase-Aware Validation

**Converteren Phase (Import):**
- P0: HARD ERROR (blocks import)
- P1 Field Groups: SOFT WARNING with OR-logic
- P2/P3: No validation

**Promotie Phase (To Master Catalog):**
- P0: HARD ERROR (blocks promotion)
- P1 Field Groups: HARD ERROR with OR-logic (blocks promotion)
- P2: SOFT WARNING
- P3: No validation

**Verrijken Phase (Enrichment):**
- All priorities validated
- P2/P3: Soft warnings for quality improvement

### Code Pattern: Field Group Validation

```typescript
// Pattern from docs/technical/field-group-validation.md

import { FieldGroup, ValidationPhase } from '@/types/field-groups';

// Define Field Group
const colorFieldGroup: FieldGroup = {
  groupId: 'color_group',
  groupName: 'Kleur',
  fields: [
    { name: 'supplier_color_code', priority: 'P1' },
    { name: 'supplier_color_name', priority: 'P1' }
  ],
  requiredForPhase: {
    converteren: false,  // Soft warning only
    promotie: true,      // Hard error - blocks promotion
    verrijken: true
  }
};

// Validate Field Group with OR-logic
function validateFieldGroup(
  fieldGroup: FieldGroup,
  record: Record<string, any>,
  phase: ValidationPhase
): ValidationResult {
  // Check if at least ONE field in group has a value
  const hasValue = fieldGroup.fields.some(field => 
    record[field.name] !== null && 
    record[field.name] !== undefined && 
    record[field.name] !== ''
  );

  if (!hasValue && fieldGroup.requiredForPhase[phase]) {
    return {
      isValid: false,
      error: {
        level: phase === 'converteren' ? 'warning' : 'error',
        message: `${fieldGroup.groupName}: Minimaal één veld verplicht: ${
          fieldGroup.fields.map(f => f.name).join(' OF ')
        }`
      }
    };
  }

  return { isValid: true };
}
```

### UI Pattern: Field Group Display

```typescript
// Show Field Group as single logical unit with OR-logic
<div className="field-group">
  <Badge variant={hasValue ? 'success' : 'warning'}>
    {fieldGroup.groupName} (P1)
  </Badge>
  <div className="field-options">
    {fieldGroup.fields.map(field => (
      <div key={field.name} className="field-option">
        <Checkbox checked={!!record[field.name]} />
        <span>{field.name}</span>
      </div>
    ))}
  </div>
  <p className="text-muted-foreground">
    Minimaal één veld verplicht
  </p>
</div>
```

### Quality Score Calculation

```typescript
// Pattern from docs/technical/progressive-quality-ladder.md

function calculateQualityScore(record: Record<string, any>): number {
  const weights = {
    P0: 50,  // Critical fields
    P1: 20,  // Required fields (including Field Groups)
    P2: 5,   // Recommended fields
    P3: 1    // Optional fields
  };

  let earnedPoints = 0;
  let maxPoints = 0;

  // For Field Groups: 1 group = 1 P1 field (even if multiple fields)
  fieldGroups.forEach(group => {
    maxPoints += weights.P1;
    const hasValue = group.fields.some(f => !!record[f.name]);
    if (hasValue) earnedPoints += weights.P1;
  });

  // For individual fields
  fields.forEach(field => {
    maxPoints += weights[field.priority];
    if (!!record[field.name]) earnedPoints += weights[field.priority];
  });

  return Math.round((earnedPoints / maxPoints) * 100);
}
```

### Testing Checklist for Field Groups

When implementing Field Group validation:

✅ **OR-logic works correctly:**
- Test: One field filled → validation passes
- Test: Multiple fields filled → validation passes
- Test: No fields filled → validation fails (in correct phase)

✅ **Phase-aware validation:**
- Test: Converteren phase → soft warning for missing P1 Field Groups
- Test: Promotie phase → hard error blocks promotion for missing P1 Field Groups
- Test: Verrijken phase → all validations active

✅ **Quality score calculation:**
- Test: Field Group counts as 1 P1 field (not multiple)
- Test: Partially filled Field Group = full P1 points
- Test: Empty Field Group = 0 P1 points

✅ **UI displays OR-logic clearly:**
- Shows "Field1 OF Field2 OF Field3"
- Highlights which fields have values
- Indicates "Minimaal één veld verplicht"

### Common Pitfalls

❌ **Counting Field Group fields individually:**
```typescript
// WRONG: Counts supplier_color_code and supplier_color_name as 2 separate P1 fields
maxPoints += weights.P1; // for supplier_color_code
maxPoints += weights.P1; // for supplier_color_name

// CORRECT: Field Group = 1 logical P1 field
maxPoints += weights.P1; // for entire Color Group
```

❌ **Validating with AND-logic instead of OR:**
```typescript
// WRONG: Requires ALL fields
const hasValue = group.fields.every(f => !!record[f.name]);

// CORRECT: Requires at least ONE field
const hasValue = group.fields.some(f => !!record[f.name]);
```

❌ **Same validation stringency across all phases:**
```typescript
// WRONG: Always hard error
if (!hasValue) return { isValid: false, error: 'Missing field' };

// CORRECT: Phase-aware stringency
if (!hasValue && group.requiredForPhase[phase]) {
  const level = phase === 'converteren' ? 'warning' : 'error';
  return { isValid: false, error: { level, message } };
}
```

---

## 📝 Lovable Prompting Best Practices

### Good Prompt Structure
```
Create [feature name] according to docs:

DOCUMENTATION REFERENCE:
- Based on: docs/technical/[relevant-doc].md
- Patterns to follow: [list key patterns]

REQUIREMENTS:
1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

TECHNICAL SPECS:
- Use shadcn/ui components: [list components]
- Database tables: [list tables]
- Edge Functions: [if applicable]
- Authorization: [admin/user requirements]

VALIDATION RULES (from docs/data-model/validation-rules.md):
- Priority levels: P0 (Critical), P1 (Required), P2 (Recommended), P3 (Optional)
- Field Groups: [list relevant groups - e.g., Color, Size, Style, EAN]
- Phase requirements: [Converteren / Promotie / Verrijken]
- [Additional specific rules]

BUSINESS RULES (from docs/data-model/business-rules.md):
- [Rule 1]
- [Rule 2]
```

### What Makes a Prompt Effective
✅ **Reference documentation:**
- "According to docs/technical/import-architecture.md..."

✅ **Be specific about patterns:**
- "Use has_role() security definer as shown in user-authorization.md"

✅ **List exact components:**
- "Use shadcn/ui Dialog, Stepper, Table, Progress"

✅ **Include validation/business rules:**
- "SKU must match regex /^[A-Z0-9-]+$/ per validation-rules.md"
- "Color Field Group (P1) requires at least ONE field: supplier_color_code OR supplier_color_name"

✅ **Mention authorization:**
- "Admin role required - check with requireAdmin() in Edge Function"

❌ **Vague requests:**
- "Make an import feature" (no context, no patterns)

❌ **Missing documentation reference:**
- "Add user management" (which docs? which patterns?)

---

## 🎓 Key Principles Summary

1. **README first, always** - Complete project context before diving into specific docs
2. **Documentation is the source of truth** - Not your general knowledge, not assumptions
3. **Read before coding** - No exceptions, even for "simple" features
4. **Plan before implementing** - Present plan, get approval, then code
5. **Follow exact patterns** - Don't improvise or "improve" without discussing
6. **Multiple docs for complex features** - Import = architecture + validation + mapping
7. **Reference docs in code** - Comment with source: "Pattern from [doc]"
8. **Ask when unclear** - Better to ask than to guess and rebuild

**When in doubt:** Read the docs, present a plan, wait for approval.

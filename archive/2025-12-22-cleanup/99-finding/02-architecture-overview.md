# Architecture Overview
**Van Kruiningen PIM System**

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui       │
│  - Import Wizard                                                 │
│  - Product Management                                            │
│  - Quality Dashboard                                             │
│  - Reference Data Management                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTPS/WebSocket
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                     SUPABASE LAYER                               │
│  ┌────────────────┬────────────────┬───────────────────────┐   │
│  │  PostgreSQL    │  Edge Functions │   Auth + Storage      │   │
│  │  - 50+ Tables  │  - 60+ Functions│   - RLS Policies      │   │
│  │  - RLS         │  - Deno Runtime │   - File Storage      │   │
│  │  - Functions   │  - AI Gateway   │   - Real-time         │   │
│  └────────────────┴────────────────┴───────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ AI Gateway API
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                     AI LAYER                                     │
│  Lovable AI Gateway → Google Gemini 2.5 Flash                   │
│  - Column Mapping Suggestions                                    │
│  - Product Enrichment                                            │
│  - Quality Scoring                                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Architectural Decisions

### 1. Single-Tenant Architecture

**Decision:** No multi-tenancy, no `tenant_id` columns.

**Rationale:**
- Internal use only (Van Kruiningen employees)
- Simpler codebase (no tenant filtering everywhere)
- Better performance (no extra WHERE clauses)
- Easier to maintain and debug

**Impact:**
- All database queries are simpler
- No tenant isolation needed
- Focus on role-based authorization instead

**Trade-offs:**
- Cannot be sold as SaaS without major refactor
- Single point of failure for all users
- No data isolation between departments

**Assessment:** ✅ Correct decision for internal tool

### 2. Role-Based Authorization (RBAC)

**Decision:** Two roles - `admin` and `user`

**Roles:**
| Role | Permissions |
|------|-------------|
| `admin` | Full CRUD, invite users, manage templates/categories, bulk operations |
| `user` | Read-only access to products, templates, reports |

**Implementation:**
- Roles stored in separate `user_roles` table
- Enforced at database level (RLS policies)
- Enforced at application level (React hooks)
- Enforced at Edge Function level (`requireAdmin`)

**Security Definer Pattern:**
```sql
CREATE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = role_name
  )
$$;
```

**Assessment:** ✅ Well-implemented, secure pattern

### 3. Progressive Quality Ladder

**Decision:** 4-tier quality system (P0/P1/P2/P3) instead of binary validation

**Priority Levels:**
| Priority | Label | Weight | Validation | Impact |
|----------|-------|--------|------------|--------|
| P0 | MVP | 50% | HARD BLOCK | Blocks import |
| P1 | Good | 30% | OPTIONAL | Warnings only |
| P2 | Better | 15% | OPTIONAL | Score only |
| P3 | Best | 5% | OPTIONAL | Bonus |

**Innovation:**
- Allows rapid import with minimal data (P0)
- Gradual enrichment over time
- Clear quality visibility
- Business-aligned field prioritization

**Assessment:** ✅ Innovative, solves real business problem

### 4. Client-Side Import Parsing

**Decision:** Parse Excel/CSV in browser, not in Edge Function

**Old Architecture (v2.0):**
```
Browser → Upload to Storage → Edge Function downloads → Parse → Insert
Problem: Timeouts, crashes on malformed CSV, 30-second limit
```

**New Architecture (v2.1+):**
```
Browser → Parse with Papa Parse (streaming) → Batch upload to Edge Function
Benefits: No timeouts, handles 100K+ rows, constant memory
```

**Performance Comparison:**
| File Size | v2.0 (Server) | v3.0 (Client) |
|-----------|---------------|---------------|
| 1 MB | ❌ Timeout | ✅ 10 sec |
| 10 MB | ❌ Crash | ✅ 60 sec |
| 100 MB | ❌ Never | ✅ 500 sec |

**Assessment:** ✅ Major improvement, correct architectural shift

### 5. Field Groups with OR-Logic

**Decision:** Allow alternative field names for same concept

**Problem:**
- Supplier A: Uses `color_name` field
- Supplier B: Uses `color_code` field
- System needs EITHER field to be valid

**Solution: Field Groups**
```sql
CREATE TABLE field_groups (
  id SERIAL PRIMARY KEY,
  group_key TEXT NOT NULL,
  priority TEXT NOT NULL, -- P0, P1, P2, P3
  validation_logic TEXT DEFAULT 'OR' -- OR, AND, XOR
);

CREATE TABLE field_group_members (
  group_id INTEGER REFERENCES field_groups(id),
  field_key TEXT NOT NULL
);
```

**Example:**
- Color Group: `supplier_color_name` OR `supplier_color_code`
- Style Group: `supplier_style_name` OR `supplier_style_code`
- Size Group: `supplier_size_code` OR `supplier_size_name`

**Assessment:** ✅ Elegant solution to real-world variability

### 6. AI-Powered Intelligence

**Decision:** Integrate Lovable AI for column mapping and enrichment

**AI Functions:**
1. **Column Mapping** (`ai-suggest-mapping`)
   - Analyzes 100 sample rows
   - Suggests optimal field mappings
   - Confidence scores 70-100%

2. **Product Enrichment** (`ai-enrich-product`)
   - Generates descriptions
   - Suggests categories
   - Improves metadata

3. **Batch Enrichment** (`batch-enrich-products`)
   - Process multiple products
   - Background job queue
   - Progress tracking

4. **Conversational AI** (Chat interface)
   - User: "Make description more professional"
   - AI: Generates improved text
   - Thumbs up/down feedback

**Model:** Google Gemini 2.5 Flash
**Temperature:** 0.3 (mapping) / 0.7 (enrichment)

**Assessment:** ✅ Well-integrated, adds significant value

---

## 📦 Component Architecture

### Frontend Layer

**Structure:**
```
src/
├── components/
│   ├── ai-engine/      (23 components)
│   ├── import/         (56 components)
│   ├── products/       (5 components)
│   ├── quality/        (8 components)
│   ├── reference-data/ (15 components)
│   └── ui/             (50 shadcn/ui components)
├── pages/              (33 pages)
├── hooks/              (57 custom hooks)
├── lib/                (29 utility files)
├── types/              (9 type definition files)
└── integrations/       (Supabase client)
```

**Key Patterns:**

1. **Custom Hooks for Logic**
```typescript
export function useImportWizard() {
  const [step, setStep] = useState(1);
  const [parsedRows, setParsedRows] = useState([]);
  // ... logic
  return { step, parsedRows, nextStep, prevStep };
}
```

2. **Compound Components**
```typescript
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>Title</DialogHeader>
    Content
  </DialogContent>
</Dialog>
```

3. **TanStack Query for Data**
```typescript
const { data: products, isLoading } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
});
```

**Assessment:** ✅ Well-organized, follows React best practices

### Backend Layer (Supabase Edge Functions)

**60+ Edge Functions:**

**Import Functions:**
- `parse-file-columns` - Extract columns from file
- `batch-insert-raw-staging` - Batch upload parsed data
- `execute-mapping` - Apply column mappings
- `activate-dataset` - Promote to active products

**AI Functions:**
- `ai-suggest-mapping` - Column mapping suggestions
- `ai-enrich-product` - Single product enrichment
- `batch-enrich-products` - Bulk enrichment
- `ai-suggest-brand-ean-prefix` - EAN prefix detection

**Quality Functions:**
- `analyze-dataset-quality` - Calculate quality score
- `calculate-dataset-completeness` - Field completeness
- `generate-quality-report` - Comprehensive report
- `predictive-quality-check` - Pre-import validation

**Management Functions:**
- `invite-user` - User invitation
- `activate-user` / `deactivate-user` - User management
- `cleanup-old-temp-data` - Automated maintenance
- `archive-old-errors` - Error log archiving

**Pattern:**
```typescript
// Standard Edge Function structure
Deno.serve(async (req) => {
  // 1. CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Authentication & Authorization
    const { user, supabase } = await requireAdmin(req);

    // 3. Request validation
    const { data } = await req.json();
    const validated = schema.parse(data);

    // 4. Business logic
    const result = await processData(validated);

    // 5. Response
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // 6. Error handling
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
```

**Assessment:** ✅ Consistent pattern, well-structured

### Database Layer

**PostgreSQL Schema:**
- **50+ Tables**
- **100+ Functions**
- **RLS Policies on all tables**
- **Materialized views for performance**

**Key Tables:**

**Product Data:**
- `supplier_products` - Raw supplier data
- `master_variants` - Normalized products
- `master_variant_colors` - Color variations
- `master_variant_skus` - Size variants

**Reference Data:**
- `brands`, `suppliers`
- `categories` - ALG taxonomy
- `color_families`, `color_options` - GS1 colors
- `clothing_types`, `international_sizes`
- `decoration_methods`, `decoration_positions`

**Import Infrastructure:**
- `import_jobs` - Import tracking
- `import_templates` - Reusable mappings
- `supplier_datasets` - Raw import data
- `import_job_errors` - Error tracking
- `import_job_errors_archive` - Error archiving (v3.0)

**Quality & AI:**
- `pim_field_definitions` - P0/P1/P2/P3 fields
- `field_groups` - OR-logic groups
- `enrichment_suggestions` - AI suggestions
- `data_quality_status` - Per-product quality

**Security:**
- `user_roles` - RBAC
- `user_invites` - Invitation system

**Assessment:** ✅ Well-designed, normalized schema

---

## 🔄 Data Flow Patterns

### 1. Import Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Edge Function
    participant Database
    participant AI Gateway

    User->>Browser: Upload Excel/CSV
    Browser->>Browser: Parse with Papa Parse (streaming)
    Browser->>Edge Function: Batch upload (100 rows)
    Edge Function->>Database: Insert to supplier_datasets
    Browser->>AI Gateway: Request column mappings
    AI Gateway-->>Browser: Return suggestions
    User->>Browser: Review/adjust mappings
    Browser->>Edge Function: Execute mapping
    Edge Function->>Database: Create products
    Database-->>User: Success + quality score
```

### 2. Quality Validation Flow

```mermaid
graph TD
    A[Import Data] --> B[Extract Fields]
    B --> C[Check Field Groups P0]
    C --> D{All P0 Satisfied?}
    D -->|No| E[BLOCK Import]
    D -->|Yes| F[Check Individual P0 Fields]
    F --> G{All P0 Fields Present?}
    G -->|No| E
    G -->|Yes| H[Calculate Quality Score]
    H --> I[Check P1/P2/P3]
    I --> J[Generate Warnings/Recommendations]
    J --> K[Allow Import]
```

### 3. AI Enrichment Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Edge Function
    participant Database
    participant AI

    User->>UI: Request enrichment for product
    UI->>Edge Function: POST /ai-enrich-product
    Edge Function->>Database: Fetch product data
    Database-->>Edge Function: Return data
    Edge Function->>AI: Generate enrichment
    AI-->>Edge Function: Return suggestion
    Edge Function->>Database: Insert enrichment_suggestion
    Database-->>UI: Return suggestion
    UI->>User: Display suggestion
    User->>UI: Accept/Reject
    UI->>Database: Update based on feedback
```

---

## 🔐 Security Architecture

### Multi-Layer Security

**Layer 1: Database (RLS Policies)**
```sql
-- Example: Product insert policy
CREATE POLICY "Admins can insert products"
  ON public.supplier_products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role('admin'));
```

**Layer 2: Application (React Hooks)**
```typescript
const { data: userRole } = useUserRole();
if (!userRole?.isAdmin) return <Unauthorized />;
```

**Layer 3: Edge Functions**
```typescript
const { user, supabase } = await requireAdmin(req);
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Admin
    participant System
    participant NewUser
    participant Database

    Admin->>System: Invite user (email + role)
    System->>Database: Create user_invites record
    System->>NewUser: Send email with invite link
    NewUser->>System: Click link + set password
    System->>Database: Create auth.users + user_roles
    NewUser->>System: Login with email/password
    System->>Database: Validate + fetch role
    System-->>NewUser: Authenticated session
```

**Assessment:** ✅ Defense in depth, well-implemented

---

## 📊 Scalability Considerations

### Current Capabilities

**Proven Scale:**
- ✅ 100,000+ rows per import
- ✅ 50+ concurrent users
- ✅ 1M+ products in database
- ✅ Constant memory usage (streaming)

**Performance Optimizations:**
- Indexed queries
- Materialized views
- Automated cleanup (cron jobs)
- Batch processing (100 rows per call)
- Backpressure control

### Scaling Limits

**Current Bottlenecks:**
1. **Database Connections**
   - Supabase connection limit: 500 connections
   - Current: ~20 active connections
   - Headroom: 25x growth

2. **Edge Function Concurrency**
   - Cold start: ~2-3 seconds
   - Warm instance: <100ms
   - Auto-scaling: Yes

3. **AI Gateway Rate Limits**
   - Current usage: ~1,000 requests/day
   - Rate limit: 10,000 requests/day
   - Headroom: 10x growth

**Scaling Strategy:**
- ✅ Horizontal: Add more Edge Function instances (auto-scaled)
- ✅ Vertical: Upgrade Supabase plan (more DB resources)
- ⚠️ Caching: Add Redis for frequently accessed data
- ⚠️ CDN: Offload media assets to CDN

**Assessment:** ✅ Can scale to 10x current usage without major changes

---

## 🎯 Architectural Strengths

1. ✅ **Modern Stack** - React 18, TypeScript, Supabase, AI
2. ✅ **Security-First** - Multi-layer authorization
3. ✅ **Scalable** - Handles 100K+ rows, auto-scaling
4. ✅ **Type-Safe** - 100% TypeScript coverage
5. ✅ **Well-Documented** - Exceptional documentation
6. ✅ **AI-Powered** - Smart mapping, enrichment
7. ✅ **Progressive** - Quality ladder allows gradual improvement

---

## ⚠️ Architectural Weaknesses

1. ❌ **No Testing** - Zero automated tests
2. ⚠️ **State Complexity** - Multiple overlapping state systems
3. ⚠️ **No Caching** - Relies only on TanStack Query
4. ⚠️ **Manual Deployments** - No CI/CD automation
5. ⚠️ **N+1 Queries** - Some inefficient database queries

---

## 📈 Architecture Evolution

**v1.0** (January 2025)
- Initial product management
- Basic stamdata
- User management

**v2.0** (January 2025)
- AI-powered import
- Quality scoring
- Template system

**v2.1** (January 2025)
- Client-side parsing
- Streaming mode
- No file size limit

**v3.0** (November 2025)
- Security hardening
- Automated cleanup
- Performance optimization

**Future (Planned):**
- v3.1: Testing framework
- v3.2: Export engine
- v4.0: Advanced analytics

**Assessment:** ✅ Rapid, well-managed evolution

---

## 🏁 Conclusion

The Van Kruiningen PIM architecture is **well-designed, modern, and scalable**. The key architectural decisions (single-tenant, progressive quality ladder, client-side parsing, AI integration) are all justified and well-executed.

**Strengths:**
- Modern tech stack
- Security-first design
- Scalable to 10x current usage
- AI-powered intelligence
- Exceptional documentation

**Improvement Areas:**
- Add automated testing
- Implement caching layer
- Optimize N+1 queries
- Automate deployments

**Overall Rating: 9/10** - Excellent architecture with minor optimization opportunities

---

*Next: [Database Analysis](./03-database-analysis.md)*


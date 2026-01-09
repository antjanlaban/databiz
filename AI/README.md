DataBiz – Project Requirements & AI Coding Instructions
Last updated: January 8, 2026
Project: DataBiz (Bedrijfskleding Import System)
Scope: Multi-tenant product import from supplier files (CSV/Excel)
Target Users: Van Kruiningen Reclame + future workwear organizations

## 📚 Belangrijke Documentatie voor AI Agents

**VOOR JE BEGINT MET CODE SCHRIJVEN, LEES DEZE DOCUMENTATIE:**

1. **[AI/Company/README.md](AI/Company/README.md)** - Project-specifieke context en richtlijnen voor DataBiz
   - Tech stack, omgevingen, architectuur
   - Agent richtlijnen (voorkom hallucinatie!)
   - Roadmap en prioriteiten
   - Success criteria

2. **[AI/Company/DESIGN_SYSTEM.md](AI/Company/DESIGN_SYSTEM.md)** - Design system voor UI development ⚠️ **VERPLICHT VOOR UI TASKS**
   - Design principles (Desktop-first, Dark mode only)
   - Component library (shadcn/ui framework)
   - Tone & voice (Nederlands voor UI)
   - **MUST**: Lees dit document VOOR elke UI component
   - **MUST**: Check shadcn/ui library eerst
   - **MUST**: Doorloop compliance checklist

3. **[AI/Company/CODE_QUALITY_STRATEGY.md](AI/Company/CODE_QUALITY_STRATEGY.md)** - Code quality patterns en standaarden ⚠️ **VERPLICHT VOOR CODE TASKS**
   - Code organization patterns
   - Error handling standards
   - Logging patterns
   - Type safety requirements
   - AI agent guidelines
   - **MUST**: Check dit document voor code patterns en consistentie

4. **[docs/README.md](../docs/README.md)** - Domain documentatie
   - Data-import domain model
   - ETL workflows
   - Test cases

**KRITISCH**: Agents moeten eerst `AI/Company/README.md` lezen voordat ze code schrijven. Dit voorkomt hallucinatie en zorgt voor focus op completion.

1. Project Vision
DataBiz is a supplier product import system for workwear organizations that:

Imports product data from supplier files (CSV, Excel, up to 50 MB, 15k+ rows, 36+ columns).

Centralizes EAN/GTIN master data globally (shared across all organizations).

Manages products per company with their own local settings (price, category, status).

Handles conflicts when suppliers provide duplicate or conflicting EAN data.

Tracks lineage – every product knows which import/supplier created or updated it.

Key Principle: Stability First
Import process must never lock up or lose data.

All supplier files stored server-side.

Comprehensive validation & error reporting.

2. Database Model – Immutable Truth
Central Stamdata (Shared Across All Tenants)
ean_catalog – Global EAN/Product Registry
text
id (UUID, PK)
ean_code (VARCHAR 14, UNIQUE globally)
global_name (VARCHAR 255) – e.g., "Safety Vest Orange"
global_brand (VARCHAR 100) – e.g., "Tricorp"
global_attributes (JSONB) – any additional metadata
created_at
updated_at
Purpose: Single source of truth for EAN data. All organizations reference this.

brands – Global Brand Registry
text
id (UUID, PK)
name (VARCHAR 255, UNIQUE)
normalized_name (VARCHAR 255)
metadata (JSONB)
created_at
Purpose: Centralized brand list (Tricorp, Dassy, etc.).

suppliers – Global Supplier Registry
text
id (UUID, PK)
name (VARCHAR 255, UNIQUE)
contact_info (TEXT)
metadata (JSONB)
created_at
updated_at
Purpose: One entry per supplier (Supplier A, Supplier B, etc.), shared across organizations.

Per-Tenant Data
companies – Tenants
text
id (UUID, PK)
name (VARCHAR 255)
created_at
Purpose: Each organization (Van Kruiningen, future clients) is a company.

company_suppliers – Which Suppliers Does This Company Use?
text
id (UUID, PK)
company_id (FK → companies)
supplier_id (FK → suppliers)
is_active (BOOLEAN)
company_supplier_code (VARCHAR 100) – e.g., "SUP-001"
created_at
Purpose: Company A uses Supplier X, Company B uses Supplier X and Y.

company_products – Products This Company Sells
text
id (UUID, PK)
company_id (FK → companies)
ean_id (FK → ean_catalog)
is_active (BOOLEAN)
local_name_override (VARCHAR 255)
local_price (DECIMAL)
local_category (VARCHAR 100)
local_tags (JSONB)
created_at
updated_at
Purpose: Company A's view of EAN 871...: price €15, category "Safety", etc.

Import Workflow Tables
import_sessions – One File = One Session
text
id (UUID, PK)
company_id (FK → companies)
supplier_id (FK → suppliers)
file_name (VARCHAR 255)
file_type (VARCHAR 10) – 'csv', 'xlsx'
file_hash (VARCHAR 64) – SHA256, prevent re-uploads
file_size_bytes (INT)
status (VARCHAR 20) – 'pending', 'validating', 'processed', 'failed'
error_message (TEXT)
total_rows_in_file (INT)
rows_with_ean (INT)
rows_imported (INT)
rows_rejected (INT)
uploaded_by_user_id (FK → users, nullable for now)
uploaded_at (TIMESTAMP)
processed_at (TIMESTAMP)
created_at
Purpose: Track each upload, status, and statistics.

import_raw_rows – All Rows From All Files
text
id (UUID, PK)
import_session_id (FK → import_sessions, CASCADE delete)
row_number_in_file (INT)
raw_data (JSONB) – **entire original row, all columns**
ean_gtin (VARCHAR 14, extracted from raw_data)
status (VARCHAR 20) – 'valid_with_ean', 'no_ean', 'invalid_ean', 'duplicate_ean'
validation_errors (TEXT[])
action (VARCHAR 20) – 'insert', 'update', 'skip', 'review'
action_notes (TEXT)
processed_at (TIMESTAMP)
created_at
Purpose: Immutable audit trail of everything suppliers gave us.

ean_conflicts – When a New Import Conflicts with Existing EAN
text
id (UUID, PK)
company_id (FK → companies)
ean_code (VARCHAR 14)
current_ean_catalog_id (FK → ean_catalog)
incoming_import_raw_row_id (FK → import_raw_rows)
conflict_type (VARCHAR 30) – 'duplicate_ean', 'ean_update', 'data_mismatch'
conflict_description (TEXT)
current_data (JSONB) – snapshot of current ean_catalog record
incoming_data (JSONB) – raw data from import row
status (VARCHAR 20) – 'pending', 'resolved', 'archived'
user_decision (VARCHAR 20) – 'keep_current', 'replace_with_new', 'merge', 'archive_old'
resolved_by_user_id (FK → users)
resolved_at (TIMESTAMP)
resolution_notes (TEXT)
created_at
Purpose: Queue of decisions needed before import is final.

ean_history – Version Control for EAN Catalog
text
id (UUID, PK)
ean_catalog_id (FK → ean_catalog)
change_type (VARCHAR 20) – 'created', 'updated', 'archived'
previous_values (JSONB)
new_values (JSONB)
triggered_by_import_session_id (FK → import_sessions)
triggered_by_import_raw_row_id (FK → import_raw_rows)
action_type (VARCHAR 30) – 'auto_import', 'user_decision', 'conflict_resolution'
action_note (TEXT)
created_by_user_id (FK → users)
created_at
Purpose: Full audit trail of every change to global EAN data.

3. Import Workflow – Detailed Process
Phase 1: Upload & Validation
User uploads file (CSV or Excel, max 50 MB).

Server checks:

File extension valid? (csv, xlsx only)

File size OK? (≤ 50 MB)

File hash already uploaded? (prevent duplicates)

Create import_sessions record with status pending.

Store file server-side (Supabase Storage or disk, your choice).

Phase 2: Parse & Extract
Parse file (CSV → PapaParse, Excel → ExcelJS).

For each row:

Extract all columns into raw_data (JSONB, untouched).

Look for EAN column (case-insensitive: ean, EAN, gtin, GTIN, barcode, etc.).

If found & valid (14 digits) → set ean_gtin.

If not found or invalid → set ean_gtin = NULL.

Validate required fields (trim whitespace, check for nulls).

Collect validation errors (but continue, don't stop).

Batch insert into import_raw_rows (500–1000 rows per insert).

Update import_sessions:

status = 'validating'

total_rows_in_file = X

rows_with_ean = Y

Phase 3: EAN Conflict Detection
For each row with valid EAN:

Check: does this EAN already exist in ean_catalog?

If NO: ready to import (mark row action = 'insert').

If YES: check ean_conflicts queue:

Is there an unresolved conflict for this EAN?

If unresolved: don't proceed, inform user.

If resolved: use resolution rule (keep old, replace, merge, etc.).

Create conflict records for all unresolved EAN duplicates.

Update import_sessions:

Count rows marked for import vs conflict.

Phase 4: User Conflict Resolution (if needed)
User navigates to "Pending Conflicts" page.

Shows:

EAN code.

Current data in ean_catalog.

Incoming data from import_raw_rows.

4 options: keep_current, replace_with_new, merge, archive_old.

User decides → update ean_conflicts.status = 'resolved', save decision.

Create ean_history record documenting the decision.

Phase 5: Final Import
For all resolved conflicts + non-conflicting EANs:

Insert or update ean_catalog record.

Insert company_products record (link company to that EAN).

Create ean_history entry.

Update import_sessions:

status = 'processed'

rows_imported = X

processed_at = NOW()

UI shows summary:

Total rows: X

Rows with EAN: Y

Successfully imported: Z

Conflicts pending user decision: W

Rows without EAN (skipped): V

4. UI Screens – Minimum Viable Set
1. Upload Screen (/upload)
File picker (CSV/Excel).

Supplier dropdown (choose who this import is from).

Upload button.

Progress bar.

Result summary (total rows, rows with EAN, conflicts count).

Link to conflicts page if needed.

2. Pending Conflicts (/conflicts)
List of unresolved EAN conflicts.

Side-by-side comparison: current vs incoming.

4 decision buttons per row.

Mark as resolved.

Audit trail (who decided what, when).

3. EAN Products List (/eans)
Full-text search by name, brand, EAN.

Filter by: supplier, brand, category, active/archived.

Paginate.

Click an EAN → detail view.

4. EAN Detail (/ean/:id)
Display ean_catalog data.

Show complete raw_data (JSON viewer).

Show ean_history (who changed what, when).

Show all company_products that use this EAN.

5. Import History (/imports)
List all import_sessions.

Status badge (pending, processing, completed, failed).

Statistics (rows, EANs, conflicts).

Click → detail view of that import.

6. Import Detail (/import/:id)
Full metadata of that import.

List all import_raw_rows for this session.

Filter/sort by status, EAN, validation errors.

5. What AI Agents CAN and CANNOT Do
✅ AI CAN
Generate SQL for these 8 tables + indexes + RLS policies.

Write Next.js API routes for upload, parsing, batch inserts.

Write React components for all 6 UI screens.

Write validation logic (file extension, size, EAN format).

Write conflict resolution logic.

Use Supabase JS client for queries.

❌ AI CANNOT
Add tables beyond the 8 defined above (no freelancing).

Change ean_catalog / brands / suppliers schema without explicit approval.

Implement authentication (not required yet).

Add npm packages without permission.

Use localStorage or browser storage (you said no localhost).

Make decisions on conflict resolution (user decides via UI).

6. Tech Stack
Next.js 15 (App Router, TypeScript).

Supabase (PostgreSQL, no local DB).

PapaParse (CSV parsing).

ExcelJS (Excel parsing).

Tailwind CSS (styling).

No external UI libraries (keep it simple).

7. Development Workflow

**BELANGRIJK**: Lees eerst `AI/Company/README.md` voor project context en agent richtlijnen!
**BELANGRIJK**: Check `AI/Company/CODE_QUALITY_STRATEGY.md` voor code quality patterns!

Setup
bash
# Clone locally
git clone https://github.com/antjanlaban/databiz.git
cd databiz

# Install
npm install

# Create .env.local with Supabase Dev credentials
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Run
npm run dev
Database
Open Supabase SQL Editor (DataBiz Dev project).

Copy entire requirements.md (section on schema).

Paste into SQL Editor.

Run.

Check Table Editor → all 8 tables exist.

Code Changes
In Cursor (or Codespaces):

1. **Read First**: `AI/Company/README.md`, `AI/Company/DESIGN_SYSTEM.md`, en `AI/Company/CODE_QUALITY_STRATEGY.md`
2. **For UI tasks**: MUST read `AI/Company/DESIGN_SYSTEM.md` and check shadcn/ui library first
3. **For Code tasks**: MUST read `AI/Company/CODE_QUALITY_STRATEGY.md` and follow patterns
4. **Design System Compliance**: MUST complete compliance checklist before writing UI code
5. **Code Quality Compliance**: MUST follow error handling, logging, and type safety patterns
6. Write prompt with explicit DO's and DON'Ts.
7. AI generates code (kleine incrementele stappen, focus op completion).
8. Review.
9. Test against running Supabase Dev.
10. Commit & push.

**Agent Workflow**: Zie `AI/Company/README.md` sectie "Agent Richtlijnen" voor kritische richtlijnen om hallucinatie te voorkomen.

**Design System Enforcement**: 
- ⚠️ **MUST**: Check `AI/Company/DESIGN_SYSTEM.md` voor elke UI component
- ⚠️ **MUST**: Use shadcn/ui components (geen custom zonder goedkeuring)
- ⚠️ **MUST**: Desktop-first (1440px minimum, geen responsive)
- ⚠️ **MUST**: Dark mode only (geen light mode code)
- ⚠️ **MUST**: Complete compliance checklist before proceeding

8. Example Prompt Template for AI
Use this template when asking AI to build something:

text
Context:
- Project: DataBiz (supplier product import system).
- Read FIRST: AI/Company/README.md (project context) and AI/Company/DESIGN_SYSTEM.md (UI patterns).
- This document (AI/README.md) contains database model and technical requirements.
- Stack: Next.js 15 + Supabase + shadcn/ui (Tailwind CSS + Radix UI).
- Supabase Dev is at [URL], anon key [KEY].

Task:
[Describe exactly what you want built: 1 screen, 1 API route, 1 schema change, etc.]

DO:
- Read AI/Company/README.md first for agent richtlijnen.
- **For UI tasks**: MUST read AI/Company/DESIGN_SYSTEM.md and check shadcn/ui library first.
- **For Code tasks**: MUST read AI/Company/CODE_QUALITY_STRATEGY.md and follow patterns.
- **Design System Compliance**: MUST complete compliance checklist before writing UI code.
- **Code Quality Compliance**: MUST follow error handling, logging, and type safety patterns from CODE_QUALITY_STRATEGY.md.
- Begin klein en duidelijk - voorkom hallucinatie.
- Focus op completion, niet grote features.
- Only modify files: [list specific files].
- Use the exact table/column names from this document.
- **MUST**: Use shadcn/ui components for UI (geen custom zonder goedkeuring).
- **MUST**: Desktop-first (1440px minimum, geen responsive code).
- **MUST**: Dark mode only (geen light mode code).
- **MUST**: Follow error response format from CODE_QUALITY_STRATEGY.md.
- **MUST**: Use structured logging (no console.log).
- Test against actual Supabase Dev after changes.
- Add error handling.

DON'T:
- Create new tables or change existing schema without approval.
- Add npm packages without permission.
- Use authentication (not required yet).
- Change UI components outside the scope.
- Build large features in one go - kleine incrementele stappen.
- **DON'T**: Write UI code without checking AI/Company/DESIGN_SYSTEM.md first.
- **DON'T**: Write code without checking AI/Company/CODE_QUALITY_STRATEGY.md first.
- **DON'T**: Create custom components without checking shadcn/ui first.
- **DON'T**: Add responsive/mobile code (desktop-only).
- **DON'T**: Add light mode code (dark mode only).
- **DON'T**: Use console.log (use structured logging).
- **DON'T**: Mix error response formats (follow CODE_QUALITY_STRATEGY.md).

Show me:
1. Brief summary of what you'll do (5 bullets).
2. Code changes (annotated).
3. Test steps (how to verify it works).
9. Important Rules
All data is truth: import_raw_rows is immutable. Every supplier row, exactly as given, is stored forever.

Central EAN: ean_catalog is one global registry. Avoid duplicates through conflict resolution.

Company context: Always filter by company_id. Don't show Company A's data to Company B.

Stability: Upload must never crash, lose data, or get stuck. Validate early, store everything, resolve conflicts asynchronously.

Audit trail: Every change to ean_catalog is recorded in ean_history. Every import is tracked in import_sessions + import_raw_rows.

10. Roadmap (Later Phases)
Phase 2: Per-tenant local product overrides (price, category, etc.).

Phase 3: Scheduled/automatic imports (cron jobs).

Phase 4: Brand management UI.

Phase 5: Export to external systems (PIM, webshops).

Phase 6: Multi-user authentication + role-based access.

End of requirements.md
# INTEGRATION RESEARCH: n8n Workflow Orchestration

## System Overview
n8n is a workflow automation tool that allows for visual orchestration of complex business logic. Integrating n8n with the Van Kruiningen PIM (Lovable/Supabase) enables complex background processing, connecting to external systems (Gripp, KMS, Webshops) without writing custom code for every integration, and handling long-running tasks.

## API Capabilities (n8n)
- **Auth Method:** API Key (for n8n API) / Webhook URLs (public or secured with header auth).
- **Protocol:** REST / Webhooks.
- **Rate Limits:** Dependent on self-hosted infrastructure or n8n cloud plan.
- **Data Formats:** JSON.

## Key Integration Points

### 1. Supabase → n8n (Triggers)
**Pattern:** Database Webhooks
**Mechanism:**
- Use Supabase Database Webhooks (via `pg_net` extension or Dashboard UI).
- Trigger on `INSERT`, `UPDATE`, or `DELETE` on specific tables (e.g., `import_jobs`, `export_queue`).
- **Payload:** Sends the `old_record` and `new_record` as JSON to n8n.

### 2. n8n → Supabase (Read/Write)
**Pattern:** Native n8n Supabase Node
**Mechanism:**
- n8n has a built-in Supabase node.
- **Auth:** Uses Supabase Project URL and Service Role Key (for backend ops).
- **Operations:** `Get`, `Create`, `Update`, `Delete`, `Execute SQL`.

### 3. Lovable (Frontend) → n8n
**Pattern:** Edge Function Proxy (Recommended)
**Mechanism:**
- **DO NOT** call n8n webhooks directly from React (CORS issues, security risks).
- **Flow:** Lovable UI → Supabase Edge Function (`trigger-workflow`) → n8n Webhook.
- **Benefit:** Edge Function handles Supabase Auth validation before triggering n8n.

### 4. n8n → Lovable (Real-time Feedback)
**Pattern:** Database State + Realtime
**Mechanism:**
- n8n does **not** push to frontend directly.
- n8n updates a record in Supabase (e.g., `UPDATE import_jobs SET status = 'COMPLETED'`).
- Supabase Realtime broadcasts this change to the Lovable client.

## Integration Patterns

### Pattern A: Async Job Processing (e.g., Import/Export)
1. **Lovable:** User clicks "Start Export".
2. **Supabase:** Inserts row into `export_jobs` table.
3. **Supabase Webhook:** Fires POST to n8n webhook.
4. **n8n:**
   - Fetches data from Supabase.
   - Transforms data.
   - Pushes to External API (Gripp/Shopify).
   - Updates `export_jobs` status to `COMPLETED` in Supabase.
5. **Lovable:** UI updates automatically via Realtime subscription.

### Pattern B: Scheduled Sync
1. **n8n:** Cron trigger runs every night.
2. **n8n:** Fetches updates from Gripp ERP.
3. **n8n:** Upserts data into Supabase `suppliers` table.

## Known Limitations & Risks
- ❌ **Security:** n8n Webhooks are public by default. Must implement Header Auth or use Edge Function proxy.
- ❌ **Latency:** Webhooks add a small delay compared to direct Edge Functions.
- ❌ **Error Handling:** If n8n fails, Supabase might not know. n8n must explicitly write error states back to the DB.

## Best Practices for Token & Cost Efficiency

To avoid excessive token usage (AI costs) and n8n execution costs, follow these guidelines:

### 1. Batching (Chunking) - **CRITICAL**
Instead of triggering a workflow for every single product (1,000 triggers = 1,000 executions), send data in batches.
*   **Pattern:** Frontend sends an array of IDs `[1, 2, ..., 100]` to the Edge Function.
*   **n8n:** Receives one JSON array. Uses the "Split In Batches" node to process them efficiently or sends the whole array to the AI model if the context window allows.
*   **Savings:** Reduces n8n executions by 99% and optimizes AI context usage (one prompt instruction for 50 items vs 50 instructions).

### 2. Delta Updates (Change Detection)
Only trigger AI/Workflows when relevant data actually changes.
*   **Mechanism:** In the Edge Function or Supabase Webhook, check if the relevant columns (e.g., `description`, `material`) have changed.
*   **Logic:** `IF old_record.description != new_record.description THEN trigger_n8n`.
*   **Savings:** Prevents re-processing unchanged products.

### 3. Lean Payloads (Minification)
When sending data to n8n (and subsequently to an AI model), send **only** what is needed.
*   **Bad:** Sending the full `supplier_product` record (50+ columns, timestamps, internal IDs).
*   **Good:** Sending `{ "id": 123, "name": "...", "desc": "..." }`.
*   **Savings:** Reduces input tokens for LLMs significantly.

### 4. Caching & Idempotency
Store the result of expensive operations (like AI descriptions) in Supabase and check before re-running.
*   **Pattern:** Check if `ai_description` is `NULL` or `outdated` before triggering the workflow.
*   **Savings:** Prevents accidental double-spending on tokens for the same content.

## Advice for Architect
- **Recommendation 1:** Use **Supabase Database Webhooks** for event-driven workflows to decouple the database from the orchestration logic.
- **Recommendation 2:** Use a **Proxy Edge Function** for any user-initiated workflows to ensure proper authentication.
- **Recommendation 3:** Create a dedicated `workflow_logs` table in Supabase where n8n writes execution results for audit trails.
- **Recommendation 4:** Use the **Service Role Key** in n8n credentials to bypass RLS, as n8n acts as a backend system.

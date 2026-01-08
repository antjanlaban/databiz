# Integration Research: Supabase & n8n Architecture

**Date:** 2025-05-22
**Author:** Integration Specialist Agent (GitHub Copilot)
**Target Audience:** Architect, Backend Developer, Frontend Developer

## 1. Executive Summary

This report outlines the architectural patterns for integrating **Supabase** (Backend) with **n8n** (Workflow Automation) to support the Van Kruiningen PIM system.

**Core Recommendation:**
- **Supabase → n8n:** Use **Database Webhooks** (via `pg_net` extension) to trigger n8n workflows asynchronously on data changes.
- **n8n → Supabase:** Use the native **n8n Supabase Node** for CRUD operations.
- **Lovable → n8n:** Route requests through **Supabase Edge Functions** to secure the n8n webhook URLs, rather than calling n8n directly from the client.
- **Real-time:** Rely on Supabase's native **Realtime** engine. n8n updates the database, and the frontend subscribes to those changes.

---

## 2. Integration Patterns

### 2.1. Supabase to n8n (Triggers)

**Requirement:** Trigger a workflow when a product is created, updated, or deleted.

#### ✅ Recommended Approach: Database Webhooks
Supabase uses the `pg_net` extension to make HTTP requests directly from the database.

1.  **Setup in n8n:**
    *   Create a **Webhook Node**.
    *   Method: `POST`.
    *   Authentication: Add a shared secret in the Header (e.g., `X-Webhook-Secret`).

2.  **Setup in Supabase:**
    *   Create a Database Webhook in the Supabase Dashboard (Database > Webhooks).
    *   **Event:** `INSERT`, `UPDATE`, or `DELETE` on specific tables (e.g., `products`).
    *   **URL:** The n8n Production Webhook URL.
    *   **Headers:** Add the `X-Webhook-Secret`.

**Why this is best:** It is asynchronous, reliable, and doesn't require maintaining a persistent connection (unlike the n8n "Postgres Trigger" node which can be unstable with connection poolers).

#### ⚠️ Alternative: Edge Functions
For complex logic (e.g., "only trigger if price changes by > 10%"), write a Supabase Edge Function that performs the check and *then* calls the n8n webhook.

---

### 2.2. n8n to Supabase (Read/Write)

**Requirement:** n8n needs to fetch product data, transform it, and write it back.

#### ✅ Recommended Approach: Native Supabase Node
n8n has a built-in **Supabase Node** that wraps the PostgREST API.

*   **Credentials:** Use the Supabase Project URL and **Service Role Key** (for admin access) or **Anon Key** (if respecting RLS, though Service Role is typical for backend automation).
*   **Operations:**
    *   `Get All`: Fetch rows with filtering.
    *   `Create`: Insert new rows.
    *   `Update`: Update existing rows by ID.
    *   `Execute Query`: Run raw SQL (use sparingly).

---

### 2.3. Lovable (Frontend) to n8n

**Requirement:** A user clicks "Start Import" in the UI, triggering an n8n workflow.

#### ❌ Direct Call (Not Recommended)
Calling n8n directly from React (`fetch('https://n8n.instance.com/webhook/...')`) exposes the webhook URL and potentially allows anyone to trigger your workflows.

#### ✅ Recommended Approach: Proxy via Edge Function
1.  **Lovable:** Calls a Supabase Edge Function: `supabase.functions.invoke('start-import')`.
2.  **Edge Function:**
    *   Validates the user's session (Auth).
    *   Checks permissions (RBAC).
    *   Calls the n8n Webhook URL privately using `fetch()`.
    *   Returns a `200 OK` to the frontend immediately ("Import started").

---

## 3. Authentication & Security

| Communication Path | Auth Mechanism | Security Measure |
| :--- | :--- | :--- |
| **Supabase → n8n** | Header Auth | Shared Secret (`X-Webhook-Secret`) configured in n8n Webhook node. |
| **n8n → Supabase** | API Key | **Service Role Key** (Bypasses RLS - use with care) or **Anon Key**. |
| **Frontend → n8n** | JWT (Supabase) | **Edge Function Proxy**. The frontend authenticates with Supabase; the Edge Function authenticates with n8n. |

**CORS Note:** If you *must* call n8n directly from the frontend, you must configure the **Allowed Origins (CORS)** setting in the n8n Webhook Node to include your Lovable URL.

---

## 4. Real-time Feedback Loop

**Requirement:** n8n processes a file and the UI updates a progress bar.

**Architecture:**
1.  **Lovable:** Subscribes to the `imports` table via Supabase Realtime.
    ```typescript
    supabase.channel('imports')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'imports' }, (payload) => {
        updateProgressBar(payload.new.progress);
      })
      .subscribe();
    ```
2.  **n8n:**
    *   Step 1: Process chunk of data.
    *   Step 2: Use **Supabase Node** to update the `imports` table (`progress = 10`, `progress = 20`, etc.).
3.  **Supabase:** Automatically broadcasts this change to the connected Lovable client.

**Conclusion:** n8n does *not* need to talk to the frontend directly. It simply updates the database state, and Supabase handles the real-time notification.

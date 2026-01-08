# 🐙 N8N Integration Strategy - DataBiz Next

> **Strategic Pivot:** December 21, 2025
> **Goal:** Reduce Backend Complexity & Prevent Hallucinations
> **Owner:** [N8N-EXPERT]

---

## 🎯 The "Thin Backend" Philosophy

We are shifting complex logic from Python code to n8n workflows. This reduces the cognitive load on the AI agents and simplifies the codebase.

### ✅ What goes to N8N?

1.  **Complex AI Chains:** Multi-step reasoning, LLM calls, RAG pipelines.
2.  **Data Enrichment:** Fetching data from external APIs, transforming it, and updating the DB.
3.  **Background Jobs:** Long-running processes (e.g., "Process Import CSV").
4.  **Orchestration:** Coordinating between multiple services.

### ❌ What stays in FastAPI (Backend)?

1.  **CRUD Operations:** Simple Create, Read, Update, Delete.
2.  **Authentication:** User login, token management (Identity Domain).
3.  **Database Models:** The Source of Truth (SQLAlchemy schemas).
4.  **API Contract:** The interface the Frontend talks to.

---

## 🛠️ Workflow Structure

### Directory Layout

We treat n8n workflows as code. They must be committed to the repo.

```
n8n/
├── workflows/           # JSON exports of workflows
│   ├── imports/        # Import processing flows
│   ├── enrichment/     # Data enrichment flows
│   └── ai/             # AI/LLM chains
├── credentials/         # Template for credentials (NO SECRETS!)
└── package.json         # Local n8n runner (via npm)
```

### Integration Pattern: Hybrid-Cloud (Recommended)

We run **N8N in Railway** (Cloud) while keeping **Backend/Frontend Local** (Dev).

**Why?**

1.  **Data Gravity:** N8N needs fast access to Postgres, MinIO, and Redis (all in Railway).
2.  **Stability:** Long-running jobs shouldn't die if you close your laptop.
3.  **Performance:** Processing large CSVs happens entirely within the Railway network.

**The Challenge:** How does Cloud N8N talk to Local Backend?
**The Solution:** Secure Tunnels (ngrok / cloudflared).

#### Workflow Flow

1.  **Frontend (Local)** triggers action.
2.  **Backend (Local)** sends webhook to **N8N (Railway)**.
    - URL: `https://n8n-production.up.railway.app/webhook/...`
    - _Works fine: Local -> Cloud is always open._
3.  **N8N (Railway)** processes data (talks to DB/MinIO internally).
4.  **N8N (Railway)** needs to notify Backend?
    - URL: `https://your-tunnel-url.ngrok.io/api/v1/callback`
    - _Requires Tunnel: Cloud -> Local needs a bridge._

### Railway Configuration (Source of Truth)

This configuration connects N8N to your existing `Postgres`, `Redis`, and `MinIO` services.

```json
{
  "service": {
    "name": "n8n",
    "variables": {
      "DB_TYPE": "postgresdb",
      "DB_POSTGRESDB_HOST": "${{Postgres.PGHOST}}",
      "DB_POSTGRESDB_PORT": "${{Postgres.PGPORT}}",
      "DB_POSTGRESDB_DATABASE": "${{Postgres.PGDATABASE}}",
      "DB_POSTGRESDB_USER": "${{Postgres.PGUSER}}",
      "DB_POSTGRESDB_PASSWORD": "${{Postgres.PGPASSWORD}}",

      "EXECUTIONS_MODE": "queue",
      "QUEUE_BULL_REDIS_HOST": "${{Redis.REDISHOST}}",
      "QUEUE_BULL_REDIS_PORT": "${{Redis.REDISPORT}}",
      "QUEUE_BULL_REDIS_PASSWORD": "${{Redis.REDIS_PASSWORD}}",
      "QUEUE_BULL_REDIS_USERNAME": "${{Redis.REDISUSER}}",

      "N8N_DEFAULT_BINARY_DATA_MODE": "s3",
      "N8N_S3_BUCKET_NAME": "n8n-data",
      "N8N_S3_ENDPOINT": "http://${{minio.RAILWAY_PRIVATE_DOMAIN}}:9000",
      "N8N_S3_ACCESS_KEY": "${{minio.MINIO_ROOT_USER}}",
      "N8N_S3_ACCESS_SECRET": "${{minio.MINIO_ROOT_PASSWORD}}",
      "N8N_S3_SSL": "false"
    }
  }
}
```

---

## 🤖 [N8N-EXPERT] Responsibilities

1.  **Visual Coding:** Create workflows that are self-documenting.
2.  **Error Handling:** Every workflow must have an Error Trigger node.
3.  **Version Control:** Export workflows to JSON and commit them.
4.  **Testing:** Verify webhook inputs and outputs.

---

## 🚨 Hallucination Prevention

By moving logic to n8n, we:

- **Isolate Complexity:** Agents don't need to understand 500 lines of Python logic; they just need to know the Webhook input/output.
- **Visual Debugging:** We can see exactly where a flow fails in the n8n UI.
- **Modular AI:** We can swap AI models in n8n without redeploying the backend.

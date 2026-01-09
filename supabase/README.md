# Supabase Setup - DataBiz

## ✅ Status: Volledig Operationeel

- ✅ CLI gekoppeld aan project (smpkbweozrkjalpceqwu)
- ✅ Database migrations werkend
- ✅ Tabellen: products, import_sessions, ean_conflicts

## 🔐 Credentials

Aanwezig in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://smpkbweozrkjalpceqwu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ACCESS_TOKEN=sbp_...  # Voor CLI
```

## 📝 Migrations

### Nieuwe migration maken
```bash
supabase migration new naam_van_migration
# Edit bestand in supabase/migrations/
supabase db push
```

### Bestaande migrations
```bash
supabase db push              # Push naar remote
supabase db pull              # Pull remote schema
supabase db diff              # Vergelijk local vs remote
```

## 📁 Structuur

```
supabase/
├── migrations/
│   └── 001_initial_schema.sql
└── README.md
```

## 🔧 Optionele Integraties

### VS Code Extension

**⚠️ Problemen met "Connection failed" foutmeldingen?**  
Zie [TROUBLESHOOTING_SUPABASE_EXTENSION.md](../docs/TROUBLESHOOTING_SUPABASE_EXTENSION.md) voor oplossingen.

**Configuratie (optioneel):**
```json
{
  "supabase.accessToken": "sbp_JOUW_TOKEN_HIER",
  "supabase.projectRef": "smpkbweozrkjalpceqwu"
}
```

**Automatische configuratie:**
```bash
node scripts/setup-supabase-extension.mjs
```
Dit script leest `SUPABASE_ACCESS_TOKEN` uit `.env.local` en configureert de extensie automatisch.

**Check configuratie:**
```bash
node scripts/configure-supabase-extension.mjs check
```

### MCP Server (AI Agents)
```bash
npm install -g @supabase/mcp-server-supabase
```

## 🔗 Links

- **Dashboard**: https://supabase.com/dashboard/project/smpkbweozrkjalpceqwu
- **SQL Editor**: https://supabase.com/dashboard/project/smpkbweozrkjalpceqwu/sql
- **CLI Docs**: https://supabase.com/docs/guides/cli

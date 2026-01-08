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
Settings JSON:
```json
{
  "supabase.accessToken": "sbp_a9dff715a046760db07d71155d264ed2b83fcc7f",
  "supabase.projectRef": "smpkbweozrkjalpceqwu"
}
```

### MCP Server (AI Agents)
```bash
npm install -g @supabase/mcp-server-supabase
```

## 🔗 Links

- **Dashboard**: https://supabase.com/dashboard/project/smpkbweozrkjalpceqwu
- **SQL Editor**: https://supabase.com/dashboard/project/smpkbweozrkjalpceqwu/sql
- **CLI Docs**: https://supabase.com/docs/guides/cli

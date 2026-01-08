# 🔍 Logging Quick Reference - DataBiz

> **Voor developers: Hoe logs effectief gebruiken tijdens development**

---

## ⚡ Snelle Start

### Servers starten + logs monitoren

```powershell
# Terminal 1: Start servers
Task: "🚀 Dev: Start All (Backend + Frontend)"

# Terminal 2: Monitor logs
npm run logs
```

**Of gebruik split terminal in VS Code:**

- `Ctrl+Shift+P` → "Run Task" → "🚀 Dev: Start All"
- `Ctrl+Shift+P` → "Run Task" → "📝 Logs: View Backend Logs"

---

## 📊 Log Viewer Commando's

```powershell
# Realtime logs (tail mode)
npm run logs

# Last 100 lines
node scripts/view-logs.js --lines 100

# List all log files
npm run logs:list

# Help
node scripts/view-logs.js --help
```

---

## 🎨 Log Kleuren Betekenis

| Kleur          | Level    | Wanneer                      |
| :------------- | :------- | :--------------------------- |
| 🔵 **Cyan**    | DEBUG    | Development debugging        |
| 🟢 **Green**   | INFO     | Normale operaties            |
| 🟡 **Yellow**  | WARNING  | Waarschuwing (niet critical) |
| 🔴 **Red**     | ERROR    | Errors (behandeld)           |
| 🟣 **Magenta** | CRITICAL | Critical errors (crash)      |

---

## 🔍 Logs Doorzoeken

### PowerShell Voorbeelden

```powershell
# Zoek naar ERROR in alle logs
Select-String -Path backend\logs\*.log -Pattern "ERROR"

# Zoek naar user login events
Select-String -Path backend\logs\*.log -Pattern "login"

# Filter op tijdstip
Select-String -Path backend\logs\databiz_*.log -Pattern "14:3[0-9]"

# Count errors per log file
Get-ChildItem backend\logs\*.log | ForEach-Object {
    $count = (Select-String -Path $_.FullName -Pattern "ERROR" -AllMatches).Count
    "$($_.Name): $count errors"
}

# Laatste N regels met ERROR
Get-Content backend\logs\databiz_20251220.log |
  Select-String "ERROR" |
  Select-Object -Last 10
```

---

## 📝 Logging in je Code

### Import logger

```python
from src.shared.logging_config import get_logger

logger = get_logger(__name__)
```

### Info logging

```python
# Simpel
logger.info("User logged in")

# Met variabelen
logger.info(f"Processing {count} items")

# Met context
logger.info(f"File uploaded: {filename}, size: {size_mb}MB")
```

### Error logging

```python
# Met exception info
try:
    risky_operation()
except Exception as e:
    logger.error(f"Operation failed: {e}", exc_info=True)

# Of gebruik helper
from src.shared.logging_config import log_error

try:
    process_payment(user_id, amount)
except Exception as e:
    log_error(
        error=e,
        context={"user_id": user_id, "amount": amount},
        request_id=request.state.request_id
    )
```

### Performance logging

```python
import time

start = time.time()
result = slow_operation()
duration_ms = (time.time() - start) * 1000

if duration_ms > 100:
    logger.warning(f"Slow operation: {operation_name} took {duration_ms:.1f}ms")
```

---

## 🎯 Wat te loggen?

### ✅ LOG WEL

```python
# User actions
logger.info(f"User {user_id} uploaded file: {filename}")

# Important state changes
logger.info(f"Dataset {dataset_id} status: {old_status} → {new_status}")

# Performance issues
logger.warning(f"Query took {duration}ms (expected <50ms)")

# Business logic decisions
logger.info(f"AI mapping confidence: {confidence}% - using {strategy}")

# Handled errors
logger.error(f"Failed to parse CSV: {e}")
```

### ❌ LOG NIET

```python
# Trivial info (gebruik DEBUG level)
logger.info("Entering function")  # ❌
logger.debug("Entering function")  # ✅

# Sensitive data
logger.info(f"Password: {password}")  # ❌ NEVER!
logger.info(f"Token: {token}")       # ❌ NEVER!

# Inside loops (te veel noise)
for item in items:
    logger.info(f"Processing {item}")  # ❌

# Gebruik in plaats:
logger.info(f"Processing {len(items)} items...")  # ✅
```

---

## 🔥 Debug Tips

### Backend niet start?

```powershell
# Check laatste errors in logs
Select-String -Path backend\logs\*.log -Pattern "ERROR" | Select-Object -Last 5

# Check database connection
Select-String -Path backend\logs\*.log -Pattern "database"

# Check migrations
Select-String -Path backend\logs\*.log -Pattern "migration"
```

### API call faalt?

```powershell
# Zoek request ID in logs
Select-String -Path backend\logs\*.log -Pattern "a1b2c3d4"

# Zoek endpoint
Select-String -Path backend\logs\*.log -Pattern "/api/v1/auth/login"

# Filter op status code
Select-String -Path backend\logs\*.log -Pattern "\[500\]|\[404\]|\[401\]"
```

### Performance problemen?

```powershell
# Zoek slow queries
Select-String -Path backend\logs\*.log -Pattern "Slow query"

# Zoek requests > 1 second
Select-String -Path backend\logs\*.log -Pattern "[0-9]{4,}\.[0-9]ms"

# Check request durations
Select-String -Path backend\logs\*.log -Pattern "←.*\[[0-9]+\].*ms"
```

---

## 📦 Log Bestanden Beheren

### Grote logs opruimen

```powershell
# Check totale grootte
Get-ChildItem backend\logs\*.log |
  Measure-Object -Property Length -Sum |
  Select-Object @{Name="TotalMB";Expression={$_.Sum / 1MB}}

# Verwijder logs ouder dan 7 dagen
Get-ChildItem backend\logs\*.log |
  Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} |
  Remove-Item

# Archiveer oude logs
Compress-Archive backend\logs\databiz_2025*.log -DestinationPath logs_archive_2025.zip
Remove-Item backend\logs\databiz_2025*.log
```

### Log rotatie (handmatig)

```powershell
# Bewaar alleen laatste 5 dagen
Get-ChildItem backend\logs\*.log |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 5 |
  Remove-Item
```

---

## 🆘 Troubleshooting

### "No log files found"

```powershell
# Backend moet gedraaid hebben
curl http://localhost:9000/health

# Check logs directory
Test-Path backend\logs

# Maak directory aan
New-Item -ItemType Directory -Path backend\logs -Force
```

### "Permission denied"

```powershell
# Check permissions
Get-Acl backend\logs

# Fix permissions (run as admin)
icacls backend\logs /grant Everyone:F
```

### Logs niet realtime

```powershell
# Python buffering issue - log viewer lost het op
# Maar voor debugging: check laatste 50 regels
Get-Content backend\logs\databiz_*.log -Tail 50
```

---

## 📚 Gerelateerd

- [Logging README](../backend/logs/README.md) - Uitgebreide documentatie
- [Logging Config](../backend/src/shared/logging_config.py) - Implementatie
- [Logging Middleware](../backend/src/shared/logging_middleware.py) - Request tracking

---

**TIP:** Bookmark deze pagina voor snelle referentie! 📌

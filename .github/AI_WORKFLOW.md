# AI Agent Workflow - MANDATORY

## The Rule

**Before ANY action or answer about system state:**

```bash
npm run preflight
```

**No exceptions. No shortcuts. No assumptions.**

---

## Common Scenarios

### Scenario 1: User wants to start dev server

```bash
# Step 1: ALWAYS check first
npm run preflight

# Step 2: Read the output
Dev Server: ✅ Running on :3000
# → Tell user: "Server already running on port 3000"

Dev Server: ⚠️  Not running
# → Start it: npm run dev
```

### Scenario 2: User asks "Does table X exist?"

```bash
# Step 1: ALWAYS check first
npm run preflight

# Step 2: Read output
Database: ✅ All tables exist
# → Answer: "Yes, preflight confirms products table exists"

Database: ⚠️  Missing tables: products
# → Answer: "No, table doesn't exist. Run: supabase db push"
```

### Scenario 3: User reports error on page

```bash
# Step 1: Check system state
npm run preflight

# Step 2: Ask for browser console output
# User must provide actual error message

# Step 3: Diagnose based on verified state + error message
```

---

## Scripts Available

```bash
npm run preflight     # Check everything (MANDATORY before actions)
npm run dev           # Auto preflight + start server
npm run dev:force     # Skip preflight (use only if you know what you're doing)
```

---

## What NOT to Do

❌ **Skip preflight**
```bash
# User: "Start server"
npm run dev  # WRONG! Check first with preflight
```

❌ **Make assumptions**
```
User: "Is Supabase connected?"
Answer: "Should be, credentials are in .env.local"  # WRONG!
```

❌ **Restart unnecessarily**
```bash
# Server already running
killall node && npm run dev  # WRONG! Check state first
```

---

## What TO Do

✅ **Always preflight first**
```bash
npm run preflight
# Read output
# Then decide action
```

✅ **Base answers on verification**
```
User: "Is Supabase connected?"
> npm run preflight
> Supabase: ✅ Connected
Answer: "Yes, preflight confirms Supabase is connected"
```

✅ **Smart decisions**
```bash
npm run preflight
# Server running? → Don't restart
# Server stopped? → Start it
# Supabase down? → Report issue, don't proceed
```

---

## Enforcement

This is not optional. The preflight check is:
- Built into npm scripts (runs automatically with `npm run dev`)
- Required before all system state answers
- Mandatory in copilot-instructions.md
- Your first action for ANY system-related task

**Follow this workflow. Always.**

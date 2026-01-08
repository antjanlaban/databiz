# Worktree Presentation Guide

> **Voor gebruikers die hun work willen tonen in een worktree.**

---

## 🎬 Wat kun je presenteren in een worktree?

| Wat | Hoe | Voorbeeld |
|-----|-----|-----------|
| **Source Code** | Open file in editor (syntax highlighting) | Show Identity models, API endpoints |
| **Tests** | Run in Test Explorer (VS Code) | Show pytest results, coverage |
| **Git History** | Use Source Control panel | Show commits, branches, diffs |
| **Documentation** | Open MD files (preview mode) | Show WORKTREE.md, slice definitions |
| **API Responses** | REST Client / Thunder Client | Hit endpoints, show JSON responses |
| **Frontend UI** | Dev server + browser | Run npm run dev, demo login flow |
| **Database Schema** | SQLAlchemy models + migrations | Show entity relationships |
| **Test Results** | Pytest output + coverage reports | Show pass/fail counts |

---

## 🚀 Worktree 1: Identity Testing

### Setup (eerste keer)
```powershell
cd C:\Users\Antjan\databiz-next__identity__testing

# Setup Python venv
python -m venv .venv
.\.venv\Scripts\activate
pip install -r ../databiz-next/backend/requirements.txt

# (Optional) Start backend server
cd backend
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 9000
```

### Wat te tonen
1. **WORKTREE.md** → Scope fence (welke paths mag je aanpassen)
2. **Backend Models** → `backend/src/domains/identity/models.py` (User, RefreshToken, etc.)
3. **API Endpoints** → `backend/src/domains/identity/user_management/routes.py`
4. **Tests** → Press `Ctrl+Shift+P` → "Test: Run All Tests" → Live pytest results
5. **Git Status** → Source Control panel → Show branches, commits, status

### Live Demo (Identity Flow)
```bash
# Terminal 1: Start backend
cd backend
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 9000

# Terminal 2 (in VS Code): Run identity tests
pytest backend/tests/domains/identity/ -v

# Or: Use REST Client extension to call endpoints manually
# POST http://localhost:9000/api/v1/auth/login
# JSON body: {"email": "admin@databiz.com", "password": "..."}
```

---

## 🚀 Worktree 2: Imports Testing

### Setup (eerste keer)
```powershell
cd C:\Users\Antjan\databiz-next__imports__testing

# Setup Python venv
python -m venv .venv
.\.venv\Scripts\activate
pip install -r ../databiz-next/backend/requirements.txt

# (Optional) Start backend server
cd backend
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 9000
```

### Wat te tonen
1. **WORKTREE.md** → Scope fence voor Imports domain
2. **Supplier Models** → `backend/src/domains/imports/models.py`
3. **File Upload Endpoints** → `backend/src/domains/imports/file_intake/routes.py`
4. **Tests** → Run imports tests with `Ctrl+Shift+P` → "Test: Run All Tests"
5. **Example Files** → Show CSV/XLSX files in `examples/suppliers/`

### Live Demo (Import Flow)
```bash
# Terminal 1: Start backend
cd backend
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 9000

# Terminal 2 (in VS Code): Run import tests
pytest backend/tests/domains/imports/ -v

# Or: Use REST Client to upload a file
# POST http://localhost:9000/api/v2/imports/files/upload
# Form data: file=<Tricorp - RoerdinkCatalog.csv>, supplier_id=<uuid>
```

---

## 📊 Test Explorer in VS Code

**Wat je kunt doen:**
- ✅ Run all tests (Ctrl+Shift+P → "Test: Run All Tests")
- ✅ Run single test file
- ✅ Run single test function
- ✅ View coverage % per file
- ✅ Debug failing tests (breakpoints)

**In VS Code:**
1. Click the **Flask icon** (Testing) in left sidebar
2. Browse test structure:
   ```
   backend/tests/
   ├─ domains/
   │  ├─ identity/
   │  │  ├─ test_*.py
   │  └─ imports/
   │     ├─ test_*.py
   ```
3. Click the play icon (▶️) to run

---

## 🌿 Git Operations in Worktree

**Source Control Panel (Ctrl+Shift+G):**
- See current branch (e.g., `feature/identity-testing`)
- View uncommitted changes
- Stage/commit/push changes
- View commit history

**Example:**
```bash
# In the worktree terminal
git status                           # See changes
git add -A                           # Stage all
git commit -m "feat: add identity endpoints"
git push origin feature/identity-testing
```

---

## 📝 REST Client Extension (for API Testing)

**Install**: VS Code Extensions → Search "REST Client" → Install

**Create a `.http` file** (e.g., `test.http`):
```http
### Login
POST http://localhost:9000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@databiz.com",
  "password": "SecurePass123"
}

### List Suppliers
GET http://localhost:9000/api/v2/imports/suppliers
Authorization: Bearer <token-from-login>

### Upload File
POST http://localhost:9000/api/v2/imports/files/upload
Authorization: Bearer <token>

< @file ../examples/suppliers/Tricorp - RoerdinkCatalog.csv
supplier_id: a0cea33c-a41e-4a2b-88a3-b8e6e7ab7603
```

Click the **"Send Request"** link above each request to execute it.

---

## 📈 Coverage Reports

**After running tests with coverage:**
```bash
pytest backend/tests/ --cov=backend/src --cov-report=html
```

**Open the HTML report:**
```powershell
Start-Process htmlcov/index.html
```

Shows:
- % coverage per module
- Which lines aren't tested
- Branch coverage

---

## 🔄 Multi-Window Workflow

**Keep both worktrees open side-by-side:**

1. **Window 1** (Identity Worktree):
   - Left: File explorer showing identity models
   - Right: Test Explorer running tests

2. **Window 2** (Imports Worktree):
   - Left: File explorer showing imports models
   - Right: Terminal running backend server

3. **Browser Window** (if using E2E):
   - Manual testing of login flow / upload flow
   - Or: Playwright tests (automated)

---

## 💡 Pro Tips

### Debugging
- Set breakpoints in Python code (click left margin)
- Run test with debugger: Right-click test → "Debug Test"
- Inspect variables, step through code

### Code Navigation
- `Ctrl+Click` on function/class → Jump to definition
- `Ctrl+Shift+F` → Search across entire worktree
- `Ctrl+P` → Quick file open

### Terminal Shortcuts
- `Ctrl+Shift+`` → New terminal
- `Ctrl+J` → Toggle terminal panel

---

## 🎯 Demo Checklist

Before presenting a worktree:

- [ ] Backend server running (`uvicorn` on port 9000)
- [ ] Python venv activated (`.\.venv\Scripts\activate`)
- [ ] Dependencies installed (`pip install -r backend/requirements.txt`)
- [ ] Docker containers running (`docker compose up -d` from main repo)
- [ ] Tests pass locally (`pytest backend/tests/ -v`)
- [ ] Git branch is clean or all changes committed
- [ ] REST Client extension installed (optional but recommended)

---

## 🚪 Clean Up

When done with a worktree:

```bash
# From main repo
git worktree list                    # See all worktrees
git worktree remove ../databiz-next__identity__testing
git worktree remove ../databiz-next__imports__testing
```

This removes the folders and branches.

---

**Last Updated**: December 17, 2025 | **Status**: Active

# Acceptance Test Report - DataBiz Next

**Datum:** 2025-12-18  
**Tester:** Antjan  
**Environment:** Staging (Railway + Cloudflare Pages)  
**Branch:** `staging`  
**Build:** 7677b402

## 🌐 Environment URLs

| Service          | URL                                                              |
| :--------------- | :--------------------------------------------------------------- |
| **Frontend**     | https://databiz-next.pages.dev/                                  |
| **Backend API**  | https://databiz-next-acceptance-production.up.railway.app        |
| **Health Check** | https://databiz-next-acceptance-production.up.railway.app/health |
| **API Docs**     | https://databiz-next-acceptance-production.up.railway.app/docs   |

---

## 📋 Test Categories

| #   | Category                    | Priority    | Status     |
| :-- | :-------------------------- | :---------- | :--------- |
| 1   | Infrastructure & Deployment | 🔴 Critical | ⏳ Pending |
| 2   | Authentication Flow         | 🔴 Critical | ⏳ Pending |
| 3   | User Management             | 🟡 High     | ⏳ Pending |
| 4   | File Upload (Imports)       | 🟡 High     | ⏳ Pending |
| 5   | Supplier Management         | 🟡 High     | ⏳ Pending |
| 6   | Dataset Lifecycle           | 🟢 Medium   | ⏳ Pending |
| 7   | Frontend UI/UX              | 🟢 Medium   | ⏳ Pending |
| 8   | Error Handling              | 🟡 High     | ⏳ Pending |

---

## 1. Infrastructure & Deployment

### 1.1 Health Check

- [ ] Backend `/health` endpoint returns 200
- [ ] Response contains `{"status": "healthy"}`

**URL:** https://databiz-next-staging.up.railway.app/health

**Result:**

```
Status:
Response:
```

### 1.2 API Documentation

- [ ] Swagger UI loads at `/docs`
- [ ] All endpoints listed

**URL:** https://databiz-next-staging.up.railway.app/docs

**Result:**

```
Status:
Notes:
```

### 1.3 Database Connection

- [ ] Seeded data present (18 suppliers)
- [ ] Migrations applied

**Check via:** Login and navigate to suppliers

---

## 2. Authentication Flow

### 2.1 Login (Happy Path)

- [ ] Valid credentials return access + refresh token
- [ ] User redirected to dashboard

**Test credentials:**

- Email: `admin@databiz.nl`
- Password: `admin123`

**URL:** https://databiz-next-staging.up.railway.app (frontend)

**Steps:**

1. Navigate to login page
2. Enter credentials
3. Click Login
4. Verify redirect to dashboard

**Result:**

```
Status:
Tokens received: Yes/No
Redirect: Yes/No
Notes:
```

### 2.2 Login (Invalid Credentials)

- [ ] Wrong password returns 401
- [ ] Error message shown to user

**Test:**

- Email: `admin@databiz.nl`
- Password: `wrongpassword`

**Result:**

```
Status:
Error message:
```

### 2.3 Token Refresh

- [ ] Refresh token works
- [ ] New access token issued

**Test:** Wait 15 mins or manually call `/api/v1/auth/refresh`

**Result:**

```
Status:
Notes:
```

### 2.4 Logout

- [ ] Logout clears tokens
- [ ] Redirect to login page

**Result:**

```
Status:
Notes:
```

---

## 3. User Management

### 3.1 List Users (Admin)

- [ ] GET /api/v1/identity/users returns user list
- [ ] Only accessible when logged in as admin

**Result:**

```
Status:
User count:
Notes:
```

### 3.2 Create User (Admin)

- [ ] POST creates new user
- [ ] Validation errors shown for invalid input

**Test data:**

```json
{
  "email": "test@databiz.nl",
  "name": "Test User",
  "role": "viewer"
}
```

**Result:**

```
Status:
Notes:
```

### 3.3 Invite User Flow

- [ ] Invite email sent (or logged)
- [ ] Accept invite page works
- [ ] Password can be set

**Result:**

```
Status:
Notes:
```

---

## 4. File Upload (Imports)

### 4.1 Upload CSV File

- [ ] File upload accepts CSV
- [ ] File stored in MinIO/storage
- [ ] Dataset created in database

**Test file:** Use `examples/gripp/producten_gripp.csv`

**Steps:**

1. Navigate to Imports page
2. Click "Upload"
3. Select CSV file
4. Verify upload success

**Result:**

```
Status:
File ID:
Columns detected:
Rows detected:
Notes:
```

### 4.2 Upload Invalid File

- [ ] Non-CSV rejected
- [ ] Error message shown

**Test:** Upload a `.txt` or `.exe` file

**Result:**

```
Status:
Error message:
```

### 4.3 Large File Handling

- [ ] Large CSV (1000+ rows) handles correctly
- [ ] No timeout

**Test file:** `examples/suppliers/FHB-Artikelstammdaten_v104.csv`

**Result:**

```
Status:
Processing time:
Notes:
```

---

## 5. Supplier Management

### 5.1 List Suppliers

- [ ] GET /api/v2/imports/suppliers returns list
- [ ] 18 seeded suppliers visible

**Result:**

```
Status:
Supplier count:
Sample suppliers:
Notes:
```

### 5.2 Supplier Dropdown in Upload

- [ ] Supplier dropdown populated
- [ ] Selection works

**Result:**

```
Status:
Notes:
```

---

## 6. Dataset Lifecycle

### 6.1 View Dataset Details

- [ ] Dataset list shows uploaded files
- [ ] Can click to view details

**Result:**

```
Status:
Notes:
```

### 6.2 Activate Dataset

- [ ] Activate button works
- [ ] Status changes to "active"

**Result:**

```
Status:
Notes:
```

### 6.3 Deactivate Dataset

- [ ] Deactivate button works
- [ ] Status changes to "inactive"

**Result:**

```
Status:
Notes:
```

---

## 7. Frontend UI/UX

### 7.1 Responsive Design

- [ ] Works on desktop (1920x1080)
- [ ] Works on tablet (768px)
- [ ] Works on mobile (375px)

**Result:**

```
Desktop:
Tablet:
Mobile:
Notes:
```

### 7.2 Navigation

- [ ] All menu links work
- [ ] Active page highlighted
- [ ] Logout in header works

**Result:**

```
Status:
Broken links:
Notes:
```

### 7.3 Loading States

- [ ] Spinners shown during API calls
- [ ] No blank screens

**Result:**

```
Status:
Notes:
```

---

## 8. Error Handling

### 8.1 Unauthenticated Access

- [ ] Protected routes redirect to login
- [ ] API returns 401 (not 403)

**Test:** Clear cookies, try accessing `/dashboard`

**Result:**

```
Status:
Redirect: Yes/No
API status code:
Notes:
```

### 8.2 Network Errors

- [ ] Graceful error when backend unreachable
- [ ] Retry option shown

**Test:** Disconnect network temporarily

**Result:**

```
Status:
Error message:
Notes:
```

### 8.3 Validation Errors

- [ ] Form validation messages shown
- [ ] Fields highlighted

**Test:** Submit empty forms

**Result:**

```
Status:
Notes:
```

---

## 📊 Summary

| Category            | Passed | Failed | Blocked | Total  |
| :------------------ | :----- | :----- | :------ | :----- |
| Infrastructure      |        |        |         | 3      |
| Authentication      |        |        |         | 4      |
| User Management     |        |        |         | 3      |
| File Upload         |        |        |         | 3      |
| Supplier Management |        |        |         | 2      |
| Dataset Lifecycle   |        |        |         | 3      |
| Frontend UI/UX      |        |        |         | 3      |
| Error Handling      |        |        |         | 3      |
| **TOTAL**           |        |        |         | **24** |

---

## 🐛 Bugs Found

| #   | Severity | Category | Description | Steps to Reproduce | Expected | Actual |
| :-- | :------- | :------- | :---------- | :----------------- | :------- | :----- |
| 1   |          |          |             |                    |          |        |
| 2   |          |          |             |                    |          |        |
| 3   |          |          |             |                    |          |        |

---

## 💡 Improvement Suggestions

| #   | Category | Suggestion | Priority |
| :-- | :------- | :--------- | :------- |
| 1   |          |            |          |
| 2   |          |            |          |
| 3   |          |            |          |

---

## ✅ Sign-off

- [ ] All critical tests passed
- [ ] No blocking bugs
- [ ] Ready for production promotion

**Tester:** ********\_********  
**Date:** ********\_********  
**Approved:** Yes / No

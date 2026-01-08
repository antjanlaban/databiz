# User Authorization Strategy

**Last Updated:** 17 oktober 2025  
**Version:** 2.0

---

## Overview

**Pattern:** Role-Based Access Control (RBAC)  
**Implementation:** PostgreSQL RLS + security definer functions  
**Why:** Single organization, need internal access control only

---

## Architecture

### Single-Tenant Model

```
PIM System
├── Users (employees only)
│   ├── Admin users (full access)
│   └── Regular users (read-only)
├── Products (shared across all users)
├── Suppliers (shared)
└── Categories (shared)
```

**No tenant isolation needed** - all users belong to same organization.

---

## Roles

### admin

**Permissions:**
- ✅ Full CRUD access to all data
- ✅ Invite new users
- ✅ Manage import templates
- ✅ Configure categories
- ✅ Manage user roles
- ✅ Bulk operations
- ✅ Delete operations

### user

**Permissions:**
- ✅ Read-only access to products
- ✅ Use existing import templates (read-only)
- ✅ View reports/exports
- ❌ Cannot modify data
- ❌ Cannot invite users
- ❌ Cannot delete

---

## Implementation

### 1. Database Level

#### user_roles table

```sql
-- Security-critical: separate from profiles
CREATE TYPE app_role AS ENUM ('admin', 'user');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

**Why separate table?**
- ✅ Prevents privilege escalation (users can't edit their own role)
- ✅ Clean separation of concerns
- ✅ Easier to audit role changes

#### Security Definer Function

```sql
-- Prevents RLS recursion issues
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

#### Row Level Security Policies

**Pattern applied to all core tables:**

```sql
-- Example: product_styles table
ALTER TABLE product_styles ENABLE ROW LEVEL SECURITY;

-- Read: Anyone authenticated
CREATE POLICY "read_access" ON product_styles
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: Admins only
CREATE POLICY "write_access" ON product_styles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
```

**Applied to tables:**
- product_styles
- color_variants
- product_skus
- price_history
- price_tiers
- categories
- import_templates
- decoration_options

---

### 2. Application Level

#### React Hook

```typescript
// hooks/use-user-role.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useUserRole() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    }
  });

  const { data: roleData } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      
      return data?.role;
    },
    enabled: !!user?.id
  });

  return {
    user,
    role: roleData,
    isAdmin: roleData === 'admin',
    isUser: roleData === 'user',
    isLoading: !roleData
  };
}
```

#### Conditional UI Rendering

```typescript
// components/products/product-actions.tsx
import { useUserRole } from '@/hooks/use-user-role';
import { Button } from '@/components/ui/button';

export function ProductActions({ productId }: { productId: number }) {
  const { isAdmin } = useUserRole();

  return (
    <div className="flex gap-2">
      <Button variant="outline">View</Button>
      
      {isAdmin && (
        <>
          <Button variant="default">Edit</Button>
          <Button variant="destructive">Delete</Button>
        </>
      )}
    </div>
  );
}
```

**⚠️ SECURITY WARNING:**
- UI conditional rendering is **UX only**, NOT security
- RLS policies enforce server-side
- Edge Functions MUST validate role
- NEVER rely on client-side role check alone

---

### 3. Edge Functions

#### Admin Check Pattern

```typescript
// supabase/functions/_shared/auth.ts
export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }

  // Check role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleData?.role !== 'admin') {
    throw new Error('Admin role required');
  }

  return user;
}
```

#### Usage in Edge Function

```typescript
// supabase/functions/import-products/index.ts
import { serve } from 'std/server';
import { requireAdmin } from '../_shared/auth.ts';

serve(async (req) => {
  try {
    // Require admin
    const user = await requireAdmin(req);

    const { file_path, template_id } = await req.json();

    // Process import
    // ...

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 403 }
    );
  }
});
```

---

## Invite System

### Flow

```
1. Admin enters email + role
   ↓
2. System creates user_invites record
   ↓
3. System sends magic link email
   ↓
4. New user clicks link
   ↓
5. Account activated with specified role
   ↓
6. User can login via:
   - Magic link (passwordless)
   - Email + password (after setting)
```

### Database Table

```sql
CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  invited_by UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  invite_token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invites_token ON user_invites(invite_token);
CREATE INDEX idx_invites_status ON user_invites(status);
```

### Edge Function: Invite User

```typescript
// supabase/functions/auth-invite/index.ts
serve(async (req) => {
  const admin = await requireAdmin(req);
  const { email, role } = await req.json();

  // Validate
  if (!email || !['admin', 'user'].includes(role)) {
    return new Response('Invalid input', { status: 400 });
  }

  // Create invite
  const { data: invite } = await supabase
    .from('user_invites')
    .insert({
      email,
      role,
      invited_by: admin.id
    })
    .select()
    .single();

  // Send magic link email
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      invite_id: invite.id
    }
  });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true, invite }));
});
```

### Edge Function: Accept Invite

```typescript
// supabase/functions/auth-accept-invite/index.ts
serve(async (req) => {
  const { invite_token, password } = await req.json();

  // Get invite
  const { data: invite } = await supabase
    .from('user_invites')
    .select('*')
    .eq('invite_token', invite_token)
    .eq('status', 'pending')
    .single();

  if (!invite || new Date(invite.expires_at) < new Date()) {
    return new Response('Invite invalid or expired', { status: 400 });
  }

  // Create user
  const { data: user } = await supabase.auth.admin.createUser({
    email: invite.email,
    password: password,
    email_confirm: true
  });

  // Assign role
  await supabase
    .from('user_roles')
    .insert({
      user_id: user.id,
      role: invite.role
    });

  // Mark invite accepted
  await supabase
    .from('user_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  return new Response(JSON.stringify({ success: true }));
});
```

---

## Authentication Methods

### 1. Magic Link (Passwordless)

```typescript
// Request magic link
const { error } = await supabase.auth.signInWithOtp({
  email: 'jan@vankruiningen.nl'
});

// User clicks link in email → automatically logged in
```

**Pros:**
- ✅ No password to remember
- ✅ More secure (no password leaks)
- ✅ Faster login

### 2. Email + Password

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'jan@vankruiningen.nl',
  password: 'secure-password'
});
```

**Pros:**
- ✅ Works offline
- ✅ Familiar pattern
- ✅ Backup when email unavailable

### 3. Change Password (In-App)

```typescript
// User can set/change password after login
const { error } = await supabase.auth.updateUser({
  password: 'new-secure-password'
});
```

---

## Testing Authorization

### Unit Tests

```typescript
// tests/authorization.test.ts
describe('Product Authorization', () => {
  it('admin can create product', async () => {
    const admin = await createTestUser('admin');
    const { data, error } = await supabase
      .from('product_styles')
      .insert({
        style_name: 'Test Product Admin',
        brand_id: 1
      });
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('user cannot create product', async () => {
    const user = await createTestUser('user');
    const { error } = await supabase
      .from('product_styles')
      .insert({
        style_name: 'Test Product User',
        brand_id: 1
      });
      });
    
    expect(error).toBeDefined();
    expect(error.message).toContain('permission denied');
  });

  it('user can read products', async () => {
    const user = await createTestUser('user');
    const { data, error } = await supabase
      .from('product_styles')
      .select('*')
      .limit(10);
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

### Manual Test Checklist

- [ ] Create admin user
- [ ] Admin can create/edit/delete products
- [ ] Create regular user
- [ ] Regular user can read products
- [ ] Regular user CANNOT edit products (gets permission error)
- [ ] Regular user CANNOT delete products
- [ ] Admin can invite new user
- [ ] Regular user CANNOT invite users
- [ ] Invited user receives email
- [ ] Invited user can activate account
- [ ] Role is correctly assigned

---

## Security Best Practices

### ✅ DO

- **Always** check role server-side (RLS + Edge Functions)
- **Always** use `has_role()` function in RLS policies
- **Always** validate user input
- **Always** log role changes for audit
- **Always** use security definer functions to prevent recursion

### ❌ DON'T

- **Never** trust client-provided role
- **Never** rely on UI conditional rendering for security
- **Never** bypass RLS in queries
- **Never** store role in JWT claims (use database)
- **Never** allow users to edit their own role

---

## Migration from Multi-Tenant

If converting existing multi-tenant system:

```sql
-- 1. Remove tenant_id columns
ALTER TABLE product_styles DROP COLUMN tenant_id;
ALTER TABLE color_variants DROP COLUMN tenant_id;
-- ... repeat for all tables

-- 2. Create user_roles table
CREATE TABLE user_roles (...);

-- 3. Assign roles to existing users
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email LIKE '%@vankruiningen.nl';

-- 4. Update RLS policies
DROP POLICY "tenant_isolation_select" ON product_styles;
CREATE POLICY "read_access" ON product_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_access" ON product_styles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
```

---

_Single-tenant with role-based access - simple, secure, fast._

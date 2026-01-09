# Identity Domain Model

## Bounded Context: Authentication & Authorization

### Domain Overview
Het Identity domein is verantwoordelijk voor gebruikersauthenticatie, autorisatie en gebruikersbeheer in DataBiz. Dit domein omvat het volledige proces van gebruikersuitnodigingen, wachtwoordbeheer, rolgebaseerde toegangscontrole (RBAC) en multi-tenant isolatie. Het domein integreert met Supabase Auth voor identity management en voegt application-specific data toe via user profiles.

### Core Domain Entities

#### 1. User (Aggregate Root)
**Identity**: `id` (UUID) - References `auth.users.id` from Supabase

**Attributes**:
- `email`: String - Uniek identificatiemiddel (inlognaam)
- `password`: String - Gehashed wachtwoord (managed by Supabase Auth)
- `profile`: UserProfile - Application-specific data

**Invariants**:
- Email moet uniek zijn in `auth.users`
- Wachtwoord moet minimaal 8 karakters lang zijn
- User moet een profile hebben om toegang te krijgen tot de applicatie
- Status moet `active` zijn om in te kunnen loggen

**Business Rules**:
1. Email is het unieke identificatiemiddel voor inloggen
2. Wachtwoord wordt gehashed en opgeslagen door Supabase Auth
3. User kan alleen inloggen als status `active` is
4. User profile wordt automatisch aangemaakt bij invite acceptatie

#### 2. UserProfile (Entity)
**Identity**: `id` (UUID) - FK naar `auth.users.id`

**Attributes**:
- `role`: Enum['admin', 'business_admin', 'worker'] - Rol van de gebruiker
- `company_id`: UUID (nullable) - FK naar `companies` (alleen voor business_admin en worker)
- `status`: Enum['pending_invite', 'active', 'inactive'] - Huidige status
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Complete Lifecycle States**:
```
pending_invite → active → inactive
     ↓              ↑
  (expired)      (reactivated)
```

**Status Transitions**:
- `pending_invite` → `active`: Gebruiker accepteert invite en stelt wachtwoord in
- `active` → `inactive`: Admin deactiveert gebruiker
- `inactive` → `active`: Admin reactiveert gebruiker

**Invariants**:
- `business_admin` en `worker` MOETEN een `company_id` hebben
- `admin` MOET GEEN `company_id` hebben (NULL)
- Status moet `active` zijn om in te kunnen loggen
- Profile wordt automatisch aangemaakt bij invite acceptatie

**Business Rules**:
1. Admin heeft geen company koppeling (platform-level)
2. Business Admin is gekoppeld aan 1 company
3. Worker is gekoppeld aan 1 company
4. Status wijzigingen kunnen alleen door Admin worden gedaan
5. Profile wordt verwijderd als user wordt verwijderd (CASCADE)

#### 3. Company (Entity)
**Identity**: `id` (UUID)

**Attributes**:
- `name`: String - Bedrijfsnaam (bijv. "Van Kruiningen Reclame")
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Invariants**:
- Name moet uniek zijn (business rule, niet database constraint)
- Company kan niet worden verwijderd als er actieve users zijn (soft delete in toekomst)

**Business Rules**:
1. Elke company is een aparte tenant
2. Business Admins en Workers zijn gekoppeld aan 1 company
3. Data isolatie gebeurt op company niveau
4. Admin kan alle companies zien en beheren

#### 4. UserInvite (Entity)
**Identity**: `id` (UUID)

**Attributes**:
- `email`: String - Emailadres van uitgenodigde gebruiker
- `token`: String(UUID) - Unieke invite token
- `role`: Enum['admin', 'business_admin', 'worker'] - Rol die toegekend wordt
- `company_id`: UUID (nullable) - FK naar `companies` (voor business_admin en worker)
- `created_by`: UUID - FK naar `auth.users` (wie heeft de uitnodiging gemaakt)
- `expires_at`: Timestamp - Verloopt 48 uur na creatie
- `accepted_at`: Timestamp (nullable) - Wanneer invite is geaccepteerd
- `status`: Enum['pending', 'accepted', 'expired'] - Huidige status
- `created_at`: Timestamp

**Complete Lifecycle States**:
```
pending → accepted
  ↓
expired
```

**Status Transitions**:
- `pending` → `accepted`: Gebruiker accepteert invite en stelt wachtwoord in
- `pending` → `expired`: 48 uur verstreken zonder acceptatie
- `expired` → `pending`: Nieuwe invite gegenereerd (regenerate)

**Invariants**:
- Token moet uniek zijn
- Email moet uniek zijn per pending invite (geen duplicate pending invites)
- Expires_at moet 48 uur na created_at zijn
- `business_admin` en `worker` MOETEN een `company_id` hebben
- `admin` MOET GEEN `company_id` hebben (NULL)
- Invite kan niet worden geaccepteerd als status niet `pending` is
- Invite kan niet worden geaccepteerd als expires_at is verstreken

**Business Rules**:
1. Invite tokens zijn cryptographically random UUIDs
2. Invites verlopen na 48 uur
3. Er kan maar 1 pending invite per email zijn
4. Email moet uniek zijn in `auth.users` (geen duplicate users)
5. Invite status wordt automatisch op `expired` gezet als expires_at is verstreken
6. Alleen Admin kan invites regenereren
7. Business Admin kan alleen workers aanmaken binnen eigen company
8. Admin kan business admins aanmaken voor elke company

### Domain Services

#### 1. InviteService (Domain Service)
**Responsibility**: Beheert het volledige invite lifecycle

**Operations**:
- `createInvite(input: CreateInviteInput, createdBy: string, creatorRole: InviteRole, creatorCompanyId: string | null): Promise<{ invite: UserInvite; inviteLink: string }>`
  - Valideert permissions (Admin kan business_admin, Business Admin kan worker)
  - Bepaalt company_id (auto voor worker, required voor business_admin)
  - Checkt of email al bestaat in auth.users
  - Checkt of er al een pending invite is
  - Genereert token (UUID)
  - Berekent expires_at (48 uur)
  - Maakt invite record aan
  - Genereert Supabase magic link
  - Retourneert invite en link

- `validateInvite(token: string): Promise<ValidateInviteResult>`
  - Haalt invite op via token
  - Checkt status (moet pending zijn)
  - Checkt expires_at (moet in toekomst zijn)
  - Markeert als expired als nodig
  - Retourneert validatie resultaat

- `acceptInvite(input: AcceptInviteInput): Promise<{ user: { id: string; email: string } }>`
  - Valideert invite (status, expires_at)
  - Maakt user aan in Supabase Auth
  - Maakt user_profile aan met role en company_id
  - Update invite status naar `accepted`
  - Retourneert user data

- `regenerateInvite(inviteId: string, createdBy: string): Promise<{ inviteLink: string }>`
  - Haalt bestaande invite op
  - Genereert nieuwe token
  - Update expires_at (48 uur vanaf nu)
  - Reset status naar `pending`
  - Genereert nieuwe Supabase magic link
  - Retourneert nieuwe link

- `listInvites(userId: string, userRole: InviteRole, userCompanyId: string | null): Promise<UserInvite[]>`
  - Filtert invites op basis van permissions
  - Admin ziet alle invites
  - Business Admin ziet alleen invites voor eigen company
  - Retourneert gefilterde lijst

**Business Rules**:
1. Alleen Admin kan business_admin invites aanmaken
2. Alleen Business Admin kan worker invites aanmaken
3. Company_id wordt automatisch ingevuld voor workers (van creator)
4. Email moet uniek zijn in auth.users
5. Er kan maar 1 pending invite per email zijn
6. Invites verlopen na 48 uur
7. Alleen Admin kan invites regenereren
8. Invite acceptatie creëert automatisch user en profile

#### 2. UserService (Domain Service)
**Responsibility**: Beheert user profiles en user management

**Operations**:
- `getUserProfile(userId: string): Promise<UserProfile | null>`
  - Haalt profile op via user ID
  - Retourneert null als niet gevonden

- `getUser(userId: string): Promise<User | null>`
  - Haalt profile op
  - Haalt email op uit auth.users
  - Combineert tot User object
  - Retourneert null als niet gevonden

- `listUsers(userId: string, userRole: InviteRole, userCompanyId: string | null): Promise<User[]>`
  - Filtert users op basis van permissions
  - Admin ziet alle users
  - Business Admin ziet alleen users in eigen company
  - Worker ziet alleen zichzelf
  - Haalt emails op uit auth.users voor alle profiles
  - Retourneert gefilterde lijst

- `updateUserStatus(targetUserId: string, status: UserStatus, currentUserId: string, currentUserRole: InviteRole): Promise<UserProfile>`
  - Valideert dat alleen Admin status kan wijzigen
  - Update status in database
  - Retourneert bijgewerkt profile

- `getCurrentUser(userId: string): Promise<User | null>`
  - Wrapper voor getUser
  - Retourneert huidige user

**Business Rules**:
1. Alleen Admin kan user status wijzigen
2. Users worden gefilterd op basis van rol en company
3. Business Admin ziet alleen eigen company users
4. Worker ziet alleen zichzelf
5. Admin ziet alle users

#### 3. AuthService (Domain Service)
**Responsibility**: Beheert authenticatie en sessies

**Operations**:
- `login(email: string, password: string): Promise<{ user: User; session: any }>`
  - Valideert credentials via Supabase Auth
  - Haalt user profile op
  - Checkt of status `active` is
  - Sign out als status niet active
  - Retourneert user en session

- `logout(): Promise<void>`
  - Sign out via Supabase Auth
  - Verwijdert session

- `getSession(): Promise<any | null>`
  - Haalt huidige session op
  - Retourneert null als geen session

- `getCurrentUser(): Promise<User | null>`
  - Haalt huidige user uit session
  - Retourneert null als niet ingelogd

- `getUserFromRequest(request: Request): Promise<User | null>`
  - Haalt token uit Authorization header
  - Valideert token via Supabase
  - Haalt user op
  - Retourneert null als niet geautoriseerd

**Business Rules**:
1. Login vereist actieve user (status = 'active')
2. Inactieve users kunnen niet inloggen
3. Session wordt beheerd door Supabase Auth
4. Logout verwijdert session
5. Token validatie gebeurt server-side

### Value Objects

#### InviteRole
**Type**: Enum
**Values**: `'admin'`, `'business_admin'`, `'worker'`

**Validation**:
- Moet een van de drie waarden zijn
- Case-sensitive

**Business Rules**:
- Admin: Platform-level, geen company koppeling
- Business Admin: Company-level, gekoppeld aan 1 company
- Worker: Company-level, gekoppeld aan 1 company

#### UserStatus
**Type**: Enum
**Values**: `'pending_invite'`, `'active'`, `'inactive'`

**Validation**:
- Moet een van de drie waarden zijn
- Case-sensitive

**Business Rules**:
- `pending_invite`: User heeft invite maar nog niet geaccepteerd
- `active`: User kan inloggen en applicatie gebruiken
- `inactive`: User is gedeactiveerd, kan niet inloggen

#### InviteStatus
**Type**: Enum
**Values**: `'pending'`, `'accepted'`, `'expired'`

**Validation**:
- Moet een van de drie waarden zijn
- Case-sensitive

**Business Rules**:
- `pending`: Invite is geldig en kan geaccepteerd worden
- `accepted`: Invite is geaccepteerd, kan niet opnieuw gebruikt worden
- `expired`: Invite is verlopen (48 uur), kan niet geaccepteerd worden

#### InviteToken
**Type**: String (UUID)
**Format**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Validation**:
- Moet valide UUID zijn
- Moet uniek zijn in database
- Cryptographically random

**Business Rules**:
- Token wordt gegenereerd bij invite creatie
- Token wordt gebruikt in invite link
- Token wordt gevalideerd bij acceptatie
- Token kan worden geregenereerd (nieuwe UUID)

#### Email
**Type**: String
**Format**: RFC 5322 email format

**Validation**:
- Moet valide email formaat zijn
- Moet uniek zijn in auth.users
- Case-insensitive voor vergelijking

**Business Rules**:
- Email is het unieke identificatiemiddel
- Email wordt gebruikt voor inloggen
- Email moet uniek zijn (geen duplicate users)

#### Password
**Type**: String
**Min Length**: 8 karakters

**Validation**:
- Minimaal 8 karakters lang
- Validatie gebeurt door Supabase Auth
- Wordt gehashed opgeslagen

**Business Rules**:
- Wachtwoord wordt gehashed door Supabase Auth
- Wachtwoord wordt nooit in plain text opgeslagen
- Wachtwoord recovery gebeurt via nieuwe invite (geen email service)

### Domain Events

#### UserInvitedEvent
**Triggered**: Wanneer invite wordt aangemaakt
**Payload**:
```typescript
{
  inviteId: UUID,
  email: string,
  role: InviteRole,
  companyId: UUID | null,
  createdBy: UUID,
  expiresAt: Timestamp,
  triggeredAt: Timestamp
}
```

#### InviteAcceptedEvent
**Triggered**: Wanneer gebruiker invite accepteert en wachtwoord instelt
**Payload**:
```typescript
{
  inviteId: UUID,
  userId: UUID,
  email: string,
  role: InviteRole,
  companyId: UUID | null,
  acceptedAt: Timestamp
}
```

#### InviteExpiredEvent
**Triggered**: Wanneer invite verloopt (48 uur)
**Payload**:
```typescript
{
  inviteId: UUID,
  email: string,
  expiredAt: Timestamp
}
```

#### UserLoggedInEvent
**Triggered**: Wanneer gebruiker succesvol inlogt
**Payload**:
```typescript
{
  userId: UUID,
  email: string,
  role: InviteRole,
  companyId: UUID | null,
  loggedInAt: Timestamp
}
```

#### UserLoggedOutEvent
**Triggered**: Wanneer gebruiker uitlogt
**Payload**:
```typescript
{
  userId: UUID,
  loggedOutAt: Timestamp
}
```

#### UserStatusChangedEvent
**Triggered**: Wanneer Admin user status wijzigt
**Payload**:
```typescript
{
  userId: UUID,
  oldStatus: UserStatus,
  newStatus: UserStatus,
  changedBy: UUID,
  changedAt: Timestamp
}
```

#### InviteRegeneratedEvent
**Triggered**: Wanneer Admin invite link opnieuw genereert
**Payload**:
```typescript
{
  inviteId: UUID,
  email: string,
  oldToken: UUID,
  newToken: UUID,
  regeneratedBy: UUID,
  regeneratedAt: Timestamp
}
```

### Repository Interfaces (Domain)

#### IUserProfileRepository
```typescript
interface IUserProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  create(profile: UserProfile): Promise<UserProfile>;
  update(profile: UserProfile): Promise<UserProfile>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
  findByCompany(companyId: string): Promise<UserProfile[]>;
  findByRole(role: InviteRole): Promise<UserProfile[]>;
  delete(id: string): Promise<void>;
}
```

#### IUserInviteRepository
```typescript
interface IUserInviteRepository {
  findById(id: string): Promise<UserInvite | null>;
  findByToken(token: string): Promise<UserInvite | null>;
  findByEmail(email: string): Promise<UserInvite[]>;
  findPendingByEmail(email: string): Promise<UserInvite | null>;
  create(invite: UserInvite): Promise<UserInvite>;
  update(invite: UserInvite): Promise<UserInvite>;
  updateStatus(id: string, status: InviteStatus, acceptedAt?: Timestamp): Promise<void>;
  findByCreator(createdBy: string): Promise<UserInvite[]>;
  findByCompany(companyId: string): Promise<UserInvite[]>;
  findExpired(): Promise<UserInvite[]>;
  delete(id: string): Promise<void>;
}
```

#### ICompanyRepository
```typescript
interface ICompanyRepository {
  findById(id: string): Promise<Company | null>;
  findByName(name: string): Promise<Company | null>;
  findAll(): Promise<Company[]>;
  create(company: Company): Promise<Company>;
  update(company: Company): Promise<Company>;
  delete(id: string): Promise<void>;
}
```

### Application Services (Domain)

#### InviteApplicationService
**Orchestrates**: Complete invite workflow
**Depends on**: 
- InviteService
- IUserInviteRepository
- ICompanyRepository
- Supabase Auth Admin API

**Use Cases**:
1. Create Business Admin Invite (Admin only)
   - Valideer dat creator Admin is
   - Valideer company bestaat
   - Maak invite aan
   - Genereer link
   - Retourneer link voor handmatige verzending

2. Create Worker Invite (Business Admin only)
   - Valideer dat creator Business Admin is
   - Auto-fill company_id van creator
   - Maak invite aan
   - Genereer link
   - Retourneer link voor handmatige verzending

3. Accept Invite
   - Valideer invite (status, expires_at)
   - Maak user aan in Supabase Auth
   - Maak profile aan
   - Update invite status
   - Auto-login gebruiker

4. Regenerate Invite (Admin only)
   - Valideer dat creator Admin is
   - Genereer nieuwe token
   - Update expires_at
   - Genereer nieuwe link
   - Retourneer nieuwe link

#### UserApplicationService
**Orchestrates**: User management operations
**Depends on**: 
- UserService
- IUserProfileRepository
- Supabase Auth Admin API

**Use Cases**:
1. List Users (Filtered by permissions)
   - Haal huidige user op
   - Filter op basis van rol en company
   - Retourneer gefilterde lijst

2. Get User Details
   - Valideer permissions
   - Haal user op
   - Retourneer user data

3. Update User Status (Admin only)
   - Valideer dat creator Admin is
   - Update status
   - Retourneer bijgewerkt profile

#### AuthApplicationService
**Orchestrates**: Authentication operations
**Depends on**: 
- AuthService
- UserService
- Supabase Auth

**Use Cases**:
1. Login
   - Valideer credentials
   - Check user status
   - Maak session aan
   - Retourneer user en session

2. Logout
   - Verwijder session
   - Retourneer success

3. Get Current User
   - Haal session op
   - Haal user op
   - Retourneer user data

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```
Admin (Level 3)
├── Kan Business Admin aanmaken
├── Kan alle companies zien
├── Kan alle users zien
├── Kan user status wijzigen
└── Geen company koppeling nodig

Business Admin (Level 2)
├── Gekoppeld aan 1 company
├── Kan Workers binnen eigen company aanmaken
├── Kan alleen users in eigen company zien
└── Kan alleen invites voor eigen company zien

Worker (Level 1)
├── Gekoppeld aan 1 company
├── Kan alleen eigen data zien
└── Geen user management rechten
```

#### Permission Matrix

| Operation | Admin | Business Admin | Worker |
|-----------|-------|---------------|--------|
| Create Business Admin Invite | ✅ | ❌ | ❌ |
| Create Worker Invite | ✅ | ✅ (own company) | ❌ |
| List All Users | ✅ | ❌ | ❌ |
| List Company Users | ✅ | ✅ (own company) | ❌ |
| View Own Profile | ✅ | ✅ | ✅ |
| Update User Status | ✅ | ❌ | ❌ |
| Regenerate Invite | ✅ | ❌ | ❌ |
| View All Companies | ✅ | ❌ | ❌ |
| View Own Company | ✅ | ✅ | ✅ |

### Multi-Tenant Isolation

#### Data Isolation Strategy
- **Company-based filtering**: Alle queries filteren op `company_id`
- **RLS Policies**: Row Level Security policies handhaven isolatie automatisch
- **Business Admin**: Ziet alleen data van eigen company
- **Worker**: Ziet alleen data van eigen company
- **Admin**: Ziet alle data (geen filtering)

#### RLS Policy Patterns

**User Profiles**:
```sql
-- Users can read own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Business admins can read company profiles
CREATE POLICY "Business admins can read company profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'business_admin'
      AND up.company_id = user_profiles.company_id
    )
  );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );
```

**User Invites**:
- Zelfde pattern als user_profiles
- Filtering op basis van creator of company_id

### Security Considerations

#### Authentication Security
- **Password Hashing**: Beheerd door Supabase Auth (bcrypt)
- **Password Requirements**: Minimaal 8 karakters (Supabase validatie)
- **Session Management**: Beheerd door Supabase Auth (JWT tokens)
- **Token Expiration**: Invite tokens verlopen na 48 uur
- **Token Regeneration**: Alleen Admin kan tokens regenereren

#### Authorization Security
- **Role-based Access**: Permissions gebaseerd op rol
- **Company Isolation**: Data isolatie via RLS policies
- **Permission Checks**: Server-side validatie in alle operations
- **Token Validation**: Alle API routes valideren tokens

#### Data Security
- **Service Role Key**: Alleen server-side gebruikt, nooit geëxposeerd
- **RLS Policies**: Automatische data isolatie op database niveau
- **Email Uniqueness**: Voorkomt duplicate accounts
- **Invite Token Security**: Cryptographically random UUIDs

#### Security Best Practices
1. Wachtwoorden worden nooit in plain text opgeslagen
2. Tokens worden server-side gevalideerd
3. Permissions worden altijd server-side gecheckt
4. RLS policies handhaven data isolatie
5. Service role key wordt nooit geëxposeerd aan client
6. Error messages zijn generiek (geen informatie leakage)

### Error Handling Strategy

#### Error Categories

**Authentication Errors**:
- Invalid credentials → 401 Unauthorized
- User not found → 401 Unauthorized (generieke message)
- User inactive → 401 Unauthorized (generieke message)
- **Action**: Sign out user, retourneer generieke error

**Authorization Errors**:
- Insufficient permissions → 403 Forbidden
- Wrong company access → 403 Forbidden
- **Action**: Retourneer duidelijke error message

**Validation Errors**:
- Invalid email format → 400 Bad Request
- Password too short → 400 Bad Request
- Missing required fields → 400 Bad Request
- **Action**: Retourneer specifieke validation errors

**Business Logic Errors**:
- Email already exists → 400 Bad Request
- Pending invite exists → 400 Bad Request
- Invite expired → 400 Bad Request
- Invite already accepted → 400 Bad Request
- **Action**: Retourneer duidelijke business error

**System Errors**:
- Database errors → 500 Internal Server Error
- Supabase API errors → 500 Internal Server Error
- **Action**: Log error, retourneer generieke error

#### Error Recovery

**Retry Strategy**:
- Invite acceptatie kan opnieuw geprobeerd worden (als invite nog geldig is)
- Login kan opnieuw geprobeerd worden
- Geen automatische retries (prevent abuse)

**Error Logging**:
- Alle errors worden gelogd met context
- Sensitive data wordt niet gelogd
- Error messages zijn user-friendly

### Transaction Boundaries

#### Transaction 1: Create Invite
- **Scope**: Insert invite record + generate Supabase link
- **Isolation**: Read committed
- **Rollback**: Als link generatie faalt, verwijder invite record
- **Commit**: Na succesvolle link generatie

#### Transaction 2: Accept Invite
- **Scope**: Create user in auth.users + create profile + update invite
- **Isolation**: Read committed
- **Rollback**: Als profile creatie faalt, verwijder user
- **Commit**: Na succesvolle profile creatie en invite update

#### Transaction 3: Login
- **Scope**: Validate credentials + check status + create session
- **Isolation**: Read committed
- **Rollback**: Als status check faalt, sign out
- **Commit**: Na succesvolle login

#### Transaction 4: Update User Status
- **Scope**: Update profile status
- **Isolation**: Read committed
- **Rollback**: Bij database error
- **Commit**: Na succesvolle update

### Business Rules Summary

1. **User Management**:
   - Email is uniek identificatiemiddel
   - Wachtwoord minimaal 8 karakters
   - User moet actief zijn om in te kunnen loggen
   - Profile wordt automatisch aangemaakt bij invite acceptatie

2. **Invite Management**:
   - Invites verlopen na 48 uur
   - Er kan maar 1 pending invite per email zijn
   - Email moet uniek zijn in auth.users
   - Alleen Admin kan business_admin invites aanmaken
   - Alleen Business Admin kan worker invites aanmaken

3. **Role-Based Access**:
   - Admin: Platform-level, alle permissions
   - Business Admin: Company-level, eigen company management
   - Worker: Company-level, alleen eigen data

4. **Company Isolation**:
   - Business Admin en Worker zijn gekoppeld aan 1 company
   - Data wordt gefilterd op company_id
   - RLS policies handhaven isolatie automatisch
   - Admin ziet alle data

5. **Password Recovery**:
   - Geen automatische password reset (geen email service)
   - Recovery gebeurt via nieuwe invite door Admin
   - Oude invite wordt geannuleerd bij regeneratie

### Integration Points

#### Supabase Auth Integration
- **Identity Management**: `auth.users` tabel (Supabase managed)
- **Password Hashing**: Beheerd door Supabase Auth
- **Session Management**: JWT tokens via Supabase Auth
- **Magic Links**: `admin.generateLink()` voor invite links
- **User Creation**: `admin.createUser()` bij invite acceptatie
- **Login**: `signInWithPassword()` voor authenticatie

#### Database Integration
- **User Profiles**: `user_profiles` tabel (application data)
- **User Invites**: `user_invites` tabel (invite management)
- **Companies**: `companies` tabel (multi-tenant)
- **RLS Policies**: Automatische data isolatie

### Future Enhancements

- **Email Service Integration**: Automatische email verzending voor invites
- **Password Reset Flow**: Self-service password reset via email
- **Two-Factor Authentication**: 2FA voor extra beveiliging
- **Audit Logging**: Track alle user management acties
- **Soft Delete**: Archive users in plaats van hard delete
- **Bulk Operations**: Bulk user management (import/export)
- **User Preferences**: User settings en preferences
- **Session Management**: View en revoke actieve sessions
- **Rate Limiting**: Prevent brute force attacks
- **Account Lockout**: Lock account na X failed login attempts

### Conventies

- **Domain Entities**: PascalCase (User, UserProfile, UserInvite, Company)
- **Value Objects**: PascalCase (InviteRole, UserStatus, InviteStatus, InviteToken, Email, Password)
- **Domain Services**: PascalCase (InviteService, UserService, AuthService)
- **Status Values**: snake_case ('pending_invite', 'active', 'inactive', 'pending', 'accepted', 'expired')
- **Role Values**: snake_case ('admin', 'business_admin', 'worker')
- **API Routes**: kebab-case ('/api/auth/login', '/api/auth/invites')
- **UI Labels**: Nederlands (vriendelijk, netjes informeel)


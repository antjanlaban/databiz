# DataBiz Implementation Details

## Architecture Overview

DataBiz is a TypeScript Next.js application built with the App Router pattern, designed for importing and managing supplier product data from CSV and Excel files.

## Core Components

### 1. File Upload System (`app/upload/page.tsx`)
- Accepts CSV and Excel files
- Parses files using PapaParse (CSV) and SheetJS (Excel)
- Validates data format and required fields
- Creates import sessions for tracking
- Detects duplicate EANs and creates conflict records
- Inserts new products directly into the database

### 2. Import Sessions (`app/sessions/page.tsx`)
- Displays all import sessions in reverse chronological order
- Shows status, processed rows, and conflicts count
- Links to conflicts resolution page when conflicts exist
- Color-coded status indicators

### 3. EAN Conflicts Resolution (`app/conflicts/page.tsx`)
- Lists all unresolved EAN conflicts
- Shows side-by-side comparison of existing vs new product data
- Provides three resolution options:
  - **Keep Existing**: Mark as resolved without changes
  - **Use New**: Update product with new data
  - **Skip**: Mark as resolved without action
- Real-time UI updates as conflicts are resolved

### 4. Active EANs Listing (`app/eans/page.tsx`)
- Displays all products in the database
- Search functionality across EAN, name, and supplier
- Pagination (20 items per page)
- Shows last updated date

## Technical Decisions

### Database Design
- **products**: Main table storing product data with unique EAN constraint
- **import_sessions**: Tracks each import with metadata
- **ean_conflicts**: Stores conflicts with JSONB fields for flexible data structure

### Type Safety
- TypeScript interfaces for all database entities
- Type-safe Supabase client (with runtime fallbacks)
- Proper error handling with typed errors

### Client-Side Architecture
- All data pages use `'use client'` directive for dynamic rendering
- `force-dynamic` export to prevent static generation
- Supabase client initialized on client-side only

### File Parsing
- Supports both lowercase and capitalized column names
- ExcelJS for secure Excel file parsing (replaces vulnerable xlsx package)
- Validates required fields before insertion
- Collects errors without stopping the entire import
- Trims whitespace from string values

### Error Handling
- User-friendly error messages in UI
- Proper TypeScript error type checking
- Graceful degradation when Supabase is not configured

## Security Considerations

### Addressed Vulnerabilities
1. **Excel Parsing**: Replaced vulnerable xlsx package with secure ExcelJS library
   - No known vulnerabilities in ExcelJS 4.4.0
   - Better maintained and more feature-rich

2. **No Authentication**: Currently, the application has no authentication
   - Mitigation: This is intentional per requirements
   - Future: Implement Supabase Auth or similar

3. **No Input Sanitization**: Product data is stored as-is
   - Mitigation: Basic validation on required fields
   - Future: Add XSS prevention and data sanitization

### Best Practices Implemented
- Environment variables for sensitive credentials
- Row Level Security (RLS) enabled in Supabase
- Client-side only database access
- TypeScript for type safety

## UI/UX Design

### Design Principles
- **Minimal**: Clean, simple component structure without design system
- **Functional**: Focus on core import workflow
- **Responsive**: Tailwind CSS for mobile-friendly layout
- **Accessible**: Semantic HTML and proper ARIA labels

### Component Library
- **Button**: Three variants (primary, secondary, danger)
- **Card**: Container with consistent padding and shadow
- **Table**: Responsive table with proper headers
- **Navigation**: Persistent top navigation

## Performance Optimizations

1. **Pagination**: 20 items per page on EANs listing
2. **Indexed Database**: Indexes on frequently queried columns
3. **Efficient Queries**: Select only needed columns
4. **Client-side Filtering**: Search without additional database queries

## Testing & Development

### Build Process
```bash
npm run dev    # Development server
npm run build  # Production build
npm run lint   # ESLint checking
```

### Development Workflow
1. Configure Supabase in `.env`
2. Run database migrations
3. Start development server
4. Test import flow with sample data

## Future Enhancements

### Priority 1 (Core Features)
- User authentication with Supabase Auth
- Bulk conflict resolution
- Product editing and deletion
- Import rollback functionality

### Priority 2 (Advanced Features)
- Export to CSV/Excel
- Advanced filtering and sorting
- Import history with diff view
- Supplier management
- Product categories and tags

### Priority 3 (Enterprise Features)
- API endpoints for programmatic access
- Webhook notifications
- Audit logging
- Multi-tenant support
- Role-based access control

## Maintenance Notes

### Dependencies to Monitor
- `exceljs`: Keep updated for new features and security patches
- `next`: Keep up with Next.js updates
- `@supabase/supabase-js`: Update for new features

### Database Migrations
When schema changes are needed:
1. Update `lib/database.types.ts`
2. Run migration SQL in Supabase
3. Update affected components
4. Test import flow thoroughly

### Common Issues
- **Build Errors**: Ensure environment variables are set
- **Runtime Errors**: Check Supabase credentials
- **Import Failures**: Validate CSV/Excel format

## Support & Documentation

- See `README.md` for setup instructions
- Database schema in `README.md`
- Code comments for complex logic

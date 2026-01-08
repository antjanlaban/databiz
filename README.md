# DataBiz - Product Data Import Application

DataBiz is a TypeScript Next.js application for importing and managing supplier product data from CSV and Excel files.

## Features

- **File Upload**: Import product data from CSV or Excel files
- **Import Sessions**: Track and review import history
- **Conflict Resolution**: Resolve duplicate EAN conflicts
- **Active EANs**: Browse and search all imported products
- **Supabase Integration**: PostgreSQL database with real-time capabilities

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **File Parsing**: PapaParse (CSV) and ExcelJS (Excel)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/antjanlaban/databiz.git
   cd databiz
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### Database Setup

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Create products table
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  ean TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  supplier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create import_sessions table
CREATE TABLE import_sessions (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  conflicts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ean_conflicts table
CREATE TABLE ean_conflicts (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  ean TEXT NOT NULL,
  existing_product JSONB NOT NULL,
  new_product JSONB NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolution TEXT CHECK (resolution IN ('keep_existing', 'use_new', 'skip')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_products_ean ON products(ean);
CREATE INDEX idx_import_sessions_status ON import_sessions(status);
CREATE INDEX idx_ean_conflicts_resolved ON ean_conflicts(resolved);
CREATE INDEX idx_ean_conflicts_session ON ean_conflicts(session_id);

-- Enable Row Level Security (RLS) - Optional for now
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ean_conflicts ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (no auth)
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on import_sessions" ON import_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on ean_conflicts" ON ean_conflicts FOR ALL USING (true) WITH CHECK (true);
```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## File Format Requirements

Your CSV or Excel files should have the following columns:

- **ean**: Product EAN/barcode (required, string)
- **name**: Product name (required, string)
- **price**: Product price (required, number)
- **supplier**: Supplier name (required, string)

### Example CSV:

```csv
ean,name,price,supplier
1234567890123,Product A,19.99,Supplier X
9876543210987,Product B,29.99,Supplier Y
```

### Example Excel:

| ean           | name      | price | supplier   |
|---------------|-----------|-------|------------|
| 1234567890123 | Product A | 19.99 | Supplier X |
| 9876543210987 | Product B | 29.99 | Supplier Y |

## Project Structure

```
databiz/
├── app/                    # Next.js app directory
│   ├── upload/            # File upload page
│   ├── sessions/          # Import sessions page
│   ├── conflicts/         # EAN conflicts resolution page
│   ├── eans/             # Active EANs listing page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Navigation.tsx
│   └── Table.tsx
├── lib/                   # Utility functions and configurations
│   ├── database.types.ts # TypeScript database types
│   ├── fileParser.ts     # CSV/Excel parsing utilities
│   └── supabase.ts       # Supabase client configuration
└── package.json
```

## Usage Flow

1. **Upload**: Navigate to the Upload page and select a CSV or Excel file
2. **Review**: Check the Import Sessions page to see the status of your import
3. **Resolve Conflicts**: If there are duplicate EANs, resolve them in the Conflicts page
4. **Browse**: View all imported products in the Active EANs page

## Future Enhancements

- User authentication and authorization
- Bulk conflict resolution
- Export functionality
- Product editing and deletion
- Advanced filtering and sorting
- Import history and rollback
- API endpoints for programmatic access

## Security Considerations

All dependencies have been checked for known vulnerabilities and are using secure versions.

For production use, consider:
- Implementing additional input validation and sanitization
- Adding user authentication and authorization
- Running regular security audits
- Implementing rate limiting for file uploads
- Setting up proper logging and monitoring

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

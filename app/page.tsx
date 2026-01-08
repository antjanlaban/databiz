import { use } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function Home({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Unwrap searchParams to satisfy Next.js 15 requirements
  // Even if we don't use it, Next.js requires it to be unwrapped
  if (searchParams) {
    use(searchParams);
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to DataBiz
        </h1>
        <p className="text-xl text-gray-600">
          Import and manage supplier product data with ease
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-2xl font-semibold mb-4">Upload Files</h2>
          <p className="text-gray-600 mb-4">
            Import supplier product data from CSV or Excel files
          </p>
          <Link href="/upload">
            <Button>Go to Upload</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">Import Sessions</h2>
          <p className="text-gray-600 mb-4">
            Review and track your import sessions
          </p>
          <Link href="/upload">
            <Button>View Sessions</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">EAN Conflicts</h2>
          <p className="text-gray-600 mb-4">
            Resolve conflicts when importing duplicate EANs
          </p>
          <Link href="/conflicts">
            <Button>Manage Conflicts</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">Active EANs</h2>
          <p className="text-gray-600 mb-4">
            Browse all active products in the database
          </p>
          <Link href="/eans">
            <Button>View EANs</Button>
          </Link>
        </Card>
      </div>

      <Card className="bg-blue-50">
        <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Configure your Supabase credentials in the .env file</li>
          <li>Upload a CSV or Excel file with product data</li>
          <li>Review the import session and resolve any conflicts</li>
          <li>View your imported products in the Active EANs page</li>
        </ol>
      </Card>
    </div>
  );
}

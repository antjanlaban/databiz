'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { parseFile } from '@/lib/fileParser';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse the file
      const { data: products, errors } = await parseFile(file);

      if (errors.length > 0) {
        setError(`Found ${errors.length} error(s) in the file:\n${errors.slice(0, 5).join('\n')}`);
        if (products.length === 0) {
          setLoading(false);
          return;
        }
      }

      // Create import session
      const { data: session, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          filename: file.name,
          status: 'processing',
          total_rows: products.length,
          processed_rows: 0,
          conflicts_count: 0,
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to create import session: ${sessionError.message}`);
      }

      // Check for existing EANs
      const eans = products.map(p => p.ean);
      const { data: existingProducts, error: checkError } = await supabase
        .from('products')
        .select('*')
        .in('ean', eans);

      if (checkError) {
        throw new Error(`Failed to check existing products: ${checkError.message}`);
      }

      const existingEANs = new Set(existingProducts?.map((p: any) => p.ean) || []);
      const newProducts = products.filter((p: any) => !existingEANs.has(p.ean));
      const conflicts = products.filter((p: any) => existingEANs.has(p.ean));

      // Store conflicts for resolution
      if (conflicts.length > 0) {
        const conflictRecords = conflicts.map((newProduct: any) => {
          const existing = existingProducts?.find((p: any) => p.ean === newProduct.ean);
          return {
            session_id: session.id!,
            ean: newProduct.ean,
            existing_product: existing,
            new_product: newProduct,
            resolved: false,
          };
        });

        const { error: conflictError } = await supabase
          .from('ean_conflicts')
          .insert(conflictRecords);

        if (conflictError) {
          console.error('Failed to store conflicts:', conflictError);
        }
      }

      // Insert new products
      if (newProducts.length > 0) {
        const { error: insertError } = await supabase
          .from('products')
          .insert(newProducts);

        if (insertError) {
          throw new Error(`Failed to insert products: ${insertError.message}`);
        }
      }

      // Update session
      await supabase
        .from('import_sessions')
        .update({
          status: 'completed',
          processed_rows: newProducts.length,
          conflicts_count: conflicts.length,
        })
        .eq('id', session.id!);

      setSuccess(
        `Import completed! ${newProducts.length} products imported, ${conflicts.length} conflicts found.`
      );

      // Redirect to sessions page after 2 seconds
      setTimeout(() => {
        router.push('/sessions');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Upload Product Data</h1>

      <Card>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV or Excel File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={loading}
            />
          </div>

          {file && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Selected file:</strong> {file.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">File Format Requirements:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Required columns: ean, name, price, supplier</li>
              <li>• Price must be a valid number</li>
              <li>• EAN should be unique identifier</li>
            </ul>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Upload and Import'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

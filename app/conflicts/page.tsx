'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { EANConflict } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<EANConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      const { data, error } = await supabase
        .from('ean_conflicts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConflicts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conflicts');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (
    conflictId: number,
    resolution: 'keep_existing' | 'use_new' | 'skip'
  ) => {
    setResolving(conflictId);
    try {
      const conflict = conflicts.find(c => c.id === conflictId);
      if (!conflict) return;

      // If using new, update the product
      if (resolution === 'use_new' && 
          conflict.new_product.name && 
          conflict.new_product.price !== null && 
          conflict.new_product.price !== undefined && 
          conflict.new_product.supplier) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: conflict.new_product.name,
            price: conflict.new_product.price,
            supplier: conflict.new_product.supplier,
          })
          .eq('ean', conflict.ean);

        if (updateError) throw updateError;
      }

      // Mark conflict as resolved
      const { error: resolveError } = await supabase
        .from('ean_conflicts')
        .update({
          resolved: true,
          resolution,
        })
        .eq('id', conflictId);

      if (resolveError) throw resolveError;

      // Remove from local state
      setConflicts(conflicts.filter(c => c.id !== conflictId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading conflicts...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">EAN Conflicts</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {conflicts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No unresolved conflicts found</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {conflicts.map((conflict) => (
            <Card key={conflict.id}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      EAN: {conflict.ean}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Session ID: {conflict.session_id}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 text-blue-900">
                      Existing Product
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-700">Name:</dt>
                        <dd className="text-gray-900">{conflict.existing_product.name}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-700">Price:</dt>
                        <dd className="text-gray-900">
                          ${conflict.existing_product.price?.toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-700">Supplier:</dt>
                        <dd className="text-gray-900">{conflict.existing_product.supplier}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 text-green-900">
                      New Product
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-700">Name:</dt>
                        <dd className="text-gray-900">{conflict.new_product.name}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-700">Price:</dt>
                        <dd className="text-gray-900">
                          ${conflict.new_product.price?.toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-700">Supplier:</dt>
                        <dd className="text-gray-900">{conflict.new_product.supplier}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="secondary"
                    onClick={() => handleResolve(conflict.id!, 'keep_existing')}
                    disabled={resolving === conflict.id}
                  >
                    Keep Existing
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleResolve(conflict.id!, 'use_new')}
                    disabled={resolving === conflict.id}
                  >
                    Use New
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleResolve(conflict.id!, 'skip')}
                    disabled={resolving === conflict.id}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePageTitle } from '@/components/layout/PageTitleContext';
import { supabase } from '@/lib/supabase';
import { EANConflict } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export default function ConflictsPage() {
  const { setTitle } = usePageTitle();
  const [conflicts, setConflicts] = useState<EANConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);

  useEffect(() => {
    setTitle('EAN Conflicts');
    return () => setTitle(null);
  }, [setTitle]);

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
      setError(err instanceof Error ? err.message : 'Kan conflicten niet ophalen');
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
          conflict.new_product.supplier) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: conflict.new_product.name,
            price: conflict.new_product.price,
            supplier: conflict.new_product.supplier,
            updated_at: new Date().toISOString(),
          })
          .eq('ean', conflict.ean);

        if (updateError) throw updateError;
      }

      // Mark conflict as resolved
      const { error: resolveError } = await supabase
        .from('ean_conflicts')
        .update({
          resolved: true,
          resolution: resolution,
        })
        .eq('id', conflictId);

      if (resolveError) throw resolveError;

      // Refresh conflicts list
      await fetchConflicts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij het oplossen van conflict');
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {conflicts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              Geen openstaande conflicten. Alles is opgelost!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono text-sm text-emerald-400">
                      EAN: {conflict.ean}
                    </CardTitle>
                    <CardDescription>
                      Conflict aangemaakt op {conflict.created_at ? new Date(conflict.created_at).toLocaleString('nl-NL') : 'Onbekend'}
                    </CardDescription>
                  </div>
                  <Badge variant="warning">Openstaand</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                      Huidige Product
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Naam:</span> {conflict.existing_product.name}</p>
                      <p><span className="font-semibold">Prijs:</span> €{conflict.existing_product.price?.toFixed(2) || 'N/A'}</p>
                      <p><span className="font-semibold">Leverancier:</span> {conflict.existing_product.supplier}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                      Nieuw Product
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Naam:</span> {conflict.new_product.name}</p>
                      <p><span className="font-semibold">Prijs:</span> €{conflict.new_product.price?.toFixed(2) || 'N/A'}</p>
                      <p><span className="font-semibold">Leverancier:</span> {conflict.new_product.supplier}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => conflict.id && handleResolve(conflict.id, 'keep_existing')}
                    disabled={resolving === conflict.id || !conflict.id}
                  >
                    Houd Huidige
                  </Button>
                  <Button
                    onClick={() => conflict.id && handleResolve(conflict.id, 'use_new')}
                    disabled={resolving === conflict.id || !conflict.id}
                  >
                    Gebruik Nieuw
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => conflict.id && handleResolve(conflict.id, 'skip')}
                    disabled={resolving === conflict.id || !conflict.id}
                  >
                    Sla Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

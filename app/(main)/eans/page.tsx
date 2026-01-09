'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable, DataTableRow, DataTableCell } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/components/layout/PageTitleContext';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export default function EANsPage() {
  const { setTitle } = usePageTitle();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setTitle('EAN Varianten');
    return () => setTitle(null);
  }, [setTitle]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.ean.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Fout: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Producten</CardTitle>
            <Input
              type="text"
              placeholder="Zoeken op EAN, naam of leverancier..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['EAN', 'Naam', 'Leverancier', 'Prijs', 'Laatst bijgewerkt']}
            stickyFirstColumn={true}
          >
            {paginatedProducts.map((product) => (
              <DataTableRow key={product.id} stickyFirstColumn={true}>
                <DataTableCell className="font-mono text-sm text-emerald-400">
                  {product.ean}
                </DataTableCell>
                <DataTableCell className="font-semibold text-base">
                  {product.name}
                </DataTableCell>
                <DataTableCell>{product.supplier}</DataTableCell>
                <DataTableCell>€{product.price.toFixed(2)}</DataTableCell>
                <DataTableCell>
                  {product.updated_at ? new Date(product.updated_at).toLocaleDateString('nl-NL') : '-'}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>

          {paginatedProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Geen producten gevonden
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Pagina {currentPage} van {totalPages} ({filteredProducts.length} producten)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Vorige
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Volgende
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

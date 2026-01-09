'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/components/layout/PageTitleContext';

export default function Home({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { setTitle } = usePageTitle();
  
  // Unwrap searchParams to satisfy Next.js 15 requirements
  if (searchParams) {
    use(searchParams);
  }

  useEffect(() => {
    setTitle('Welkom bij DataBiz');
    return () => setTitle(null);
  }, [setTitle]);
  
  return (
    <div className="space-y-8">

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Datasets</CardTitle>
            <CardDescription>
              Importeer en beheer leveranciersproductdata datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/datasets">
              <Button>Ga naar Datasets</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>EAN Conflicts</CardTitle>
            <CardDescription>
              Los conflicten op bij het importeren van dubbele EAN's
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/conflicts">
              <Button variant="outline">Beheer Conflicts</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actieve EAN's</CardTitle>
            <CardDescription>
              Blader door alle actieve producten in de database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/eans">
              <Button variant="outline">Bekijk EAN's</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Aan de slag</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Configureer je Supabase credentials in het .env bestand</li>
            <li>Upload een CSV of Excel bestand met productdata</li>
            <li>Bekijk de import sessie en los eventuele conflicten op</li>
            <li>Bekijk je geïmporteerde producten op de Actieve EAN's pagina</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

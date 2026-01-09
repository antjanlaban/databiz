'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NameTemplate } from '@/lib/nameGenerator';
import { Brand } from '@/lib/database.types';

type ActivationStep = 'prepare' | 'brand' | 'columns' | 'template' | 'preview' | 'activating';

export default function ActivatePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [step, setStep] = useState<ActivationStep>('prepare');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [session, setSession] = useState<any>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [hasJsonData, setHasJsonData] = useState(false);
  const [detectedBrandColumn, setDetectedBrandColumn] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Brand selection state
  const [brandMode, setBrandMode] = useState<'auto' | 'manual'>('auto');
  const [selectedBrandColumn, setSelectedBrandColumn] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [manualBrand, setManualBrand] = useState<string>('');
  const [missingBrands, setMissingBrands] = useState<string[]>([]);

  // Column mapping state
  const [colorColumn, setColorColumn] = useState<string>('');
  const [sizeColumn, setSizeColumn] = useState<string>('');

  // Template state
  const [template, setTemplate] = useState<NameTemplate>({
    parts: [],
    separator: ' | ',
  });
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [uniqueness, setUniqueness] = useState<any>(null);

  // EAN column (from session)
  const eanColumn = session?.detected_ean_column || '';

  // Load initial data
  useEffect(() => {
    loadActivationData();
  }, [sessionId]);

  async function loadActivationData() {
    try {
      setLoading(true);
      const response = await fetch(`/api/activate-session/${sessionId}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load activation data');
        return;
      }

      setSession(data.session);
      setColumns(data.data.columns || []);
      setHasJsonData(data.data.hasJsonData);
      setDetectedBrandColumn(data.data.detectedBrandColumn);
      setBrands(data.brands || []);

      // Auto-select detected brand column
      if (data.data.detectedBrandColumn) {
        setSelectedBrandColumn(data.data.detectedBrandColumn);
      }

      // If JSON data exists, move to brand step
      if (data.data.hasJsonData) {
        setStep('brand');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handlePrepare() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/activate-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare' }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to prepare dataset');
        return;
      }

      setColumns(data.columns || []);
      setHasJsonData(true);
      setStep('brand');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare dataset');
    } finally {
      setLoading(false);
    }
  }

  async function handleDetectBrand() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/activate-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect-brand',
          brandColumn: brandMode === 'auto' ? selectedBrandColumn : null,
          manualBrand: brandMode === 'manual' ? manualBrand : null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to detect brand');
        return;
      }

      if (data.missing && data.missing.length > 0) {
        setMissingBrands(data.missing);
        // Show warning but allow continuation
      }

      setStep('columns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect brand');
    } finally {
      setLoading(false);
    }
  }

  async function handleMapColumns() {
    if (!colorColumn || !sizeColumn) {
      setError('Kleur en Maat kolommen zijn verplicht');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/activate-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'map-columns',
          colorColumn,
          sizeColumn,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to map columns');
        return;
      }

      setStep('template');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to map columns');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfigureTemplate() {
    if (!template || template.parts.length === 0) {
      setError('Template is verplicht');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/activate-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure-template',
          template,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to configure template');
        return;
      }

      setPreviewNames(data.preview || []);
      setUniqueness(data.uniqueness || null);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure template');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    try {
      setLoading(true);
      setError(null);
      setStep('activating');

      const response = await fetch(`/api/activate-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          // Only send brandId if manual mode, otherwise send brandColumn
          brandId: brandMode === 'manual' ? selectedBrandId : null,
          brandColumn: brandMode === 'auto' && selectedBrandColumn ? selectedBrandColumn : null,
          manualBrand: brandMode === 'manual' ? manualBrand : null,
          colorColumn,
          sizeColumn,
          template,
          eanColumn,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to activate dataset');
        setStep('preview');
        return;
      }

      // Success - redirect to upload page
      router.push('/upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate dataset');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  function addTemplatePart(type: 'column' | 'text', value: string) {
    if (!value.trim()) return;

    setTemplate({
      ...template,
      parts: [...template.parts, { type, value: value.trim() }],
    });
  }

  function removeTemplatePart(index: number) {
    setTemplate({
      ...template,
      parts: template.parts.filter((_, i) => i !== index),
    });
  }

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-zinc-50">Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8" style={{ minWidth: '1440px' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-zinc-50">Dataset Activeren</h1>
          <p className="text-zinc-400 mt-2">
            {session?.file_name || 'Laden...'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-rose-800 bg-rose-500/10">
            <CardContent className="p-4">
              <p className="text-rose-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Prepare */}
        {step === 'prepare' && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-50">Stap 1: Data Converteren</CardTitle>
              <CardDescription className="text-zinc-400">
                Het goedgekeurde bestand wordt geconverteerd naar een gestructureerd formaat voor verdere verwerking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4 space-y-2">
                  <div className="text-sm text-zinc-400">Bestand wordt geconverteerd...</div>
                  <div className="text-xs text-zinc-500">
                    Dit kan even duren bij grote bestanden
                  </div>
                </div>
              ) : !hasJsonData ? (
                <div className="space-y-3">
                  <div className="bg-zinc-800/50 p-3 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-zinc-200">Wat gebeurt er?</p>
                    <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                      <li>Het goedgekeurde bestand wordt gelezen</li>
                      <li>Alle rijen en kolommen worden geëxtraheerd</li>
                      <li>Data wordt opgeslagen in een gestructureerd formaat</li>
                      <li>Kolommen worden beschikbaar gemaakt voor mapping</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handlePrepare}
                    disabled={loading}
                    className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700 w-full"
                  >
                    {loading ? 'Converteren...' : 'Start Conversie'}
                  </Button>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                  <div className="text-emerald-400 text-sm font-medium">✓ Conversie voltooid</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Data is klaar voor de volgende stappen
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Brand Selection */}
        {step === 'brand' && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-50">Stap 2: MERK Selecteren</CardTitle>
              <CardDescription className="text-zinc-400">
                Selecteer of detecteer het MERK voor deze dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-50">MERK Modus</label>
                <div className="flex gap-4">
                  <Button
                    variant={brandMode === 'auto' ? 'default' : 'outline'}
                    onClick={() => setBrandMode('auto')}
                    className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  >
                    Automatisch Detecteren
                  </Button>
                  <Button
                    variant={brandMode === 'manual' ? 'default' : 'outline'}
                    onClick={() => setBrandMode('manual')}
                    className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  >
                    Handmatig Selecteren
                  </Button>
                </div>
              </div>

              {brandMode === 'auto' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-50">MERK Kolom</label>
                  <select
                    value={selectedBrandColumn}
                    onChange={(e) => setSelectedBrandColumn(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  >
                    <option value="">Selecteer kolom...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col} {col === detectedBrandColumn ? '(gedetecteerd)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {brandMode === 'manual' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-50">MERK</label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  >
                    <option value="">Selecteer MERK...</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="text"
                    placeholder="Of voer nieuw MERK in"
                    value={manualBrand}
                    onChange={(e) => setManualBrand(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-50"
                  />
                </div>
              )}

              {missingBrands.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-800 rounded-md">
                  <p className="text-amber-400 text-sm">
                    Waarschuwing: De volgende MERKen ontbreken: {missingBrands.join(', ')}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('prepare')}
                  className="border-zinc-700 text-zinc-50 hover:bg-zinc-800"
                >
                  Vorige
                </Button>
                <Button
                  onClick={handleDetectBrand}
                  disabled={loading || (brandMode === 'auto' && !selectedBrandColumn) || (brandMode === 'manual' && !selectedBrandId && !manualBrand)}
                  className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  {loading ? 'Verwerken...' : 'Volgende'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Column Mapping */}
        {step === 'columns' && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-50">Stap 3: Kolommen Mappen</CardTitle>
              <CardDescription className="text-zinc-400">
                Wijs de Kleur en Maat kolommen toe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-50">Kleur Kolom *</label>
                <select
                  value={colorColumn}
                  onChange={(e) => setColorColumn(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="">Selecteer kolom...</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-50">Maat Kolom *</label>
                <select
                  value={sizeColumn}
                  onChange={(e) => setSizeColumn(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="">Selecteer kolom...</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('brand')}
                  className="border-zinc-700 text-zinc-50 hover:bg-zinc-800"
                >
                  Vorige
                </Button>
                <Button
                  onClick={handleMapColumns}
                  disabled={loading || !colorColumn || !sizeColumn}
                  className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  {loading ? 'Verwerken...' : 'Volgende'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Template Configuration */}
        {step === 'template' && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-50">Stap 4: Naam Template Configureren</CardTitle>
              <CardDescription className="text-zinc-400">
                Stel de naam template samen voor productnamen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-50">Beschikbare Kolommen</label>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col) => (
                    <Button
                      key={col}
                      variant="outline"
                      size="sm"
                      onClick={() => addTemplatePart('column', col)}
                      className="border-zinc-700 text-zinc-50 hover:bg-zinc-800"
                    >
                      + {col}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-50">Template Delen</label>
                <div className="space-y-2 p-4 bg-zinc-800 rounded-md">
                  {template.parts.length === 0 ? (
                    <p className="text-zinc-400 text-sm">Geen delen toegevoegd</p>
                  ) : (
                    template.parts.map((part, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge className="bg-zinc-700 text-zinc-50">
                          {part.type === 'column' ? part.value : `"${part.value}"`}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTemplatePart(index)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          Verwijder
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-50">Scheidingsteken</label>
                <Input
                  type="text"
                  value={template.separator}
                  onChange={(e) => setTemplate({ ...template, separator: e.target.value })}
                  placeholder=" | "
                  className="bg-zinc-800 border-zinc-700 text-zinc-50"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('columns')}
                  className="border-zinc-700 text-zinc-50 hover:bg-zinc-800"
                >
                  Vorige
                </Button>
                <Button
                  onClick={handleConfigureTemplate}
                  disabled={loading || template.parts.length === 0}
                  className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  {loading ? 'Verwerken...' : 'Preview'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Preview */}
        {step === 'preview' && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-50">Stap 5: Preview & Activeren</CardTitle>
              <CardDescription className="text-zinc-400">
                Controleer de gegenereerde namen en activeer de dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uniqueness && (
                <div className="p-4 bg-zinc-800 rounded-md">
                  <p className="text-zinc-50 text-sm">
                    Unieke namen: {uniqueness.unique} / {uniqueness.unique + uniqueness.duplicates}
                  </p>
                  {uniqueness.duplicates > 0 && (
                    <p className="text-amber-400 text-sm mt-1">
                      Waarschuwing: {uniqueness.duplicates} duplicaten gevonden
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-50">Preview (eerste 5 rijen)</label>
                <div className="space-y-1 p-4 bg-zinc-800 rounded-md">
                  {previewNames.map((name, index) => (
                    <div key={index} className="text-zinc-50 text-sm font-semibold">
                      {name || <span className="text-zinc-400">(leeg)</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('template')}
                  className="border-zinc-700 text-zinc-50 hover:bg-zinc-800"
                >
                  Vorige
                </Button>
                <Button
                  onClick={handleActivate}
                  disabled={loading}
                  className="bg-emerald-600 text-zinc-50 hover:bg-emerald-700"
                >
                  {loading ? 'Activeren...' : 'Dataset Activeren'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Activating */}
        {step === 'activating' && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-50">Activeren...</CardTitle>
              <CardDescription className="text-zinc-400">
                Dataset wordt geactiveerd. Dit kan even duren.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-zinc-50">Bezig met verwerken...</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


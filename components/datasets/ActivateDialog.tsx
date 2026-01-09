'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NameTemplate } from '@/lib/nameGenerator';
import { Brand, ImportSession } from '@/lib/database.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ActivationStep = 'brand' | 'columns' | 'template' | 'preview' | 'activating';

interface ActivateDialogProps {
  session: ImportSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivateStart: () => void;
}

export function ActivateDialog({
  session,
  open,
  onOpenChange,
  onActivateStart,
}: ActivateDialogProps) {
  const [step, setStep] = useState<ActivationStep>('brand');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
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

  // Load initial data when dialog opens
  useEffect(() => {
    if (open && session?.id) {
      loadActivationData();
    }
  }, [open, session?.id]);

  // JSON conversion happens automatically - no prepare step needed

  async function loadActivationData() {
    try {
      setLoading(true);
      const response = await fetch(`/api/activate-session/${session.id}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Kan activatie data niet laden');
        return;
      }

      setColumns(data.data.columns || []);
      setHasJsonData(data.data.hasJsonData);
      setDetectedBrandColumn(data.data.detectedBrandColumn);
      setBrands(data.brands || []);

      // Auto-select detected brand column
      if (data.data.detectedBrandColumn) {
        setSelectedBrandColumn(data.data.detectedBrandColumn);
      }

      // JSON conversion happens automatically - if JSON is not available, show error
      if (data.data.hasJsonData) {
        setStep('brand');
      } else {
        // JSON should be available for ready_for_activation status
        setError('JSON data is niet beschikbaar. Wacht tot JSON conversie is voltooid.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kan data niet laden');
    } finally {
      setLoading(false);
    }
  }

  // handlePrepare removed - JSON conversion happens automatically

  async function handleDetectBrand() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/activate-session/${session.id}`, {
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
        setError(data.error || 'Fout bij detecteren MERK');
        return;
      }

      if (data.missing && data.missing.length > 0) {
        setMissingBrands(data.missing);
      }

      setStep('columns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij detecteren MERK');
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

      const response = await fetch(`/api/activate-session/${session.id}`, {
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
        setError(data.error || 'Fout bij mappen kolommen');
        return;
      }

      setStep('template');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij mappen kolommen');
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

      const response = await fetch(`/api/activate-session/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure-template',
          template,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Fout bij configureren template');
        return;
      }

      setPreviewNames(data.preview || []);
      setUniqueness(data.uniqueness || null);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij configureren template');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    try {
      setLoading(true);
      setError(null);
      setStep('activating');

      const response = await fetch(`/api/activate-session/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          brandId: brandMode === 'auto' ? selectedBrandId : null,
          brandColumn: brandMode === 'auto' ? selectedBrandColumn : null,
          manualBrand: brandMode === 'manual' ? manualBrand : null,
          colorColumn,
          sizeColumn,
          template,
          eanColumn,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Fout bij activeren dataset');
        setStep('preview');
        return;
      }

      // Success - close dialog and notify parent
      onActivateStart();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij activeren dataset');
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

  const stepTitles = {
    brand: 'MERK Selecteren',
    columns: 'Kolommen Mappen',
    template: 'Template Configureren',
    preview: 'Preview',
    activating: 'Activeren...',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dataset Activeren</DialogTitle>
          <DialogDescription>
            {session.file_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Stap {['brand', 'columns', 'template', 'preview', 'activating'].indexOf(step) + 1} van 4:</span>
            <span className="font-medium text-foreground">{stepTitles[step]}</span>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Brand Selection (JSON conversion happens automatically) */}
          {step === 'brand' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stap 1: MERK Selecteren</CardTitle>
                <CardDescription className="text-xs">
                  Selecteer of detecteer het MERK voor deze dataset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={brandMode === 'auto' ? 'default' : 'outline'}
                    onClick={() => setBrandMode('auto')}
                    size="sm"
                  >
                    Automatisch
                  </Button>
                  <Button
                    variant={brandMode === 'manual' ? 'default' : 'outline'}
                    onClick={() => setBrandMode('manual')}
                    size="sm"
                  >
                    Handmatig
                  </Button>
                </div>

                {brandMode === 'auto' && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">MERK Kolom</label>
                    <select
                      value={selectedBrandColumn}
                      onChange={(e) => setSelectedBrandColumn(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
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
                    <div>
                      <label className="text-xs font-medium mb-1 block">Bestaand MERK</label>
                      <select
                        value={selectedBrandId}
                        onChange={(e) => setSelectedBrandId(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                      >
                        <option value="">Selecteer MERK...</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Of nieuw MERK</label>
                      <Input
                        type="text"
                        placeholder="Voer nieuw MERK in"
                        value={manualBrand}
                        onChange={(e) => setManualBrand(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}

                {missingBrands.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-2 rounded">
                    Waarschuwing: Ontbrekende MERKen: {missingBrands.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'columns' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stap 2: Kolommen Mappen</CardTitle>
                <CardDescription className="text-xs">
                  Wijs de Kleur en Maat kolommen toe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Kleur Kolom *</label>
                  <select
                    value={colorColumn}
                    onChange={(e) => setColorColumn(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                  >
                    <option value="">Selecteer kolom...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Maat Kolom *</label>
                  <select
                    value={sizeColumn}
                    onChange={(e) => setSizeColumn(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                  >
                    <option value="">Selecteer kolom...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Template */}
          {step === 'template' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stap 3: Template Configureren</CardTitle>
                <CardDescription className="text-xs">
                  Configureer de naam template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Template Onderdelen</label>
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addTemplatePart('column', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                    >
                      <option value="">Voeg kolom toe...</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      placeholder="Of voeg tekst toe"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          addTemplatePart('text', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>

                {template.parts.length > 0 && (
                  <div className="space-y-1">
                    {template.parts.map((part, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Badge variant="outline" className="text-xs">
                          {part.type === 'column' ? 'Kolom' : 'Tekst'}
                        </Badge>
                        <span className="text-sm flex-1">{part.value}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTemplatePart(index)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium mb-1 block">Scheidingsteken</label>
                  <Input
                    type="text"
                    value={template.separator}
                    onChange={(e) => setTemplate({ ...template, separator: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stap 4: Preview</CardTitle>
                <CardDescription className="text-xs">
                  Controleer de gegenereerde namen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewNames.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {previewNames.slice(0, 10).map((name, index) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded">
                        {name}
                      </div>
                    ))}
                    {previewNames.length > 10 && (
                      <div className="text-xs text-muted-foreground text-center">
                        ... en {previewNames.length - 10} meer
                      </div>
                    )}
                  </div>
                )}

                {uniqueness && (
                  <div className={`text-xs p-2 rounded ${
                    uniqueness.duplicates === 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {uniqueness.unique} unieke namen
                    {uniqueness.duplicates > 0 && `, ${uniqueness.duplicates} duplicaten`}
                    {uniqueness.emptyNames > 0 && `, ${uniqueness.emptyNames} lege namen`}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 6: Activating */}
          {step === 'activating' && (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-muted-foreground">Dataset wordt geactiveerd...</div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          {step !== 'activating' && (
            <Button
              variant="outline"
              onClick={() => {
                const steps: ActivationStep[] = ['brand', 'columns', 'template', 'preview', 'activating'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1]);
                }
              }}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Vorige
            </Button>
          )}
          {step === 'brand' && (
            <Button
              onClick={handleDetectBrand}
              disabled={loading || (brandMode === 'auto' && !selectedBrandColumn) || (brandMode === 'manual' && !selectedBrandId && !manualBrand)}
            >
              {loading ? 'Verwerken...' : 'Volgende'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 'columns' && (
            <Button
              onClick={handleMapColumns}
              disabled={loading || !colorColumn || !sizeColumn}
            >
              {loading ? 'Verwerken...' : 'Volgende'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 'template' && (
            <Button
              onClick={handleConfigureTemplate}
              disabled={loading || !template || template.parts.length === 0}
            >
              {loading ? 'Verwerken...' : 'Preview'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 'preview' && (
            <Button
              onClick={handleActivate}
              disabled={loading}
            >
              {loading ? 'Activeren...' : 'Activeren'}
            </Button>
          )}
          {step !== 'activating' && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuleren
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


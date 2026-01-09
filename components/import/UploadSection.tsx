'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadSectionProps {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  uploadStatus: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
}

export function UploadSection({
  file,
  onFileChange,
  onUpload,
  uploadStatus,
}: UploadSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "transform rotate-180"
                )} />
                Nieuwe Import
              </CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Selecteer CSV of Excel Bestand
              </label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onFileChange}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
                className="cursor-pointer"
              />
            </div>

            {file && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-foreground">
                  <strong>Geselecteerd:</strong> {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Grootte:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <div className="bg-muted/50 p-3 rounded-lg">
              <h3 className="text-xs font-semibold mb-1 text-foreground">Upload Vereisten:</h3>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• CSV, Excel (.xlsx, .xls)</li>
                <li>• Max 50 MB</li>
                <li>• Automatische validatie en verwerking</li>
              </ul>
            </div>

            <Button
              onClick={onUpload}
              disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'processing'}
              className="w-full"
              size="sm"
            >
              {uploadStatus === 'uploading' ? 'Uploaden...' : uploadStatus === 'processing' ? 'Verwerken...' : 'Upload en Importeer'}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

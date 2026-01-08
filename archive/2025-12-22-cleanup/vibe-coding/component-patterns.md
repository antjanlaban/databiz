# Component Patterns

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Reusable patterns voor veel voorkomende scenarios in het Van Kruiningen PIM.

**Purpose:** Consistency, best practices, snellere development.

---

## Pattern 1: Data Table with Filters

**Use Case:** Products list, import history, sync jobs, etc.

**Structure:**
```typescript
// Page Component
export function ProductsListPage() {
  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    brand: [],
    type: 'all',
    status: 'active',
    search: ''
  });
  
  // State for pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  // Fetch data with query hook
  const { data, totalCount, isLoading } = useProductsQuery({
    filters,
    pagination: { page, pageSize }
  });
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <FilterBar 
        filters={filters}
        onFilterChange={setFilters}
        resultCount={totalCount}
      />
      
      {/* Table */}
      <DataTable
        data={data}
        columns={productColumns}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
      />
      
      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
      />
    </div>
  );
}
```

**Key Points:**
- Filters in state (controlled components)
- Query hook handles data fetching
- Pagination separate component
- Loading states handled by DataTable

---

## Pattern 2: Form with Validation

**Use Case:** Create/edit product, SKU, color variant, etc.

**Structure:**
```typescript
// Zod Schema
const productStyleSchema = z.object({
  style_name: z.string()
    .min(1, 'Verplicht')
    .max(200, 'Max 200 karakters'),
  brand_id: z.number().positive('Selecteer een merk'),
  supplier_article_code: z.string()
    .max(100, 'Max 100 karakters')
    .optional(),
  product_type: z.enum(['KERN', 'RAND']),
  // ... rest
});

type ProductStyleForm = z.infer<typeof productStyleSchema>;

// Component
export function ProductStyleForm({ 
  initialData, 
  onSuccess 
}: {
  initialData?: ProductStyle;
  onSuccess: () => void;
}) {
  const form = useForm<ProductStyleForm>({
    resolver: zodResolver(productStyleSchema),
    defaultValues: initialData || {
      product_type: 'KERN'
    }
  });
  
  const { createStyleMutation, updateStyleMutation } = useProductMutations();
  
  const onSubmit = (data: ProductStyleForm) => {
    if (initialData) {
      updateStyleMutation.mutate(
        { id: initialData.id, data },
        { onSuccess }
      );
    } else {
      createStyleMutation.mutate(data, { onSuccess });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="style_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Productnaam *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Premium Polo Shirt" />
              </FormControl>
              <FormDescription>
                Uniek per merk, 1-200 karakters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="supplier_article_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leverancier Artikelcode</FormLabel>
              <FormControl>
                <Input {...field} placeholder="SUPP-123" />
              </FormControl>
              <FormDescription>
                Optioneel: originele code van leverancier
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* ... more fields */}
        
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
          <Button 
            type="submit" 
            disabled={createStyleMutation.isPending}
            className="bg-vk-blue-500"
          >
            {createStyleMutation.isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

**Key Points:**
- Zod schema with transforms
- React Hook Form integration
- Mutation hook for API calls
- Loading states on submit button
- FormDescription for help text
- FormMessage for errors

---

## Pattern 3: Modal Dialog with Action

**Use Case:** Bulk edit, confirm delete, SKU generation, etc.

**Structure:**
```typescript
export function BulkEditPriceDialog({
  selectedSKUs,
  open,
  onClose
}: {
  selectedSKUs: ProductSKU[];
  open: boolean;
  onClose: () => void;
}) {
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  
  const { bulkUpdateSKUsMutation } = useProductMutations();
  
  const handleApply = () => {
    const updates: Partial<ProductSKU> = {
      sales_discount_perc: discountType === 'percentage' ? parseFloat(discountValue) : 0,
      sales_discount_amount: discountType === 'amount' ? parseFloat(discountValue) : 0
    };
    
    bulkUpdateSKUsMutation.mutate(
      {
        ids: selectedSKUs.map(s => s.sku_id),
        updates
      },
      {
        onSuccess: () => {
          toast.success(`${selectedSKUs.length} SKUs bijgewerkt`);
          onClose();
        }
      }
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Prijzen Aanpassen</DialogTitle>
          <DialogDescription>
            {selectedSKUs.length} SKUs geselecteerd
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Discount type radio */}
          <RadioGroup value={discountType} onValueChange={setDiscountType}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentage" id="percentage" />
              <Label htmlFor="percentage">Percentage korting</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="amount" id="amount" />
              <Label htmlFor="amount">Vast bedrag korting</Label>
            </div>
          </RadioGroup>
          
          {/* Discount value input */}
          <div>
            <Label>Korting</Label>
            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '15' : '5.00'}
            />
          </div>
          
          {/* Preview */}
          <div className="bg-background-tertiary p-3 rounded text-sm">
            <p className="text-text-secondary">
              {selectedSKUs.length} SKUs krijgen{' '}
              {discountType === 'percentage' ? `${discountValue}%` : `€${discountValue}`}{' '}
              korting
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button 
            onClick={handleApply}
            disabled={!discountValue || bulkUpdateSKUsMutation.isPending}
            className="bg-vk-blue-500"
          >
            Toepassen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Key Points:**
- Controlled dialog (open prop)
- Local state for form inputs
- Preview of changes
- Mutation with onSuccess callback
- Toast notification
- Disabled state during mutation

---

## Pattern 4: Real-time Progress Tracking

**Use Case:** Import processing, export sync, long-running operations

**Structure:**
```typescript
export function ImportProgressView({ jobId }: { jobId: number }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [results, setResults] = useState<ImportResults | null>(null);
  
  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel(`import-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'import_jobs',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          const job = payload.new as ImportJob;
          setProgress(job.progress_percentage);
          setStatus(job.status);
          
          if (job.status === 'completed' || job.status === 'failed') {
            setResults({
              inserted: job.inserted_count,
              updated: job.updated_count,
              errors: job.error_count
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [jobId]);
  
  if (status === 'completed') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-vk-green-500">
          <CheckCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Import Voltooid</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Nieuw" value={results?.inserted} color="green" />
          <StatCard label="Bijgewerkt" value={results?.updated} color="blue" />
          <StatCard label="Fouten" value={results?.errors} color="red" />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => navigate('/products')}>
            Bekijk Producten
          </Button>
          <Button variant="outline" onClick={downloadLog}>
            Download Log
          </Button>
        </div>
      </div>
    );
  }
  
  if (status === 'failed') {
    return <ErrorState message="Import mislukt" onRetry={retryImport} />;
  }
  
  // Processing state
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Importeren...</span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <p className="text-sm text-text-secondary">
        {progress}% voltooid
      </p>
    </div>
  );
}
```

**Key Points:**
- Supabase Realtime subscription
- Cleanup on unmount
- State transitions (processing → completed/failed)
- Different UI per state
- Progress bar component

---

## Pattern 5: Infinite Scroll List

**Use Case:** Long lists, desktop-optimized

**Structure:**
```typescript
export function ProductsInfiniteList() {
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['products', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await supabase
        .from('product_skus')
        .select('*, style:product_styles(*), brand:brands(*)')
        .range(pageParam, pageParam + 19);
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    }
  });
  
  // Intersection observer for auto-load
  const { ref, inView } = useInView();
  
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);
  
  const products = data?.pages.flat() || [];
  
  return (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductCard key={product.sku_id} sku={product} />
      ))}
      
      {/* Trigger element */}
      <div ref={ref} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="animate-spin" />}
      </div>
      
      {!hasNextPage && (
        <p className="text-center text-text-tertiary">
          Alle producten geladen
        </p>
      )}
    </div>
  );
}
```

**Key Points:**
- useInfiniteQuery from TanStack Query
- useInView hook for auto-trigger
- Flatten pages for rendering
- Loading indicator at bottom
- End-of-list message

---

## Pattern 6: Optimistic Updates

**Use Case:** Toggle active status, quick edits

**Structure:**
```typescript
export function ProductActiveToggle({ sku }: { sku: ProductSKU }) {
  const queryClient = useQueryClient();
  
  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from('product_skus')
        .update({ is_active: isActive })
        .eq('sku_id', sku.sku_id);
      
      if (error) throw error;
    },
    
    // Optimistic update
    onMutate: async (isActive) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['products'] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['products']);
      
      // Optimistically update
      queryClient.setQueryData(['products'], (old: any) => {
        return {
          ...old,
          pages: old.pages.map((page: any) =>
            page.map((p: ProductSKU) =>
              p.sku_id === sku.sku_id ? { ...p, is_active: isActive } : p
            )
          )
        };
      });
      
      return { previousData };
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['products'], context.previousData);
      }
      toast.error('Update mislukt');
    },
    
    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
  
  return (
    <Switch
      checked={sku.is_active}
      onCheckedChange={(checked) => toggleActiveMutation.mutate(checked)}
      disabled={toggleActiveMutation.isPending}
    />
  );
}
```

**Key Points:**
- Immediate UI update (optimistic)
- Rollback on error
- Invalidate query after mutation
- Disabled during mutation

---

## Pattern 7: Error Boundary

**Use Case:** Catch React errors, show fallback

**Structure:**
```typescript
// ErrorBoundary.tsx
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Send to error tracking service (Sentry, etc.)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-semibold">Er ging iets mis</h2>
          <p className="text-text-secondary text-center max-w-md">
            {this.state.error?.message || 'Onbekende fout opgetreden'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Pagina Herladen
          </Button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage in App.tsx
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* ... routes */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

**Key Points:**
- Class component (required for error boundaries)
- Log error to console + tracking service
- User-friendly fallback UI
- Reload button
- Wrap entire app or critical sections

---

## Pattern 8: File Upload with Preview

**Use Case:** Import files, logo upload, image upload

**Structure:**
```typescript
export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB
  onUpload
}: {
  accept: string;
  maxSize?: number;
  onUpload: (file: File) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };
  
  const handleFile = (file: File) => {
    // Validate
    if (!file.type.match(accept)) {
      toast.error('Ongeldig bestandstype');
      return;
    }
    
    if (file.size > maxSize) {
      toast.error(`Bestand te groot (max ${maxSize / 1024 / 1024}MB)`);
      return;
    }
    
    // Preview (for images)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    
    onUpload(file);
  };
  
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        dragActive ? 'border-vk-blue-500 bg-vk-blue-500/5' : 'border-border-primary'
      )}
    >
      {preview ? (
        <div className="space-y-4">
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" />
          <Button variant="outline" onClick={() => setPreview(null)}>
            Andere kiezen
          </Button>
        </div>
      ) : (
        <>
          <Upload className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
          <p className="text-lg mb-2">Sleep bestand hierheen</p>
          <p className="text-sm text-text-tertiary mb-4">of</p>
          <Button onClick={() => document.getElementById('file-input')?.click()}>
            Selecteer Bestand
          </Button>
          <input
            id="file-input"
            type="file"
            accept={accept}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
```

**Key Points:**
- Drag & drop support
- File validation (type, size)
- Image preview
- Hidden file input
- Toast notifications for errors

---

*Deze patterns vormen de basis voor consistent en efficiënt development in Lovable.*
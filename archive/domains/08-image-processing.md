# Domain 8: Image Processing & Caching

**Context:** Image Processing & Caching (Async Queue + Lazy Fallback)  
**Status:** Active Development  
**Created:** December 23, 2025

---

## 📖 Domain Overview

### Business Purpose

Optimize product image loading performance by caching and optimizing supplier images. External supplier FTP/HTTP servers are slow (30s timeouts), unreliable, and cause poor UX on catalog pages. This domain processes images asynchronously, stores optimized versions (thumb 200x200, medium 800x800 WebP) in Supabase Storage CDN, and provides <1s load times.

### Problem Statement

**Current Issues:**
- 🐌 Slow: 30s timeout per external image fetch via proxy
- 💾 Ephemeral: In-memory cache lost on Edge Function cold start
- 📦 Unoptimized: Full-resolution images loaded for thumbnails
- 🔄 Blocking: On-demand fetching blocks UI

**Solution:**
- ✅ Async queue processing after dataset activation
- ✅ Persistent storage in Supabase Storage bucket
- ✅ Two optimized sizes (thumb/medium) WebP quality=85
- ✅ Lazy fallback for long queues or failures
- ✅ CDN delivery with 1-year cache headers

### Domain Boundaries

**In Scope:**
- Image URL validation (with prefix support)
- Async batch processing queue
- Image optimization (resize + WebP conversion)
- Storage in `product-images` bucket
- Lazy on-demand processing fallback
- Processing status tracking
- Retry logic for failures
- Frontend display resolver

**Out of Scope:**
- Original large image storage (use proxy on-demand)
- Image editing/manipulation by users
- Watermarking or branding
- Video processing
- Master catalog image management (Context 5)
- Import file storage (Context 1)

### Core Entities

1. **Product Image Processing Job**
   - Entity: Supplier Product (with image processing metadata)
   - Fields: `cached_image_urls`, `image_processing_status`, `image_cached_at`, `image_processing_attempts`
   - Lifecycle: pending → processing → completed | failed

2. **Cached Image Asset**
   - Storage: Supabase Storage `product-images` bucket
   - Path: `{supplier_id}/{product_id}/thumb.webp` | `medium.webp`
   - Metadata: size (bytes), width, height, format (webp), quality (85)

---

## 🏗️ Architecture

### Data Flow

```
Dataset Activation (Context 1)
  ↓
Bulk UPDATE: image_processing_status = 'pending'
  ↓
Scheduled Worker (every 5 min via pg_cron)
  ↓
Call Edge Function: process-product-images
  ↓
RPC: get_next_processing_batch (10 products)
  ↓ FOR UPDATE SKIP LOCKED
Mark status = 'processing'
  ↓
For each product:
  1. Construct full image URL (with prefix if needed)
  2. Validate URL exists (HEAD request)
  3. Download image (via existing proxy logic)
  4. Resize to thumb (200x200) + medium (800x800)
  5. Convert to WebP quality=85
  6. Upload to product-images bucket
  7. Update cached_image_urls JSONB
  8. Mark status = 'completed'
  ↓
Frontend: getDisplayImageUrl()
  ↓
Check cached_image_urls.thumb|medium
  ↓ (if exists)
Return CDN URL (instant load)
  ↓ (if null AND status='pending')
Show skeleton + wait
  ↓ (if status='failed')
Show error + retry button
  ↓ (if queue >1000 OR >2 days pending)
Trigger lazy processing endpoint
```

### Processing Strategies

#### **Strategy 1: Scheduled Queue Processing (Primary)**
- **Trigger:** pg_cron job every 5 minutes
- **Batch Size:** 10 products per invocation
- **Priority:** ACTIVE products first, oldest pending first
- **Concurrency:** Single worker (avoid race conditions)
- **Retry:** Failed jobs retry up to 3 times with 5-min interval

#### **Strategy 2: Lazy On-Demand Processing (Fallback)**
- **Trigger:** Frontend onError handler or queue overflow (>1000)
- **Batch Size:** 1 product (immediate)
- **Priority:** High (bypasses queue)
- **Use Case:** Long queues, stuck jobs, or critical products

### URL Construction Logic

**Critical:** Respect `image_url_prefix` from import job:

```typescript
function constructFullImageUrl(
  product: SupplierProduct,
  importJob: ImportJob
): string {
  const rawUrl = product.supplier_image_urls[0];
  
  // Already absolute URL (https:// or ftp://)
  if (/^(https?|ftp):\/\//.test(rawUrl)) {
    return rawUrl;
  }
  
  // Relative path - prepend prefix
  if (importJob.image_url_prefix) {
    return importJob.image_url_prefix + rawUrl;
  }
  
  // No prefix, assume relative to supplier domain
  throw new Error('Relative URL without prefix');
}
```

### Image Validation

Before processing, validate image exists:

```typescript
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    // Check HTTP 200 OK
    if (!response.ok) return false;
    
    // Verify Content-Type is image
    const contentType = response.headers.get('Content-Type');
    if (!contentType?.startsWith('image/')) return false;
    
    // Check reasonable file size (< 50MB)
    const contentLength = response.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
```

---

## 📊 Database Schema

### New Fields in `supplier_products`

```sql
-- Migration: 20251223_add_image_processing.sql

ALTER TABLE supplier_products
  ADD COLUMN cached_image_urls JSONB,
  ADD COLUMN image_processing_status TEXT DEFAULT 'pending',
  ADD COLUMN image_cached_at TIMESTAMP,
  ADD COLUMN image_processing_attempts INT DEFAULT 0,
  ADD COLUMN image_processing_error TEXT;

-- Check constraint
ALTER TABLE supplier_products
  ADD CONSTRAINT chk_image_processing_status 
  CHECK (image_processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Index for queue queries
CREATE INDEX idx_image_processing_queue 
  ON supplier_products(image_processing_status, image_cached_at)
  WHERE image_processing_status IN ('pending', 'failed');

-- Index for ACTIVE products priority
CREATE INDEX idx_image_processing_active 
  ON supplier_products(product_status, image_processing_status)
  WHERE product_status = 'ACTIVE';

-- Comment
COMMENT ON COLUMN supplier_products.cached_image_urls IS 
  'JSONB object with keys: thumb (200x200 WebP URL), medium (800x800 WebP URL)';

COMMENT ON COLUMN supplier_products.image_processing_status IS 
  'Image processing queue status: pending (queued), processing (in progress), completed (done), failed (error after 3 retries)';
```

### Storage Bucket Schema

```sql
-- Create bucket (via Edge Function or manual)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Public read access
  10485760, -- 10MB max per file
  ARRAY['image/webp', 'image/jpeg', 'image/png']
);

-- RLS Policy: Public read
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- RLS Policy: Service role only write
CREATE POLICY "Service role can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'service_role');

-- RLS Policy: Service role only delete
CREATE POLICY "Service role can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'service_role');
```

---

## 🔌 API Contracts

### Edge Function: `process-product-images`

**Endpoint:** `POST /functions/v1/process-product-images`

**Authentication:** Service Role Key (internal only)

**Request Body:**
```typescript
{
  batch_size?: number; // Default 10
  force_retry?: boolean; // Retry failed jobs
}
```

**Response:**
```typescript
{
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  errors?: Array<{
    product_id: number;
    error: string;
  }>;
}
```

**Process:**
1. Call RPC `get_next_processing_batch(batch_size)`
2. For each product:
   - Fetch import job for `image_url_prefix`
   - Construct full URL with prefix
   - Validate URL exists (HEAD request)
   - Download image (reuse proxy-ftp-image logic)
   - Resize with Sharp to thumb (200x200) + medium (800x800)
   - Convert to WebP quality=85
   - Upload to `product-images/{supplier_id}/{product_id}/thumb.webp`
   - Update `cached_image_urls` JSONB
   - Update `image_processing_status = 'completed'`
   - Update `image_cached_at = NOW()`
3. Return summary

**Error Handling:**
- Increment `image_processing_attempts`
- Log error in `image_processing_error`
- If attempts ≥ 3: Set status = 'failed'
- Else: Set status = 'pending' for retry

### Edge Function: `process-product-image-lazy`

**Endpoint:** `POST /functions/v1/process-product-image-lazy`

**Authentication:** Anon Key (public)

**Request Body:**
```typescript
{
  product_id: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  cached_urls?: {
    thumb: string;
    medium: string;
  };
  error?: string;
}
```

**Process:**
- Same as batch processor but for single product
- Bypasses queue (immediate processing)
- Returns cached URLs directly

### RPC Function: `get_next_processing_batch`

**Signature:**
```sql
CREATE FUNCTION get_next_processing_batch(
  p_batch_size INT DEFAULT 10
)
RETURNS TABLE (
  product_id INT,
  supplier_id INT,
  import_job_id INT,
  supplier_image_urls TEXT[],
  image_url_prefix TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Select next batch with lock
  RETURN QUERY
  SELECT 
    sp.id AS product_id,
    sp.supplier_id,
    sp.import_dataset_job_id AS import_job_id,
    sp.supplier_image_urls,
    ij.image_url_prefix
  FROM supplier_products sp
  JOIN import_supplier_dataset_jobs ij ON sp.import_dataset_job_id = ij.id
  WHERE (
    sp.image_processing_status = 'pending' 
    OR (sp.image_processing_status = 'failed' AND sp.image_processing_attempts < 3)
  )
  AND sp.product_status = 'ACTIVE'
  AND sp.supplier_image_urls IS NOT NULL
  AND array_length(sp.supplier_image_urls, 1) > 0
  ORDER BY 
    sp.image_processing_status = 'pending' DESC, -- Pending first
    sp.image_cached_at ASC NULLS FIRST            -- Oldest first
  LIMIT p_batch_size
  FOR UPDATE SKIP LOCKED;
  
  -- Mark as processing
  UPDATE supplier_products
  SET image_processing_status = 'processing'
  WHERE id IN (
    SELECT product_id FROM get_next_processing_batch(0)
  );
END;
$$;
```

---

## 🎨 Frontend Integration

### Smart Image Resolver

**File:** `src/lib/images.ts`

```typescript
export type ImageContext = 'grid' | 'filmstrip' | 'detail' | 'zoom';

export function getDisplayImageUrl(
  product: SupplierProduct,
  context: ImageContext
): string {
  // Priority 1: Cached optimized images
  if (product.cached_image_urls) {
    const cached = product.cached_image_urls as {
      thumb?: string;
      medium?: string;
    };
    
    switch (context) {
      case 'grid':
      case 'filmstrip':
        return cached.thumb || cached.medium || fallbackToProxy(product);
      case 'detail':
        return cached.medium || cached.thumb || fallbackToProxy(product);
      case 'zoom':
        // Always use original via proxy for zoom
        return fallbackToProxy(product);
    }
  }
  
  // Priority 2: Fallback to proxy
  return fallbackToProxy(product);
}

function fallbackToProxy(product: SupplierProduct): string {
  const url = product.supplier_image_urls?.[0];
  if (!url) return '';
  
  if (isFtpUrl(url) || needsProxy(url)) {
    return getProxiedImageUrl(url);
  }
  
  return url;
}

export function getImageProcessingStatus(
  product: SupplierProduct
): 'cached' | 'pending' | 'processing' | 'failed' | 'no-image' {
  if (!product.supplier_image_urls?.length) return 'no-image';
  if (product.cached_image_urls) return 'cached';
  
  return product.image_processing_status as any || 'pending';
}
```

### React Component Integration

**File:** `src/components/supplier-catalog/ProductImageDisplay.tsx`

```tsx
function ProductImageDisplay({ product, context = 'detail' }) {
  const status = getImageProcessingStatus(product);
  const imageUrl = getDisplayImageUrl(product, context);
  const [retrying, setRetrying] = useState(false);
  
  const triggerLazyProcessing = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-product-image-lazy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ product_id: productId }),
        }
      );
      
      if (!response.ok) throw new Error('Failed to process');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplier-products']);
      toast.success('Image processed successfully');
    },
  });
  
  if (status === 'pending' || status === 'processing') {
    return (
      <div className="relative">
        <Skeleton className="w-full h-full" />
        <Badge variant="secondary" className="absolute top-2 right-2">
          Processing...
        </Badge>
      </div>
    );
  }
  
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load</p>
        <Button
          size="sm"
          onClick={() => triggerLazyProcessing.mutate(product.id)}
          disabled={retrying}
        >
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <img
      src={imageUrl}
      alt={product.supplier_style_name}
      loading="lazy"
      decoding="async"
      onError={() => {
        // Auto-trigger lazy processing if cached image fails
        if (status === 'cached') {
          triggerLazyProcessing.mutate(product.id);
        }
      }}
    />
  );
}
```

---

## 📈 Performance Characteristics

### Storage Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| Avg thumb size | 3 KB | 200x200 WebP quality=85 |
| Avg medium size | 15 KB | 800x800 WebP quality=85 |
| Total per product | 18 KB | thumb + medium |
| 10,000 products | 180 MB | 10K × 18 KB |
| 100,000 products | 1.8 GB | 100K × 18 KB |

**Cost:** ~$0.021/GB/month (Supabase Storage) = **$0.004/month** for 10K products

### Processing Time

| Metric | Value | Notes |
|--------|-------|-------|
| Download time | 0.5-5s | Via existing proxy logic |
| Resize + WebP | 0.2s | Sharp library |
| Upload to storage | 0.3s | Supabase CDN |
| Total per product | 1-6s | Avg 3s |
| Batch of 10 | 10-60s | Parallel not possible (memory) |
| 10,000 products | 8-16 hours | With 5-min intervals |

**Optimization:** Lazy fallback ensures critical products processed first

### Load Time Improvement

| Scenario | Before (Proxy) | After (Cached) | Improvement |
|----------|----------------|----------------|-------------|
| Catalog grid (50 products) | 15-30s (cold) | 0.5-1s | **30x faster** |
| Product detail page | 2-5s per image | 0.2-0.5s | **10x faster** |
| Infinite scroll | Blocks on scroll | Instant | **Smooth UX** |

---

## 🔒 Security & Access Control

### RLS Policies

- **Read:** Public access to `product-images` bucket (images are not sensitive)
- **Write:** Service role only (prevents abuse)
- **Delete:** Service role only (cleanup jobs)

### Rate Limiting

- **Scheduled worker:** 1 invocation per 5 minutes (no user control)
- **Lazy processing:** Rate limit per IP (10 requests/minute) to prevent abuse

### Data Privacy

- Images are product catalog (non-PII)
- No user-specific images stored
- Audit trail via `image_cached_at` timestamp

---

## 🧪 Testing Strategy

### Unit Tests

1. **URL Construction:**
   - Test absolute URLs (https://, ftp://)
   - Test relative URLs with prefix
   - Test relative URLs without prefix (error)
   - Test malformed URLs

2. **Image Validation:**
   - Test valid image URLs (HTTP 200 + image/*)
   - Test 404 errors
   - Test non-image Content-Types
   - Test oversized files (>50MB)

3. **Processing Logic:**
   - Test Sharp resize (200x200, 800x800)
   - Test WebP conversion quality=85
   - Test upload to storage
   - Test JSONB update

### Integration Tests

1. **Queue Processing:**
   - Create 20 products with pending status
   - Trigger scheduled worker
   - Verify batch of 10 processed
   - Verify remaining 10 still pending
   - Verify retry logic (failed → pending)

2. **Lazy Processing:**
   - Call lazy endpoint with product_id
   - Verify immediate processing
   - Verify queue bypassed
   - Verify cached_urls returned

3. **Frontend Integration:**
   - Grid view loads thumb images
   - Detail view loads medium images
   - Zoom loads original via proxy
   - Skeleton shown for pending
   - Retry button works for failed

---

## 📊 Monitoring & Observability

### Key Metrics

1. **Queue Health:**
   - Pending count: `SELECT COUNT(*) FROM supplier_products WHERE image_processing_status = 'pending'`
   - Processing count: `SELECT COUNT(*) WHERE status = 'processing'`
   - Failed count: `SELECT COUNT(*) WHERE status = 'failed'`
   - Avg wait time: `SELECT AVG(NOW() - created_at) WHERE status = 'pending'`

2. **Processing Performance:**
   - Avg processing time per product
   - Success rate: `completed / (completed + failed)`
   - Retry rate: `AVG(image_processing_attempts) WHERE status = 'completed'`

3. **Storage Usage:**
   - Total storage: `SELECT SUM(size) FROM storage.objects WHERE bucket_id = 'product-images'`
   - Avg file size: `SELECT AVG(size) WHERE bucket_id = 'product-images'`

### Alerts

- Queue overflow: pending > 1000 for >1 hour
- High failure rate: failed / total > 20%
- Stuck jobs: processing status >15 minutes
- Storage quota: usage > 80% of limit

---

## 🔄 Lifecycle & Maintenance

### Backfill Strategy

**Option A: One-time Batch (Recommended)**
```sql
-- Queue all ACTIVE products without cached images
UPDATE supplier_products
SET image_processing_status = 'pending',
    image_processing_attempts = 0
WHERE product_status = 'ACTIVE'
  AND cached_image_urls IS NULL
  AND supplier_image_urls IS NOT NULL
  AND array_length(supplier_image_urls, 1) > 0;
```

**Estimated Time:** 8-16 hours for 10,000 products with 5-min intervals

**Option B: Lazy Only**
- No backfill, rely on lazy processing
- Products processed on first view
- Weeks to complete but zero upfront cost

### Cleanup Strategy

**Inactive Products:**
```sql
-- Delete cached images for INACTIVE/DELETED products older than 90 days
DELETE FROM storage.objects
WHERE bucket_id = 'product-images'
  AND name LIKE ANY (
    SELECT supplier_id || '/' || id || '/%'
    FROM supplier_products
    WHERE product_status IN ('INACTIVE', 'DELETED')
      AND status_changed_at < NOW() - INTERVAL '90 days'
  );

-- Clear metadata
UPDATE supplier_products
SET cached_image_urls = NULL,
    image_processing_status = 'pending'
WHERE product_status IN ('INACTIVE', 'DELETED')
  AND status_changed_at < NOW() - INTERVAL '90 days';
```

**Run:** Monthly via pg_cron

---

## 🚧 Future Enhancements

1. **Progressive WebP + JPEG Fallback**
   - Detect browser support
   - Store both WebP and JPEG versions
   - Serve optimal format per client

2. **Blurhash Placeholders**
   - Generate blurhash during processing
   - Store in `cached_image_urls.blurhash`
   - Show instant placeholder while loading

3. **Image CDN Integration**
   - Integrate with Cloudflare Images or imgix
   - On-the-fly transformations
   - Better global performance

4. **Smarter Retry Logic**
   - Exponential backoff (1m, 5m, 30m)
   - Circuit breaker for permanently broken URLs
   - Notification for manual review

5. **Batch Upload Optimization**
   - Process multiple images in parallel
   - Use Deno's Worker threads
   - Reduce total processing time

---

## 📚 Related Contexts

| Context | Relationship | Interface |
|---------|-------------|-----------|
| **01-import-intake** | Triggers queue | `activate-dataset` sets status='pending' |
| **03-supplier-catalog** | Consumes cached images | `getDisplayImageUrl()` resolver |
| **05-master-catalog** | Future integration | Master images separate (Context 5) |
| **07-export-integrations** | Uses cached images | Export APIs prefer cached URLs |

---

## ✅ Acceptance Criteria

### Backend (Copilot)

- [ ] Migration adds all image processing fields
- [ ] Storage bucket created with RLS policies
- [ ] Edge Function `process-product-images` processes batch of 10
- [ ] RPC `get_next_processing_batch` returns correct queue order
- [ ] URL construction respects `image_url_prefix`
- [ ] Image validation checks HEAD request + Content-Type
- [ ] Retry logic increments attempts and caps at 3
- [ ] Scheduled worker calls Edge Function every 5 minutes
- [ ] Lazy processing endpoint works for single product
- [ ] activate-dataset queues images for new products

### Frontend (Lovable)

- [ ] `getDisplayImageUrl()` returns correct size per context
- [ ] Skeleton shown for pending status
- [ ] Error badge + retry button for failed status
- [ ] Lazy processing mutation works from UI
- [ ] Grid view uses thumb images
- [ ] Detail view uses medium images
- [ ] Zoom view falls back to proxy original
- [ ] No console errors for missing cached URLs

### Performance

- [ ] Catalog page loads in <2s (cached images)
- [ ] Image processing completes in <5s per product
- [ ] Storage usage <200MB for 10K products
- [ ] Queue processes 10 products per 5 minutes
- [ ] Failed images retry up to 3 times
- [ ] Lazy processing completes in <10s

---

**End of DDD Document**

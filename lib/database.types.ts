export interface Product {
  id?: number;
  ean: string;
  name: string;
  price: number;
  supplier: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImportSession {
  id?: number;
  file_name: string;
  status: 'pending' | 'uploading' | 'parsing' | 'analyzing_ean' | 'waiting_column_selection' | 'processing' | 'approved' | 'converting' | 'ready_for_activation' | 'activating' | 'activated' | 'rejected' | 'failed';
  display_status?: 'processing' | 'action_required' | 'ready' | 'activating' | 'completed' | 'error'; // User-friendly status label
  total_rows?: number; // Deprecated: use total_rows_in_file instead
  total_rows_in_file?: number; // Total number of rows (productregels) in file
  columns_count?: number; // Number of columns in file
  processed_rows: number;
  conflicts_count: number;
  file_hash?: string;
  file_size_bytes?: number;
  file_storage_path?: string;
  file_type?: 'csv' | 'xlsx';
  uploaded_at?: string;
  parsed_at?: string; // When file parsing was completed
  error_message?: string;
  // EAN analysis fields (metadata kept, but status is now unified)
  unique_ean_count?: number; // Number of unique EAN codes in file
  duplicate_ean_count?: number; // Number of duplicate EAN codes in file
  detected_ean_column?: string; // Name of the detected EAN column
  ean_analysis_at?: string; // Timestamp of EAN analysis
  // Activation fields
  activated_variants_count?: number; // Number of EAN variants created during activation
  activated_duplicates_count?: number; // Number of duplicate EANs found during activation
  activated_at?: string; // Timestamp when dataset activation was completed
  created_at?: string;
  updated_at?: string;
}

export interface EANConflict {
  id?: number;
  session_id: number;
  ean: string;
  existing_product: Product;
  new_product: Partial<Product>;
  resolved: boolean;
  resolution?: 'keep_existing' | 'use_new' | 'skip';
  created_at?: string;
}

export interface Brand {
  id?: string; // UUID
  name: string;
  created_at?: string;
}

export interface EANVariant {
  id?: string; // UUID
  ean: string;
  brand_id: string; // UUID
  color: string;
  size: string;
  name: string;
  import_session_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>;
      };
      import_sessions: {
        Row: ImportSession;
        Insert: Omit<ImportSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ImportSession, 'id' | 'created_at' | 'updated_at'>>;
      };
      ean_conflicts: {
        Row: EANConflict;
        Insert: Omit<EANConflict, 'id' | 'created_at'>;
        Update: Partial<Omit<EANConflict, 'id' | 'created_at'>>;
      };
      brands: {
        Row: Brand;
        Insert: Omit<Brand, 'id' | 'created_at'>;
        Update: Partial<Omit<Brand, 'id' | 'created_at'>>;
      };
      ean_variants: {
        Row: EANVariant;
        Insert: Omit<EANVariant, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<EANVariant, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

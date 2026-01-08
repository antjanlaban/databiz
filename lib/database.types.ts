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
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  conflicts_count: number;
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
    };
  };
}

/**
 * Mock utilities for Supabase
 */

import { vi } from 'vitest';

/**
 * Create a mock Supabase Storage client
 */
export function createMockStorage() {
  const buckets = new Map<string, { public: boolean }>();
  const files = new Map<string, Blob>();

  return {
    listBuckets: vi.fn().mockResolvedValue({
      data: Array.from(buckets.entries()).map(([name, config]) => ({
        id: name,
        name,
        public: config.public,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      error: null,
    }),
    createBucket: vi.fn().mockImplementation((name: string, options?: { public?: boolean }) => {
      buckets.set(name, { public: options?.public ?? false });
      return Promise.resolve({ data: { name }, error: null });
    }),
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockImplementation((path: string, file: Blob) => {
        files.set(path, file);
        return Promise.resolve({
          data: { path },
          error: null,
        });
      }),
      download: vi.fn().mockImplementation((path: string) => {
        const file = files.get(path);
        if (!file) {
          return Promise.resolve({
            data: null,
            error: { message: 'File not found', statusCode: 404 },
          });
        }
        return Promise.resolve({
          data: file,
          error: null,
        });
      }),
      remove: vi.fn().mockImplementation((paths: string[]) => {
        paths.forEach((path) => files.delete(path));
        return Promise.resolve({
          data: paths.map((path) => ({ name: path })),
          error: null,
        });
      }),
    }),
    // Expose internal state for test assertions
    _getBucket: (name: string) => buckets.get(name),
    _getFile: (path: string) => files.get(path),
    _clear: () => {
      buckets.clear();
      files.clear();
    },
  };
}

/**
 * Create a mock Supabase Database client
 */
export function createMockDatabase() {
  const tables = new Map<string, any[]>();

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (!tables.has(table)) {
        tables.set(table, []);
      }

      const tableData = tables.get(table)!;
      let queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockImplementation((data: any) => {
          const insertData = Array.isArray(data) ? data : [data];
          const newRows = insertData.map((row, idx) => ({
            id: tableData.length + idx + 1,
            ...row,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          tableData.push(...newRows);
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: newRows[0],
                error: null,
              }),
            }),
          };
        }),
        update: vi.fn().mockImplementation((data: any) => {
          return {
            eq: vi.fn().mockImplementation((column: string, value: any) => {
              const row = tableData.find((r: any) => r[column] === value);
              if (row) {
                Object.assign(row, data, { updated_at: new Date().toISOString() });
                return Promise.resolve({ data: row, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: tableData[0] || null,
          error: tableData.length === 0 ? { code: 'PGRST116', message: 'No rows returned' } : null,
        }),
      };

      // Mock query execution
      const executeQuery = () => {
        return Promise.resolve({
          data: tableData,
          error: null,
        });
      };

      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.order = vi.fn().mockReturnValue(Promise.resolve({ data: tableData, error: null }));

      return queryBuilder;
    }),
    // Expose internal state for test assertions
    _getTable: (name: string) => tables.get(name) || [],
    _clearTable: (name: string) => tables.set(name, []),
    _clearAll: () => tables.clear(),
  };
}

/**
 * Create a complete mock Supabase client
 */
export function createMockSupabaseClient() {
  const storage = createMockStorage();
  const database = createMockDatabase();

  return {
    storage,
    ...database,
  };
}


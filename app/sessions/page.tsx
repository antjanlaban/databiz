'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { ImportSession } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('import_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Import Sessions</h1>
        <Link href="/upload">
          <Button>New Upload</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <Card>
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No import sessions found</p>
            <Link href="/upload">
              <Button>Upload Your First File</Button>
            </Link>
          </div>
        ) : (
          <Table headers={['Filename', 'Status', 'Total Rows', 'Processed', 'Conflicts', 'Date']}>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {session.filename}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-semibold ${getStatusColor(session.status)}`}>
                    {session.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.total_rows}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.processed_rows}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {session.conflicts_count > 0 ? (
                    <Link href="/conflicts">
                      <span className="text-orange-600 font-semibold hover:underline">
                        {session.conflicts_count}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-gray-500">0</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.created_at
                    ? new Date(session.created_at).toLocaleDateString() + ' ' +
                      new Date(session.created_at).toLocaleTimeString()
                    : '-'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

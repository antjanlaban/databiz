'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { User } from '@/src/domains/identity/types/user.types';
import type { UserInvite } from '@/src/domains/identity/types/invite.types';

interface Company {
  id: string;
  name: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Invite form state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'business_admin' | 'worker'>('worker');
  const [inviteCompanyId, setInviteCompanyId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const meResponse = await fetch('/api/auth/me');
      if (!meResponse.ok) {
        router.push('/login');
        return;
      }
      const meData = await meResponse.json();
      setCurrentUser(meData.user);

      // Get session token from Supabase client
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session?.access_token) {
        router.push('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
      };

      // Load users
      const usersResponse = await fetch('/api/auth/users', { headers });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Load invites
      const invitesResponse = await fetch('/api/auth/invites', { headers });
      if (invitesResponse.ok) {
        const invitesData = await invitesResponse.json();
        setInvites(invitesData.invites || []);
      }

      // Load companies (if admin)
      if (meData.user.profile.role === 'admin') {
        const companiesResponse = await fetch('/api/auth/companies', { headers });
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          setCompanies(companiesData.companies || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij laden data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError('');

    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Niet ingelogd');
      }

      const response = await fetch('/api/auth/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          company_id: inviteRole === 'business_admin' ? inviteCompanyId : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fout bij aanmaken uitnodiging');
      }

      setInviteLink(data.inviteLink);
      setInviteEmail('');
      setInviteCompanyId('');
      // Reload invites
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('Link gekopieerd naar klembord');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Laden...</p>
      </div>
    );
  }

  if (!currentUser || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'business_admin')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-rose-400">Je hebt geen toegang tot deze pagina</p>
        </CardContent>
      </Card>
    );
  }

  const canCreateBusinessAdmin = currentUser.profile.role === 'admin';
  const canCreateWorker = currentUser.profile.role === 'business_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gebruikersbeheer</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Beheer gebruikers en uitnodigingen
          </p>
        </div>
        {(canCreateBusinessAdmin || canCreateWorker) && (
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>Nieuwe uitnodiging</Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle>Nieuwe uitnodiging</DialogTitle>
                <DialogDescription>
                  Maak een nieuwe gebruiker aan door een uitnodigingslink te genereren
                </DialogDescription>
              </DialogHeader>
              {inviteLink ? (
                <div className="space-y-4">
                  <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <p className="text-sm text-emerald-400 mb-2">Uitnodigingslink gegenereerd:</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="bg-zinc-800 border-zinc-700 text-zinc-50 font-mono text-xs"
                      />
                      <Button onClick={copyInviteLink} size="sm">Kopieer</Button>
                    </div>
                  </div>
                  <Button onClick={() => { setInviteLink(''); setShowInviteDialog(false); }} className="w-full">
                    Sluiten
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-50">E-mailadres</label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="naam@voorbeeld.nl"
                      required
                      className="bg-zinc-800 border-zinc-700 text-zinc-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-50">Rol</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'business_admin' | 'worker')}
                      className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50"
                      required
                    >
                      {canCreateBusinessAdmin && <option value="business_admin">Business Admin</option>}
                      {canCreateWorker && <option value="worker">Worker</option>}
                    </select>
                  </div>

                  {inviteRole === 'business_admin' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-50">Company</label>
                      <select
                        value={inviteCompanyId}
                        onChange={(e) => setInviteCompanyId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50"
                        required
                      >
                        <option value="">Selecteer company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={inviteLoading}>
                    {inviteLoading ? 'Aanmaken...' : 'Uitnodiging aanmaken'}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gebruikers</CardTitle>
          <CardDescription>Overzicht van alle gebruikers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-zinc-400">
                    Geen gebruikers gevonden
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.profile.role === 'admin' && 'Admin'}
                        {user.profile.role === 'business_admin' && 'Business Admin'}
                        {user.profile.role === 'worker' && 'Worker'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.profile.status === 'active'
                            ? 'success'
                            : user.profile.status === 'inactive'
                            ? 'error'
                            : 'warning'
                        }
                      >
                        {user.profile.status === 'active' && 'Actief'}
                        {user.profile.status === 'inactive' && 'Inactief'}
                        {user.profile.status === 'pending_invite' && 'Uitnodiging open'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uitnodigingen</CardTitle>
          <CardDescription>Openstaande uitnodigingen</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verloopt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-400">
                    Geen uitnodigingen gevonden
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {invite.role === 'admin' && 'Admin'}
                        {invite.role === 'business_admin' && 'Business Admin'}
                        {invite.role === 'worker' && 'Worker'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invite.status === 'pending'
                            ? 'warning'
                            : invite.status === 'accepted'
                            ? 'success'
                            : 'error'
                        }
                      >
                        {invite.status === 'pending' && 'Open'}
                        {invite.status === 'accepted' && 'Geaccepteerd'}
                        {invite.status === 'expired' && 'Verlopen'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      {new Date(invite.expires_at).toLocaleDateString('nl-NL')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


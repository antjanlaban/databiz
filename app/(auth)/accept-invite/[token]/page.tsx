'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserInvite } from '@/src/domains/identity/types/invite.types';

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<UserInvite | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    // Validate invite token
    const validateInvite = async () => {
      try {
        const response = await fetch(`/api/auth/invites/validate?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Uitnodiging is ongeldig');
          setValidating(false);
          return;
        }

        setInvite(data.invite);
        setValidating(false);
      } catch (err) {
        setError('Fout bij valideren uitnodiging');
        setValidating(false);
      }
    };

    if (token) {
      validateInvite();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 karakters lang zijn');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Accepteren uitnodiging mislukt');
      }

      // Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout bij accepteren uitnodiging');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-zinc-400">Uitnodiging valideren...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-rose-400">Uitnodiging ongeldig</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Welkom bij DataBiz</CardTitle>
          <CardDescription>
            Stel je wachtwoord in om je account te activeren
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invite && (
            <div className="mb-4 rounded-md bg-zinc-800 p-3 text-sm">
              <p className="text-zinc-300">
                <span className="font-medium">E-mail:</span> {invite.email}
              </p>
              <p className="text-zinc-300 mt-1">
                <span className="font-medium">Rol:</span>{' '}
                {invite.role === 'admin' && 'Admin'}
                {invite.role === 'business_admin' && 'Business Admin'}
                {invite.role === 'worker' && 'Worker'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-50">
                Wachtwoord
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 8 karakters"
                required
                disabled={loading}
                minLength={8}
                className="bg-zinc-900 border-zinc-800 text-zinc-50"
              />
              <p className="text-xs text-zinc-400">
                Wachtwoord moet minimaal 8 karakters lang zijn
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-50">
                Bevestig wachtwoord
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Herhaal wachtwoord"
                required
                disabled={loading}
                minLength={8}
                className="bg-zinc-900 border-zinc-800 text-zinc-50"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Account activeren...' : 'Account activeren'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


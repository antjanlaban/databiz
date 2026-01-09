'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use client-side Supabase for login (handles cookies automatically)
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Handle specific Supabase errors
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Ongeldige inloggegevens');
        }
        throw new Error(authError.message || 'Ongeldige inloggegevens');
      }

      if (!authData.user) {
        throw new Error('Geen gebruiker gevonden na inloggen');
      }

      // Check user profile and status
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        await supabase.auth.signOut();
        
        // Check if it's an RLS recursion error
        if (profileError.code === '42P17' || profileError.message?.includes('infinite recursion')) {
          throw new Error('Database configuratiefout. Neem contact op met een beheerder.');
        }
        
        throw new Error('Gebruikersprofiel niet gevonden');
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Gebruikersprofiel niet gevonden');
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('Je account is niet actief. Neem contact op met een beheerder.');
      }

      // Redirect to dashboard - cookies are automatically handled by createBrowserClient
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Onbekende fout bij inloggen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <h1 className="text-3xl font-bold text-zinc-50">DataBiZ</h1>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Inloggen</CardTitle>
            <CardDescription>
              Log in met je e-mailadres en wachtwoord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-50">
                  E-mailadres
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  required
                  disabled={loading}
                  className="bg-zinc-900 border-zinc-800 text-zinc-50 autofill:bg-zinc-900 autofill:text-zinc-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-50">
                  Wachtwoord
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="bg-zinc-900 border-zinc-800 text-zinc-50 pr-10 autofill:bg-zinc-900 autofill:text-zinc-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-50 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Inloggen...' : 'Inloggen'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


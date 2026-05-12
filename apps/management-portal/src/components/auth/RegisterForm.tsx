'use client';

import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hubRegister, HubApiError } from '@/lib/api-client';
import type { Locale } from '@/lib/i18n';

export function RegisterForm({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await hubRegister({ email, password });
    } catch (err) {
      setBusy(false);
      if (err instanceof HubApiError) setError(t('errorRegister'));
      else setError(t('errorServer'));
      return;
    }
    // Auto-sign-in after successful registration.
    const res = await signIn('credentials', { email, password, redirect: false });
    setBusy(false);
    if (res?.ok) {
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } else {
      setError(t('errorInvalidCredentials'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('registerTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Link
              href={`/${locale}/login`}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {t('switchToLogin')}
            </Link>
            <Button type="submit" disabled={busy}>
              {t('submitRegister')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

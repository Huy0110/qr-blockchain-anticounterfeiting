import { LoginForm } from '@/components/auth/LoginForm';
import type { Locale } from '@/lib/i18n';

// LoginForm reads ?callbackUrl via useSearchParams, which forces the
// page out of the static-prerender path. Mark it dynamic so the build
// doesn't try to bake it.
export const dynamic = 'force-dynamic';

export default function LoginPage({ params }: { params: { locale: Locale } }): JSX.Element {
  return <LoginForm locale={params.locale} />;
}

import { RegisterForm } from '@/components/auth/RegisterForm';
import type { Locale } from '@/lib/i18n';

export default function RegisterPage({ params }: { params: { locale: Locale } }): JSX.Element {
  return <RegisterForm locale={params.locale} />;
}

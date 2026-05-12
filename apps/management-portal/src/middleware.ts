import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from './lib/i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // AC-MP-9: default locale is vi; switch only via the explicit toggle.
  // Disable Accept-Language negotiation so the first visit always lands
  // on /vi/.
  localeDetection: false,
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

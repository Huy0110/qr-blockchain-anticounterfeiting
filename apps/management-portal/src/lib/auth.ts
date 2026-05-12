import type { AuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { hubLogin, hubRefresh } from './api-client';

// Hard guard: refuse to boot if the E2E credential bypass is enabled
// in a production runtime. The bypass is tested + documented inside
// `authorize` below; this assertion makes it impossible for an
// operator to flip the flag in a real deployment.
if (process.env.MGMT_PORTAL_E2E_BYPASS === '1' && process.env.NODE_ENV === 'production') {
  throw new Error(
    'MGMT_PORTAL_E2E_BYPASS=1 is set in a production environment. This ' +
      'flag accepts any credentials and must never run outside tests. ' +
      'Unset the env var or do not set NODE_ENV=production.',
  );
}

interface HubTokens {
  accessToken: string;
  refreshToken: string;
  /** UNIX ms when the access token expires. */
  accessExpiresAtMs: number;
  email: string;
  producerId: string;
}

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    refreshToken: string;
    accessExpiresAtMs: number;
    user: { email: string; producerId: string };
    error?: 'RefreshAccessTokenError' | undefined;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends Partial<HubTokens> {
    error?: 'RefreshAccessTokenError' | undefined;
  }
}

export async function refreshAccessTokenIfNeeded(token: JWT): Promise<JWT> {
  // 60-second skew so we refresh just before expiry rather than on it.
  if (token.accessExpiresAtMs && Date.now() < token.accessExpiresAtMs - 60_000) {
    return token;
  }
  if (!token.refreshToken) return { ...token, error: 'RefreshAccessTokenError' };
  try {
    const refreshed = await hubRefresh(token.refreshToken);
    return {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessExpiresAtMs: Date.now() + refreshed.accessTokenExpiresInSec * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Producer credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        // E2E bypass: mocking the hub from Playwright's `page.route` only
        // covers browser traffic, not the Next runtime's outbound fetch
        // here. When MGMT_PORTAL_E2E_BYPASS is set we accept any creds
        // and synthesise a token bundle so flow-level tests can run
        // without a live hub. Never set this in production.
        if (process.env.MGMT_PORTAL_E2E_BYPASS === '1') {
          return {
            id: 'producer-1',
            email: String(creds.email),
            accessToken: 'e2e-access',
            refreshToken: 'e2e-refresh',
            accessExpiresAtMs: Date.now() + 3600_000,
            producerId: 'producer-1',
          } as unknown as { id: string; email: string };
        }
        try {
          const res = await hubLogin({
            email: String(creds.email),
            password: String(creds.password),
          });
          // Stash the hub-issued tokens on the user object so the jwt
          // callback can pick them up. NextAuth's User type doesn't know
          // about these extra fields; the cast is intentional.
          return {
            id: res.producerId,
            email: res.email,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            accessExpiresAtMs: Date.now() + res.accessTokenExpiresInSec * 1000,
            producerId: res.producerId,
          } as unknown as { id: string; email: string };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/vi/login',
    error: '/vi/login',
  },
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        // Initial sign-in: copy fields stashed by `authorize` (typed as
        // a narrow record so we don't reach for `any`).
        const u = user as unknown as {
          accessToken: string;
          refreshToken: string;
          accessExpiresAtMs: number;
          email: string;
          producerId: string;
        };
        return {
          ...token,
          accessToken: u.accessToken,
          refreshToken: u.refreshToken,
          accessExpiresAtMs: u.accessExpiresAtMs,
          email: u.email,
          producerId: u.producerId,
        };
      }
      return refreshAccessTokenIfNeeded(token);
    },
    async session({ session, token }): Promise<Session> {
      return {
        ...session,
        accessToken: token.accessToken ?? '',
        refreshToken: token.refreshToken ?? '',
        accessExpiresAtMs: token.accessExpiresAtMs ?? 0,
        user: {
          email: token.email ?? session.user?.email ?? '',
          producerId: token.producerId ?? '',
        },
        error: token.error,
      };
    },
  },
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshAccessTokenIfNeeded } from '@/lib/auth';
import * as apiClient from '@/lib/api-client';

describe('refreshAccessTokenIfNeeded', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T00:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the token unchanged when access expiry is more than 60s away', async () => {
    const token = {
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAtMs: Date.now() + 5 * 60 * 1000,
    };
    const refreshSpy = vi.spyOn(apiClient, 'hubRefresh');
    const result = await refreshAccessTokenIfNeeded(token);
    expect(result).toBe(token);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('refreshes when within the 60s skew window', async () => {
    const token = {
      accessToken: 'old',
      refreshToken: 'r-old',
      accessExpiresAtMs: Date.now() + 30 * 1000, // 30s — inside the 60s skew
    };
    vi.spyOn(apiClient, 'hubRefresh').mockResolvedValueOnce({
      accessToken: 'new',
      refreshToken: 'r-new',
      accessTokenExpiresInSec: 3600,
    });
    const result = await refreshAccessTokenIfNeeded(token);
    expect(result.accessToken).toBe('new');
    expect(result.refreshToken).toBe('r-new');
    expect(result.error).toBeUndefined();
  });

  it('returns RefreshAccessTokenError when no refresh token is present', async () => {
    const token = { accessToken: 'a', accessExpiresAtMs: Date.now() - 1000 };
    const result = await refreshAccessTokenIfNeeded(token);
    expect(result.error).toBe('RefreshAccessTokenError');
  });

  it('returns RefreshAccessTokenError when hubRefresh throws', async () => {
    const token = {
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAtMs: Date.now() - 1000,
    };
    vi.spyOn(apiClient, 'hubRefresh').mockRejectedValueOnce(new Error('502'));
    const result = await refreshAccessTokenIfNeeded(token);
    expect(result.error).toBe('RefreshAccessTokenError');
    expect(result.refreshToken).toBe('r'); // original retained for the next attempt
  });
});

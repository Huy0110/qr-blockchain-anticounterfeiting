/**
 * Lighthouse CI thresholds for the consumer dApp.
 *
 * Phase 4 / T-027 / DoD: Lighthouse perf >= 85, a11y >= 90 on the three
 * key consumer routes. The repo doesn't run Lighthouse in CI by default
 * (it would require headed Chrome on every PR); these thresholds are the
 * contract that releases must hit before pinning a new IPFS CID.
 *
 * Usage (local):
 *   pnpm --filter @qr-bc/dapp-portal build
 *   npx http-server out -p 8000 -s &
 *   npx lhci autorun --config=apps/dapp-portal/test/lighthouse.config.js
 */
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:8000/vi/',
        'http://localhost:8000/vi/scanner/',
        'http://localhost:8000/vi/about/',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        // Mobile-first emulation matches AC-DA's 4G assumption.
        emulatedFormFactor: 'mobile',
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

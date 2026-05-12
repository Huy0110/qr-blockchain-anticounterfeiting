module.exports = {
  extends: 'solhint:recommended',
  rules: {
    'compiler-version': ['error', '^0.8.24'],
    'func-visibility': ['error', { ignoreConstructors: true }],
    'no-empty-blocks': 'warn',
    'reason-string': ['warn', { maxLength: 64 }],
    'no-global-import': 'error',
    'private-vars-leading-underscore': ['warn', { strict: false }],
    'gas-custom-errors': 'warn',
    'comprehensive-interface': 'off',
    'no-console': 'off',
    'avoid-low-level-calls': 'warn',
    'not-rely-on-time': 'off',
  },
};

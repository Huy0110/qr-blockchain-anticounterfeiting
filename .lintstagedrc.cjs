const path = require('node:path');

const isEslintIgnored = (file) => {
  const base = path.basename(file);
  if (base.startsWith('.')) return true;
  if (/\.config\.(c?js|m?js|ts)$/.test(base)) return true;
  // CommonJS scripts under apps/dapp-portal/test/ are tooling, not app code,
  // and the Next ESLint preset chokes on them with type-aware rules.
  if (file.includes('/dapp-portal/test/') && /\.(c?js)$/.test(file)) return true;
  return false;
};

module.exports = {
  '*.{ts,tsx,js,jsx,cjs,mjs}': (files) => {
    const cmds = [`prettier --write ${files.map((f) => JSON.stringify(f)).join(' ')}`];
    const lintable = files.filter((f) => !isEslintIgnored(f));
    if (lintable.length > 0) {
      cmds.push(
        `eslint --fix --max-warnings 0 ${lintable.map((f) => JSON.stringify(f)).join(' ')}`,
      );
    }
    return cmds;
  },
  '*.{json,yml,yaml,md}': ['prettier --write'],
  '*.sol': ['prettier --write'],
};

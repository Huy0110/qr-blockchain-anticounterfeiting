import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        // Lightness chosen so each color hits WCAG AA (>=4.5:1) when used
        // as text-success / text-warning / text-danger on the white card
        // background.
        success: { DEFAULT: 'hsl(142 71% 30%)', foreground: 'white' },
        warning: { DEFAULT: 'hsl(28 92% 38%)', foreground: 'white' },
        danger: { DEFAULT: 'hsl(0 70% 42%)', foreground: 'white' },
      },
      fontFamily: { sans: ['system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;

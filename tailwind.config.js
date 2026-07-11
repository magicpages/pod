/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-color-scheme="dark"]'],
  content: [
    './*.hbs',
    './partials/**/*.hbs',
    './podcast/**/*.hbs',
    './members/**/*.hbs',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        // Cream + warm neutrals (light mode chassis)
        cream: {
          DEFAULT: '#FAFAF7',
          alt: '#F5F2EC',
        },
        ink: {
          950: '#0A0A0A',
          900: '#1F1D18',
          700: '#3A3833',
          500: '#6B6960',
          400: '#9C998F',
          300: '#D6D3C8',
          200: '#E5E3DC',
          50: '#FAFAF7',
        },
        // Dark mode surfaces
        night: {
          950: '#0A0A0A',
          900: '#13110E',
          800: '#1F1D18',
          700: '#2A2823',
          600: '#3A3833',
        },
        // Accent — deep teal, also driven by --color-accent at runtime
        accent: {
          DEFAULT: 'var(--color-accent, #1A4D4D)',
          50: '#E2EDED',
          200: '#A8C9C9',
          400: '#6BA5A5',
          500: '#3E8484',
          600: '#2A6868',
          700: '#1A4D4D',
          800: '#143E3E',
          900: '#0F2F2F',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        serif: [
          '"Source Serif Pro"',
          'Charter',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'Times',
          'serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      fontFeatureSettings: {
        tabular: ['"tnum"', '"lnum"'],
      },
      letterSpacing: {
        display: '-0.03em',
        title: '-0.02em',
        tight: '-0.015em',
        snug: '-0.01em',
        eyebrow: '0.1em',
        chip: '0.08em',
      },
      maxWidth: {
        prose: '720px',
        content: '1280px',
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [
    // @tailwindcss/typography was removed — the .prose parent class isn't
    // used anywhere in the theme. We override `max-w-prose` and `not-prose`
    // via core utilities; the plugin's 12KB of generated rules was waste.
  ],
};

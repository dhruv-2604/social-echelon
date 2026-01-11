/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        wellness: {
          purple: {
            DEFAULT: 'var(--wellness-purple)',
            soft: 'var(--wellness-purple-soft)',
            light: 'var(--wellness-purple-light)',
          },
          blue: {
            DEFAULT: 'var(--wellness-blue)',
            soft: 'var(--wellness-blue-soft)',
            light: 'var(--wellness-blue-light)',
          },
          green: {
            DEFAULT: 'var(--wellness-green)',
            soft: 'var(--wellness-green-soft)',
            light: 'var(--wellness-green-light)',
          },
          yellow: {
            DEFAULT: 'var(--wellness-yellow)',
            soft: 'var(--wellness-yellow-soft)',
            light: 'var(--wellness-yellow-light)',
          },
          teal: {
            DEFAULT: 'var(--wellness-teal)',
            soft: 'var(--wellness-teal-soft)',
            light: 'var(--wellness-teal-light)',
          },
          coral: {
            DEFAULT: 'var(--wellness-coral)',
            soft: 'var(--wellness-coral-soft)',
            light: 'var(--wellness-coral-light)',
          },
          mint: {
            DEFAULT: 'var(--wellness-mint)',
            soft: 'var(--wellness-mint-soft)',
            light: 'var(--wellness-mint-light)',
          },
          sky: {
            DEFAULT: 'var(--wellness-sky)',
            soft: 'var(--wellness-sky-soft)',
            light: 'var(--wellness-sky-light)',
          },
          lavender: {
            DEFAULT: 'var(--wellness-lavender)',
            soft: 'var(--wellness-lavender-soft)',
            light: 'var(--wellness-lavender-light)',
          },
          neutral: {
            900: 'var(--wellness-neutral-900)',
            800: 'var(--wellness-neutral-800)',
            700: 'var(--wellness-neutral-700)',
            600: 'var(--wellness-neutral-600)',
            500: 'var(--wellness-neutral-500)',
            400: 'var(--wellness-neutral-400)',
            300: 'var(--wellness-neutral-300)',
            200: 'var(--wellness-neutral-200)',
            100: 'var(--wellness-neutral-100)',
          },
          white: 'var(--wellness-white)',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        'wellness-sm': 'var(--shadow-sm)',
        'wellness-md': 'var(--shadow-md)',
        'wellness-lg': 'var(--shadow-lg)',
        'wellness-xl': 'var(--shadow-xl)',
      },
      borderRadius: {
        'wellness-sm': 'var(--radius-sm)',
        'wellness-md': 'var(--radius-md)',
        'wellness-lg': 'var(--radius-lg)',
        'wellness-xl': 'var(--radius-xl)',
      }
    },
  },
  plugins: [],
}
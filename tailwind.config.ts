import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './worker/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 20px 80px rgba(15, 23, 42, 0.16)'
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        rise: 'rise 0.45s ease-out'
      }
    }
  },
  plugins: []
} satisfies Config;

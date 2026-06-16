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
        // Override the entire green scale with the FarmERP360 palette
        green: {
          50:  '#FDF6E3',  // warm cream — light tints, hover backgrounds
          100: '#F5EDD6',  // deeper cream — badge bg, active tints
          200: '#E5D9BF',  // warm tan — borders, dividers
          300: '#B8A07A',  // muted gold-green
          400: '#6B9E7A',  // medium-light green
          500: '#2D6A4F',  // medium green — focus rings
          600: '#2D6A4F',  // primary action — buttons, icons
          700: '#1B4332',  // hover / darker
          800: '#1B4332',  // active text
          900: '#122B20',  // darkest
        },
        // Amber stays for warnings; gold is our accent
        gold: {
          50:  '#FDF8EC',
          100: '#FAF0D0',
          200: '#F4E3A8',
          300: '#EDD478',
          400: '#E2C558',
          500: '#C9A84C',  // main gold accent
          600: '#B8943A',
          700: '#9A7A2D',
          800: '#7A5F22',
          900: '#5A4518',
        },
        // Semantic aliases
        farm: {
          dark:   '#1B4332',
          green:  '#2D6A4F',
          gold:   '#C9A84C',
          cream:  '#FDF6E3',
          cream2: '#F5EDD6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

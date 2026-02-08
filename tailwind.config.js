export default {
  content: [
    './index.html',
    './components/**/*.{js,ts,jsx,tsx}',
    './screens/**/*.{js,ts,jsx,tsx}',
    './*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#13a4ec',
        'primary-dark': '#0e7ab0',
        'primary-container': '#B2EBFF',
        'on-primary-container': '#001F28',
        'background-light': '#f8fafc',
        'background-dark': '#101c22',
        'surface-light': '#ffffff',
        'surface-dark': '#1e293b',
        'surface-container': '#EFF4F5',
        'surface-container-high': '#E9EEF0',
        error: '#BA1A1A',
        'error-container': '#FFDAD6',
        'on-error-container': '#410002',
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.05)',
        glow: '0 0 10px rgba(19, 164, 236, 0.3)',
        'elevation-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

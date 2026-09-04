/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBFAF7',
        ink: '#111110',
        gold: '#A67C2E',
        mid: '#6B6860',
        line: '#E4DFD6',
        green: '#4E7D3C',
        red: '#B3452C',
        amber: '#946A16',
        blue: '#2F6690'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      maxWidth: {
        app: '620px'
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1e40af',   // Azul Rey (Botones principales)
          secondary: '#3b82f6', // Azul Brillo
          accent: '#60a5fa',    
          dark: '#0f172a',      // Texto y Botones Negros
          light: '#f1f5f9',     // Fondo de la App
          contrast: '#ffffff',  // Blanco puro para texto sobre azul/negro
        },
        surface: {
          card: '#ffffff',
          input: '#ffffff',
        }
      },
      borderRadius: {
        'app': '1rem',
      }
    },
  },
  plugins: [],
}
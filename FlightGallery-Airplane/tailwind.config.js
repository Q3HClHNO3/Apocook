/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif'
        ]
      },
      transitionTimingFunction: {
        gallery: 'cubic-bezier(0.22, 1, 0.36, 1)',
        flight: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      boxShadow: {
        cabin: '0 34px 100px rgba(70, 113, 140, 0.28)',
        window: 'inset 0 2px 12px rgba(255,255,255,0.9), inset 0 -22px 50px rgba(82,129,160,0.25), 0 24px 70px rgba(67,107,132,0.32)'
      }
    }
  },
  plugins: []
}

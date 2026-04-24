/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(NaN, NaN%, 97%)',
            '100': 'hsl(NaN, NaN%, 94%)',
            '200': 'hsl(NaN, NaN%, 86%)',
            '300': 'hsl(NaN, NaN%, 76%)',
            '400': 'hsl(NaN, NaN%, 64%)',
            '500': 'hsl(NaN, NaN%, 50%)',
            '600': 'hsl(NaN, NaN%, 40%)',
            '700': 'hsl(NaN, NaN%, 32%)',
            '800': 'hsl(NaN, NaN%, 24%)',
            '900': 'hsl(NaN, NaN%, 16%)',
            '950': 'hsl(NaN, NaN%, 10%)',
            DEFAULT: '#16a34a'
        },
        secondary: {
            '50': 'hsl(NaN, NaN%, 97%)',
            '100': 'hsl(NaN, NaN%, 94%)',
            '200': 'hsl(NaN, NaN%, 86%)',
            '300': 'hsl(NaN, NaN%, 76%)',
            '400': 'hsl(NaN, NaN%, 64%)',
            '500': 'hsl(NaN, NaN%, 50%)',
            '600': 'hsl(NaN, NaN%, 40%)',
            '700': 'hsl(NaN, NaN%, 32%)',
            '800': 'hsl(NaN, NaN%, 24%)',
            '900': 'hsl(NaN, NaN%, 16%)',
            '950': 'hsl(NaN, NaN%, 10%)',
            DEFAULT: '#22c55e'
        },
        'neutral-50': '#e5e5e5',
        'neutral-100': '#a3a3a3',
        'neutral-200': '#737373',
        'neutral-300': '#f5f5f5',
        'neutral-400': '#0a0a0a',
        'neutral-500': '#222222',
        background: '#0a0a0a',
        foreground: '#e5e5e5'
    },
    fontFamily: {
        body: [
            'ui-monospace',
            'sans-serif'
        ],
        font2: [
            'Recoleta',
            'sans-serif'
        ]
    },
    fontSize: {
        '11': [
            '11px',
            {
                lineHeight: '16.5px',
                letterSpacing: '0.88px'
            }
        ],
        '12': [
            '12px',
            {
                lineHeight: '18px'
            }
        ],
        '13': [
            '13px',
            {
                lineHeight: '18.2px'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: '21px'
            }
        ],
        '15': [
            '15px',
            {
                lineHeight: '22.5px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: 'normal'
            }
        ],
        '20': [
            '20px',
            {
                lineHeight: '30px',
                letterSpacing: '-0.2px'
            }
        ],
        '28': [
            '28px',
            {
                lineHeight: 'normal'
            }
        ],
        '40': [
            '40px',
            {
                lineHeight: '60px',
                letterSpacing: '-0.8px'
            }
        ],
        '72': [
            '72px',
            {
                lineHeight: '73.44px',
                letterSpacing: '-1.8px'
            }
        ],
        '17.92': [
            '17.92px',
            {
                lineHeight: '28.672px'
            }
        ],
        '13.3333': [
            '13.3333px',
            {
                lineHeight: 'normal'
            }
        ]
    },
    spacing: {
        '1': '2px',
        '16': '32px',
        '20': '40px',
        '24': '48px',
        '28': '56px',
        '36': '72px'
    },
    borderRadius: {
        md: '10px',
        full: '999px'
    },
    transitionDuration: {
        '120': '0.12s'
    },
    container: {
        center: true,
        padding: '32px'
    },
    maxWidth: {
        container: '1200px'
    }
},
  },
};

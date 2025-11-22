import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			// Cyberpunk Theme Colors
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			
  			// Primary: Acid Lime for accents
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			
  			// Dark theme colors
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			
  			// Cyberpunk specific colors
  			'acid-lime': '#a3e635',
  			'deep-black': '#000000',
  			'dark-zinc': '#18181b',
  			'zinc': {
  				800: '#27272a',
  				700: '#3f3f46',
  				600: '#52525b',
  				500: '#71717a',
  				400: '#a1a1aa',
  				300: '#d4d4d8',
  			},
  			
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		
  		fontFamily: {
  			'sans': ['var(--font-geist-sans)', 'system-ui', '-apple-system', 'sans-serif'],
  			'mono': ['SF Mono', 'Courier New', 'Courier', 'monospace'],
  			'display': ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
  		},
  		
  		fontSize: {
  			'xs': ['0.75rem', { lineHeight: '1rem' }],
  			'sm': ['0.875rem', { lineHeight: '1.25rem' }],
  			'base': ['1rem', { lineHeight: '1.5rem' }],
  			'lg': ['1.125rem', { lineHeight: '1.75rem' }],
  			'xl': ['1.25rem', { lineHeight: '1.75rem' }],
  			'2xl': ['1.5rem', { lineHeight: '2rem' }],
  			'3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  			'4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  			'5xl': ['3rem', { lineHeight: '1' }],
  			'6xl': ['3.75rem', { lineHeight: '1' }],
  			'7xl': ['4.5rem', { lineHeight: '1' }],
  			'8xl': ['6rem', { lineHeight: '1' }],
  			'9xl': ['8rem', { lineHeight: '1' }],
  			'display': ['10rem', { lineHeight: '0.9' }],
  		},
  		
  		animation: {
  			'marquee': 'marquee 20s linear infinite',
  			'marquee-fast': 'marquee 10s linear infinite',
  			'glitch': 'glitch 2s infinite',
  			'pulse-lime': 'pulse-lime 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'scan-line': 'scan-line 8s linear infinite',
  			'flicker': 'flicker 0.5s linear infinite',
  		},
  		
  		keyframes: {
  			marquee: {
  				'0%': { transform: 'translateX(0%)' },
  				'100%': { transform: 'translateX(-100%)' },
  			},
  			glitch: {
  				'0%, 100%': { transform: 'translate(0)' },
  				'20%': { transform: 'translate(-2px, 2px)' },
  				'40%': { transform: 'translate(-2px, -2px)' },
  				'60%': { transform: 'translate(2px, 2px)' },
  				'80%': { transform: 'translate(2px, -2px)' },
  			},
  			'pulse-lime': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' },
  			},
  			'scan-line': {
  				'0%': { transform: 'translateY(-100%)' },
  				'100%': { transform: 'translateY(100%)' },
  			},
  			flicker: {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.8' },
  			},
  		},
  		
  		borderRadius: {
  			'none': '0',
  			'sm': '0.125rem',
  			'DEFAULT': '0.25rem',
  			'md': '0.375rem',
  			'lg': '0.5rem',
  			'xl': '0.75rem',
  			'2xl': '1rem',
  			'3xl': '1.5rem',
  			'full': '9999px',
  		},
  		
  		backdropBlur: {
  			xs: '2px',
  			sm: '4px',
  			DEFAULT: '8px',
  			md: '12px',
  			lg: '16px',
  			xl: '24px',
  			'2xl': '40px',
  			'3xl': '64px',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

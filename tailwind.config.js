import { withUt } from "uploadthing/tw";

/** @type {import('tailwindcss').Config} */
module.exports = withUt({
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./frontend/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				slate: { '50': '#e9eee4', '100': '#dde6d5', '200': '#c9d6bd', '300': '#aebfa0', '400': '#7f9170', '500': '#5c6e51', '600': '#44523d', '700': '#33402d', '800': '#243319', '900': '#18240f', '950': '#0f170c' },
				sky: { '50': '#f1faea', '100': '#e0f5d1', '200': '#c3eba6', '300': '#a3e07f', '400': '#8fdd69', '500': '#7ed957', '600': '#3f8a22', '700': '#2b6416', '800': '#234f12', '900': '#1b3a10', '950': '#0f2208' },
				cyan: { '50': '#f1faea', '100': '#e0f5d1', '200': '#c3eba6', '300': '#a3e07f', '400': '#8fdd69', '500': '#7ed957', '600': '#3f8a22', '700': '#2b6416', '800': '#234f12', '900': '#1b3a10', '950': '#0f2208' },
				white: '#f6f9f2',
				ink: '#000000',
				physics: {
					black: '#e9eee4',
					charcoal: '#f6f9f2',
					panel: '#d8e2d0',
					cyan: '#7ed957',
					'cyan-bright': '#9be573',
					white: '#1c2418',
					muted: '#44523d',
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			fontFamily: {
				sans: ['var(--font-body)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				display: ['var(--font-display)', 'Cooper Black', 'Georgia', 'serif'],
			},
			boxShadow: {
				'hard-sm': '3px 3px 0 #000',
				hard: '4px 4px 0 #000',
				'hard-lg': '7px 7px 0 #000',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				rise: {
					from: { opacity: '0', transform: 'translate3d(0, 24px, 0) scale(0.97)' },
					to: { opacity: '1', transform: 'none' },
				},
				float: {
					'50%': { transform: 'translate3d(0, -10px, 0)' },
				},
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				rise: 'rise 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.12) backwards',
				float: 'float 4s ease-in-out infinite',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
});

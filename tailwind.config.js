/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
			success: {
				DEFAULT: 'hsl(var(--success))',
				foreground: 'hsl(var(--success-foreground))'
			},
			warning: {
				DEFAULT: 'hsl(var(--warning))',
				foreground: 'hsl(var(--warning-foreground))'
			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			auth: {
  				sidebar: '#20507F',
  				'sidebar-foreground': '#FFFFFF',
  				card: '#F6F8D5',
  				'card-foreground': '#20507F',
  				accent: '#98D2C0',
  				'accent-foreground': '#20507F'
  			},
  			selected: {
  				DEFAULT: 'hsl(var(--selected))',
  				foreground: 'hsl(var(--selected-foreground))'
  			},
  			hero: {
  				from: 'hsl(var(--hero-from))',
  				to: 'hsl(var(--hero-to))',
  				foreground: 'hsl(var(--hero-foreground))',
  				muted: 'hsl(var(--hero-muted))',
  				success: 'hsl(var(--hero-success))',
  				danger: 'hsl(var(--hero-danger))'
  			},
  			'chart-bar': 'hsl(var(--chart-bar))',
  			tint: {
  				'blue-fg': 'hsl(var(--tint-blue-fg))',     'blue-bg': 'hsl(var(--tint-blue-bg))',
  				'green-fg': 'hsl(var(--tint-green-fg))',   'green-bg': 'hsl(var(--tint-green-bg))',
  				'orange-fg': 'hsl(var(--tint-orange-fg))', 'orange-bg': 'hsl(var(--tint-orange-bg))',
  				'pink-fg': 'hsl(var(--tint-pink-fg))',     'pink-bg': 'hsl(var(--tint-pink-bg))',
  				'teal-fg': 'hsl(var(--tint-teal-fg))',     'teal-bg': 'hsl(var(--tint-teal-bg))',
  				'purple-fg': 'hsl(var(--tint-purple-fg))', 'purple-bg': 'hsl(var(--tint-purple-bg))',
  				'slate-fg': 'hsl(var(--tint-slate-fg))',   'slate-bg': 'hsl(var(--tint-slate-bg))',
  				'amber-fg': 'hsl(var(--tint-amber-fg))',   'amber-bg': 'hsl(var(--tint-amber-bg))'
  			},
  		},
  		fontSize: {
  			'4xl': 'var(--font-size-4xl)',
  			'3xl': 'var(--font-size-3xl)',
  			'2xl': 'var(--font-size-2xl)',
  			xl: 'var(--font-size-xl)',
  			lg: 'var(--font-size-lg)',
  			md: 'var(--font-size-md)',
  			sm: 'var(--font-size-sm)',
  			xs: 'var(--font-size-xs)',
  		},
  		lineHeight: {
  			'title-1': 'var(--leading-title-1)',
  			'title-2': 'var(--leading-title-2)',
  			'title-3': 'var(--leading-title-3)',
  			'title-4': 'var(--leading-title-4)',
  			'title-5': 'var(--leading-title-5)',
  			'body-lg': 'var(--leading-body-lg)',
  			'body-sm': 'var(--leading-body-sm)',
  			caption: 'var(--leading-caption)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			card: 'var(--shadow-card)',
  			floating: 'var(--shadow-floating)'
  		},
  		backgroundImage: {
  			'hero-gradient': 'linear-gradient(135deg, hsl(var(--hero-from)), hsl(var(--hero-to)))'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

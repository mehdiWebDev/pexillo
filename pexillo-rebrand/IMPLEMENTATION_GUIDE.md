# 🎮 PIXELLO CYBERPUNK REBRANDING GUIDE

## Overview
Complete transformation from clean e-commerce to "High-End Digital Streetwear" aesthetic with cyberpunk/industrial theme.

## 🚀 Quick Implementation

### 1. Copy Configuration Files

Copy these files to your project root:
- `/tailwind.config.ts` - Complete Tailwind configuration with cyberpunk theme
- `/src/styles/globals.css` - Global styles with dark theme and effects

### 2. Update Your Layout Files

#### Update `src/app/layout.tsx`:
```tsx
import "@/src/styles/globals.css"; // Use new global styles
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-deep-black text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

#### Update `src/app/[locale]/layout.tsx`:
```tsx
import { CyberNavbar } from "@/src/components/CyberNavbar";
import { CyberFooter } from "@/src/components/CyberFooter";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // ... existing locale setup ...

  return (
    <html lang={locale} className="dark">
      <body className="bg-deep-black text-white">
        <CyberNavbar />
        <main className="min-h-screen">
          {children}
        </main>
        <CyberFooter />
      </body>
    </html>
  );
}
```

### 3. Replace Components

Replace your existing components with the cyberpunk versions:

| Old Component | New Component | Location |
|--------------|---------------|----------|
| `NavMenu` / `NavigationMenu` | `CyberNavbar` | `/src/components/CyberNavbar.tsx` |
| `Footer` | `CyberFooter` | `/src/components/CyberFooter.tsx` |
| `HeroBanner` | `CyberHeroBanner` | `/src/components/CyberHeroBanner.tsx` |
| `FeaturedProducts` | `CyberFeaturedProducts` | `/src/components/CyberFeaturedProducts.tsx` |

### 4. Update Homepage

Replace `src/app/[locale]/page.tsx`:
```tsx
import { CyberHeroBanner } from "@/src/components/CyberHeroBanner";
import { CyberFeaturedProducts } from "@/src/components/CyberFeaturedProducts";
import { CyberProductCategories } from "@/src/components/CyberProductCategories";
import { CyberValueProps } from "@/src/components/CyberValueProps";

export default function Home() {
  return (
    <>
      <CyberHeroBanner />
      <CyberValueProps />
      <CyberFeaturedProducts />
      <CyberProductCategories />
    </>
  );
}
```

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--acid-lime: #a3e635    /* Primary accent */
--deep-black: #000000   /* Main background */
--dark-zinc: #18181b    /* Card backgrounds */

/* Text Colors */
--white: #ffffff        /* Headings */
--zinc-400: #a1a1aa    /* Body text */
--zinc-500: #71717a    /* Muted text */

/* Borders */
--zinc-800: #27272a    /* Default borders */
--acid-lime: #a3e635   /* Hover/active borders */
```

### Typography
```css
/* Headings */
font-family: 'Geist Sans', system-ui, sans-serif;
font-weight: 900;      /* Black weight */
text-transform: uppercase;
letter-spacing: -0.05em; /* Tight tracking */

/* Body/Technical */
font-family: 'SF Mono', 'Courier New', monospace;
font-size: 0.875rem;   /* Small, technical feel */
```

### Key CSS Classes

#### Glitch Effect
```html
<h1 className="glitch" data-text="CYBER">CYBER</h1>
```

#### System Button
```html
<button className="btn-system">
  ADD TO CART
</button>
```

#### Tech Border
```html
<div className="tech-border">
  Content
</div>
```

#### Product Card
```html
<div className="product-card-cyber">
  <!-- Product content -->
</div>
```

#### Status Indicator
```html
<div className="status-indicator">
  System Online
</div>
```

## 📦 Component Updates

### Product Cards
- Grayscale images by default, color on hover
- Sharp corners (no border-radius)
- Monospace font for prices
- "ADD TO SYSTEM" instead of "Add to Cart"
- Stock indicators for low inventory

### Buttons
```tsx
// Primary Button (Lime)
<button className="bg-acid-lime text-black font-mono font-bold uppercase px-6 py-3 hover:bg-white transition-all">
  START CREATING
</button>

// Secondary Button (Outlined)
<button className="border border-zinc-800 text-white font-mono uppercase px-6 py-3 hover:border-acid-lime hover:text-acid-lime transition-all">
  VIEW COLLECTIONS
</button>
```

### Forms/Inputs
```tsx
<input 
  className="bg-zinc-900 border border-zinc-800 text-white font-mono px-4 py-2 focus:border-acid-lime focus:outline-none"
  placeholder="ENTER EMAIL..."
/>
```

## 🔧 Additional Components to Update

### Product Listing Page (`/products`)
```tsx
// Filters styled as system controls
<div className="bg-zinc-900 border border-zinc-800 p-4">
  <h3 className="text-white font-mono uppercase mb-4">
    /// SYSTEM FILTERS
  </h3>
  {/* Filter options */}
</div>

// Grid with tech styling
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {/* Product cards */}
</div>
```

### Product Detail Page
```tsx
// Split layout with technical specs
<div className="grid lg:grid-cols-2 gap-8">
  {/* Left: Image with corner marks */}
  <div className="relative">
    {/* Corner decorations */}
    <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-acid-lime"></div>
    {/* Product image */}
  </div>
  
  {/* Right: Technical specs */}
  <div className="font-mono">
    <h1 className="text-4xl font-black uppercase">PRODUCT_NAME</h1>
    <div className="text-acid-lime text-2xl">$99.00</div>
    
    {/* Material Data Grid */}
    <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-zinc-900 border border-zinc-800">
      <div>
        <span className="text-zinc-500">MATERIAL:</span>
        <span className="text-white">100% COTTON</span>
      </div>
      {/* More specs */}
    </div>
  </div>
</div>
```

### Cart/Checkout
- Rename "Cart" to "SYSTEM MEMORY"
- Use monospace font for item counts and prices
- Technical styling for form fields
- Progress indicators as system status bars

## 🎬 Animations & Effects

### Marquee Text
```tsx
<div className="overflow-hidden">
  <div className="animate-marquee whitespace-nowrap">
    <span>SCROLLING TEXT MESSAGE /// </span>
    <span>SCROLLING TEXT MESSAGE /// </span>
  </div>
</div>
```

### Glitch Animation
Applied automatically to elements with `.glitch` class

### Scan Line Effect
```tsx
<div className="relative scan-line">
  {/* Content with animated scan line */}
</div>
```

### Hover Effects
- Images: Grayscale → Color
- Borders: zinc-800 → acid-lime
- Text: zinc-400 → white/acid-lime
- Scale: 1 → 1.05

## 📝 Copy Updates

| Old Copy | New Copy |
|----------|----------|
| "Welcome to our store" | "V.2.0 SYSTEM ONLINE" |
| "Shopping Cart" | "SYSTEM MEMORY" |
| "Add to Cart" | "ADD TO SYSTEM" |
| "Product Details" | "TECHNICAL SPECS" |
| "Description" | "DATA" |
| "Checkout" | "PROCESS ORDER" |
| "My Account" | "USER PROFILE" |
| "Search" | "QUERY DATABASE" |
| "Filter" | "SYSTEM FILTERS" |
| "Sort By" | "ORGANIZE DATA" |

## 🚨 Important Notes

1. **Force Dark Mode**: The theme is always dark. Remove any theme toggles or light mode options.

2. **Sharp Corners**: Use `rounded-none` or no border-radius by default. Only use minimal rounding for specific UI elements.

3. **Monospace Everything Technical**: Prices, stock counts, dates, system messages should all use `font-mono`.

4. **Uppercase Text**: Headers and CTAs should be uppercase. Use `uppercase` class liberally.

5. **Color Restraint**: Primarily black/white/gray with acid-lime accents. Avoid other colors except for specific badges.

## 🔍 Testing Checklist

- [ ] All pages use black background
- [ ] Navigation has marquee banner
- [ ] Logo is "P" in lime box
- [ ] Footer has giant PIXELLO watermark
- [ ] Product images are grayscale by default
- [ ] Hover states show lime accents
- [ ] All buttons use uppercase text
- [ ] Forms have technical styling
- [ ] Prices use monospace font
- [ ] System status indicators present
- [ ] Mobile menu uses full-screen overlay
- [ ] Animations (glitch, scan line) working

## 💾 Next Steps

1. Create remaining page components:
   - `CyberProductCategories.tsx`
   - `CyberValueProps.tsx`
   - `CyberProductDetail.tsx`
   - `CyberDesignStudio.tsx`
   - `CyberCheckout.tsx`

2. Update all product-related services to use new terminology

3. Add sound effects for interactions (optional)

4. Implement loading states with terminal-style animations

5. Create 404 page with "SYSTEM ERROR" theme

---

**SYSTEM MESSAGE:** Rebranding complete. Your e-commerce platform has been successfully upgraded to CYBERPUNK_MODE.

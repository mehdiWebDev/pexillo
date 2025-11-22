'use client';

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContentItem,
  NavigationMenuContentGrid,
  NavigationMenuContentList,
  NavigationMenuFeaturedItem,
} from "@/src/components/ui/navigation-menu";
import { Zap, Package, Shirt, Palette, Code, Layers } from "lucide-react";

// Example of implementing the cyberpunk navigation with dropdowns
export function CyberNavigationMenuExample() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {/* Shop Dropdown */}
        <NavigationMenuItem>
          <NavigationMenuTrigger variant="default">
            SHOP
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuContentGrid>
              <NavigationMenuFeaturedItem
                href="/products/featured"
                title="CYBER COLLECTION"
                badge="NEW"
              >
                Exclusive digital streetwear designs. Limited drops every week.
                System-generated patterns meet human creativity.
              </NavigationMenuFeaturedItem>
              
              <div className="space-y-2">
                <NavigationMenuContentItem
                  href="/products/t-shirts"
                  title="T-SHIRTS"
                  description="Premium cotton. Glitch graphics. DTF printed."
                />
                <NavigationMenuContentItem
                  href="/products/hoodies"
                  title="HOODIES"
                  description="Heavyweight fabric. Tech-inspired designs."
                />
                <NavigationMenuContentItem
                  href="/products/accessories"
                  title="ACCESSORIES"
                  description="Complete your digital aesthetic."
                />
                <NavigationMenuContentItem
                  href="/products/all"
                  title="VIEW ALL"
                  description="Browse complete catalog. 247+ items online."
                />
              </div>
            </NavigationMenuContentGrid>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Design Studio Dropdown */}
        <NavigationMenuItem>
          <NavigationMenuTrigger variant="default">
            STUDIO
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuContentList>
              <li className="col-span-2">
                <NavigationMenuFeaturedItem
                  href="/design"
                  title="DESIGN STUDIO V.2.0"
                  badge="BETA"
                >
                  Professional-grade design tools. Create your own glitch reality.
                  AI-powered suggestions. Real-time preview on products.
                </NavigationMenuFeaturedItem>
              </li>
              
              <NavigationMenuContentItem
                href="/design/templates"
                title="TEMPLATES"
                description="Start with pre-made designs. Customize everything."
              />
              
              <NavigationMenuContentItem
                href="/design/ai-tools"
                title="AI TOOLS"
                description="Generate unique patterns. Glitch effects. Style transfer."
              />
              
              <NavigationMenuContentItem
                href="/design/upload"
                title="UPLOAD"
                description="Bring your own designs. Support for PNG, SVG, AI files."
              />
              
              <NavigationMenuContentItem
                href="/design/gallery"
                title="GALLERY"
                description="Community creations. Get inspired. Share your work."
              />
            </NavigationMenuContentList>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Collections Dropdown */}
        <NavigationMenuItem>
          <NavigationMenuTrigger variant="default">
            COLLECTIONS
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuContentGrid>
              <div className="space-y-2">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 uppercase">
                    /// Active Collections
                  </span>
                </div>
                
                <NavigationMenuContentItem
                  href="/collections/cyber-001"
                  title="CYBER_001"
                  description="Original launch collection. 25 pieces."
                />
                
                <NavigationMenuContentItem
                  href="/collections/glitch-reality"
                  title="GLITCH REALITY"
                  description="Where digital meets physical. 42 pieces."
                />
                
                <NavigationMenuContentItem
                  href="/collections/neon-dreams"
                  title="NEON DREAMS"
                  description="Acid colors. Bold statements. 18 pieces."
                />
              </div>
              
              <div className="space-y-2">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 uppercase">
                    /// Limited Drops
                  </span>
                </div>
                
                <NavigationMenuContentItem
                  href="/collections/limited/winter-2025"
                  title="WINTER.25"
                  description="Cold weather. Hot designs. Dropping soon."
                />
                
                <NavigationMenuContentItem
                  href="/collections/limited/collab"
                  title="COLLABS"
                  description="Artist partnerships. Exclusive releases."
                />
                
                <NavigationMenuContentItem
                  href="/collections/archive"
                  title="ARCHIVE"
                  description="Past collections. Limited restocks."
                />
              </div>
            </NavigationMenuContentGrid>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Simple Links (no dropdown) */}
        <NavigationMenuItem>
          <Link href="/about" legacyBehavior passHref>
            <NavigationMenuLink className={cn(
              "group inline-flex h-10 w-max items-center justify-center px-4 py-2",
              "text-sm font-bold uppercase tracking-wider",
              "bg-transparent text-zinc-400",
              "hover:bg-zinc-900 hover:text-white",
              "transition-all duration-200",
              "relative",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-acid-lime",
              "after:scale-x-0 after:transition-transform after:duration-300",
              "hover:after:scale-x-100"
            )}>
              ABOUT
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

// Variant with icons and cyber styling
export function CyberNavigationWithIcons() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {/* Products with icon */}
        <NavigationMenuItem>
          <NavigationMenuTrigger variant="cyber" className="gap-2">
            <Package className="w-4 h-4" />
            PRODUCTS
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[400px] p-4 space-y-3">
              {/* Category grid */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/products/clothing"
                  className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 hover:border-acid-lime hover:bg-zinc-800 transition-all group"
                >
                  <Shirt className="w-5 h-5 text-zinc-500 group-hover:text-acid-lime" />
                  <div>
                    <div className="font-bold text-xs uppercase text-white group-hover:text-acid-lime">
                      Clothing
                    </div>
                    <div className="text-xs font-mono text-zinc-500">
                      156 items
                    </div>
                  </div>
                </Link>
                
                <Link
                  href="/products/accessories"
                  className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 hover:border-acid-lime hover:bg-zinc-800 transition-all group"
                >
                  <Zap className="w-5 h-5 text-zinc-500 group-hover:text-acid-lime" />
                  <div>
                    <div className="font-bold text-xs uppercase text-white group-hover:text-acid-lime">
                      Accessories
                    </div>
                    <div className="text-xs font-mono text-zinc-500">
                      42 items
                    </div>
                  </div>
                </Link>
              </div>
              
              {/* Quick filters */}
              <div className="pt-3 border-t border-zinc-800">
                <div className="text-xs font-mono text-zinc-500 uppercase mb-2">
                  /// Quick Filters
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/products?filter=new"
                    className="px-3 py-1 bg-acid-lime text-black text-xs font-bold uppercase hover:bg-white transition-colors"
                  >
                    NEW
                  </Link>
                  <Link
                    href="/products?filter=sale"
                    className="px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase hover:bg-red-400 transition-colors"
                  >
                    SALE
                  </Link>
                  <Link
                    href="/products?filter=limited"
                    className="px-3 py-1 bg-purple-500 text-white text-xs font-bold uppercase hover:bg-purple-400 transition-colors"
                  >
                    LIMITED
                  </Link>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Design Studio with icon */}
        <NavigationMenuItem>
          <NavigationMenuTrigger variant="cyber" className="gap-2">
            <Palette className="w-4 h-4" />
            STUDIO
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[600px] p-6">
              {/* Studio features grid */}
              <div className="grid grid-cols-3 gap-4">
                <Link
                  href="/design/create"
                  className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 p-4 hover:border-acid-lime transition-all"
                >
                  <div className="relative z-10">
                    <Code className="w-8 h-8 text-acid-lime mb-3" />
                    <h3 className="font-bold uppercase text-white group-hover:text-acid-lime transition-colors">
                      Create
                    </h3>
                    <p className="text-xs font-mono text-zinc-500 mt-1">
                      Start from scratch
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-acid-lime/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                
                <Link
                  href="/design/templates"
                  className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 p-4 hover:border-acid-lime transition-all"
                >
                  <div className="relative z-10">
                    <Layers className="w-8 h-8 text-acid-lime mb-3" />
                    <h3 className="font-bold uppercase text-white group-hover:text-acid-lime transition-colors">
                      Templates
                    </h3>
                    <p className="text-xs font-mono text-zinc-500 mt-1">
                      100+ designs ready
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-acid-lime/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                
                <Link
                  href="/design/ai"
                  className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 p-4 hover:border-acid-lime transition-all"
                >
                  <div className="relative z-10">
                    <Zap className="w-8 h-8 text-acid-lime mb-3" />
                    <h3 className="font-bold uppercase text-white group-hover:text-acid-lime transition-colors">
                      AI Tools
                    </h3>
                    <p className="text-xs font-mono text-zinc-500 mt-1">
                      Generate & enhance
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-acid-lime/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>
              
              {/* CTA */}
              <div className="mt-4 p-4 bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white">STUDIO PRO</h4>
                    <p className="text-xs font-mono text-zinc-500">
                      Unlock all features. No limits.
                    </p>
                  </div>
                  <Link
                    href="/studio/pro"
                    className="px-4 py-2 bg-acid-lime text-black font-bold uppercase text-xs hover:bg-white transition-colors"
                  >
                    UPGRADE
                  </Link>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

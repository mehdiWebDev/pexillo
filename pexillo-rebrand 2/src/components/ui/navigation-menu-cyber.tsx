import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center gap-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

// Cyberpunk styled trigger
const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: [
          "bg-transparent text-zinc-400",
          "hover:bg-zinc-900 hover:text-white",
          "focus:bg-zinc-900 focus:text-white",
          "data-[state=open]:bg-zinc-900 data-[state=open]:text-acid-lime",
          "data-[state=open]:border-b-2 data-[state=open]:border-acid-lime",
          "relative",
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-acid-lime",
          "after:scale-x-0 after:transition-transform after:duration-300",
          "hover:after:scale-x-100",
        ],
        cyber: [
          "bg-black border border-zinc-800",
          "text-zinc-400 font-mono",
          "hover:border-acid-lime hover:text-acid-lime hover:shadow-[0_0_10px_rgba(163,230,53,0.3)]",
          "data-[state=open]:border-acid-lime data-[state=open]:text-acid-lime",
          "data-[state=open]:bg-zinc-900",
        ],
        glitch: [
          "bg-transparent text-white font-black",
          "hover:text-acid-lime",
          "data-[state=open]:text-acid-lime",
          "relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-acid-lime before:to-transparent",
          "before:translate-x-[-200%] hover:before:translate-x-[200%]",
          "before:transition-transform before:duration-700",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger> & {
    variant?: "default" | "cyber" | "glitch"
  }
>(({ className, children, variant = "default", ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle({ variant }), "group", className)}
    {...props}
  >
    <span className="relative z-10">{children}</span>
    <ChevronDown
      className={cn(
        "relative top-[1px] ml-1 h-3 w-3 transition duration-300",
        "text-zinc-500 group-hover:text-acid-lime",
        "group-data-[state=open]:rotate-180 group-data-[state=open]:text-acid-lime"
      )}
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      // Animation classes
      "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out",
      "data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out",
      "data-[motion=from-end]:slide-in-from-right-52",
      "data-[motion=from-start]:slide-in-from-left-52",
      "data-[motion=to-end]:slide-out-to-right-52",
      "data-[motion=to-start]:slide-out-to-left-52",
      // Layout
      "left-0 top-0 w-full md:absolute md:w-auto",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        // Cyberpunk styling
        "bg-black/95 backdrop-blur-xl",
        "border border-zinc-800",
        "text-white",
        // Shadow with lime glow
        "shadow-2xl shadow-acid-lime/10",
        // Animation
        "origin-top-center relative mt-1.5",
        "h-[var(--radix-navigation-menu-viewport-height)]",
        "w-full md:w-[var(--radix-navigation-menu-viewport-width)]",
        "overflow-hidden",
        // State animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90",
        "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        // Grid background pattern (optional)
        "before:absolute before:inset-0 before:bg-gradient-to-b before:from-zinc-900/50 before:to-transparent before:pointer-events-none",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
      "data-[state=visible]:animate-in data-[state=hidden]:animate-out",
      "data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 bg-acid-lime shadow-[0_0_10px_rgba(163,230,53,0.5)]" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

// Additional styled components for content items
const NavigationMenuContentItem = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    title?: string
    description?: string
  }
>(({ className, title, children, description, href, ...props }, ref) => (
  <a
    ref={ref}
    href={href}
    className={cn(
      "block select-none space-y-1 p-3",
      "bg-transparent hover:bg-zinc-900",
      "border border-transparent hover:border-zinc-800",
      "no-underline outline-none transition-all duration-200",
      "focus:bg-zinc-900 focus:border-acid-lime",
      "group",
      className
    )}
    {...props}
  >
    {title && (
      <div className="text-sm font-bold uppercase tracking-wider text-white group-hover:text-acid-lime transition-colors">
        {title}
      </div>
    )}
    {description && (
      <p className="line-clamp-2 text-xs font-mono leading-snug text-zinc-400 group-hover:text-zinc-300">
        {description}
      </p>
    )}
    {children}
  </a>
))
NavigationMenuContentItem.displayName = "NavigationMenuContentItem"

// Grid layout for dropdown content
const NavigationMenuContentGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "grid gap-3 p-4 md:p-6",
      "md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]",
      className
    )}
    {...props}
  />
))
NavigationMenuContentGrid.displayName = "NavigationMenuContentGrid"

// List layout for dropdown content
const NavigationMenuContentList = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(
      "grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]",
      className
    )}
    {...props}
  />
))
NavigationMenuContentList.displayName = "NavigationMenuContentList"

// Featured item for highlighting important content
const NavigationMenuFeaturedItem = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    title?: string
    badge?: string
  }
>(({ className, title, children, badge, href, ...props }, ref) => (
  <a
    ref={ref}
    href={href}
    className={cn(
      "flex h-full w-full select-none flex-col justify-end",
      "bg-gradient-to-b from-zinc-900 to-zinc-800",
      "border border-zinc-800 hover:border-acid-lime",
      "p-6 no-underline outline-none",
      "transition-all duration-300",
      "hover:shadow-[0_0_20px_rgba(163,230,53,0.2)]",
      "focus:shadow-[0_0_20px_rgba(163,230,53,0.3)]",
      "group relative overflow-hidden",
      className
    )}
    {...props}
  >
    {/* Scan line effect on hover */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-acid-lime/5 to-transparent translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000" />
    
    {badge && (
      <span className="absolute top-4 right-4 px-2 py-1 bg-acid-lime text-black text-xs font-bold uppercase">
        {badge}
      </span>
    )}
    
    {title && (
      <div className="mb-2 mt-4 text-lg font-black uppercase text-white group-hover:text-acid-lime transition-colors">
        {title}
      </div>
    )}
    <p className="text-sm font-mono leading-tight text-zinc-400 group-hover:text-zinc-300 transition-colors">
      {children}
    </p>
  </a>
))
NavigationMenuFeaturedItem.displayName = "NavigationMenuFeaturedItem"

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  NavigationMenuContentItem,
  NavigationMenuContentGrid,
  NavigationMenuContentList,
  NavigationMenuFeaturedItem,
}

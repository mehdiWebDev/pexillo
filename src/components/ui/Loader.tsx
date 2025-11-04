// src/components/ui/Loader.tsx
import { ShoppingCart, Package, Loader2 } from 'lucide-react';

interface LoaderProps {
  type?: 'default' | 'cart' | 'products';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function Loader({ 
  type = 'default', 
  text = 'Loading...', 
  size = 'md',
  fullScreen = false 
}: LoaderProps) {
  const sizes = {
    sm: { icon: 16, container: 40, border: 2 },
    md: { icon: 24, container: 64, border: 3 },
    lg: { icon: 32, container: 80, border: 4 }
  };

  const currentSize = sizes[size];

  const icons = {
    default: <Loader2 className={`w-${currentSize.icon} h-${currentSize.icon} text-primary animate-spin`} />,
    cart: <ShoppingCart className={`w-${currentSize.icon} h-${currentSize.icon} text-muted-foreground/30`} />,
    products: <Package className={`w-${currentSize.icon} h-${currentSize.icon} text-muted-foreground/30`} />
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {type === 'default' ? (
        // Simple spinning loader
        <Loader2 className="text-primary animate-spin" size={currentSize.container} />
      ) : (
        // Icon with spinner overlay
        <div className="relative" style={{ width: currentSize.container, height: currentSize.container }}>
          {icons[type]}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ 
              width: currentSize.container, 
              height: currentSize.container 
            }}
          >
            <div 
              className="border-primary/20 border-t-primary rounded-full animate-spin"
              style={{ 
                width: currentSize.container - 8, 
                height: currentSize.container - 8,
                borderWidth: currentSize.border
              }}
            />
          </div>
        </div>
      )}
      
      {/* Loading Text */}
      {text && (
        <>
          <p className={`font-medium text-muted-foreground ${
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
          }`}>
            {text}
          </p>
          
          {/* Animated Dots */}
          <div className="flex justify-center gap-1.5">
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"></span>
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
          </div>
        </>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

// Usage Examples:
// <Loader /> - Simple spinner
// <Loader type="cart" text="Loading your cart..." fullScreen />
// <Loader type="products" text="Loading products..." size="lg" />
// <Loader size="sm" />
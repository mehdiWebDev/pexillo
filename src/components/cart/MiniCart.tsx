// src/components/cart/MiniCart.tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from '@/src/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { ShoppingCart, X, Plus, Minus, Trash2, ChevronRight } from 'lucide-react';
import { RootState, AppDispatch } from '@/src/store';
import {
  selectCartItems,
  selectCartIsOpen,
  selectCartSubtotal,
  selectCartItemCount,
  selectLastAddedItem,
  toggleCart,
  closeCart,
  updateCartItemLocal,
  removeFromCartLocal,
  updateCartItemDB,
  removeFromCartDB,
  clearLastAddedItem
} from '@/src/store/slices/cartSlice';
import { toast } from '@/src/hooks/use-toast';

// Cart Drawer Component
function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const t = useTranslations('cart');
  const locale = useLocale();
  
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const itemCount = useSelector(selectCartItemCount);
  const { isAuth, user } = useSelector((state: RootState) => state.auth);
  
  // EXACTLY LIKE IN ProductsPageClient - translate at display time
  const translatedItems = locale === 'en' ? items : items.map(item => {
    const productTrans = item.product_translations?.[locale] || {};
    const variantTrans = item.variant_translations?.[locale] || {};
    
    return {
      ...item,
      product_name: productTrans.name || item.product_name,
      variant_size: variantTrans.size || item.variant_size,
      variant_color: variantTrans.color || item.variant_color,
    };
  });

  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      if (isAuth && user?.id) {
        await dispatch(updateCartItemDB({ itemId, quantity: newQuantity })).unwrap();
      } else {
        dispatch(updateCartItemLocal({ itemId, quantity: newQuantity }));
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      if (isAuth && user?.id) {
        await dispatch(removeFromCartDB(itemId)).unwrap();
      } else {
        dispatch(removeFromCartLocal(itemId));
      }

      toast({
        title: t('success'),
        description: t('itemRemoved'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('removeFailed'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  const handleViewCart = () => {
    onClose();
    router.push('/cart');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Cart Drawer */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-md bg-background border-l shadow-2xl z-[9999]">
        <div className="h-full flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <h2 className="text-lg font-semibold">
              {t('cart')} ({itemCount})
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              aria-label={t('close')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          {translatedItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <ShoppingCart size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t('emptyCart')}</p>
              <button
                onClick={() => {
                  onClose();
                  router.push('/products');
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
              >
                {t('continueShopping')}
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-4">
                  {translatedItems.map((item) => {
                    const isUpdating = updatingItems.has(item.id);

                    return (
                      <div key={item.id} className="flex gap-3 pb-4 border-b last:border-0">
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-20 h-24 object-cover rounded-md cursor-pointer"
                          onClick={() => {
                            onClose();
                            router.push(`/products/${item.product_slug}`);
                          }}
                        />

                        <div className="flex-1">
                          <h3
                            className="font-medium text-sm mb-1 cursor-pointer hover:underline"
                            onClick={() => {
                              onClose();
                              router.push(`/products/${item.product_slug}`);
                            }}
                          >
                            {item.product_name}
                          </h3>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span>{item.variant_size}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: item.variant_color_hex }}
                              />
                              {item.variant_color}
                            </span>
                          </div>

                          <div className="text-sm font-medium mb-2">
                            ${item.unit_price.toFixed(2)}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border rounded-md">
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  disabled={isUpdating || item.quantity <= 1}
                                  className="p-1 hover:bg-muted disabled:opacity-30"
                                >
                                  <Minus size={14} />
                                </button>

                                <span className="px-3 text-sm min-w-[40px] text-center">
                                  {isUpdating ? '...' : item.quantity}
                                </span>

                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  disabled={isUpdating || item.quantity >= item.max_quantity}
                                  className="p-1 hover:bg-muted disabled:opacity-30"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isUpdating}
                                className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="text-sm font-semibold">
                              ${item.total_price.toFixed(2)}
                            </div>
                          </div>

                          {!item.in_stock && (
                            <div className="text-xs text-destructive mt-1">
                              {t('outOfStock')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t bg-background p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-base font-medium">{t('subtotal')}</span>
                  <span className="text-xl font-bold">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleViewCart}
                    className="w-full py-2.5 px-4 border border-input bg-background hover:bg-accent text-sm font-medium rounded-md"
                  >
                    {t('viewCart')}
                  </button>

                  <button
                    onClick={handleCheckout}
                    className="w-full py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md flex items-center justify-center gap-2"
                  >
                    {t('checkout')}
                    <ChevronRight size={16} />
                  </button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-3">
                  {t('shippingCalculatedAtCheckout')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Main MiniCart Component
export default function MiniCart() {
  const dispatch = useDispatch<AppDispatch>();
  const t = useTranslations('cart');
  const locale = useLocale();

  const isOpen = useSelector(selectCartIsOpen);
  const itemCount = useSelector(selectCartItemCount);
  const lastAddedItem = useSelector(selectLastAddedItem);

  const [showAddedNotification, setShowAddedNotification] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Show notification - translate it here too!
  useEffect(() => {
    if (lastAddedItem) {
      setShowAddedNotification(true);
      const timer = setTimeout(() => {
        setShowAddedNotification(false);
        dispatch(clearLastAddedItem());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedItem, dispatch]);

  // Translate the last added item for notification
  const translatedLastAddedItem = lastAddedItem && locale !== 'en' 
    ? {
        ...lastAddedItem,
        product_name: lastAddedItem.product_translations?.[locale]?.name || lastAddedItem.product_name,
        variant_size: lastAddedItem.variant_translations?.[locale]?.size || lastAddedItem.variant_size,
        variant_color: lastAddedItem.variant_translations?.[locale]?.color || lastAddedItem.variant_color,
      }
    : lastAddedItem;

  const handleClose = () => {
    dispatch(closeCart());
  };

  return (
    <>
      {/* Cart Toggle Button */}
      <button
        onClick={() => dispatch(toggleCart())}
        className="relative p-2 text-foreground hover:opacity-70 transition-opacity"
        aria-label={t('openCart')}
      >
        <ShoppingCart size={20} />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {itemCount}
          </span>
        )}
      </button>

      {/* Added to Cart Notification */}
      {showAddedNotification && translatedLastAddedItem && mounted && createPortal(
        <div className="fixed top-4 right-4 bg-card border rounded-lg shadow-lg p-4 z-[10000] max-w-sm">
          <div className="flex gap-3">
            <img
              src={translatedLastAddedItem.product_image}
              alt={translatedLastAddedItem.product_name}
              className="w-12 h-12 object-cover rounded-md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t('addedToCart')}</p>
              <p className="text-sm text-muted-foreground truncate">{translatedLastAddedItem.product_name}</p>
              <p className="text-xs text-muted-foreground">
                {translatedLastAddedItem.variant_size} / {translatedLastAddedItem.variant_color}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cart Drawer Portal */}
      {mounted && createPortal(
        <CartDrawer isOpen={isOpen} onClose={handleClose} />,
        document.body
      )}
    </>
  );
}
// src/components/cart/MiniCart.tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from '@/src/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, ChevronRight } from 'lucide-react';
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

  // Calculate total savings
  const totalSavings = items.reduce((sum, item) => {
    if (item.original_price && item.discount_amount) {
      return sum + (item.discount_amount * item.quantity);
    }
    return sum;
  }, 0);

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
    } catch {
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
    } catch {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Cart Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            {t('cart')} <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t('close')}
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {translatedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingCart size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">{t('emptyCart')}</p>
            <button
              onClick={() => {
                onClose();
                router.push('/products');
              }}
              className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
            >
              {t('continueShopping')}
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {translatedItems.map((item) => {
                const isUpdating = updatingItems.has(item.id);

                return (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 relative">
                      <Image
                        src={item.product_image}
                        alt={item.product_name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          onClose();
                          router.push(`/products/${item.product_slug}`);
                        }}
                      />
                      {item.discount_percentage && item.discount_percentage > 0 && (
                        <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          -{Math.round(item.discount_percentage)}%
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3
                            className="font-bold text-gray-900 cursor-pointer hover:underline"
                            onClick={() => {
                              onClose();
                              router.push(`/products/${item.product_slug}`);
                            }}
                          >
                            {item.product_name}
                          </h3>
                          <div className="text-right">
                            {(item.original_price && item.original_price > item.unit_price) || item.discount_percentage ? (
                              <div>
                                <span className="font-bold text-green-600 text-sm">${item.unit_price.toFixed(2)}</span>
                                <span className="text-xs text-gray-500 line-through ml-1">
                                  ${item.original_price?.toFixed(2)}
                                </span>
                                {item.discount_percentage && (
                                  <div className="text-[10px] text-green-600 font-bold">
                                    -{Math.round(item.discount_percentage)}% OFF
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-gray-900">${item.unit_price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Size: {item.variant_size} • Color: {item.variant_color}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={isUpdating || item.quantity <= 1}
                            className="px-2 py-1 hover:bg-gray-50 text-gray-500 disabled:opacity-30"
                          >
                            -
                          </button>
                          <span className="px-2 text-sm font-bold">
                            {isUpdating ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={isUpdating || item.quantity >= item.max_quantity}
                            className="px-2 py-1 hover:bg-gray-50 text-gray-500 disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isUpdating}
                          className="text-xs font-bold text-gray-400 hover:text-red-500 underline disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </div>

                      {!item.in_stock && (
                        <div className="text-xs text-red-500 mt-1">
                          {t('outOfStock')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-6 bg-white space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">{t('subtotal')}</span>
                  <span className="font-black text-xl text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-600 font-bold text-sm">{t('savings') || 'You Save'}</span>
                    <span className="text-green-600 font-bold text-sm">-${totalSavings.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">{t('shippingCalculatedAtCheckout')}</p>

              <div className="space-y-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-gray-800 transition-all flex justify-between items-center px-6 group"
                >
                  <span>{t('checkout')}</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleViewCart}
                  className="w-full py-3 border-2 border-gray-200 text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  {t('viewCart')}
                </button>
              </div>
            </div>
          </>
        )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
            <Image
              src={translatedLastAddedItem.product_image}
              alt={translatedLastAddedItem.product_name}
              width={48}
              height={48}
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
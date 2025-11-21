// app/[locale]/cart/CartPageClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from '@/src/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Loader from '@/src/components/ui/Loader';
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShoppingCart,
  Truck,
  Shield,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { RootState, AppDispatch } from '@/src/store';
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartItemCount,
  updateCartItemLocal,
  removeFromCartLocal,
  updateCartItemDB,
  removeFromCartDB,
  clearCartLocal,
  clearCartDB,
  loadCartFromStorage,
  fetchCart
} from '@/src/store/slices/cartSlice';
import { toast } from '@/src/hooks/use-toast';

export default function CartPageClient() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const t = useTranslations('cart');
  const locale = useLocale();

  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const itemCount = useSelector(selectCartItemCount);
  const { isAuth, user } = useSelector((state: RootState) => state.auth);
  const cartIsLoading = useSelector((state: RootState) => state.cart.isLoading);

  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // CRITICAL: Load cart on mount
  useEffect(() => {
    if (isAuth && user?.id) {
      dispatch(fetchCart(user.id)).finally(() => {
        setIsInitialized(true);
      });
    } else {
      dispatch(loadCartFromStorage());
      setIsInitialized(true);
    }
  }, [isAuth, user?.id, dispatch]);

  // Apply translations at display time
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

  // Calculate shipping and totals
  const shipping = subtotal > 75 ? 0 : 9.99;
  const tax = subtotal * 0.15;
  const total = subtotal + shipping + tax;

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (newQuantity > item.max_quantity) {
      toast({
        title: t('error'),
        description: t('maxQuantityExceeded', { max: item.max_quantity }),
        variant: 'destructive',
      });
      return;
    }

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
    setRemovingItems(prev => new Set(prev).add(itemId));

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
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleClearCart = async () => {
    if (!confirm(t('clearConfirm'))) return;

    setIsClearing(true);

    try {
      if (isAuth && user?.id) {
        await dispatch(clearCartDB(user.id)).unwrap();
      } else {
        dispatch(clearCartLocal());
      }

      toast({
        title: t('success'),
        description: t('cartCleared'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('clearFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push('/checkout');
  };


  // Show loading state while initializing
  if (!isInitialized || cartIsLoading) {
    return (
      <Loader text="Loading your cart..." fullScreen />
    );
  }

  // Empty cart state
  if (items.length === 0 && !cartIsLoading) {
    return (
      <div className="min-h-screen bg-background mt-10">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <ShoppingCart className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold mb-4">{t('emptyCartTitle')}</h1>
            <p className="text-muted-foreground mb-8">{t('emptyCartMessage')}</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <ArrowLeft size={20} />
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-background mt-10">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {t('pageTitle')} ({itemCount} {itemCount === 1 ? t('item') : t('items')})
          </h1>
          <div className="flex items-center justify-between">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft size={16} />
              {t('continueShopping')}
            </Link>
            <button
              onClick={handleClearCart}
              disabled={isClearing}
              className="text-sm text-destructive hover:underline disabled:opacity-50"
            >
              {t('clearCart')}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items - Left Side */}
          <div className="lg:col-span-2 space-y-4">
            {translatedItems.map((item) => {
              const isUpdating = updatingItems.has(item.id);
              const isRemoving = removingItems.has(item.id);
              const isProcessing = isUpdating || isRemoving;

              return (
                <div
                  key={item.id}
                  className={`
                    bg-card border rounded-lg p-4 transition-opacity
                    ${isRemoving ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link
                      href={`/products/${item.product_slug}`}
                      className="flex-shrink-0"
                    >
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-24 h-28 object-cover rounded-md hover:opacity-80 transition-opacity"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <Link
                            href={`/products/${item.product_slug}`}
                            className="font-semibold text-lg hover:underline"
                          >
                            {item.product_name}
                          </Link>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>{t('size')}: {item.variant_size}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {t('color')}:
                              <span
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: item.variant_color_hex }}
                              />
                              {item.variant_color}
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            ${item.total_price.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ${item.unit_price.toFixed(2)} {t('each')}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls & Remove */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          {/* Quantity Selector */}
                          <div className="flex items-center border rounded-lg">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={isProcessing || item.quantity <= 1}
                              className="p-2 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus size={16} />
                            </button>

                            <span className="px-4 py-2 min-w-[60px] text-center font-medium">
                              {isUpdating ? '...' : item.quantity}
                            </span>

                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={isProcessing || item.quantity >= item.max_quantity}
                              className="p-2 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          {/* Stock Warning */}
                          {item.quantity === item.max_quantity && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              {t('maxStock')}
                            </span>
                          )}
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isProcessing}
                          className="flex items-center gap-2 text-sm text-destructive hover:underline disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          {t('remove')}
                        </button>
                      </div>

                      {/* Out of Stock Warning */}
                      {!item.in_stock && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 text-destructive rounded-md">
                          <AlertCircle size={16} />
                          <span className="text-sm">{t('outOfStock')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary - Right Side */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">{t('orderSummary')}</h2>

              <div className="space-y-3 pb-4 border-b">
                <div className="flex justify-between">
                  <span>{t('subtotal')}</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('shipping')}</span>
                  <span className="font-medium">
                    {shipping === 0 ? (
                      <span className="text-green-600">{t('free')}</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('tax')}</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between py-4 text-lg font-bold">
                <span>{t('total')}</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {/* Free Shipping Progress */}
              {shipping > 0 && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {t('freeShippingAt', { amount: (75 - subtotal).toFixed(2) })}
                  </p>
                  <div className="w-full bg-amber-200 dark:bg-amber-900 rounded-full h-2 mt-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((subtotal / 75) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {t('proceedToCheckout')}
                <ArrowLeft className="rotate-180" size={20} />
              </button>

              {/* Trust Badges */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Shield className="w-5 h-5" />
                  <span>{t('secureCheckout')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Truck className="w-5 h-5" />
                  <span>{t('fastShipping')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CreditCard className="w-5 h-5" />
                  <span>{t('paymentMethods')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
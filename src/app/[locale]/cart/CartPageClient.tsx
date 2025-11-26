// app/[locale]/cart/CartPageClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from '@/src/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import Loader from '@/src/components/ui/Loader';
import {
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
    } catch {
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
    } catch {
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
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <Link
              href="/products"
              className="text-lg font-semibold tracking-tighter group flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              {t('continueShopping')}
            </Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <ShoppingCart className="w-20 h-20 md:w-24 md:h-24 mx-auto text-gray-400 mb-6" />
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">{t('emptyCartTitle')}</h1>
          <p className="text-gray-500 mb-8 text-sm md:text-base">{t('emptyCartMessage')}</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:-translate-y-1"
          >
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 py-6 sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
          <Link
            href="/products"
            className="text-lg font-semibold tracking-tighter group flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            {t('continueShopping')}
          </Link>
          <button
            onClick={handleClearCart}
            disabled={isClearing}
            className="text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors"
          >
            {t('clearCart')}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
          {/* Cart Items - Left Side */}
          <div className="lg:col-span-7 space-y-6 md:space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">
                {t('pageTitle')}
              </h1>
              <p className="text-sm md:text-base text-gray-500">
                {itemCount} {itemCount === 1 ? t('item') : t('items')} {t('inCart')}
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              {translatedItems.map((item) => {
                const isUpdating = updatingItems.has(item.id);
                const isRemoving = removingItems.has(item.id);
                const isProcessing = isUpdating || isRemoving;

                return (
                  <div
                    key={item.id}
                    className={`
                      border-b border-gray-200 pb-4 md:pb-6 transition-opacity last:border-0
                      ${isRemoving ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex gap-3 md:gap-4">
                      {/* Product Image */}
                      <Link
                        href={`/products/${item.product_slug}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-20 h-24 sm:w-24 sm:h-28 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            width={96}
                            height={112}
                            className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                          />
                        </div>
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/products/${item.product_slug}`}
                              className="font-bold text-gray-900 text-sm md:text-base hover:underline line-clamp-2"
                            >
                              {item.product_name}
                            </Link>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">
                              {t('size')}: {item.variant_size} • {t('color')}: {item.variant_color}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-gray-900 text-sm md:text-base">
                              ${item.total_price.toFixed(2)}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">
                              ${item.unit_price.toFixed(2)} {t('each')}
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls & Remove */}
                        <div className="flex items-center justify-between mt-3 md:mt-4">
                          <div className="flex items-center gap-2">
                            {/* Quantity Selector */}
                            <div className="flex items-center border-2 border-gray-200 rounded-lg">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={isProcessing || item.quantity <= 1}
                                className="px-2 py-1 md:px-3 md:py-2 hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus size={16} />
                              </button>

                              <span className="px-3 md:px-4 py-1 md:py-2 min-w-[40px] md:min-w-[50px] text-center font-bold text-sm md:text-base">
                                {isUpdating ? '...' : item.quantity}
                              </span>

                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                disabled={isProcessing || item.quantity >= item.max_quantity}
                                className="px-2 py-1 md:px-3 md:py-2 hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>

                            {/* Stock Warning */}
                            {item.quantity === item.max_quantity && (
                              <span className="text-xs text-amber-600">
                                {t('maxStock')}
                              </span>
                            )}
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isProcessing}
                            className="text-xs md:text-sm font-bold text-gray-400 hover:text-red-500 underline disabled:opacity-50"
                          >
                            {t('remove')}
                          </button>
                        </div>

                        {/* Out of Stock Warning */}
                        {!item.in_stock && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 text-red-600 rounded-md">
                            <AlertCircle size={16} />
                            <span className="text-xs md:text-sm font-medium">{t('outOfStock')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary - Right Side */}
          <div className="lg:col-span-5">
            <div className="bg-gray-50 rounded-2xl p-4 md:p-6 lg:sticky lg:top-32 border border-gray-200">
              <h3 className="font-black text-lg md:text-xl text-gray-900 mb-4 md:mb-6">{t('orderSummary')}</h3>

              {/* Free Shipping Progress */}
              {shipping > 0 && (
                <div className="mb-4 md:mb-6 bg-white p-3 md:p-4 rounded-xl border border-gray-200">
                  <div className="flex justify-between text-xs md:text-sm font-bold mb-2">
                    <span className="text-gray-900">{t('freeShippingAt', { amount: (75 - subtotal).toFixed(2) })}</span>
                    <span className="text-red-600">{Math.min((subtotal / 75) * 100, 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-900 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((subtotal / 75) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 md:space-y-3 border-t border-gray-200 pt-4 md:pt-6">
                <div className="flex justify-between text-xs md:text-sm font-medium text-gray-500">
                  <span>{t('subtotal')}</span>
                  <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm font-medium text-gray-500">
                  <span>{t('shipping')}</span>
                  <span className="text-gray-900">
                    {shipping === 0 ? t('free') : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs md:text-sm font-medium text-gray-500">
                  <span>{t('tax')}</span>
                  <span className="text-gray-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-3 md:pt-4 mt-3 md:mt-4">
                  <span className="font-black text-base md:text-xl text-gray-900">{t('total')}</span>
                  <div className="text-right">
                    <span className="text-[10px] md:text-xs text-gray-400 font-medium mr-1 md:mr-2">CAD</span>
                    <span className="font-black text-lg md:text-2xl text-gray-900">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full mt-4 md:mt-6 py-4 md:py-5 bg-gray-900 text-white font-black text-base md:text-lg rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                {t('proceedToCheckout')}
                <ArrowLeft className="rotate-180 w-5 h-5" />
              </button>

              {/* Trust Badges */}
              <div className="mt-4 md:mt-6 space-y-2 md:space-y-3">
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500">
                  <Shield className="w-4 h-4 md:w-5 md:h-5" />
                  <span>{t('secureCheckout')}</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500">
                  <Truck className="w-4 h-4 md:w-5 md:h-5" />
                  <span>{t('fastShipping')}</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500">
                  <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
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
// src/hooks/useCart.ts
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/src/store';
import { cartService } from '@/src/services/cartService';
import {
    fetchCart,
    addToCartDB,
    addToCartLocal,
    loadCartFromStorage,
    openCart,
} from '@/src/store/slices/cartSlice';
import { toast } from '@/src/hooks/use-toast';

export function useCart() {
    const dispatch = useDispatch<AppDispatch>();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const cart = useSelector((state: RootState) => state.cart);

    // Load cart on mount
    useEffect(() => {
        if (isAuth && user?.id) {
            dispatch(fetchCart(user.id));
        } else {
            dispatch(loadCartFromStorage());
        }
    }, [isAuth, user?.id, dispatch]);

    // Merge cart on login
    useEffect(() => {
        if (isAuth && user?.id && cart.items.length > 0) {
            const hasLocalItems = cart.items.some(item => 
                typeof item.id === 'string' && item.id.includes('-')
            );

            if (hasLocalItems) {
                const mergeItems = cart.items.map(item => ({
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    customization_price: item.customization_price,
                }));

                cartService.mergeCart(user.id, mergeItems).then(() => {
                    dispatch(fetchCart(user.id));
                });
            }
        }
    }, [isAuth, user?.id]);

    // Simple add to cart - let the display components handle translation
    const addToCart = useCallback(async (
        productId: string,
        variantId: string,
        productDetails: {
            name: string;
            slug: string;
            image: string;
            unitPrice: number;
            variantSize: string;
            variantColor: string;
            variantColorHex?: string;
            maxQuantity: number;
            translations?: any;
            variantTranslations?: any;
        },
        quantity: number = 1
    ) => {
        try {
            if (isAuth && user?.id) {
                // For logged in users, just save to DB
                await dispatch(addToCartDB({
                    userId: user.id,
                    productId,
                    variantId,
                    quantity,
                    unitPrice: productDetails.unitPrice,
                })).unwrap();
                
                // Success toast
                toast({
                    title: 'Added to cart',
                    description: `${productDetails.name} added successfully`,
                });
            } else {
                // For anonymous users, save everything including translations
                const cartItem = {
                    id: `${Date.now()}-${Math.random()}`,
                    product_id: productId,
                    variant_id: variantId,
                    product_name: productDetails.name,
                    product_slug: productDetails.slug,
                    product_image: productDetails.image,
                    variant_size: productDetails.variantSize,
                    variant_color: productDetails.variantColor,
                    variant_color_hex: productDetails.variantColorHex,
                    quantity,
                    unit_price: productDetails.unitPrice,
                    customization_price: 0,
                    total_price: productDetails.unitPrice * quantity,
                    in_stock: true,
                    max_quantity: productDetails.maxQuantity,
                    product_translations: productDetails.translations,
                    variant_translations: productDetails.variantTranslations,
                };

                dispatch(addToCartLocal(cartItem));
                
                // Success toast
                toast({
                    title: 'Added to cart',
                    description: `${productDetails.name} added successfully`,
                });
            }

            dispatch(openCart());
            return true;
        } catch (error) {
            console.error('Add to cart error:', error);
            toast({
                title: 'Error',
                description: 'Failed to add item to cart',
                variant: 'destructive',
            });
            return false;
        }
    }, [isAuth, user?.id, dispatch]);

    return {
        items: cart.items,
        isOpen: cart.isOpen,
        isLoading: cart.isLoading,
        error: cart.error,
        subtotal: cart.items.reduce((sum, item) => sum + item.total_price, 0),
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        addToCart,
    };
}
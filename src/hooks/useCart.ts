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
    updateCartItemLocal
} from '@/src/store/slices/cartSlice';
import { toast } from '@/src/hooks/use-toast';

export function useCart() {
    const dispatch = useDispatch<AppDispatch>();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const cart = useSelector((state: RootState) => state.cart);

    // Load cart on mount - ONLY if not already fetched
    useEffect(() => {
        if (cart.hasFetched) return; // Prevent duplicate fetches

        if (isAuth && user?.id) {
            dispatch(fetchCart(user.id));
        } else {
            dispatch(loadCartFromStorage());
        }
    }, [isAuth, user?.id, dispatch, cart.hasFetched]);

    // Merge cart on login - ONLY ONCE
    useEffect(() => {
        // Only run if user just logged in and has local cart items
        if (isAuth && user?.id && cart.items.length > 0 && !cart.hasFetched) {
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
    }, [isAuth, user?.id, cart.items, cart.hasFetched, dispatch]);

    // FIXED: Check existing cart quantity before adding
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
            translations?: Record<string, { name?: string; description?: string }>;
            variantTranslations?: Record<string, { size?: string; color?: string }>;
        },
        quantity: number = 1
    ) => {
        try {
            // CHECK EXISTING CART QUANTITY FIRST
            const existingItem = cart.items.find(item => item.variant_id === variantId);
            const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
            const totalAfterAdd = currentQuantityInCart + quantity;
            
            // Validate against max inventory
            if (totalAfterAdd > productDetails.maxQuantity) {
                const availableToAdd = productDetails.maxQuantity - currentQuantityInCart;
                
                if (availableToAdd <= 0) {
                    toast({
                        title: 'Cannot add more',
                        description: `You already have the maximum available quantity (${productDetails.maxQuantity}) in your cart`,
                        variant: 'destructive',
                    });
                    return false;
                }
                
                // Adjust quantity to max available
                quantity = availableToAdd;
                toast({
                    title: 'Quantity adjusted',
                    description: `Only ${availableToAdd} more available. Added ${availableToAdd} to cart.`,
                });
            }

            if (isAuth && user?.id) {
                // For logged in users, save to DB
                await dispatch(addToCartDB({
                    userId: user.id,
                    productId,
                    variantId,
                    quantity,
                    unitPrice: productDetails.unitPrice,
                })).unwrap();
                
                toast({
                    title: 'Added to cart',
                    description: `${productDetails.name} added successfully`,
                });
            } else {
                // For anonymous users
                if (existingItem) {
                    // Update existing item
                    dispatch(updateCartItemLocal({ 
                        itemId: existingItem.id, 
                        quantity: currentQuantityInCart + quantity 
                    }));
                } else {
                    // Add new item
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
                }
                
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
    }, [isAuth, user?.id, dispatch, cart.items]);

    // Helper function to check if can add more
    const canAddToCart = useCallback((variantId: string, maxQuantity: number) => {
        const existingItem = cart.items.find(item => item.variant_id === variantId);
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        return currentQuantity < maxQuantity;
    }, [cart.items]);

    // Get current quantity in cart for a variant
    const getCartQuantity = useCallback((variantId: string) => {
        const existingItem = cart.items.find(item => item.variant_id === variantId);
        return existingItem ? existingItem.quantity : 0;
    }, [cart.items]);

    return {
        items: cart.items,
        isOpen: cart.isOpen,
        isLoading: cart.isLoading,
        error: cart.error,
        subtotal: cart.items.reduce((sum, item) => sum + item.total_price, 0),
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        addToCart,
        canAddToCart,
        getCartQuantity,
    };
}
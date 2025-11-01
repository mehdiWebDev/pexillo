// src/services/cartService.ts
import { createClient } from '@/lib/supabase/client';

export interface CartItemInput {
    userId: string;
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    customizationPrice?: number;
}

export interface CartMergeItem {
    product_id: string;
    variant_id: string;
    quantity: number;
    unit_price: number;
    customization_price?: number;
}

class CartService {
    // Get full cart details with product and variant information
    async getCart(userId: string) {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('cart_items')
            .select(`
      *,
      products!inner (
        id,
        name,
        slug,
        primary_image_url,
        badge,
        is_active,
        translations  -- Include translations JSONB
      ),
      product_variants!inner (
        id,
        size,
        color,
        color_hex,
        inventory_count,
        is_active,
        price_adjustment,
        translations  -- Include translations JSONB
      )
    `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data?.map(item => ({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.products.name, // Store default name
            product_slug: item.products.slug,
            product_image: item.products.primary_image_url,
            variant_size: item.product_variants.size, // Store default size
            variant_color: item.product_variants.color, // Store default color
            variant_color_hex: item.product_variants.color_hex,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price),
            customization_price: parseFloat(item.customization_price || 0),
            total_price: parseFloat(item.total_price),
            in_stock: item.product_variants.inventory_count > 0,
            max_quantity: item.product_variants.inventory_count,
            // Store the translations objects
            product_translations: item.products.translations,
            variant_translations: item.product_variants.translations,
        })) || [];
    }


    // Add item to cart or update quantity if exists
    async addToCart(input: CartItemInput) {
        const supabase = createClient();

        // Check inventory first
        const { data: variant } = await supabase
            .from('product_variants')
            .select('inventory_count')
            .eq('id', input.variantId)
            .single();

        if (!variant || variant.inventory_count < input.quantity) {
            throw new Error('Insufficient inventory');
        }

        // Check if item already exists
        const { data: existing } = await supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('user_id', input.userId)
            .eq('variant_id', input.variantId)
            .single();

        if (existing) {
            // Check total quantity doesn't exceed inventory
            const newQuantity = existing.quantity + input.quantity;
            if (newQuantity > variant.inventory_count) {
                throw new Error('Cannot add more items than available in stock');
            }

            // Update quantity
            const { data, error } = await supabase
                .from('cart_items')
                .update({
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return { data, isUpdate: true };
        } else {
            // Add new item
            const { data, error } = await supabase
                .from('cart_items')
                .insert({
                    user_id: input.userId,
                    product_id: input.productId,
                    variant_id: input.variantId,
                    quantity: input.quantity,
                    unit_price: input.unitPrice,
                    customization_price: input.customizationPrice || 0,
                })
                .select()
                .single();

            if (error) throw error;
            return { data, isUpdate: false };
        }
    }

    // Update cart item quantity
    async updateQuantity(itemId: string, quantity: number, userId: string) {
        const supabase = createClient();

        // Verify ownership and get variant info
        const { data: cartItem } = await supabase
            .from('cart_items')
            .select(`
        variant_id,
        user_id,
        product_variants!inner (
          inventory_count
        )
      `)
            .eq('id', itemId)
            .single();

        if (!cartItem || cartItem.user_id !== userId) {
            throw new Error('Cart item not found');
        }

        if (quantity > cartItem.product_variants.inventory_count) {
            throw new Error('Quantity exceeds available inventory');
        }

        if (quantity <= 0) {
            // Remove item if quantity is 0
            return this.removeItem(itemId, userId);
        }

        const { data, error } = await supabase
            .from('cart_items')
            .update({
                quantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Remove item from cart
    async removeItem(itemId: string, userId: string) {
        const supabase = createClient();

        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', itemId)
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true };
    }

    // Clear entire cart
    async clearCart(userId: string) {
        const supabase = createClient();

        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true };
    }

    // Get cart count for header badge
    async getCartCount(userId: string): Promise<number> {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('cart_items')
            .select('quantity')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching cart count:', error);
            return 0;
        }

        return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    }

    // Get cart summary (for checkout)
    async getCartSummary(userId: string) {
        const cart = await this.getCart(userId);

        const subtotal = cart.reduce((sum, item) => {
            const itemTotal = (parseFloat(item.unit_price) + parseFloat(item.customization_price || 0)) * item.quantity;
            return sum + itemTotal;
        }, 0);

        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

        return {
            items: cart,
            subtotal,
            itemCount,
            shipping: 0, // Calculate based on your logic
            tax: 0, // Calculate based on your logic
            total: subtotal,
        };
    }

    // Merge anonymous cart with user cart on login
    async mergeCart(userId: string, anonymousCart: CartMergeItem[]) {
        if (!anonymousCart || anonymousCart.length === 0) return;

        const supabase = createClient();

        // Get existing user cart
        const { data: existingItems } = await supabase
            .from('cart_items')
            .select('variant_id, quantity')
            .eq('user_id', userId);

        const existingMap = new Map(
            existingItems?.map(item => [item.variant_id, item.quantity]) || []
        );

        // Process each anonymous cart item
        for (const item of anonymousCart) {
            try {
                // Check inventory
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('inventory_count')
                    .eq('id', item.variant_id)
                    .single();

                if (!variant) continue;

                const existingQuantity = existingMap.get(item.variant_id) || 0;
                const totalQuantity = Math.min(
                    existingQuantity + item.quantity,
                    variant.inventory_count
                );

                if (existingQuantity > 0) {
                    // Update existing item
                    await supabase
                        .from('cart_items')
                        .update({
                            quantity: totalQuantity,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .eq('variant_id', item.variant_id);
                } else {
                    // Add new item
                    await supabase
                        .from('cart_items')
                        .insert({
                            user_id: userId,
                            product_id: item.product_id,
                            variant_id: item.variant_id,
                            quantity: Math.min(item.quantity, variant.inventory_count),
                            unit_price: item.unit_price,
                            customization_price: item.customization_price || 0,
                        });
                }
            } catch (error) {
                console.error('Error merging cart item:', error);
                // Continue with other items even if one fails
            }
        }

        // Clear localStorage after successful merge
        if (typeof window !== 'undefined') {
            localStorage.removeItem('cart');
        }
    }

    // Validate cart items (check inventory before checkout)
    async validateCart(userId: string) {
        const cart = await this.getCart(userId);
        const validationIssues: any[] = [];

        for (const item of cart) {
            if (item.product_variants.inventory_count < item.quantity) {
                validationIssues.push({
                    itemId: item.id,
                    productName: item.products.name,
                    variant: `${item.product_variants.size} / ${item.product_variants.color}`,
                    requestedQuantity: item.quantity,
                    availableQuantity: item.product_variants.inventory_count,
                    issue: item.product_variants.inventory_count === 0 ? 'out_of_stock' : 'insufficient_stock'
                });
            }
        }

        return {
            isValid: validationIssues.length === 0,
            issues: validationIssues
        };
    }

}

export const cartService = new CartService();



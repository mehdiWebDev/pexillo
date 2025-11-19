// src/store/slices/cartSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { createClient } from '@/lib/supabase/client';

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  product_name: string; // Default English name
  product_slug: string;
  product_image: string;
  variant_size: string; // Default size
  variant_color: string; // Default color
  variant_color_hex?: string;
  quantity: number;
  unit_price: number;
  customization_price?: number;
  total_price: number;
  in_stock: boolean;
  max_quantity: number;
  // Add translations just like in products
  product_translations?: any;
  variant_translations?: any;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  subtotal: number;
  itemCount: number;
  lastAddedItem: CartItem | null;
  hasFetched: boolean;
}

const initialState: CartState = {
  items: [],
  isOpen: false,
  isLoading: false,
  error: null,
  subtotal: 0,
  itemCount: 0,
  lastAddedItem: null,
  hasFetched: false,
};

// Fetch cart from database WITH translations
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (userId: string) => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          name,
          slug,
          primary_image_url,
          translations
        ),
        product_variants (
          size,
          color,
          color_hex,
          inventory_count,
          translations
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data?.map(item => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.products.name,
      product_slug: item.products.slug,
      product_image: item.products.primary_image_url,
      variant_size: item.product_variants.size,
      variant_color: item.product_variants.color,
      variant_color_hex: item.product_variants.color_hex,
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      customization_price: parseFloat(item.customization_price || 0),
      total_price: parseFloat(item.total_price),
      in_stock: item.product_variants.inventory_count > 0,
      max_quantity: item.product_variants.inventory_count,
      // Include translations
      product_translations: item.products.translations,
      variant_translations: item.product_variants.translations,
    })) || [];
  }
);

export const addToCartDB = createAsyncThunk(
  'cart/addToCartDB',
  async ({ 
    userId, 
    productId, 
    variantId, 
    quantity, 
    unitPrice 
  }: {
    userId: string;
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
  }) => {
    const supabase = createClient();
    
    // Check if item already exists
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('variant_id', variantId)
      .single();

    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({ 
          quantity: existing.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select(`
          *,
          products (
            name,
            slug,
            primary_image_url,
            translations
          ),
          product_variants (
            size,
            color,
            color_hex,
            inventory_count,
            translations
          )
        `)
        .single();

      if (error) throw error;
      return { item: data, isUpdate: true };
    } else {
      // Add new item
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          product_id: productId,
          variant_id: variantId,
          quantity,
          unit_price: unitPrice,
        })
        .select(`
          *,
          products (
            name,
            slug,
            primary_image_url,
            translations
          ),
          product_variants (
            size,
            color,
            color_hex,
            inventory_count,
            translations
          )
        `)
        .single();

      if (error) throw error;
      return { item: data, isUpdate: false };
    }
  }
);

export const updateCartItemDB = createAsyncThunk(
  'cart/updateCartItemDB',
  async ({ 
    itemId, 
    quantity 
  }: {
    itemId: string;
    quantity: number;
  }) => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('cart_items')
      .update({ 
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) throw error;
    return { itemId, quantity };
  }
);

export const removeFromCartDB = createAsyncThunk(
  'cart/removeFromCartDB',
  async (itemId: string) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return itemId;
  }
);

export const clearCartDB = createAsyncThunk(
  'cart/clearCartDB',
  async (userId: string) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCartLocal: (state, action: PayloadAction<CartItem>) => {
      const existingItemIndex = state.items.findIndex(
        item => item.variant_id === action.payload.variant_id
      );

      if (existingItemIndex >= 0) {
        state.items[existingItemIndex].quantity += action.payload.quantity;
        state.items[existingItemIndex].total_price = 
          state.items[existingItemIndex].quantity * 
          (state.items[existingItemIndex].unit_price + 
           (state.items[existingItemIndex].customization_price || 0));
      } else {
        state.items.push(action.payload);
      }
      
      state.lastAddedItem = action.payload;
      state.isOpen = true;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(state.items));
      }
    },
    
    updateCartItemLocal: (state, action: PayloadAction<{ 
      itemId: string; 
      quantity: number 
    }>) => {
      const item = state.items.find(item => item.id === action.payload.itemId);
      if (item) {
        item.quantity = action.payload.quantity;
        item.total_price = item.quantity * (item.unit_price + (item.customization_price || 0));
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('cart', JSON.stringify(state.items));
        }
      }
    },
    
    removeFromCartLocal: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(state.items));
      }
    },
    
    clearCartLocal: (state) => {
      state.items = [];
      state.lastAddedItem = null;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart');
      }
    },
    
    loadCartFromStorage: (state) => {
      if (typeof window !== 'undefined') {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          try {
            state.items = JSON.parse(savedCart);
            state.hasFetched = true;
          } catch (error) {
            console.error('Error loading cart from storage:', error);
          }
        } else {
          state.hasFetched = true;
        }
      }
    },
    
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    
    openCart: (state) => {
      state.isOpen = true;
    },
    
    closeCart: (state) => {
      state.isOpen = false;
    },
    
    clearLastAddedItem: (state) => {
      state.lastAddedItem = null;
    },

    resetCart: (state) => {
      state.items = [];
      state.lastAddedItem = null;
      state.hasFetched = false;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart');
      }
    },
  },
  
  extraReducers: (builder) => {
    // Fetch cart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isLoading = false;
        state.error = null;
        state.hasFetched = true;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch cart';
        state.hasFetched = true;
      });
    
    // Add to cart
    builder
      .addCase(addToCartDB.fulfilled, (state, action) => {
        const newItem: CartItem = {
          id: action.payload.item.id,
          product_id: action.payload.item.product_id,
          variant_id: action.payload.item.variant_id,
          product_name: action.payload.item.products.name,
          product_slug: action.payload.item.products.slug,
          product_image: action.payload.item.products.primary_image_url,
          variant_size: action.payload.item.product_variants.size,
          variant_color: action.payload.item.product_variants.color,
          variant_color_hex: action.payload.item.product_variants.color_hex,
          quantity: action.payload.item.quantity,
          unit_price: parseFloat(action.payload.item.unit_price),
          customization_price: parseFloat(action.payload.item.customization_price || 0),
          total_price: parseFloat(action.payload.item.total_price),
          in_stock: action.payload.item.product_variants.inventory_count > 0,
          max_quantity: action.payload.item.product_variants.inventory_count,
          product_translations: action.payload.item.products.translations,
          variant_translations: action.payload.item.product_variants.translations,
        };
        
        if (action.payload.isUpdate) {
          const index = state.items.findIndex(item => item.id === newItem.id);
          if (index >= 0) {
            state.items[index] = newItem;
          }
        } else {
          state.items.unshift(newItem);
        }
        
        state.lastAddedItem = newItem;
        state.isOpen = true;
      });
    
    // Update cart item
    builder
      .addCase(updateCartItemDB.fulfilled, (state, action) => {
        const item = state.items.find(item => item.id === action.payload.itemId);
        if (item) {
          item.quantity = action.payload.quantity;
          item.total_price = item.quantity * (item.unit_price + (item.customization_price || 0));
        }
      });
    
    // Remove from cart
    builder
      .addCase(removeFromCartDB.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
    
    // Clear cart
    builder
      .addCase(clearCartDB.fulfilled, (state) => {
        state.items = [];
        state.lastAddedItem = null;
      });
  },
});

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartIsOpen = (state: { cart: CartState }) => state.cart.isOpen;
export const selectCartSubtotal = (state: { cart: CartState }) => 
  state.cart.items.reduce((sum, item) => sum + item.total_price, 0);
export const selectCartItemCount = (state: { cart: CartState }) => 
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectLastAddedItem = (state: { cart: CartState }) => state.cart.lastAddedItem;

export const {
  addToCartLocal,
  updateCartItemLocal,
  removeFromCartLocal,
  clearCartLocal,
  loadCartFromStorage,
  toggleCart,
  openCart,
  closeCart,
  clearLastAddedItem,
  resetCart,
} = cartSlice.actions;

export default cartSlice.reducer;
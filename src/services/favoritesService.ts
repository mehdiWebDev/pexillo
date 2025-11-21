// src/services/favoritesService.ts
import { createClient } from '@/lib/supabase/client';

export interface FavoriteItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

class FavoritesService {
  /**
   * Get all favorites for a user
   */
  async getFavorites(userId: string): Promise<{ data: string[] | null; error: unknown }> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('wishlist')
      .select('product_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching favorites:', error);
      return { data: null, error };
    }

    return { data: data?.map(item => item.product_id) || [], error: null };
  }

  /**
   * Add a product to favorites
   */
  async addFavorite(userId: string, productId: string): Promise<{ success: boolean; error: unknown }> {
    const supabase = createClient();

    const { error } = await supabase
      .from('wishlist')
      .insert({
        user_id: userId,
        product_id: productId,
      });

    if (error) {
      console.error('Error adding favorite:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  }

  /**
   * Remove a product from favorites
   */
  async removeFavorite(userId: string, productId: string): Promise<{ success: boolean; error: unknown }> {
    const supabase = createClient();

    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing favorite:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  }

  /**
   * Toggle a product in favorites (add if not present, remove if present)
   */
  async toggleFavorite(userId: string, productId: string): Promise<{ isFavorite: boolean; error: unknown }> {
    const supabase = createClient();

    // Check if already in favorites
    const { data: existing, error: fetchError } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking favorite:', fetchError);
      return { isFavorite: false, error: fetchError };
    }

    if (existing) {
      // Remove from favorites
      const { error } = await this.removeFavorite(userId, productId);
      return { isFavorite: false, error };
    } else {
      // Add to favorites
      const { error } = await this.addFavorite(userId, productId);
      return { isFavorite: true, error };
    }
  }

  /**
   * Check if a product is in favorites
   */
  async isFavorite(userId: string, productId: string): Promise<{ isFavorite: boolean; error: unknown }> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.error('Error checking favorite:', error);
      return { isFavorite: false, error };
    }

    return { isFavorite: !!data, error: null };
  }
}

export const favoritesService = new FavoritesService();

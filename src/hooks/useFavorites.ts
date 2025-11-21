// src/hooks/useFavorites.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store';
import { favoritesService } from '@/src/services/favoritesService';
import { toast } from '@/src/hooks/use-toast';

export function useFavorites() {
  const { isAuth, user } = useSelector((state: RootState) => state.auth);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    if (isAuth && user?.id) {
      loadFavorites();
    } else {
      // Load from localStorage for guest users
      const localFavorites = localStorage.getItem('favorites');
      if (localFavorites) {
        setFavorites(JSON.parse(localFavorites));
      }
    }
  }, [isAuth, user?.id]);

  // Load favorites from database
  const loadFavorites = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await favoritesService.getFavorites(user.id);
      if (!error && data) {
        setFavorites(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Toggle favorite (add or remove)
  const toggleFavorite = useCallback(async (productId: string) => {
    if (!isAuth || !user?.id) {
      // Handle guest users with localStorage
      const currentFavorites = [...favorites];
      const index = currentFavorites.indexOf(productId);

      if (index > -1) {
        // Remove from favorites
        currentFavorites.splice(index, 1);
        setFavorites(currentFavorites);
        localStorage.setItem('favorites', JSON.stringify(currentFavorites));
        toast({
          title: 'Removed from favorites',
          description: 'Product removed from your favorites',
        });
      } else {
        // Add to favorites
        currentFavorites.push(productId);
        setFavorites(currentFavorites);
        localStorage.setItem('favorites', JSON.stringify(currentFavorites));
        toast({
          title: 'Added to favorites',
          description: 'Product added to your favorites',
        });
      }
      return;
    }

    // Handle authenticated users
    try {
      const { isFavorite, error } = await favoritesService.toggleFavorite(user.id, productId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update favorites',
          variant: 'destructive',
        });
        return;
      }

      // Update local state
      if (isFavorite) {
        setFavorites([...favorites, productId]);
        toast({
          title: 'Added to favorites',
          description: 'Product added to your favorites',
        });
      } else {
        setFavorites(favorites.filter(id => id !== productId));
        toast({
          title: 'Removed from favorites',
          description: 'Product removed from your favorites',
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorites',
        variant: 'destructive',
      });
    }
  }, [isAuth, user?.id, favorites]);

  // Check if a product is in favorites
  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.includes(productId);
  }, [favorites]);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
    loadFavorites,
  };
}

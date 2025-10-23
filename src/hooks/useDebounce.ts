// src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

/**
 * Debounce hook to optimize performance
 * Delays updating value until user stops typing/sliding
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout if value changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
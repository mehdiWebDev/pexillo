// src/hooks/useProductsQuery.ts
import { useSupabaseQuery } from "./useSupabaseQuery";
import { getProducts } from "@/src/services/productService";

export function useProductsQuery() {
  return useSupabaseQuery(["products"], getProducts, {
    staleTime: 10 * 1000, // 10 seconds
    refetchOnWindowFocus: true
  });
}


import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/src/services/productService";

export function useProductsQuery() {
  return useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
}

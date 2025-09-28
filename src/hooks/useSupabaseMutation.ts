// src/hooks/useSupabaseMutation.ts
"use client";

import { useMutation, UseMutationOptions, MutationKey } from "@tanstack/react-query";

export function useSupabaseMutation<
  TData,
  TError = Error,
  TVariables = void,
  TContext = unknown,
  TMutationKey extends MutationKey = MutationKey
>(
  key: TMutationKey, // mutation key
  mutationFn: (variables: TVariables) => Promise<TData>, // mutation function
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationKey" | "mutationFn"> // options
) {
  return useMutation<TData, TError, TVariables, TContext>({
    mutationKey: key,
    mutationFn,
    ...options,
  });
}


// Example component usage
// import { useSupabaseMutation } from "@/src/hooks/useSupabaseMutation";
// import { createProduct, updateProduct, deleteProduct } from "@/src/services/productService";
// import { useQueryClient } from "@tanstack/react-query";

// function ProductsEditor() {
//   const queryClient = useQueryClient();

//   const createMutation = useSupabaseMutation(["products", "create"], createProduct, {
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["products"] });
//     },
//   });

//   const updateMutation = useSupabaseMutation(
//     ["products", "update"],
//     ({ id, values }: { id: string; values: { name?: string; price?: number } }) =>
//       updateProduct(id, values),
//     {
//       onSuccess: (_, { id }) => {
//         // Invalidate list and specific entity if you query it separately
//         queryClient.invalidateQueries({ queryKey: ["products"] });
//         queryClient.invalidateQueries({ queryKey: ["product", id] });
//       },
//     }
//   );

//   const deleteMutation = useSupabaseMutation(
//     ["products", "delete"],
//     (id: string) => deleteProduct(id),
//     {
//       onSuccess: () => {
//         queryClient.invalidateQueries({ queryKey: ["products"] });
//       },
//     }
//   );


// }


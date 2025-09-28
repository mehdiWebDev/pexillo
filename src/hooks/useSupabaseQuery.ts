// src/hooks/useSupabaseQuery.ts
"use client";

import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";

export function useSupabaseQuery<TData, TError = Error, TQueryKey extends QueryKey = QueryKey>(
  key: TQueryKey, // query key
  queryFn: () => Promise<TData>, // query function
  options?: Omit<UseQueryOptions<TData, TError, TData, TQueryKey>, "queryKey" | "queryFn"> // options
) {
  return useQuery<TData, TError, TData, TQueryKey>({ 
    queryKey: key, 
    queryFn,
    ...options,
  });
}

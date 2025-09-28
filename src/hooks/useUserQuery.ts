// src/hooks/useUserQuery.ts
import { useSupabaseQuery } from "./useSupabaseQuery";
import { getUserProfile } from "@/src/services/userService";
import type { Profile } from "@/src/services/userService";

export function useUserQuery(userId?: string) {
  return useSupabaseQuery<Profile>(
    ["profiles", userId ?? ""], // query key (stable even when userId is undefined)
    () => getUserProfile(userId as string), // safe due to enabled guard
    {
      enabled: !!userId, // only run if userId is provided
      refetchOnWindowFocus: false, // refetch when window is focused
      staleTime: 10 * 1000, // 10 seconds
    }
  );
}

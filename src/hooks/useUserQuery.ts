// src/hooks/useUserQuery.ts
import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/src/services/userService";

export function useUserQuery(userId: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId, // only run if userId is provided
  });
}

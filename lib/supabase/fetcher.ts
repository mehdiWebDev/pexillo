// lib/supabase/fetcher.ts
import { PostgrestError } from "@supabase/supabase-js";

export async function handleSupabase<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data as T;
}

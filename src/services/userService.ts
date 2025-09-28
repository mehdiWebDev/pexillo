// src/services/userService.ts
import { supabase } from "@/lib/supabase/client";
import { handleSupabase } from "@/lib/supabase/fetcher";

// Define the shape of a row from the `profiles` table that we consume in the app
export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  created_at: string | null;
  // add other fields you use as needed, e.g., avatar_url, updated_at, etc.
  [key: string]: any;
};

export async function getUserProfile(userId: string): Promise<Profile> {
  return handleSupabase<Profile>(
    supabase.from("profiles").select("*").eq("id", userId).single()
  );
}

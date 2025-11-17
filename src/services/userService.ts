// src/services/userService.ts
import { supabase } from "@/lib/supabase/client";
import { handleSupabase } from "@/lib/supabase/fetcher";

// Define the shape of a row from the `profiles` table that we consume in the app
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  marketing_consent: boolean;
  preferred_language: string;
  total_spent: number;
  total_orders: number;
  last_order_date: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export async function getUserProfile(userId: string): Promise<Profile> {
  return handleSupabase<Profile>(
    supabase.from("profiles").select("*").eq("id", userId).single()
  );
}

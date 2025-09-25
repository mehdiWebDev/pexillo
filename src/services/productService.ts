import { supabase } from "@/lib/supabase/client";

export async function getProducts() {
  const { data, error } = await supabase.from("products").select("*");
  if (error) throw new Error(error.message);
  return data;
}

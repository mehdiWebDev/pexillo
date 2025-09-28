// src/services/productService.ts
import { supabase } from "@/lib/supabase/client";
import { handleSupabase } from "@/lib/supabase/fetcher";

export async function getProducts() {
  return handleSupabase(
    supabase.from("products").select("*")
  );
}


export async function createProduct(values: { name: string; price: number }) {
  return handleSupabase(
    supabase.from("products").insert(values).select("*").single()
  );
}

export async function updateProduct(id: string, values: Partial<{ name: string; price: number }>) {
  return handleSupabase(
    supabase.from("products").update(values).eq("id", id).select("*").single()
  );
}

export async function deleteProduct(id: string) {
  // If you don’t need returned rows, you can omit select(), and set your hook’s TData to something like { id: string }
  return handleSupabase(
    supabase.from("products").delete().eq("id", id).select("*").single()
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { resetCart } from "@/src/store/slices/cartSlice";

export function LogoutButton() {
  const router = useRouter();
  const dispatch = useDispatch();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // Reset cart state on logout
    dispatch(resetCart());

    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}

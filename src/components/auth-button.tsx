"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Profile } from "./profile";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setLoading, clearUser } from "@/src/store/slices/authSlice";
import { RootState } from "@/src/store";

export function AuthButton() {
  const { user, isAuth, loading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const supabase = createClient();

  useEffect(() => {
    // Set loading while checking auth
    dispatch(setLoading(true));

    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        dispatch(setUser({ user, isAuth: true }));
      } else {
        dispatch(clearUser());
      }
      dispatch(setLoading(false));
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          dispatch(setUser({ user: session.user, isAuth: true }));
        } else {
          dispatch(clearUser());
        }
        dispatch(setLoading(false));
      }
    );

    return () => subscription.unsubscribe();
  }, [dispatch, supabase]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return isAuth && user ? (
    <div className="flex items-center gap-4">
      <Profile user={user} />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
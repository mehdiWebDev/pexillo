"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAppDispatch } from "@/src/store/hooks";
import { setUser, AuthUser } from "@/src/store/slices/authSlice";
import { useTranslations, useLocale } from "next-intl";


export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const t = useTranslations('login');
  const locale = useLocale();

  // Check if we're on French version
  const isFrench = locale === 'fr' || pathname.startsWith('/fr');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      dispatch(setUser({ user: data.user as unknown as AuthUser, isAuth: true }));

      // Redirect to home page - root for English, /fr for French
      const redirectUrl = isFrench ? '/fr' : '/';
      router.push(redirectUrl);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{t('passwordLabel')}</Label>
                  <Link
                    href={isFrench ? '/fr/auth/forgot-password' : '/auth/forgot-password'}
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('loggingIn') : t('loginButton')}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t('noAccount')}{" "}
              <Link
                href={isFrench ? '/fr/auth/sign-up' : '/auth/sign-up'}
                className="underline underline-offset-4"
              >
                {t('signUpLink')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

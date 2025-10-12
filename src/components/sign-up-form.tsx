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
import { useTranslations, useLocale } from "next-intl";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('signUp');
  const locale = useLocale();
  
  // Check if we're on French version
  const isFrench = locale === 'fr' || pathname.startsWith('/fr');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError(t('passwordMismatch'));
      setIsLoading(false);
      return;
    }

    try {
      // Redirect to home page - root for English, /fr for French
      const redirectUrl = isFrench 
        ? `${window.location.origin}/fr`
        : `${window.location.origin}`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            preferred_language: isFrench ? 'fr' : 'en',
            signup_source: 'pexillo_website'
          }
        },
      });
      
      if (error) throw error;
      
      // Redirect to success page
      const successPath = isFrench 
        ? '/fr/auth/sign-up-success'
        : '/auth/sign-up-success';
      
      router.push(successPath);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Get login path based on current language
  const getLoginPath = () => {
    return isFrench ? '/fr/auth/login' : '/auth/login';
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
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
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">{t('repeatPasswordLabel')}</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  placeholder={t('repeatPasswordPlaceholder')}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('signingUp') : t('signUpButton')}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t('alreadyHaveAccount')}{" "}
              <Link href={getLoginPath()} className="underline underline-offset-4">
                {t('loginLink')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
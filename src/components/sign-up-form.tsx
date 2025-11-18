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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
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

      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
            date_of_birth: dateOfBirth,
            gender: gender || null,
            marketing_consent: marketingConsent,
            preferred_language: isFrench ? 'fr' : 'en',
            signup_source: 'pexillo_website'
          }
        },
      });

      if (error) throw error;

      // Update profile with additional information
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: phone,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            marketing_consent: marketingConsent,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }
      
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
                <Label htmlFor="full-name">{t('fullNameLabel')}</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder={t('fullNamePlaceholder')}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
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
                <Label htmlFor="phone">{t('phoneLabel')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('phonePlaceholder')}
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  minLength={8}
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
                  minLength={8}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  placeholder={t('repeatPasswordPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date-of-birth">{t('dateOfBirthLabel')}</Label>
                <Input
                  id="date-of-birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gender">{t('genderLabel')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder={t('selectGender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('male')}</SelectItem>
                    <SelectItem value="female">{t('female')}</SelectItem>
                    <SelectItem value="other">{t('other')}</SelectItem>
                    <SelectItem value="prefer_not_to_say">{t('preferNotToSay')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing-consent"
                  checked={marketingConsent}
                  onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
                />
                <label
                  htmlFor="marketing-consent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('marketingConsentLabel')}
                </label>
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
// src/app/[locale]/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store';
import { useRouter } from '@/src/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import ProfileImageSection from './components/ProfileImageSection';
import ProfileForm from './components/ProfileForm';
import OrdersSection from './components/OrdersSection';
import { Loader2 } from 'lucide-react';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marketing_consent: boolean;
  preferred_language: string;
  total_spent: number;
  total_orders: number;
  last_order_date: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const { isAuth, user } = useSelector((state: RootState) => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount (handles page refresh)
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/auth/login');
        return;
      }

      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  // Fetch profile once auth is confirmed
  useEffect(() => {
    if (!isCheckingAuth && user) {
      fetchProfile();
    } else if (!isCheckingAuth && !isAuth) {
      router.push('/auth/login');
    }
  }, [isCheckingAuth, isAuth, user, router]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <p className="text-lg font-medium text-foreground">
            {t('profileNotFound')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-lg shadow-md p-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {t('title')}
          </h1>
          <p className="mt-2 text-lg text-foreground/90">
            {t('description')}
          </p>
        </div>

        {/* Two Column Layout: Profile Image (Left) + Profile Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Profile Image Section */}
          <div className="lg:col-span-4">
            <ProfileImageSection profile={profile} onUpdate={fetchProfile} />
          </div>

          {/* Right Column - Profile Form */}
          <div className="lg:col-span-8">
            <ProfileForm profile={profile} onUpdate={fetchProfile} />
          </div>
        </div>

        {/* Orders Section */}
        <OrdersSection userId={profile.id} />
      </div>
    </div>
  );
}

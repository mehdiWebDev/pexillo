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

  useEffect(() => {
    if (!isAuth) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [isAuth]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border-4 border-black dark:border-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {t('profileNotFound')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-blue-600 dark:bg-blue-500 border-6 border-black dark:border-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)]">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-2 text-lg font-bold text-blue-100 dark:text-blue-50">
            {t('description')}
          </p>
        </div>

        {/* Two Column Layout: Profile Image (Left) + Profile Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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

// src/app/[locale]/profile/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/src/store';
import { useRouter } from '@/src/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import { clearUser } from '@/src/store/slices/authSlice';
import OrdersSection from './components/OrdersSection';
import SettingsSection from './components/SettingsSection';
import AddressesSection from './components/AddressesSection';
import PaymentMethodsSection from './components/PaymentMethodsSection';
import { Loader2, Package, MapPin, CreditCard, Settings } from 'lucide-react';
import Image from 'next/image';

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

type TabType = 'orders' | 'addresses' | 'payment' | 'settings';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuth, user } = useSelector((state: RootState) => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('settings');

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

  const fetchProfile = useCallback(async () => {
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
  }, [user]);

  // Fetch profile once auth is confirmed
  useEffect(() => {
    if (!isCheckingAuth && user) {
      fetchProfile();
    } else if (!isCheckingAuth && !isAuth) {
      router.push('/auth/login');
    }
  }, [isCheckingAuth, isAuth, user, router, fetchProfile]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    dispatch(clearUser());
    router.push('/');
  };

  const getInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return profile?.email[0].toUpperCase() || 'U';
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-gray">
        <Loader2 className="h-12 w-12 animate-spin text-brand-red" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-brand-gray flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <p className="text-lg font-medium text-brand-dark">
            {t('profileNotFound')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray">
      {/* Profile Header */}
      <header className="bg-white border-b border-gray-200 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-brand-dark tracking-tight mb-2">
              {t('hqTitle')}
            </h1>
            <p className="text-gray-500 font-medium">
              {t('welcomeBack')}, <span className="text-brand-red font-bold">{profile.full_name || t('friend')}</span>.
            </p>
          </div>
          <div className="hidden md:block">
            <button
              onClick={handleSignOut}
              className="px-6 py-2 border-2 border-gray-200 rounded-lg font-bold text-gray-500 hover:text-brand-red hover:border-brand-red transition-colors"
            >
              {t('signOut')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <aside className="space-y-4">
          {/* User Avatar Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center">
            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-gray-100 mb-4">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || 'User'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-brand-red flex items-center justify-center">
                  <span className="text-3xl font-black text-white">
                    {getInitials()}
                  </span>
                </div>
              )}
            </div>
            <h3 className="font-bold text-xl text-brand-dark">
              {profile.full_name || t('noName')}
            </h3>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mt-1">
              {t('memberSince')} {new Date(profile.created_at).getFullYear()}
            </p>
          </div>

          {/* Navigation Menu */}
          <nav className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-6 py-4 font-bold flex justify-between items-center transition-colors ${
                activeTab === 'settings'
                  ? 'text-white bg-brand-dark border-b border-gray-800'
                  : 'text-gray-600 hover:bg-gray-50 border-b border-gray-100'
              }`}
            >
              {t('settings')}
              <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-white' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full text-left px-6 py-4 font-bold flex justify-between items-center transition-colors ${
                activeTab === 'orders'
                  ? 'text-white bg-brand-dark border-b border-gray-800'
                  : 'text-gray-600 hover:bg-gray-50 border-b border-gray-100'
              }`}
            >
              {t('orders')}
              <Package className={`w-5 h-5 ${activeTab === 'orders' ? 'text-white' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`w-full text-left px-6 py-4 font-bold flex justify-between items-center transition-colors ${
                activeTab === 'addresses'
                  ? 'text-white bg-brand-dark border-b border-gray-800'
                  : 'text-gray-600 hover:bg-gray-50 border-b border-gray-100'
              }`}
            >
              {t('addresses')}
              <MapPin className={`w-5 h-5 ${activeTab === 'addresses' ? 'text-white' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`w-full text-left px-6 py-4 font-bold flex justify-between items-center transition-colors ${
                activeTab === 'payment'
                  ? 'text-white bg-brand-dark'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('paymentMethods')}
              <CreditCard className={`w-5 h-5 ${activeTab === 'payment' ? 'text-white' : 'text-gray-400'}`} />
            </button>
          </nav>

          {/* Mobile Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="md:hidden w-full px-6 py-3 border-2 border-gray-200 rounded-lg font-bold text-gray-500 hover:text-brand-red hover:border-brand-red transition-colors bg-white"
          >
            {t('signOut')}
          </button>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'settings' && <SettingsSection profile={profile} onUpdate={fetchProfile} />}
          {activeTab === 'orders' && <OrdersSection userId={profile.id} />}
          {activeTab === 'addresses' && <AddressesSection userId={profile.id} />}
          {activeTab === 'payment' && <PaymentMethodsSection userId={profile.id} />}
        </div>
      </div>
    </div>
  );
}

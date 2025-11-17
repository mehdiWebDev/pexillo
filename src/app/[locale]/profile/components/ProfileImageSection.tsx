// src/app/[locale]/profile/components/ProfileImageSection.tsx
'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Profile } from '../page';
import { Camera, Loader2, ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { toast } from '@/src/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface ProfileImageSectionProps {
  profile: Profile;
  onUpdate: () => void;
}

export default function ProfileImageSection({ profile, onUpdate }: ProfileImageSectionProps) {
  const t = useTranslations('profile');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    if (profile.full_name) {
      const names = profile.full_name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return profile.email[0].toUpperCase();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('error'),
        description: t('invalidFileType'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('error'),
        description: t('fileTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast({
        title: t('success'),
        description: t('avatarUpdated'),
      });

      onUpdate();
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast({
        title: t('error'),
        description: t('avatarUploadFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Card */}
      <div className="bg-white dark:bg-gray-900 border-6 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Avatar'}
                className="w-40 h-40 rounded-none border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] object-cover"
              />
            ) : (
              <div className="w-40 h-40 bg-blue-600 dark:bg-blue-500 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center">
                <span className="text-6xl font-black text-white">
                  {getInitials()}
                </span>
              </div>
            )}

            {/* Upload Button Overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 bg-yellow-400 dark:bg-yellow-500 hover:bg-yellow-500 dark:hover:bg-yellow-600 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-black dark:text-white" />
              ) : (
                <Camera className="h-5 w-5 text-black dark:text-white" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Name & Email */}
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase">
              {profile.full_name || t('noName')}
            </h2>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-1">
              {profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="space-y-4">
        {/* Total Orders */}
        <div className="bg-green-500 dark:bg-green-600 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-green-900 dark:text-green-100 uppercase">
                {t('totalOrders')}
              </p>
              <p className="text-3xl font-black text-white mt-1">
                {profile.total_orders}
              </p>
            </div>
            <ShoppingBag className="h-8 w-8 text-green-900 dark:text-green-100" />
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-purple-500 dark:bg-purple-600 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-purple-900 dark:text-purple-100 uppercase">
                {t('totalSpent')}
              </p>
              <p className="text-3xl font-black text-white mt-1">
                ${profile.total_spent.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-900 dark:text-purple-100" />
          </div>
        </div>

        {/* Member Since */}
        <div className="bg-orange-500 dark:bg-orange-600 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-orange-900 dark:text-orange-100 uppercase">
                {t('memberSince')}
              </p>
              <p className="text-lg font-black text-white mt-1">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-orange-900 dark:text-orange-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

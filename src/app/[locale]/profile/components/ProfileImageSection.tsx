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
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Avatar'}
                className="w-40 h-40 rounded-full ring-4 ring-muted shadow-lg object-cover"
              />
            ) : (
              <div className="w-40 h-40 bg-gradient-to-br from-primary to-secondary rounded-full ring-4 ring-muted shadow-lg flex items-center justify-center">
                <span className="text-5xl font-bold text-white">
                  {getInitials()}
                </span>
              </div>
            )}

            {/* Upload Button Overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-2 right-2 bg-secondary hover:opacity-90 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
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
            <h2 className="text-2xl font-semibold text-foreground">
              {profile.full_name || t('noName')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="space-y-4">
        {/* Total Orders */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('totalOrders')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {profile.total_orders}
              </p>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('totalSpent')}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                ${profile.total_spent.toFixed(2)}
              </p>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-secondary" />
            </div>
          </div>
        </div>

        {/* Member Since */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('memberSince')}
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-accent/10 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-accent-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

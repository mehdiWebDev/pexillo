// src/app/[locale]/profile/components/SettingsSection.tsx
'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Profile } from '../page';
import { Camera, Loader2, Save } from 'lucide-react';
import { toast } from '@/src/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';

interface SettingsSectionProps {
  profile: Profile;
  onUpdate: () => void;
}

export default function SettingsSection({ profile, onUpdate }: SettingsSectionProps) {
  const t = useTranslations('profile');
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [marketingConsent, setMarketingConsent] = useState(profile.marketing_consent || false);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferred_language || 'en');

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
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const urlParts = profile.avatar_url.split('/avatars/');
        if (urlParts[1]) {
          const oldPath = decodeURIComponent(urlParts[1]);
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

      queryClient.invalidateQueries({ queryKey: ['profiles', profile.id] });

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          marketing_consent: marketingConsent,
          preferred_language: preferredLanguage,
        })
        .eq('id', profile.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profiles', profile.id] });

      toast({
        title: t('success'),
        description: t('profileUpdated'),
      });

      onUpdate();
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: t('error'),
        description: t('errorSavingProfile'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-black text-2xl text-brand-dark">{t('settings')}</h2>

      {/* Avatar Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="font-bold text-lg text-brand-dark mb-4">{t('profilePicture')}</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'Avatar'}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-brand-red rounded-full flex items-center justify-center border-2 border-gray-200">
                <span className="text-2xl font-black text-white">
                  {getInitials()}
                </span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-1 -right-1 bg-brand-dark hover:bg-brand-red text-white rounded-full p-2 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
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
          <div>
            <p className="font-bold text-brand-dark">{profile.full_name || t('noName')}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* Personal Information Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="font-bold text-lg text-brand-dark mb-6">{t('personalInformation')}</h3>

        <div className="space-y-5">
          {/* Full Name */}
          <div className="grid gap-2">
            <Label htmlFor="fullName" className="font-bold text-brand-dark">
              {t('fullName')}
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('fullNamePlaceholder')}
              className="border-gray-200 focus:border-brand-red"
            />
          </div>

          {/* Phone */}
          <div className="grid gap-2">
            <Label htmlFor="phone" className="font-bold text-brand-dark">
              {t('phone')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('phonePlaceholder')}
              className="border-gray-200 focus:border-brand-red"
            />
          </div>

          {/* Date of Birth */}
          <div className="grid gap-2">
            <Label htmlFor="dateOfBirth" className="font-bold text-brand-dark">
              {t('dateOfBirth')}
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="border-gray-200 focus:border-brand-red"
            />
          </div>

          {/* Gender */}
          <div className="grid gap-2">
            <Label htmlFor="gender" className="font-bold text-brand-dark">
              {t('gender')}
            </Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender" className="border-gray-200 focus:border-brand-red">
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

          {/* Preferred Language */}
          <div className="grid gap-2">
            <Label htmlFor="language" className="font-bold text-brand-dark">
              {t('preferredLanguage')}
            </Label>
            <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
              <SelectTrigger id="language" className="border-gray-200 focus:border-brand-red">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('english')}</SelectItem>
                <SelectItem value="fr">{t('french')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Marketing Consent */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="marketingConsent"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-red focus:ring-brand-red"
              />
              <div className="flex-1">
                <label htmlFor="marketingConsent" className="cursor-pointer font-bold text-brand-dark">
                  {t('marketingConsent')}
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  {t('marketingConsentDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-brand-dark hover:bg-brand-red text-white rounded-xl py-3 px-6 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('saveChanges')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

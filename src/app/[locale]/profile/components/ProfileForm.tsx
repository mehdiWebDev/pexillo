// src/app/[locale]/profile/components/ProfileForm.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Profile } from '../page';
import { Save, Loader2, Mail, Phone, Calendar, Globe, BellRing, User } from 'lucide-react';
import { toast } from '@/src/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface ProfileFormProps {
  profile: Profile;
  onUpdate: () => void;
}

export default function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const t = useTranslations('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [marketingConsent, setMarketingConsent] = useState(profile.marketing_consent || false);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferred_language || 'en');

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
    <div className="bg-white dark:bg-gray-900 border-6 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 md:p-8">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase mb-6">
        {t('personalInformation')}
      </h2>

      <div className="space-y-6">
        {/* Email (Read-only) */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase mb-2">
            <Mail className="h-4 w-4" />
            {t('email')}
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-4 border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-bold cursor-not-allowed"
          />
          <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
            {t('emailCannotBeChanged')}
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase mb-2">
            <User className="h-4 w-4" />
            {t('fullName')}
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('fullNamePlaceholder')}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-gray-900 dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase mb-2">
            <Phone className="h-4 w-4" />
            {t('phone')}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-gray-900 dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase mb-2">
            <Calendar className="h-4 w-4" />
            {t('dateOfBirth')}
          </label>
          <input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          />
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="gender" className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-2 block">
            {t('gender')}
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          >
            <option value="">{t('selectGender')}</option>
            <option value="male">{t('male')}</option>
            <option value="female">{t('female')}</option>
            <option value="other">{t('other')}</option>
            <option value="prefer_not_to_say">{t('preferNotToSay')}</option>
          </select>
        </div>

        {/* Preferred Language */}
        <div>
          <label htmlFor="language" className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase mb-2">
            <Globe className="h-4 w-4" />
            {t('preferredLanguage')}
          </label>
          <select
            id="language"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          >
            <option value="en">{t('english')}</option>
            <option value="fr">{t('french')}</option>
          </select>
        </div>

        {/* Marketing Consent */}
        <div className="bg-gray-50 dark:bg-gray-800 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="marketingConsent"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-1 h-5 w-5 border-4 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-blue-600 focus:ring-4 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <div className="flex-1">
              <label htmlFor="marketingConsent" className="flex items-center gap-2 cursor-pointer font-bold text-gray-900 dark:text-white">
                <BellRing className="h-4 w-4" />
                {t('marketingConsent')}
              </label>
              <p className="mt-1 text-xs font-bold text-gray-600 dark:text-gray-400">
                {t('marketingConsentDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] px-6 py-4 text-white font-black text-lg uppercase transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:disabled:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center gap-3"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="h-6 w-6" />
              {t('saveChanges')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

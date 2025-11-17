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
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        {t('personalInformation')}
      </h2>

      <div className="space-y-5">
        {/* Email (Read-only) */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Mail className="h-4 w-4" />
            {t('email')}
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-600 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t('emailCannotBeChanged')}
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <User className="h-4 w-4" />
            {t('fullName')}
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('fullNamePlaceholder')}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Phone className="h-4 w-4" />
            {t('phone')}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="h-4 w-4" />
            {t('dateOfBirth')}
          </label>
          <input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200"
          />
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="gender" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            {t('gender')}
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200"
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
          <label htmlFor="language" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Globe className="h-4 w-4" />
            {t('preferredLanguage')}
          </label>
          <select
            id="language"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200"
          >
            <option value="en">{t('english')}</option>
            <option value="fr">{t('french')}</option>
          </select>
        </div>

        {/* Marketing Consent */}
        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="marketingConsent"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <div className="flex-1">
              <label htmlFor="marketingConsent" className="flex items-center gap-2 cursor-pointer font-medium text-gray-900 dark:text-gray-100">
                <BellRing className="h-4 w-4" />
                {t('marketingConsent')}
              </label>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {t('marketingConsentDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg py-3 px-6 font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
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
  );
}

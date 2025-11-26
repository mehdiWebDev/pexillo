// src/app/[locale]/profile/components/AddressesSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Loader2, Home, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/src/hooks/use-toast';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useTranslations } from 'next-intl';

interface Address {
  id: string;
  user_id: string;
  type: 'shipping' | 'billing';
  first_name: string;
  last_name: string;
  company: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

interface AddressesSectionProps {
  userId: string;
}

const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'YT', label: 'Yukon' },
];

export default function AddressesSection({ userId }: AddressesSectionProps) {
  const t = useTranslations('profile');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const ADDRESS_TYPES = [
    { value: 'shipping', label: t('shipping'), icon: Home },
    { value: 'billing', label: t('billing'), icon: Building2 },
  ];

  // Form state
  const [formData, setFormData] = useState({
    type: 'shipping' as 'shipping' | 'billing',
    first_name: '',
    last_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'CA',
    is_default: false,
  });

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      toast({
        title: t('error'),
        description: t('errorLoadingAddresses'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const resetForm = () => {
    setFormData({
      type: 'shipping',
      first_name: '',
      last_name: '',
      company: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: 'CA',
      is_default: false,
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (address: Address) => {
    setFormData({
      type: address.type,
      first_name: address.first_name,
      last_name: address.last_name,
      company: address.company || '',
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      state_province: address.state_province,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    });
    setEditingId(address.id);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.first_name || !formData.last_name || !formData.address_line_1 || !formData.city || !formData.state_province || !formData.postal_code) {
      toast({
        title: t('validationError'),
        description: t('fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();

      // If setting as default, unset other defaults
      if (formData.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      if (editingId) {
        // Update existing address
        const { error } = await supabase
          .from('addresses')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: t('success'),
          description: t('addressUpdated'),
        });
      } else {
        // Create new address
        const { error } = await supabase
          .from('addresses')
          .insert([{ ...formData, user_id: userId }]);

        if (error) throw error;

        toast({
          title: t('success'),
          description: t('addressAdded'),
        });
      }

      fetchAddresses();
      resetForm();
    } catch (error) {
      console.error('Failed to save address:', error);
      toast({
        title: t('error'),
        description: t('errorSavingAddress'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteAddress'))) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('addressDeleted'),
      });

      fetchAddresses();
    } catch (error) {
      console.error('Failed to delete address:', error);
      toast({
        title: t('error'),
        description: t('errorDeletingAddress'),
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const supabase = createClient();

      // Unset all defaults
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set new default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('defaultAddressUpdated'),
      });

      fetchAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
      toast({
        title: t('error'),
        description: t('errorUpdatingDefaultAddress'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-black text-2xl text-brand-dark">{t('savedAddresses')}</h2>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-red transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('addNewAddress')}
          </button>
        )}
      </div>

      {/* Address Form */}
      {isFormOpen && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-bold text-lg text-brand-dark mb-6">
            {editingId ? t('editAddress') : t('addNewAddress')}
          </h3>

          <div className="space-y-4">
            {/* Address Type */}
            <div className="grid gap-2">
              <Label className="font-bold text-brand-dark">{t('addressType')}</Label>
              <div className="grid grid-cols-2 gap-3">
                {ADDRESS_TYPES.map((addressType) => {
                  const Icon = addressType.icon;
                  return (
                    <button
                      key={addressType.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: addressType.value as 'shipping' | 'billing' })}
                      className={`px-4 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-colors ${
                        formData.type === addressType.value
                          ? 'border-brand-red bg-brand-red text-white'
                          : 'border-gray-200 text-brand-dark hover:border-brand-dark'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {addressType.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-bold text-brand-dark">{t('firstName')} *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder={t('firstNamePlaceholder')}
                  className="border-gray-200"
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-bold text-brand-dark">{t('lastName')} *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder={t('lastNamePlaceholder')}
                  className="border-gray-200"
                />
              </div>
            </div>

            {/* Company (Optional) */}
            <div className="grid gap-2">
              <Label className="font-bold text-brand-dark">{t('company')}</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder={t('companyPlaceholder')}
                className="border-gray-200"
              />
            </div>

            {/* Address Line 1 */}
            <div className="grid gap-2">
              <Label className="font-bold text-brand-dark">{t('streetAddress')} *</Label>
              <Input
                value={formData.address_line_1}
                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                placeholder={t('streetAddressPlaceholder')}
                className="border-gray-200"
              />
            </div>

            {/* Address Line 2 */}
            <div className="grid gap-2">
              <Label className="font-bold text-brand-dark">{t('apartmentSuite')}</Label>
              <Input
                value={formData.address_line_2}
                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                placeholder={t('apartmentSuitePlaceholder')}
                className="border-gray-200"
              />
            </div>

            {/* City and Province */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-bold text-brand-dark">{t('city')} *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('cityPlaceholder')}
                  className="border-gray-200"
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-bold text-brand-dark">{t('province')} *</Label>
                <Select value={formData.state_province} onValueChange={(value) => setFormData({ ...formData, state_province: value })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder={t('selectProvince')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CANADIAN_PROVINCES.map((prov) => (
                      <SelectItem key={prov.value} value={prov.value}>
                        {prov.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Postal Code */}
            <div className="grid gap-2">
              <Label className="font-bold text-brand-dark">{t('postalCode')} *</Label>
              <Input
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value.toUpperCase() })}
                placeholder={t('postalCodePlaceholder')}
                className="border-gray-200"
                maxLength={7}
              />
            </div>

            {/* Default Address Checkbox */}
            <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-brand-red focus:ring-brand-red"
              />
              <label htmlFor="is_default" className="cursor-pointer font-bold text-brand-dark">
                {t('setAsDefault')}
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-brand-dark hover:bg-brand-red text-white rounded-xl py-3 px-6 font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('saveAddress')
                )}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-brand-dark hover:border-brand-dark transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-bold text-brand-dark mb-2">{t('noAddresses')}</p>
          <p className="text-sm text-gray-500">{t('noAddressesDescription')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => {
            const typeConfig = ADDRESS_TYPES.find((t) => t.value === address.type) || ADDRESS_TYPES[0];
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={address.id}
                className={`bg-white border-2 rounded-2xl p-6 relative ${
                  address.is_default ? 'border-brand-red' : 'border-gray-200'
                }`}
              >
                {/* Default Badge */}
                {address.is_default && (
                  <div className="absolute top-4 right-4 bg-brand-red text-white px-3 py-1 rounded-full text-xs font-bold">
                    {t('defaultAddress')}
                  </div>
                )}

                {/* Address Type */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <TypeIcon className="w-5 h-5 text-brand-dark" />
                  </div>
                  <span className="font-black text-brand-dark text-lg capitalize">{address.type}</span>
                </div>

                {/* Address Details */}
                <div className="space-y-2 mb-6">
                  <p className="font-bold text-brand-dark">
                    {address.first_name} {address.last_name}
                  </p>
                  {address.company && (
                    <p className="text-sm text-gray-600">{address.company}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {address.address_line_1}
                    {address.address_line_2 && `, ${address.address_line_2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state_province} {address.postal_code}
                  </p>
                  <p className="text-sm text-gray-600">{address.country}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm text-brand-dark hover:border-brand-dark transition-colors"
                    >
                      {t('setDefault')}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm text-brand-dark hover:border-brand-dark transition-colors"
                    aria-label={t('edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm text-red-600 hover:border-red-600 transition-colors"
                    aria-label={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

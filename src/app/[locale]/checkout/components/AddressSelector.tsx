// src/app/[locale]/checkout/components/AddressSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, MapPin, Home, Building2 } from 'lucide-react';
import { addressService, type Address } from '@/src/services/addressService';
import { toast } from '@/src/hooks/use-toast';
import Loader from '@/src/components/ui/Loader';

interface AddressSelectorProps {
  userId: string;
  type: 'shipping' | 'billing';
  onSelectAddress: (address: Address | null) => void;
  onAddNewAddress: () => void;
  selectedAddressId?: string | null;
}

export default function AddressSelector({
  userId,
  type,
  onSelectAddress,
  onAddNewAddress,
  selectedAddressId,
}: AddressSelectorProps) {
  const t = useTranslations('checkout');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(selectedAddressId || null);

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, type]);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const userAddresses = await addressService.getUserAddresses(userId);
      const filteredAddresses = userAddresses.filter(addr => addr.type === type);
      setAddresses(filteredAddresses);

      // Auto-select default address if no selection
      if (!selectedId && filteredAddresses.length > 0) {
        const defaultAddress = filteredAddresses.find(addr => addr.is_default) || filteredAddresses[0];
        setSelectedId(defaultAddress.id);
        onSelectAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast({
        title: t('error'),
        description: t('errorLoadingAddresses'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedId(address.id);
    onSelectAddress(address);
  };

  const getAddressIcon = (addressType: string) => {
    return addressType === 'shipping' ? Home : Building2;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader />
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 mb-4">{t('noSavedAddresses')}</p>
        <button
          type="button"
          onClick={onAddNewAddress}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-bold"
        >
          <Plus className="w-4 h-4" />
          {t('addNewAddress')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((address) => {
          const Icon = getAddressIcon(address.type);
          const isSelected = selectedId === address.id;

          return (
            <div
              key={address.id}
              onClick={() => handleSelectAddress(address)}
              className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">
                      {address.first_name} {address.last_name}
                    </p>
                    {address.is_default && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                        {t('default')}
                      </span>
                    )}
                  </div>
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
              </div>
            </div>
          );
        })}

        {/* Add new address card */}
        <div
          onClick={onAddNewAddress}
          className="relative p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-all flex items-center justify-center min-h-[140px]"
        >
          <div className="text-center">
            <Plus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-bold text-gray-600">{t('addNewAddress')}</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-gray-500 text-center">
        {t('selectAddressInstruction')}
      </p>
    </div>
  );
}
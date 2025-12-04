// app/[locale]/checkout/components/ShippingForm.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { CANADIAN_PROVINCES } from '@/src/data/canadianProvinces';
import AddressSelector from './AddressSelector';
import { type Address } from '@/src/services/addressService';

// TypeScript declarations for Google Maps
interface GoogleMapsPlacePrediction {
  toPlace: () => GoogleMapsPlace;
}

interface GoogleMapsPlace {
  id: string;
  formattedAddress: string;
  displayName: string;
  location?: {
    lat: () => number;
    lng: () => number;
  };
  addressComponents?: Array<{
    types: string[];
    longText: string;
    shortText: string;
  }>;
  fetchFields: (options: { fields: string[] }) => Promise<void>;
}

// JSX IntrinsicElements augmentation for 'gmp-place-autocomplete'
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'included-primary-types'?: string;
          placeholder?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface GoogleGeocodeResult {
  address_components: Array<{
    types: string[];
    long_name: string;
    short_name: string;
  }>;
}

declare global {
  interface Window {
    google: {
      maps: {
        importLibrary: (library: string) => Promise<unknown>;
        Geocoder: new () => {
          geocode: (
            request: { location: { lat: number; lng: number }; region: string },
            callback: (results: GoogleGeocodeResult[] | null, status: string) => void
          ) => void;
        };
      };
    };
    initMap?: () => void;
  }
}

interface CheckoutFormData {
  email: string;
  phone: string;
  shipping: {
    firstName: string;
    lastName: string;
    address: string;
    apartment?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  sameAsShipping: boolean;
  billing?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createAccount: boolean;
  password?: string;
}

interface ShippingFormProps {
  form: UseFormReturn<CheckoutFormData>;
  onAddressChange: (address: { state: string; country: string }) => void;
  isAuth: boolean;
  userId?: string;
}

export default function ShippingForm({ form, onAddressChange, isAuth, userId }: ShippingFormProps) {
  const t = useTranslations('checkout');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const shippingAutocompleteInitialized = useRef(false);
  const billingAutocompleteInitialized = useRef(false);
  const [showAddressSelector, setShowAddressSelector] = useState(Boolean(isAuth && userId));
  const [showManualEntry, setShowManualEntry] = useState(!isAuth || !userId);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<Address | null>(null);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<Address | null>(null);

  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const sameAsShipping = watch('sameAsShipping');
  const createAccount = watch('createAccount');

  // Handle address selection from saved addresses
  const handleSelectShippingAddress = useCallback((address: Address | null) => {
    if (address) {
      setSelectedShippingAddress(address);
      // Fill form with selected address
      setValue('shipping.firstName', address.first_name);
      setValue('shipping.lastName', address.last_name);
      setValue('shipping.address', address.address_line_1);
      setValue('shipping.apartment', address.address_line_2 || '');
      setValue('shipping.city', address.city);
      setValue('shipping.state', address.state_province);
      setValue('shipping.postalCode', address.postal_code);
      setValue('shipping.country', address.country || 'CA');

      // Trigger address change for tax calculation
      onAddressChange({
        state: address.state_province,
        country: address.country || 'CA'
      });
    }
  }, [setValue, onAddressChange]);

  const handleSelectBillingAddress = useCallback((address: Address | null) => {
    if (address) {
      setSelectedBillingAddress(address);
      // Fill form with selected address
      setValue('billing.firstName', address.first_name);
      setValue('billing.lastName', address.last_name);
      setValue('billing.address', address.address_line_1);
      setValue('billing.apartment', address.address_line_2 || '');
      setValue('billing.city', address.city);
      setValue('billing.state', address.state_province);
      setValue('billing.postalCode', address.postal_code);
      setValue('billing.country', address.country || 'CA');
    }
  }, [setValue]);

  const handleAddNewShippingAddress = () => {
    setShowAddressSelector(false);
    setShowManualEntry(true);
  };

  const handleBackToSavedAddresses = () => {
    setShowAddressSelector(true);
    setShowManualEntry(false);
  };

  const handleAddNewBillingAddress = () => {
    // For billing, we just show the manual entry form
    // The selector remains visible
  };

  // Function to fill in the address form fields
  const fillInAddress = useCallback(async (placePrediction: GoogleMapsPlacePrediction, type: 'shipping' | 'billing') => {
    try {
      // Convert prediction to place
      const place = placePrediction.toPlace();

      // Fetch all available fields to see what data we have
      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress', 'displayName', 'location']
      });

      // Log everything to debug postal code issue
      console.log('=== Google Places API Response ===');
      console.log('Place ID:', place.id);
      console.log('Formatted Address:', place.formattedAddress);
      console.log('Display Name:', place.displayName);
      console.log('Location:', place.location?.lat(), place.location?.lng());
      console.log('Address Components:', place.addressComponents);

      if (!place.addressComponents) {
        console.log('No address components found');
        return;
      }

      // Initialize address data
      let address1 = '';
      let city = '';
      let province = '';
      let country = '';
      let postcode = '';
      let postcodeSuffix = '';

      // Parse address components
      for (const component of place.addressComponents) {
        const types = component.types;

        // Build street address
        if (types.includes('street_number')) {
          address1 = `${component.longText} ${address1}`;
        }

        if (types.includes('route')) {
          address1 += component.shortText;
        }

        // City
        if (types.includes('locality')) {
          city = component.longText || '';
        }

        // Province (Canada)
        if (types.includes('administrative_area_level_1')) {
          province = component.shortText || '';
        }

        // Country
        if (types.includes('country')) {
          country = component.shortText || '';
        }

        // Postal code - Canadian format: A1A 1A1
        // Google sometimes splits this into postal_code (A1A) and postal_code_suffix (1A1)
        if (types.includes('postal_code')) {
          postcode = component.longText || '';
        }

        // Postal code suffix (second part of Canadian postal code)
        if (types.includes('postal_code_suffix')) {
          postcodeSuffix = component.longText || '';
        }
      }

      // Combine postal code parts for Canadian addresses
      // Canadian postal code format: A1A 1A1 (letter-digit-letter space digit-letter-digit)
      let fullPostalCode = postcode;
      if (postcodeSuffix) {
        // Remove any existing space and rebuild with proper spacing
        fullPostalCode = `${postcode.replace(/\s+/g, '')} ${postcodeSuffix}`.trim();
      }

      // Ensure proper formatting for Canadian postal codes (uppercase and proper spacing)
      if (country === 'CA' && fullPostalCode) {
        // Remove all spaces
        fullPostalCode = fullPostalCode.replace(/\s+/g, '').toUpperCase();
        // Add space in the middle if it's a 6-character code
        if (fullPostalCode.length === 6) {
          fullPostalCode = `${fullPostalCode.slice(0, 3)} ${fullPostalCode.slice(3)}`;
        }
      }

      // Try to get more accurate postal code using Geocoding API
      // Google Places sometimes returns incorrect postal codes, so we verify with reverse geocoding
      if (place.location && country === 'CA') {
        try {
          const lat = place.location.lat();
          const lng = place.location.lng();

          console.log('Attempting reverse geocoding for more accurate postal code...');
          const geocoder = new window.google.maps.Geocoder();
          const geocodeResult = await new Promise<GoogleGeocodeResult>((resolve, reject) => {
            geocoder.geocode(
              {
                location: { lat, lng },
                region: 'CA'
              },
              (results: GoogleGeocodeResult[] | null, status: string) => {
                if (status === 'OK' && results && results[0]) {
                  resolve(results[0]);
                } else {
                  reject(new Error(`Geocoding failed: ${status}`));
                }
              }
            );
          });

          // Extract postal code from geocoding result
          let geocodedPostalCode = '';
          let geocodedPostalCodeSuffix = '';

          for (const component of geocodeResult.address_components) {
            const types = component.types;
            if (types.includes('postal_code')) {
              geocodedPostalCode = component.long_name || '';
            }
            if (types.includes('postal_code_suffix')) {
              geocodedPostalCodeSuffix = component.long_name || '';
            }
          }

          // Combine and format geocoded postal code
          if (geocodedPostalCode) {
            let verifiedPostalCode = geocodedPostalCode;
            if (geocodedPostalCodeSuffix) {
              verifiedPostalCode = `${geocodedPostalCode.replace(/\s+/g, '')} ${geocodedPostalCodeSuffix}`.trim();
            }

            // Format properly
            verifiedPostalCode = verifiedPostalCode.replace(/\s+/g, '').toUpperCase();
            if (verifiedPostalCode.length === 6) {
              verifiedPostalCode = `${verifiedPostalCode.slice(0, 3)} ${verifiedPostalCode.slice(3)}`;
            }

            console.log('Postal code comparison:', {
              fromPlaces: fullPostalCode,
              fromGeocoding: verifiedPostalCode,
              usingGeocoded: verifiedPostalCode !== fullPostalCode
            });

            // Use the geocoded postal code as it's typically more accurate
            fullPostalCode = verifiedPostalCode;
          }
        } catch (geocodeError) {
          console.warn('Reverse geocoding failed, using Places postal code:', geocodeError);
        }
      }

      console.log(`${type} address parsed:`, {
        address1,
        city,
        province,
        country,
        postcode,
        postcodeSuffix,
        fullPostalCode
      });

      // Update form fields based on type
      setValue(`${type}.address`, address1.trim());
      setValue(`${type}.city`, city);
      setValue(`${type}.state`, province);
      setValue(`${type}.country`, country || 'CA');
      setValue(`${type}.postalCode`, fullPostalCode);

      // Clear the autocomplete input
      const autocompleteId = type === 'shipping' ? '#shipping-place-autocomplete' : '#billing-place-autocomplete';
      const placeAutocomplete = document.querySelector(autocompleteId) as (HTMLElement & { value: string }) | null;
      if (placeAutocomplete) {
        placeAutocomplete.value = '';
      }

      // Focus on apartment field after autocomplete
      const apartmentField = document.querySelector(`#${type}-apartment`) as HTMLInputElement | null;
      if (apartmentField) {
        apartmentField.focus();
      }

      // Trigger parent callback only for shipping
      if (type === 'shipping') {
        onAddressChange({
          state: province,
          country: country || 'CA'
        });
      }

    } catch (error) {
      console.error(`Error filling ${type} address:`, error);
    }
  }, [setValue, onAddressChange]);

  // Load Google Maps Script (if not already loaded)
  useEffect(() => {
    let mounted = true;

    const loadScript = async () => {
      try {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');

        if (!existingScript) {
          // Create script with loading=async as Google recommends
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&loading=async&libraries=places&v=weekly&callback=initMap`;
          script.async = true;
          script.defer = true;

          // Create callback
          window.initMap = (): void => {
            console.log('Google Maps loaded via callback');
            if (mounted) {
              setIsLoading(false);
            }
          };

          script.onerror = (): void => {
            if (mounted) {
              setError('Failed to load Google Maps');
              setIsLoading(false);
            }
          };

          document.head.appendChild(script);
        } else {
          // Script already exists
          if (window.google?.maps) {
            if (mounted) {
              setIsLoading(false);
            }
          } else {
            // Wait for callback
            window.initMap = (): void => {
              console.log('Google Maps loaded via existing script');
              if (mounted) {
                setIsLoading(false);
              }
            };
          }
        }
      } catch (err) {
        console.error('Error loading Google Places:', err);
        if (mounted) {
          setError('Failed to initialize Google Places');
          setIsLoading(false);
        }
      }
    };

    loadScript();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Shipping Address Autocomplete
  useEffect(() => {
    if (isLoading || shippingAutocompleteInitialized.current) return;

    const initShippingAutocomplete = async () => {
      try {
        // Import Places library
        await window.google.maps.importLibrary('places');

        // Query the shipping autocomplete element
        const placeAutocomplete = document.querySelector(
          '#shipping-place-autocomplete'
        ) as HTMLElement & {
          includedRegionCodes?: string[];
          addEventListener: (event: string, handler: (e: { placePrediction: GoogleMapsPlacePrediction }) => Promise<void>) => void
        };

        if (!placeAutocomplete) {
          console.error('Shipping place autocomplete element not found');
          return;
        }

        // Set region codes to CANADA ONLY
        placeAutocomplete.includedRegionCodes = ['CA'];

        // Apply custom styling
        if (!document.getElementById('gmp-autocomplete-styles')) {
          const style = document.createElement('style');
          style.id = 'gmp-autocomplete-styles';
          style.textContent = `
            gmp-place-autocomplete {
              width: 100%;
              --gmpx-color-surface: #ffffff;
              --gmpx-color-on-surface: #1f2937;
              --gmpx-color-on-surface-variant: #6b7280;
              --gmpx-color-primary: #dc2626;
              --gmpx-color-on-primary: #ffffff;
              --gmpx-color-outline: #d1d5db;
              --gmpx-color-surface-variant: #f9fafb;
              --gmpx-font-family-base: inherit;
              --gmpx-font-size-base: 0.875rem;
              --gmpx-border-radius: 0.5rem;
            }
            gmp-place-autocomplete::part(input) {
              padding: 0.5rem 0.75rem;
              border: 1px solid #d1d5db;
              border-radius: 0.5rem;
            }
            gmp-place-autocomplete::part(input):focus {
              outline: none;
              border-color: #dc2626;
              box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
            }
          `;
          document.head.appendChild(style);
        }

        // Handle the gmp-select event for shipping
        placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }: { placePrediction: GoogleMapsPlacePrediction }) => {
          await fillInAddress(placePrediction, 'shipping');
        });

        shippingAutocompleteInitialized.current = true;
        console.log('✅ Shipping PlaceAutocomplete initialized successfully (Canada only)');

      } catch (error) {
        console.error('Failed to initialize Shipping PlaceAutocomplete:', error);
        setError('Failed to initialize address autocomplete');
      }
    };

    initShippingAutocomplete();

  }, [isLoading, fillInAddress]);

  // Initialize Billing Address Autocomplete
  useEffect(() => {
    if (isLoading || billingAutocompleteInitialized.current || sameAsShipping) return;

    const initBillingAutocomplete = async () => {
      try {
        // Import Places library
        await window.google.maps.importLibrary('places');

        // Query the billing autocomplete element
        const placeAutocomplete = document.querySelector(
          '#billing-place-autocomplete'
        ) as HTMLElement & {
          includedRegionCodes?: string[];
          addEventListener: (event: string, handler: (e: { placePrediction: GoogleMapsPlacePrediction }) => Promise<void>) => void
        };

        if (!placeAutocomplete) {
          console.error('Billing place autocomplete element not found');
          return;
        }

        // Set region codes to CANADA ONLY
        placeAutocomplete.includedRegionCodes = ['CA'];

        // Handle the gmp-select event for billing
        placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }: { placePrediction: GoogleMapsPlacePrediction }) => {
          await fillInAddress(placePrediction, 'billing');
        });

        billingAutocompleteInitialized.current = true;
        console.log('✅ Billing PlaceAutocomplete initialized successfully (Canada only)');

      } catch (error) {
        console.error('Failed to initialize Billing PlaceAutocomplete:', error);
      }
    };

    initBillingAutocomplete();

  }, [isLoading, sameAsShipping, fillInAddress]);

  return (
    <div className="space-y-8">
      {/* Contact Information */}
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-4">{t('contactInformation')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {t('email')}
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">
                {errors.email.message as string}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {t('phone')}
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">
                {errors.phone.message as string}
              </p>
            )}
          </div>

          {!isAuth && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="createAccount"
                {...register('createAccount')}
                className="w-5 h-5 border-2 border-gray-300 rounded accent-gray-900"
              />
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
                {t('createAccountForFaster')}
              </span>
            </label>
          )}

          {createAccount && !isAuth && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('password')}
              </label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.password.message as string}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shipping Address */}
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-4">{t('shippingAddress')}</h2>

        {/* Show address selector for authenticated users with saved addresses */}
        {isAuth && userId && showAddressSelector && (
          <div className="mb-6">
            <AddressSelector
              userId={userId}
              type="shipping"
              onSelectAddress={handleSelectShippingAddress}
              onAddNewAddress={handleAddNewShippingAddress}
              selectedAddressId={selectedShippingAddress?.id}
            />
          </div>
        )}

        {/* Show manual entry form for guests or when adding new address */}
        {(!isAuth || showManualEntry) && (
        <div className="space-y-4">
          {/* Back to saved addresses button - only for authenticated users */}
          {isAuth && userId && !showAddressSelector && (
            <button
              type="button"
              onClick={handleBackToSavedAddresses}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToSavedAddresses')}
            </button>
          )}

          <div className="grid gap-4">
          {/* Country Select */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {t('country')}
            </label>
            <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium bg-white">
              <option>Canada</option>
            </select>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('firstName')}
              </label>
              <input
                type="text"
                {...register('shipping.firstName')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
              />
              {errors.shipping?.firstName && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.shipping.firstName.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('lastName')}
              </label>
              <input
                type="text"
                {...register('shipping.lastName')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
              />
              {errors.shipping?.lastName && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.shipping.lastName.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Address Search - Canada only - Full Width */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {t('deliverTo')}
              {error && <span className="text-red-500 text-xs ml-2">({error})</span>}
            </label>

            {/* Google Places Autocomplete Element - Shipping */}
            {!isLoading ? (
              <gmp-place-autocomplete
                id="shipping-place-autocomplete"
                included-primary-types="street_address"
                placeholder={t('startTypingAddress')}
              />
            ) : (
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50"
                placeholder={t('loadingAddressAutocomplete')}
                disabled
              />
            )}

            <p className="text-xs text-gray-400 mt-1">
              {t('searchAddressHelper')}
            </p>
          </div>

          {/* Street Address Display - Visible Input - Full Width */}
          <div className="col-span-2">
            <label htmlFor="shipping-address" className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {t('streetAddress')}
            </label>
            <input
              id="shipping-address"
              type="text"
              {...register('shipping.address')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
              placeholder="123 Rue Principale"
            />
            {errors.shipping?.address && (
              <p className="text-sm text-red-500 mt-1">
                {errors.shipping.address.message as string}
              </p>
            )}
          </div>

          {/* Apartment/Suite (Optional) - Full Width */}
          <div className="col-span-2">
            <label htmlFor="shipping-apartment" className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {t('apartment')} <span className="text-gray-400 font-normal">({t('optional')})</span>
            </label>
            <input
              id="shipping-apartment"
              type="text"
              {...register('shipping.apartment')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
              placeholder="Apt, Suite, Unit, etc."
            />
          </div>

          {/* City, Postal Code, Province - One Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 col-span-2">
            <div>
              <label htmlFor="shipping-city" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('city')}
              </label>
              <input
                id="shipping-city"
                type="text"
                {...register('shipping.city')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
              />
              {errors.shipping?.city && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.shipping.city.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="shipping-postal" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('postalCode')}
              </label>
              <input
                id="shipping-postal"
                type="text"
                {...register('shipping.postalCode')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                placeholder="H1A 1A1"
              />
              {errors.shipping?.postalCode && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.shipping.postalCode.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="shipping-state" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('province')}
              </label>
              <select
                id="shipping-state"
                {...register('shipping.state', {
                  onChange: (e) => {
                    const selectedProvince = e.target.value;
                    if (selectedProvince) {
                      onAddressChange({
                        state: selectedProvince,
                        country: 'CA'
                      });
                    }
                  }
                })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium bg-white"
              >
                <option value="">{t('selectProvince')}</option>
                {CANADIAN_PROVINCES.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
              {errors.shipping?.state && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.shipping.state.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Country - Hidden field, always Canada */}
          <input
            type="hidden"
            {...register('shipping.country')}
            value="CA"
          />
          </div>
        </div>
        )}
      </div>

      {/* Shipping Method */}
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-4">{t('shippingMethod')}</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 border-2 border-gray-900 bg-gray-900/5 rounded-xl cursor-pointer transition-all">
            <div className="flex items-center gap-3">
              <input type="radio" name="shipping" className="w-5 h-5 accent-gray-900" defaultChecked />
              <div>
                <span className="block font-bold text-gray-900">{t('standardShipping')}</span>
                <span className="text-xs text-gray-500 font-medium">3-5 Business Days</span>
              </div>
            </div>
            <span className="font-bold text-gray-900">{t('free')}</span>
          </label>
          <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-gray-900 transition-all">
            <div className="flex items-center gap-3">
              <input type="radio" name="shipping" className="w-5 h-5 accent-gray-900" />
              <div>
                <span className="block font-bold text-gray-700">{t('expressShipping')}</span>
                <span className="text-xs text-gray-500 font-medium">1-2 Business Days</span>
              </div>
            </div>
            <span className="font-bold text-gray-700">$15.00</span>
          </label>
        </div>
      </div>

      {/* Billing Address Section - Collapsed by default */}
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-4">{t('billingAddress')}</h2>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="sameAsShipping"
            {...register('sameAsShipping')}
            className="w-5 h-5 border-2 border-gray-300 rounded accent-gray-900"
            defaultChecked
          />
          <label htmlFor="sameAsShipping" className="text-sm font-medium text-gray-600 cursor-pointer">
            {t('sameAsShippingAddress')}
          </label>
        </div>

        {!sameAsShipping && (
          <>
            {/* Show address selector for authenticated users with saved addresses */}
            {isAuth && userId && (
              <div className="mb-6">
                <AddressSelector
                  userId={userId}
                  type="billing"
                  onSelectAddress={handleSelectBillingAddress}
                  onAddNewAddress={handleAddNewBillingAddress}
                  selectedAddressId={selectedBillingAddress?.id}
                />
              </div>
            )}

            {/* Always show manual entry form for billing (in case they want to enter different) */}
            <div className="grid gap-4 pt-4">
            {/* Billing Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {t('firstName')}
                </label>
                <input
                  type="text"
                  {...register('billing.firstName')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                />
                {errors.billing?.firstName && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.billing.firstName.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {t('lastName')}
                </label>
                <input
                  type="text"
                  {...register('billing.lastName')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                />
                {errors.billing?.lastName && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.billing.lastName.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Billing Address Search - Full Width */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('billingAddressSearch')}
              </label>

              {/* Google Places Autocomplete Element - Billing */}
              <gmp-place-autocomplete
                id="billing-place-autocomplete"
                included-primary-types="street_address"
                placeholder={t('startTypingAddress')}
              />

              <p className="text-xs text-gray-400 mt-1">
                {t('searchAddressHelper')}
              </p>
            </div>

            {/* Billing Street Address - Full Width */}
            <div className="col-span-2">
              <label htmlFor="billing-address" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('streetAddress')}
              </label>
              <input
                id="billing-address"
                type="text"
                {...register('billing.address')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                placeholder="123 Rue Principale"
              />
              {errors.billing?.address && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.billing.address.message as string}
                </p>
              )}
            </div>

            {/* Billing Apartment/Suite (Optional) - Full Width */}
            <div className="col-span-2">
              <label htmlFor="billing-apartment" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {t('apartment')} <span className="text-gray-400 font-normal">({t('optional')})</span>
              </label>
              <input
                id="billing-apartment"
                type="text"
                {...register('billing.apartment')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                placeholder="Apt, Suite, Unit, etc."
              />
            </div>

            {/* Billing City, Postal Code, Province - One Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 col-span-2">
              <div>
                <label htmlFor="billing-city" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {t('city')}
                </label>
                <input
                  id="billing-city"
                  type="text"
                  {...register('billing.city')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                />
                {errors.billing?.city && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.billing.city.message as string}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="billing-postal" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {t('postalCode')}
                </label>
                <input
                  id="billing-postal"
                  type="text"
                  {...register('billing.postalCode')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium"
                  placeholder="H1A 1A1"
                />
                {errors.billing?.postalCode && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.billing.postalCode.message as string}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="billing-state" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {t('province')}
                </label>
                <select
                  id="billing-state"
                  {...register('billing.state')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium bg-white"
                >
                  <option value="">{t('selectProvince')}</option>
                  {CANADIAN_PROVINCES.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {errors.billing?.state && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.billing.state.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Billing Country - Hidden field, always Canada */}
            <input
              type="hidden"
              {...register('billing.country')}
              value="CA"
            />
          </div>
          </>
        )}
      </div>
    </div>
  );
}
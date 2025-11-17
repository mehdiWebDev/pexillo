// app/[locale]/checkout/components/ShippingForm.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';
import { Mail, Phone, Home, CreditCard, Search } from 'lucide-react';
import { CANADIAN_PROVINCES } from '@/src/data/canadianProvinces';

// TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

interface ShippingFormProps {
  form: UseFormReturn<any>;
  onAddressChange: (address: { state: string; country: string }) => void;
  isAuth: boolean;
}

export default function ShippingForm({ form, onAddressChange, isAuth }: ShippingFormProps) {
  const t = useTranslations('checkout');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const shippingAutocompleteInitialized = useRef(false);
  const billingAutocompleteInitialized = useRef(false);

  const {
    register,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = form;

  const sameAsShipping = watch('sameAsShipping');
  const createAccount = watch('createAccount');

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
          window.initMap = () => {
            console.log('Google Maps loaded via callback');
            if (mounted) {
              setIsLoading(false);
            }
          };

          script.onerror = () => {
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
            window.initMap = () => {
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
        ) as any;

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
        placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }: any) => {
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

  }, [isLoading, setValue, onAddressChange]);

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
        ) as any;

        if (!placeAutocomplete) {
          console.error('Billing place autocomplete element not found');
          return;
        }

        // Set region codes to CANADA ONLY
        placeAutocomplete.includedRegionCodes = ['CA'];

        // Handle the gmp-select event for billing
        placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }: any) => {
          await fillInAddress(placePrediction, 'billing');
        });

        billingAutocompleteInitialized.current = true;
        console.log('✅ Billing PlaceAutocomplete initialized successfully (Canada only)');

      } catch (error) {
        console.error('Failed to initialize Billing PlaceAutocomplete:', error);
      }
    };

    initBillingAutocomplete();

  }, [isLoading, sameAsShipping, setValue]);

  // Function to fill in the address form fields
  const fillInAddress = async (placePrediction: any, type: 'shipping' | 'billing') => {
    try {
      // Convert prediction to place
      const place = placePrediction.toPlace();

      // Fetch address components
      await place.fetchFields({ fields: ['addressComponents'] });

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
      const placeAutocomplete = document.querySelector(autocompleteId) as any;
      if (placeAutocomplete) {
        placeAutocomplete.value = '';
      }

      // Focus on apartment field after autocomplete
      const apartmentField = document.querySelector(`#${type}-apartment`) as HTMLInputElement;
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
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mail size={20} />
          {t('contactInformation')}
        </h2>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('email')} *
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">
                {errors.email.message as string}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('phone')} *
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">
                {errors.phone.message as string}
              </p>
            )}
          </div>

          {!isAuth && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="createAccount"
                {...register('createAccount')}
                className="rounded"
              />
              <label htmlFor="createAccount" className="text-sm cursor-pointer">
                {t('createAccountForFaster')}
              </label>
            </div>
          )}

          {createAccount && !isAuth && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('password')} *
              </label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {errors.password.message as string}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Home size={20} />
          {t('shippingAddress')}
        </h2>

        <div className="grid gap-4">
          {/* Name Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('firstName')} *
              </label>
              <input
                type="text"
                {...register('shipping.firstName')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.shipping?.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.shipping.firstName.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('lastName')} *
              </label>
              <input
                type="text"
                {...register('shipping.lastName')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.shipping?.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.shipping.lastName.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Address Search - Canada only */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Search size={16} />
              {t('deliverTo')} *
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
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                placeholder={t('loadingAddressAutocomplete')}
                disabled
              />
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              {t('searchAddressHelper')}
            </p>
          </div>

          {/* Street Address Display - Visible Input */}
          <div>
            <label htmlFor="shipping-address" className="block text-sm font-medium mb-2">
              {t('streetAddress')} *
            </label>
            <input
              id="shipping-address"
              type="text"
              {...register('shipping.address')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="123 Rue Principale"
            />
            {errors.shipping?.address && (
              <p className="text-sm text-destructive mt-1">
                {errors.shipping.address.message as string}
              </p>
            )}
          </div>

          {/* Apartment/Suite */}
          <div>
            <label htmlFor="shipping-apartment" className="block text-sm font-medium mb-2">
              {t('apartment')}
            </label>
            <input
              id="shipping-apartment"
              type="text"
              {...register('shipping.apartment')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('apartmentPlaceholder')}
            />
          </div>

          {/* City, Province, Postal Code */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="shipping-city" className="block text-sm font-medium mb-2">
                {t('city')} *
              </label>
              <input
                id="shipping-city"
                type="text"
                {...register('shipping.city')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.shipping?.city && (
                <p className="text-sm text-destructive mt-1">
                  {errors.shipping.city.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="shipping-state" className="block text-sm font-medium mb-2">
                {t('province')} *
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
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">{t('selectProvince')}</option>
                {CANADIAN_PROVINCES.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
              {errors.shipping?.state && (
                <p className="text-sm text-destructive mt-1">
                  {errors.shipping.state.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="shipping-postal" className="block text-sm font-medium mb-2">
                {t('postalCode')} *
              </label>
              <input
                id="shipping-postal"
                type="text"
                {...register('shipping.postalCode')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="H1A 1A1"
              />
              {errors.shipping?.postalCode && (
                <p className="text-sm text-destructive mt-1">
                  {errors.shipping.postalCode.message as string}
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
          
          {/* Display Canada as read-only info */}
          <div className="bg-muted/30 border border-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              {t('deliveryAvailable')}: <span className="font-medium text-foreground">{t('canadaOnly')}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CreditCard size={20} />
          {t('billingAddress')}
        </h2>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="sameAsShipping"
            {...register('sameAsShipping')}
            className="rounded"
          />
          <label htmlFor="sameAsShipping" className="text-sm cursor-pointer">
            {t('sameAsShippingAddress')}
          </label>
        </div>

        {!sameAsShipping && (
          <div className="grid gap-4 pt-4">
            {/* Billing Name Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('firstName')} *
                </label>
                <input
                  type="text"
                  {...register('billing.firstName')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.billing?.firstName && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.billing.firstName.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('lastName')} *
                </label>
                <input
                  type="text"
                  {...register('billing.lastName')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.billing?.lastName && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.billing.lastName.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Billing Address Search */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Search size={16} />
                {t('billingAddressSearch')}
              </label>
              
              {/* Google Places Autocomplete Element - Billing */}
              <gmp-place-autocomplete
                id="billing-place-autocomplete"
                included-primary-types="street_address"
                placeholder={t('startTypingAddress')}
              />
              
              <p className="text-xs text-muted-foreground mt-1">
                {t('searchAddressHelper')}
              </p>
            </div>

            {/* Billing Street Address */}
            <div>
              <label htmlFor="billing-address" className="block text-sm font-medium mb-2">
                {t('streetAddress')} *
              </label>
              <input
                id="billing-address"
                type="text"
                {...register('billing.address')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="123 Rue Principale"
              />
              {errors.billing?.address && (
                <p className="text-sm text-destructive mt-1">
                  {errors.billing.address.message as string}
                </p>
              )}
            </div>

            {/* Billing Apartment/Suite */}
            <div>
              <label htmlFor="billing-apartment" className="block text-sm font-medium mb-2">
                {t('apartment')}
              </label>
              <input
                id="billing-apartment"
                type="text"
                {...register('billing.apartment')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('apartmentPlaceholder')}
              />
            </div>

            {/* Billing City, Province, Postal Code */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="billing-city" className="block text-sm font-medium mb-2">
                  {t('city')} *
                </label>
                <input
                  id="billing-city"
                  type="text"
                  {...register('billing.city')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.billing?.city && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.billing.city.message as string}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="billing-state" className="block text-sm font-medium mb-2">
                  {t('province')} *
                </label>
                <select
                  id="billing-state"
                  {...register('billing.state')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">{t('selectProvince')}</option>
                  {CANADIAN_PROVINCES.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {errors.billing?.state && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.billing.state.message as string}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="billing-postal" className="block text-sm font-medium mb-2">
                  {t('postalCode')} *
                </label>
                <input
                  id="billing-postal"
                  type="text"
                  {...register('billing.postalCode')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="H1A 1A1"
                />
                {errors.billing?.postalCode && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.billing.postalCode.message as string}
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
        )}
      </div>
    </div>
  );
}
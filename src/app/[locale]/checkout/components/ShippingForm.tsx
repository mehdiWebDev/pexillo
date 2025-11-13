// app/[locale]/checkout/components/ShippingForm.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';
import { Mail, Phone, Home, CreditCard } from 'lucide-react';

// Google Maps type definitions
declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }

  namespace JSX {
    interface IntrinsicElements {
      'gmp-placeautocomplete': any;
    }
  }
}

declare namespace google.maps {
  namespace places {
    class PlaceAutocompleteElement extends HTMLElement {
      constructor(options?: {
        componentRestrictions?: { country: string | string[] };
        types?: string[];
      });
      value: string;
      addEventListener(event: 'gmp-placeselect', handler: (e: any) => void): void;
    }

    interface PlaceResult {
      addressComponents?: AddressComponent[];
      formattedAddress?: string;
      location?: {
        lat(): number;
        lng(): number;
      };
    }

    interface AddressComponent {
      longText: string;
      shortText: string;
      types: string[];
    }
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }
}

// Component interfaces
interface AddressComponent {
  street_number: string;
  route: string;
  locality: string;
  administrative_area_level_1: string;
  country: string;
  postal_code: string;
}

interface ShippingFormProps {
  form: UseFormReturn<any>;
  onAddressChange: (address: { state: string; country: string }) => void;
  isAuth: boolean;
}

// Google Maps Loader
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadPromise: Promise<void> | null = null;

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Check if already loaded
    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      return Promise.resolve();
    }

    this.loadPromise = new Promise((resolve, reject) => {
      // Check for existing script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        return;
      }

      // Create loader script
      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        reject(new Error('Google Maps API key is missing'));
        return;
      }

      // Use the recommended loading parameter and add place library with beta version
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Wait for Places library to be available
        const checkPlaces = () => {
          if (window.google?.maps?.places?.PlaceAutocompleteElement) {
            resolve();
          } else {
            setTimeout(checkPlaces, 100);
          }
        };
        checkPlaces();
      };

      script.onerror = () => reject(new Error('Failed to load Google Maps script'));

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}

export default function ShippingForm({ form, onAddressChange, isAuth }: ShippingFormProps) {
  const t = useTranslations('checkout');
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const autocompleteElementRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = form;

  const sameAsShipping = watch('sameAsShipping');
  const createAccount = watch('createAccount');

  // Type-safe error getter
  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return String(error.message);
    return '';
  };

  // Load Google Maps
  useEffect(() => {
    const loader = GoogleMapsLoader.getInstance();

    loader.load()
      .then(() => {
        setIsGoogleLoaded(true);
        console.log('Google Maps loaded successfully');
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
        setLoadError('Failed to load address autocomplete');
      });
  }, []);

  // Parse address components
  const parseAddressComponents = useCallback((place: any): Partial<AddressComponent> => {
    const result: Partial<AddressComponent> = {
      street_number: '',
      route: '',
      locality: '',
      administrative_area_level_1: '',
      country: '',
      postal_code: '',
    };

    if (!place.addressComponents) return result;

    place.addressComponents.forEach((component: any) => {
      const types = component.types;

      if (types.includes('street_number')) {
        result.street_number = component.longText || component.long_name || '';
      }
      if (types.includes('route')) {
        result.route = component.longText || component.long_name || '';
      }
      if (types.includes('locality')) {
        result.locality = component.longText || component.long_name || '';
      }
      if (types.includes('administrative_area_level_1')) {
        result.administrative_area_level_1 = component.shortText || component.short_name || '';
      }
      if (types.includes('country')) {
        result.country = component.shortText || component.short_name || '';
      }
      if (types.includes('postal_code')) {
        result.postal_code = component.longText || component.long_name || '';
      }
    });

    return result;
  }, []);

  // Initialize the PlaceAutocompleteElement
  useEffect(() => {
    if (!isGoogleLoaded || loadError) return;
    if (!containerRef.current) return;

    // Remove any existing autocomplete element
    const existingElement = containerRef.current.querySelector('gmp-placeautocomplete');
    if (existingElement) {
      existingElement.remove();
    }

    try {
      // Create the PlaceAutocompleteElement without the unsupported 'fields' property
      const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: ['us', 'ca'] },
        types: ['address']
      });

      // Set attributes directly on the element
      placeAutocomplete.setAttribute('placeholder', t('startTypingAddress'));
      placeAutocomplete.setAttribute('id', 'shipping-address-autocomplete');

      // Apply styling to match your input fields
      const existingStyle = document.getElementById('gmp-autocomplete-styles');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'gmp-autocomplete-styles';
        style.textContent = `
          gmp-placeautocomplete {
            width: 100%;
            height: 42px;
            --gmpx-color-surface: white;
            --gmpx-color-on-surface: #1f2937;
            --gmpx-color-on-surface-variant: #6b7280;
            --gmpx-color-primary: #dc2626;
            --gmpx-color-outline: #d1d5db;
            --gmpx-font-family-base: inherit;
            --gmpx-font-size-base: 0.875rem;
            --gmpx-border-radius: 0.5rem;
          }
          gmp-placeautocomplete input {
            padding: 0.5rem 0.75rem !important;
            border: 1px solid #d1d5db !important;
            border-radius: 0.5rem !important;
            font-size: 0.875rem !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          gmp-placeautocomplete input:focus {
            outline: none !important;
            border-color: #dc2626 !important;
            box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2) !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Add event listener for place selection
      placeAutocomplete.addEventListener('gmp-placeselect', async (event: any) => {
        const place = event.detail.place;

        if (!place) {
          console.log('No place selected');
          return;
        }

        try {
          // Fetch the fields we need after selection
          await place.fetchFields({
            fields: ['addressComponents', 'formattedAddress']
          });

          const components = parseAddressComponents(place);

          const fullAddress = `${components.street_number || ''} ${components.route || ''}`.trim();

          // Update form values
          setValue('shipping.address', fullAddress || place.formattedAddress || '');
          setValue('shipping.city', components.locality || '');
          setValue('shipping.state', components.administrative_area_level_1 || '');
          setValue('shipping.country', components.country || '');
          setValue('shipping.postalCode', components.postal_code || '');

          // Update the hidden input value as well
          const hiddenInput = document.getElementById('shipping-address') as HTMLInputElement;
          if (hiddenInput) {
            hiddenInput.value = fullAddress || place.formattedAddress || '';
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Notify parent about address change
          onAddressChange({
            state: components.administrative_area_level_1 || '',
            country: components.country || ''
          });

          console.log('Address updated:', {
            fullAddress,
            city: components.locality,
            state: components.administrative_area_level_1,
            country: components.country,
            postalCode: components.postal_code
          });
        } catch (fetchError) {
          console.error('Error fetching place details:', fetchError);
        }
      });

      // Insert the element
      containerRef.current.appendChild(placeAutocomplete);
      autocompleteElementRef.current = placeAutocomplete;

      console.log('PlaceAutocompleteElement initialized successfully');

    } catch (error) {
      console.error('Error setting up PlaceAutocompleteElement:', error);
      setLoadError('Failed to initialize address autocomplete');
    }

    // Cleanup
    return () => {
      if (autocompleteElementRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(autocompleteElementRef.current);
        } catch (e) {
          // Element might already be removed
        }
      }
    };
  }, [isGoogleLoaded, loadError, setValue, onAddressChange, parseAddressComponents, t]);

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
                {getErrorMessage(errors.email.message)}
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
                {getErrorMessage(errors.phone.message)}
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
                  {getErrorMessage(errors.password.message)}
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
              {form.getFieldState('shipping.firstName', form.formState).error && (
                <p className="text-sm text-destructive mt-1">
                  {getErrorMessage(form.getFieldState('shipping.firstName', form.formState).error?.message)}
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
              {form.getFieldState('shipping.lastName', form.formState).error && (
                <p className="text-sm text-destructive mt-1">
                  {getErrorMessage(form.getFieldState('shipping.lastName', form.formState).error?.message)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('address')} *
            </label>
            {/* Container for the PlaceAutocompleteElement and hidden input */}
            <div ref={containerRef} className="w-full">
              {/* Hidden input for form registration */}
              <input
                id="shipping-address"
                type="hidden"
                {...register('shipping.address')}
              />
              {/* Fallback input shown while loading */}
              {!isGoogleLoaded && (
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('startTypingAddress')}
                  autoComplete="off"
                />
              )}
            </div>
            {form.getFieldState('shipping.address', form.formState).error && (
              <p className="text-sm text-destructive mt-1">
                {getErrorMessage(form.getFieldState('shipping.address', form.formState).error?.message)}
              </p>
            )}
            {loadError && (
              <p className="text-sm text-amber-600 mt-1">{loadError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('apartment')}
            </label>
            <input
              type="text"
              {...register('shipping.apartment')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('apartmentPlaceholder')}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('city')} *
              </label>
              <input
                type="text"
                {...register('shipping.city')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {form.getFieldState('shipping.city', form.formState).error && (
                <p className="text-sm text-destructive mt-1">
                  {getErrorMessage(form.getFieldState('shipping.city', form.formState).error?.message)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('state')} *
              </label>
              <input
                type="text"
                {...register('shipping.state')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {form.getFieldState('shipping.state', form.formState).error && (
                <p className="text-sm text-destructive mt-1">
                  {getErrorMessage(form.getFieldState('shipping.state', form.formState).error?.message)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('postalCode')} *
              </label>
              <input
                type="text"
                {...register('shipping.postalCode')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {form.getFieldState('shipping.postalCode', form.formState).error && (
                <p className="text-sm text-destructive mt-1">
                  {getErrorMessage(form.getFieldState('shipping.postalCode', form.formState).error?.message)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('country')} *
            </label>
            <select
              {...register('shipping.country')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => onAddressChange({
                country: e.target.value,
                state: getValues('shipping.state') || ''
              })}
            >
              <option value="">{t('selectCountry')}</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
            {form.getFieldState('shipping.country', form.formState).error && (
              <p className="text-sm text-destructive mt-1">
                {getErrorMessage(form.getFieldState('shipping.country', form.formState).error?.message)}
              </p>
            )}
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
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              {t('billingFieldsWillAppear')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
// src/services/addressService.ts
import { createClient } from '@/lib/supabase/client';

export interface Address {
  id: string;
  user_id: string;
  type: 'shipping' | 'billing';
  is_default: boolean;
  first_name: string;
  last_name: string;
  company?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  created_at?: string;
}

export interface AddressFormData {
  type: 'shipping' | 'billing';
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

class AddressService {
  private supabase = createClient();

  /**
   * Fetch all addresses for a user
   */
  async getUserAddresses(userId: string): Promise<Address[]> {
    const { data, error } = await this.supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get a single address by ID
   */
  async getAddress(addressId: string): Promise<Address | null> {
    const { data, error } = await this.supabase
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .single();

    if (error) {
      console.error('Error fetching address:', error);
      return null;
    }

    return data;
  }

  /**
   * Create a new address
   */
  async createAddress(userId: string, addressData: AddressFormData): Promise<Address> {
    // If setting as default, unset other defaults first
    if (addressData.is_default) {
      await this.supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('type', addressData.type);
    }

    const { data, error } = await this.supabase
      .from('addresses')
      .insert([{
        ...addressData,
        user_id: userId,
        company: addressData.company || null,
        address_line_2: addressData.address_line_2 || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating address:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update an existing address
   */
  async updateAddress(addressId: string, userId: string, addressData: Partial<AddressFormData>): Promise<Address> {
    // If setting as default, unset other defaults first
    if (addressData.is_default && addressData.type) {
      await this.supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('type', addressData.type)
        .neq('id', addressId);
    }

    const { data, error } = await this.supabase
      .from('addresses')
      .update({
        ...addressData,
        company: addressData.company || null,
        address_line_2: addressData.address_line_2 || null,
      })
      .eq('id', addressId)
      .select()
      .single();

    if (error) {
      console.error('Error updating address:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: string): Promise<void> {
    const { error } = await this.supabase
      .from('addresses')
      .delete()
      .eq('id', addressId);

    if (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(addressId: string, userId: string, type: 'shipping' | 'billing'): Promise<void> {
    // First, unset all defaults of the same type
    await this.supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('type', type);

    // Then set the new default
    const { error } = await this.supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId);

    if (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }

  /**
   * Get default address by type
   */
  async getDefaultAddress(userId: string, type: 'shipping' | 'billing'): Promise<Address | null> {
    const { data, error } = await this.supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('is_default', true)
      .single();

    if (error) {
      // No default address found
      return null;
    }

    return data;
  }

  /**
   * Create address from checkout form data
   */
  async createAddressFromCheckout(
    userId: string,
    checkoutData: {
      firstName: string;
      lastName: string;
      address: string;
      apartment?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    },
    type: 'shipping' | 'billing' = 'shipping',
    setAsDefault: boolean = true
  ): Promise<Address> {
    const addressData: AddressFormData = {
      type,
      first_name: checkoutData.firstName,
      last_name: checkoutData.lastName,
      address_line_1: checkoutData.address,
      address_line_2: checkoutData.apartment,
      city: checkoutData.city,
      state_province: checkoutData.state,
      postal_code: checkoutData.postalCode,
      country: checkoutData.country,
      is_default: setAsDefault,
    };

    return this.createAddress(userId, addressData);
  }

  /**
   * Format address for display
   */
  formatAddress(address: Address): string {
    const lines = [
      `${address.first_name} ${address.last_name}`,
      address.company,
      address.address_line_1,
      address.address_line_2,
      `${address.city}, ${address.state_province} ${address.postal_code}`,
      address.country,
    ].filter(Boolean);

    return lines.join('\n');
  }

  /**
   * Format address for order (JSONB format)
   */
  formatAddressForOrder(address: Address): Record<string, string | null | undefined> {
    return {
      first_name: address.first_name,
      last_name: address.last_name,
      company: address.company,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2,
      city: address.city,
      state_province: address.state_province,
      postal_code: address.postal_code,
      country: address.country,
    };
  }
}

export const addressService = new AddressService();
// src/services/paymentMethodService.ts
import { createClient } from '@/lib/supabase/client';
import { loadStripe } from '@stripe/stripe-js';

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  cardholder_name: string;
  billing_address_id?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentMethodFormData {
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  cardholder_name: string;
  billing_address_id?: string;
  is_default?: boolean;
}

class PaymentMethodService {
  private supabase = createClient();
  private stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

  /**
   * Fetch all payment methods for a user
   */
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get a single payment method by ID
   */
  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .single();

    if (error) {
      console.error('Error fetching payment method:', error);
      return null;
    }

    return data;
  }

  /**
   * Save a Stripe payment method to database
   */
  async savePaymentMethod(
    userId: string,
    stripePaymentMethodId: string,
    cardDetails: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    },
    cardholderName: string,
    billingAddressId?: string,
    setAsDefault: boolean = false
  ): Promise<PaymentMethod> {
    // If setting as default, unset other defaults first
    if (setAsDefault) {
      await this.supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const paymentMethodData: PaymentMethodFormData = {
      stripe_payment_method_id: stripePaymentMethodId,
      card_brand: cardDetails.brand,
      card_last4: cardDetails.last4,
      card_exp_month: cardDetails.exp_month,
      card_exp_year: cardDetails.exp_year,
      cardholder_name: cardholderName,
      billing_address_id: billingAddressId,
      is_default: setAsDefault,
    };

    const { data, error } = await this.supabase
      .from('payment_methods')
      .insert([{
        ...paymentMethodData,
        user_id: userId,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving payment method:', error);
      throw error;
    }

    return data;
  }

  /**
   * Attach a payment method to a Stripe customer
   */
  async attachPaymentMethodToCustomer(
    stripePaymentMethodId: string,
    stripeCustomerId: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/stripe/attach-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: stripePaymentMethodId,
          customerId: stripeCustomerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to attach payment method');
      }
    } catch (error) {
      console.error('Error attaching payment method:', error);
      throw error;
    }
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string, stripePaymentMethodId: string): Promise<void> {
    // First, detach from Stripe
    try {
      await fetch('/api/stripe/detach-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: stripePaymentMethodId,
        }),
      });
    } catch (error) {
      console.error('Error detaching from Stripe:', error);
      // Continue with database deletion even if Stripe detach fails
    }

    // Then delete from database
    const { error } = await this.supabase
      .from('payment_methods')
      .delete()
      .eq('id', paymentMethodId);

    if (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(paymentMethodId: string, userId: string): Promise<void> {
    // First, unset all defaults
    await this.supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Then set the new default
    const { error } = await this.supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId);

    if (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Get default payment method
   */
  async getDefaultPaymentMethod(userId: string): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) {
      // No default payment method found
      return null;
    }

    return data;
  }

  /**
   * Update billing address for a payment method
   */
  async updateBillingAddress(paymentMethodId: string, billingAddressId: string): Promise<void> {
    const { error } = await this.supabase
      .from('payment_methods')
      .update({ billing_address_id: billingAddressId })
      .eq('id', paymentMethodId);

    if (error) {
      console.error('Error updating billing address:', error);
      throw error;
    }
  }

  /**
   * Check if a Stripe payment method already exists for user
   */
  async checkPaymentMethodExists(userId: string, stripePaymentMethodId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('stripe_payment_method_id', stripePaymentMethodId)
      .single();

    return !!data;
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(paymentMethod: PaymentMethod): string {
    return `${paymentMethod.card_brand} •••• ${paymentMethod.card_last4}`;
  }

  /**
   * Format expiry date for display
   */
  formatExpiryDate(month: number, year: number): string {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  }
}

export const paymentMethodService = new PaymentMethodService();
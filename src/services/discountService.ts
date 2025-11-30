// Discount Service - Handles all discount-related operations
import { createClient } from '@/lib/supabase/client';

export interface DiscountCode {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: number;
  minimum_purchase?: number;
  maximum_discount?: number | null;
  usage_limit?: number | null;
  usage_count?: number;
  user_usage_limit?: number;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string | null;
  applicable_to?: 'all' | 'product' | 'variant' | 'category' | 'user';
  applicable_ids?: string[] | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  priority?: number;
  stackable?: boolean;
  first_purchase_only?: boolean;
  minimum_items?: number | null;
  excluded_products?: string[] | null;
  excluded_categories?: string[] | null;
  campaign_name?: string | null;
  discount_category?: string | null;
  auto_apply?: boolean;
  customer_segments?: string[] | null;
}

type DiscountCodeInsert = Partial<DiscountCode>;
type DiscountCodeUpdate = Partial<DiscountCode>;

export interface DiscountValidationResult {
  isValid: boolean;
  discountId?: string;
  discountType?: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue?: number;
  maximumDiscount?: number | null;
  reason: string;
  amountOff?: number;
}

export interface DiscountStatistics {
  totalUses: number;
  totalSaved: number;
  uniqueUsers: number;
  averageOrderValue: number;
  lastUsed: string | null;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  categoryId?: string;
  quantity: number;
  price: number;
  total: number;
}

class DiscountService {
  private supabase = createClient();

  // Admin Methods - Discount Management
  async createDiscount(data: Partial<DiscountCodeInsert>) {
    const { data: discount, error } = await this.supabase
      .from('discount_codes')
      .insert({
        ...data,
        code: data.code?.toUpperCase() || '',
        created_by: (await this.supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return discount;
  }

  async updateDiscount(id: string, data: Partial<DiscountCodeUpdate>) {
    const { data: discount, error } = await this.supabase
      .from('discount_codes')
      .update({
        ...data,
        code: data.code?.toUpperCase(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return discount;
  }

  async deleteDiscount(id: string) {
    const { error } = await this.supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getDiscounts(filters?: {
    isActive?: boolean;
    category?: string;
    campaign?: string;
    search?: string;
  }) {
    let query = this.supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.category) {
      query = query.eq('discount_category', filters.category);
    }

    if (filters?.campaign) {
      query = query.eq('campaign_name', filters.campaign);
    }

    if (filters?.search) {
      query = query.or(
        `code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getDiscountById(id: string) {
    const { data, error } = await this.supabase
      .from('discount_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async toggleDiscountStatus(id: string) {
    const discount = await this.getDiscountById(id);

    const { data, error } = await this.supabase
      .from('discount_codes')
      .update({ is_active: !discount.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDiscountStatistics(discountId: string): Promise<DiscountStatistics> {
    const { data, error } = await this.supabase
      .rpc('get_discount_statistics', { p_discount_id: discountId })
      .single();

    if (error) throw error;

    const stats = data as {
      total_uses?: number;
      total_saved?: number;
      unique_users?: number;
      average_order_value?: number;
      last_used?: string;
    };
    return {
      totalUses: stats?.total_uses || 0,
      totalSaved: stats?.total_saved || 0,
      uniqueUsers: stats?.unique_users || 0,
      averageOrderValue: stats?.average_order_value || 0,
      lastUsed: stats?.last_used || null,
    };
  }

  // Customer Methods - Discount Validation & Application
  async validateDiscountCode(
    code: string,
    cartTotal: number,
    cartItems?: CartItem[],
    userId?: string
  ): Promise<DiscountValidationResult> {
    if (!code) {
      return {
        isValid: false,
        reason: 'Please enter a discount code',
      };
    }

    // Extract product, variant and category IDs from cart items
    const productIds = cartItems?.map(item => item.productId) || [];
    const variantIds = cartItems?.map(item => item.variantId).filter(Boolean) as string[] || [];
    const categoryIds = [...new Set(cartItems?.map(item => item.categoryId).filter(Boolean))] as string[];

    const { data, error } = await this.supabase.rpc('validate_discount_code', {
      p_code: code,
      p_user_id: userId || null,
      p_cart_total: cartTotal,
      p_product_ids: productIds.length > 0 ? productIds : null,
      p_variant_ids: variantIds.length > 0 ? variantIds : null,
      p_category_ids: categoryIds.length > 0 ? categoryIds : null,
    });

    if (error) {
      console.error('Discount validation error:', error);
      return {
        isValid: false,
        reason: 'Failed to validate discount code',
      };
    }

    const result = data?.[0];

    if (!result) {
      return {
        isValid: false,
        reason: 'Invalid discount code',
      };
    }

    // Calculate the actual discount amount if valid
    let amountOff = 0;
    if (result.is_valid && result.discount_id) {
      amountOff = await this.calculateDiscountAmount(
        result.discount_id,
        cartTotal,
        cartItems
      );
    }

    return {
      isValid: result.is_valid,
      discountId: result.discount_id,
      discountType: result.discount_type,
      discountValue: result.discount_value,
      maximumDiscount: result.maximum_discount,
      reason: result.reason,
      amountOff,
    };
  }

  async calculateDiscountAmount(
    discountId: string,
    subtotal: number,
    cartItems?: CartItem[]
  ): Promise<number> {
    const productTotals = cartItems?.map(item => ({
      product_id: item.productId,
      total: item.total,
    }));

    const { data, error } = await this.supabase.rpc('calculate_discount_amount', {
      p_discount_id: discountId,
      p_subtotal: subtotal,
      p_product_totals: productTotals ? JSON.stringify(productTotals) : null,
    });

    if (error) {
      console.error('Discount calculation error:', error);
      return 0;
    }

    return data || 0;
  }

  async getAutoApplyDiscounts(
    userId: string | null,
    cartTotal: number,
    cartItems?: CartItem[]
  ) {
    const productIds = cartItems?.map(item => item.productId) || [];
    const categoryIds = [...new Set(cartItems?.map(item => item.categoryId).filter(Boolean))] as string[];

    const { data, error } = await this.supabase.rpc('get_auto_apply_discounts', {
      p_user_id: userId,
      p_cart_total: cartTotal,
      p_product_ids: productIds.length > 0 ? productIds : null,
      p_category_ids: categoryIds.length > 0 ? categoryIds : null,
    });

    if (error) {
      console.error('Auto-apply discount error:', error);
      return null;
    }

    return data?.[0] || null;
  }

  async recordDiscountUsage(
    discountId: string,
    userId: string,
    orderId: string,
    amountSaved: number
  ) {
    const { error } = await this.supabase.rpc('record_discount_usage', {
      p_discount_id: discountId,
      p_user_id: userId,
      p_order_id: orderId,
      p_amount_saved: amountSaved,
    });

    if (error) {
      console.error('Failed to record discount usage:', error);
      throw error;
    }
  }

  // Utility Methods
  async checkCodeAvailability(code: string, excludeId?: string) {
    let query = this.supabase
      .from('discount_codes')
      .select('id')
      .eq('code', code.toUpperCase());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data.length === 0;
  }

  async getDashboardStats() {
    const { data: discounts, error } = await this.supabase
      .from('discount_codes')
      .select('*');

    if (error) throw error;

    const now = new Date();
    const active = discounts.filter(d =>
      d.is_active &&
      new Date(d.valid_from) <= now &&
      (!d.valid_until || new Date(d.valid_until) > now)
    );

    const expired = discounts.filter(d =>
      d.valid_until && new Date(d.valid_until) < now
    );

    const totalUsage = discounts.reduce((sum, d) => sum + (d.usage_count || 0), 0);

    return {
      total: discounts.length,
      active: active.length,
      expired: expired.length,
      totalUsage,
    };
  }

  generateDiscountCode(prefix = 'SAVE', length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;

    for (let i = prefix.length; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  formatDiscountDisplay(discount: DiscountValidationResult): string {
    if (!discount.isValid || !discount.discountType) {
      return '';
    }

    switch (discount.discountType) {
      case 'percentage':
        return `${discount.discountValue}% OFF`;
      case 'fixed_amount':
        return `$${discount.discountValue} OFF`;
      case 'free_shipping':
        return 'FREE SHIPPING';
      default:
        return '';
    }
  }
}

export const discountService = new DiscountService();
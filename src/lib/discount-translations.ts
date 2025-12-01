// Discount error message translation helper

export type DiscountErrorKey =
  | 'invalidCode'
  | 'notActive'
  | 'expired'
  | 'usageLimitReached'
  | 'alreadyUsed'
  | 'loginRequired'
  | 'firstTimeOnly'
  | 'minimumPurchase'
  | 'minimumItems'
  | 'notApplicableProducts'
  | 'notApplicableVariants'
  | 'notApplicableCategories'
  | 'discountAppliedCapped'
  | 'discountAppliedSuccess'
  | 'enterDiscountCode'
  | 'failedToValidate'
  | 'cannotCombine'
  | 'notStackable'
  | 'alreadyApplied'
  | 'discountRemoved';

interface TranslationParams {
  used?: number;
  limit?: number;
  amount?: number;
  required?: number;
  current?: number;
  percentage?: number;
  max?: number;
  code?: string;
}

/**
 * Maps English error messages from the database to translation keys
 */
export function getDiscountErrorKey(englishMessage: string): { key: DiscountErrorKey; params?: TranslationParams } | null {
  // Invalid discount code
  if (englishMessage === 'Invalid discount code') {
    return { key: 'invalidCode' };
  }

  // Not active
  if (englishMessage === 'Discount code is not active') {
    return { key: 'notActive' };
  }

  // Expired
  if (englishMessage === 'Discount code has expired or is not yet valid') {
    return { key: 'expired' };
  }

  // Usage limit reached
  if (englishMessage === 'Discount code usage limit reached') {
    return { key: 'usageLimitReached' };
  }

  // Already used (per-user limit)
  const alreadyUsedMatch = englishMessage.match(/You have already used this discount (\d+) time\(s\)\. Maximum allowed: (\d+)/);
  if (alreadyUsedMatch) {
    return {
      key: 'alreadyUsed',
      params: {
        used: parseInt(alreadyUsedMatch[1]),
        limit: parseInt(alreadyUsedMatch[2])
      }
    };
  }

  // Login required
  if (englishMessage === 'Please log in to use this discount code') {
    return { key: 'loginRequired' };
  }

  // First time only
  if (englishMessage === 'This discount is only for first-time customers') {
    return { key: 'firstTimeOnly' };
  }

  // Minimum purchase
  const minPurchaseMatch = englishMessage.match(/Minimum purchase of \$(\d+(?:\.\d+)?) required/);
  if (minPurchaseMatch) {
    return {
      key: 'minimumPurchase',
      params: { amount: parseFloat(minPurchaseMatch[1]) }
    };
  }

  // Minimum items
  const minItemsMatch = englishMessage.match(/Minimum (\d+) item\(s\) required in cart\. You have (\d+) item\(s\)/);
  if (minItemsMatch) {
    return {
      key: 'minimumItems',
      params: {
        required: parseInt(minItemsMatch[1]),
        current: parseInt(minItemsMatch[2])
      }
    };
  }

  // Not applicable to products
  if (englishMessage === 'Discount not applicable to these products') {
    return { key: 'notApplicableProducts' };
  }

  // Not applicable to variants
  if (englishMessage === 'Discount not applicable to these product variants') {
    return { key: 'notApplicableVariants' };
  }

  // Not applicable to categories
  if (englishMessage === 'Discount not applicable to these categories') {
    return { key: 'notApplicableCategories' };
  }

  // Discount applied with cap
  const cappedMatch = englishMessage.match(/Discount applied successfully \((\d+(?:\.\d+)?)% off, capped at \$(\d+(?:\.\d+)?)\)/);
  if (cappedMatch) {
    return {
      key: 'discountAppliedCapped',
      params: {
        percentage: parseFloat(cappedMatch[1]),
        max: parseFloat(cappedMatch[2])
      }
    };
  }

  // Discount applied successfully
  if (englishMessage === 'Discount applied successfully') {
    return { key: 'discountAppliedSuccess' };
  }

  // Enter discount code
  if (englishMessage === 'Please enter a discount code') {
    return { key: 'enterDiscountCode' };
  }

  // Failed to validate
  if (englishMessage === 'Failed to validate discount code') {
    return { key: 'failedToValidate' };
  }

  // Default: return the original message
  return null;
}

/**
 * Formats the translated message with parameters
 */
export function formatDiscountMessage(template: string, params?: TranslationParams): string {
  if (!params) return template;

  let formatted = template;

  // Replace all placeholders with their values
  Object.entries(params).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  });

  return formatted;
}
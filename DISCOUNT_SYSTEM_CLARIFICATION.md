# Discount System Clarification

## The Problem You're Facing:

1. **Discount codes show on product listings** even when they should be checkout-only
2. **First-purchase discounts appear for everyone** on listing pages
3. **You want manual code entry**, not automatic application
4. **Product listing discounts shouldn't count** in usage tracking

## Proposed Solution: Two Types of Discounts

### 1. **Product Sale Discounts** (Shows on Listings)
- **Purpose**: Black Friday, clearance, category sales
- **Display**: Shows strikethrough price on product cards
- **Code Required**: NO - automatically applied
- **Usage Tracking**: NO - not counted as "code usage"
- **Example**: "All T-shirts 20% off this week"
- **Setting**: `show_on_products = true`

### 2. **Checkout Discount Codes** (Manual Entry)
- **Purpose**: Welcome codes, email campaigns, influencer codes
- **Display**: NOT shown on product listings
- **Code Required**: YES - customer must enter code
- **Usage Tracking**: YES - counts each use
- **Example**: "WELCOME30", "INSTAGRAM20"
- **Setting**: `show_on_products = false`

## How This Would Work:

### For WELCOME30 (First Order Discount):
```sql
-- This makes it a checkout-only code
UPDATE discount_codes
SET
    show_on_products = false,  -- Won't show on listings
    first_purchase_only = true, -- Only works for first order
    is_active = true
WHERE code = 'WELCOME30';
```

### For Product Sales:
```sql
-- This shows on product listings
INSERT INTO discount_codes (
    description,
    discount_type,
    discount_value,
    show_on_products,  -- Shows on listings
    applicable_to,
    applicable_ids,
    code              -- Can be NULL for auto-applied sales
) VALUES (
    'Summer Sale - 25% off selected items',
    'percentage',
    25,
    true,             -- Shows on product cards
    'product',
    ARRAY['product-id-1', 'product-id-2'],
    NULL              -- No code needed
);
```

## Benefits of This Approach:

1. **Clear Separation**: Product sales vs. checkout codes
2. **Better Control**: Choose what shows where
3. **Accurate Tracking**: Only track actual code usage
4. **Better UX**: Customers see sales, enter codes when they have them
5. **Marketing Flexibility**: Different strategies for different campaigns

## Implementation Steps:

### Step 1: Add the Field
Run the migration to add `show_on_products` field

### Step 2: Update Your Product Service
Only fetch discounts with `show_on_products = true` for listing pages

### Step 3: Update Dashboard
Add a checkbox: "Show as sale price on products"

### Step 4: Configure Your Discounts
- WELCOME30: `show_on_products = false` (checkout only)
- Product sales: `show_on_products = true` (visible on listings)

## Examples:

### Checkout-Only Codes (Not shown on products):
- WELCOME30 - First order 30% off
- NEWSLETTER10 - Newsletter signup bonus
- INSTAGRAM20 - Social media campaign
- FRIEND15 - Referral code

### Product Listing Sales (Shown on products):
- Black Friday - 40% off everything
- Summer clearance - 50% off selected items
- Category sale - 20% off all shoes

Would you like me to implement this solution?
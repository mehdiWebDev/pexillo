# Show On Products Implementation Guide

## Overview
The `show_on_products` field separates discount codes into two categories:
1. **Product Sales** (`show_on_products = true`): Show as sale prices on product listings
2. **Checkout Codes** (`show_on_products = false`): Manual entry codes for checkout only

## Implementation Steps

### Step 1: Run the Database Migration

1. Open your Supabase SQL Editor
2. Copy and run the entire contents of: `/database/RUN_SHOW_ON_PRODUCTS_MIGRATION.sql`
3. This script will:
   - Add the `show_on_products` field to your `discount_codes` table
   - Update all existing discount codes to be checkout-only (`show_on_products = false`)
   - Update the database functions to respect this field
   - Set up proper indexes for performance

### Step 2: Verify the Migration

After running the migration, run this query to see your discounts categorized:

```sql
SELECT
    code,
    description,
    discount_type,
    discount_value,
    first_purchase_only,
    show_on_products,
    CASE
        WHEN show_on_products = true THEN '🏷️ Product Sale'
        ELSE '💳 Checkout Code'
    END as display_type,
    is_active
FROM discount_codes
ORDER BY show_on_products DESC, created_at DESC;
```

### Step 3: Configure Your Discounts

#### For Checkout-Only Codes (like WELCOME30):
These codes require manual entry at checkout and don't show on product listings:

```sql
UPDATE discount_codes
SET
    show_on_products = false,   -- Won't show on products
    first_purchase_only = true,  -- First order only
    is_active = true
WHERE code = 'WELCOME30';
```

#### For Product Sales (visible on listings):
These show as sale prices on product cards:

```sql
INSERT INTO discount_codes (
    description,
    discount_type,
    discount_value,
    show_on_products,
    applicable_to,
    code,            -- Can be NULL for auto-applied sales
    is_active,
    valid_from
) VALUES (
    'Black Friday - 30% off everything',
    'percentage',
    30,
    true,           -- Shows on product listings
    'all',
    NULL,           -- No code needed
    true,
    NOW()
);
```

## How It Works

### On Product Listings:
- Only discounts with `show_on_products = true` appear
- Shows strikethrough original price and sale price
- No code entry needed - automatically applied

### At Checkout:
- All active discounts work (both types)
- `show_on_products = false` codes must be manually entered
- `show_on_products = true` discounts can also have codes for checkout

## Testing the Implementation

### 1. Test Product Listings:
- Create a discount with `show_on_products = true`
- Apply it to specific products or categories
- Visit the product listing pages
- ✅ You should see sale prices on the affected products

### 2. Test Checkout Codes:
- Create/update a discount with `show_on_products = false`
- Visit product pages
- ❌ You should NOT see this discount on product cards
- Go to checkout and enter the code
- ✅ The discount should apply correctly

### 3. Test First-Order Discount:
- Ensure WELCOME30 has `show_on_products = false`
- ❌ It should NOT show on product listings
- ✅ New customers can use it at checkout
- ❌ Existing customers with orders cannot use it

## Dashboard Usage

When creating/editing discounts in your dashboard:

1. **For Checkout Codes** (email campaigns, first-order, influencer codes):
   - Toggle "Show on Product Listings" OFF
   - Requires code entry at checkout
   - Good for: WELCOME30, NEWSLETTER10, INSTAGRAM20

2. **For Product Sales** (visible sales, clearance):
   - Toggle "Show on Product Listings" ON
   - Shows automatically on products
   - Good for: Black Friday, Summer Sale, Category discounts

## Common Scenarios

### Scenario 1: First-Order Welcome Discount
```
Code: WELCOME30
Show on Products: ❌ OFF
First Purchase Only: ✅ ON
Result: New customers enter code at checkout for 30% off
```

### Scenario 2: Black Friday Sale
```
Code: (optional or NULL)
Show on Products: ✅ ON
Applicable To: All
Result: All products show sale price automatically
```

### Scenario 3: Email Campaign Code
```
Code: EMAIL20
Show on Products: ❌ OFF
Usage Limit: 100
Result: Recipients enter code at checkout
```

### Scenario 4: Category Sale
```
Code: (optional)
Show on Products: ✅ ON
Applicable To: Category (e.g., T-shirts)
Result: All T-shirts show sale price on listings
```

## Troubleshooting

### Products showing wrong discounts?
- Check `show_on_products` field in database
- Run: `SELECT * FROM discount_codes WHERE show_on_products = true AND is_active = true;`

### Checkout codes showing on products?
- They have `show_on_products = true` when it should be `false`
- Update: `UPDATE discount_codes SET show_on_products = false WHERE code = 'YOUR_CODE';`

### First-order discount showing for everyone?
- Ensure `show_on_products = false` for first-order discounts
- Verify `first_purchase_only = true`

## Benefits

1. **Clear Separation**: Sales vs promotional codes
2. **Better Control**: Choose what shows where
3. **Improved UX**: Customers see sales, enter codes when needed
4. **Accurate Tracking**: Only track actual code usage
5. **Marketing Flexibility**: Different strategies for different campaigns

The system is now ready to handle both product sales and checkout codes separately!
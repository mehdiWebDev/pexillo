# Testing Guide: Show On Products Feature

## Prerequisites
1. Run the migration script: `/database/RUN_SHOW_ON_PRODUCTS_MIGRATION_SAFE.sql`
2. Restart your development server after migration

## Test Scenarios

### Test 1: Checkout-Only Discount (WELCOME30)
**Setup:**
```sql
UPDATE discount_codes
SET
    show_on_products = false,
    first_purchase_only = true,
    is_active = true
WHERE code = 'WELCOME30';
```

**Test Steps:**
1. Browse to any product listing page
2. ❌ **Expected**: No WELCOME30 discount shown on product cards
3. Click on a product to view details
4. ❌ **Expected**: No WELCOME30 discount shown on product detail page
5. Add product to cart and go to checkout
6. Enter code "WELCOME30"
7. ✅ **Expected**: Discount applies if it's your first order

### Test 2: Product Sale Discount (Visible on Listings)
**Setup:**
```sql
INSERT INTO discount_codes (
    description,
    discount_type,
    discount_value,
    show_on_products,
    applicable_to,
    applicable_ids,
    is_active,
    valid_from,
    code
) VALUES (
    'Test Product Sale - 20% off',
    'percentage',
    20,
    true,  -- Shows on listings
    'product',
    ARRAY[(SELECT id FROM products LIMIT 1)::uuid],  -- Pick one product
    true,
    NOW(),
    'TESTSALE20'  -- Optional code for checkout
);
```

**Test Steps:**
1. Browse to product listing page
2. ✅ **Expected**: Selected product shows 20% off with strikethrough price
3. Click on the product
4. ✅ **Expected**: Product detail page shows discount
5. At checkout, the discount can also be applied with code if provided

### Test 3: Category-Wide Sale
**Setup:**
```sql
INSERT INTO discount_codes (
    description,
    discount_type,
    discount_value,
    show_on_products,
    applicable_to,
    applicable_ids,
    is_active,
    valid_from
) VALUES (
    'Category Sale - 15% off',
    'percentage',
    15,
    true,  -- Shows on listings
    'category',
    ARRAY[(SELECT id FROM categories WHERE name = 'T-Shirts' LIMIT 1)::uuid],
    true,
    NOW()
);
```

**Test Steps:**
1. Browse to T-Shirts category
2. ✅ **Expected**: All T-shirts show 15% off
3. Browse to other categories
4. ❌ **Expected**: No discount shown on other categories

### Test 4: Variant-Specific Discount
**Setup:**
```sql
INSERT INTO discount_codes (
    description,
    discount_type,
    discount_value,
    show_on_products,
    applicable_to,
    applicable_ids,
    is_active,
    valid_from
) VALUES (
    'Variant Sale - $10 off',
    'fixed_amount',
    10,
    true,  -- Shows on listings
    'variant',
    ARRAY[(SELECT id FROM product_variants WHERE size = 'XL' LIMIT 2)],  -- Pick XL variants
    true,
    NOW()
);
```

**Test Steps:**
1. Browse products with XL variants
2. ✅ **Expected**: XL variants show $10 off
3. ❌ **Expected**: Other sizes don't show discount

### Test 5: Mixed Discounts
**Setup:**
Create both types of discounts for the same product:
```sql
-- Product sale (shows on listing)
INSERT INTO discount_codes (
    code, description, discount_type, discount_value,
    show_on_products, applicable_to, applicable_ids,
    is_active, valid_from
) VALUES (
    NULL, 'Flash Sale', 'percentage', 10,
    true, 'product', ARRAY[(SELECT id FROM products LIMIT 1)::uuid],
    true, NOW()
);

-- Checkout code (doesn't show on listing)
INSERT INTO discount_codes (
    code, description, discount_type, discount_value,
    show_on_products, applicable_to, is_active, valid_from
) VALUES (
    'EXTRA5', 'Extra 5% off', 'percentage', 5,
    false, 'all', true, NOW()
);
```

**Test Steps:**
1. Browse products
2. ✅ **Expected**: Product shows 10% off (Flash Sale)
3. ❌ **Expected**: EXTRA5 discount NOT shown
4. At checkout, enter "EXTRA5"
5. ✅ **Expected**: Additional 5% discount applies

## Verification Queries

### Check Discount Configuration:
```sql
SELECT
    code,
    description,
    show_on_products,
    CASE
        WHEN show_on_products THEN '🏷️ Shows on Products'
        ELSE '💳 Checkout Only'
    END as display_type,
    applicable_to,
    is_active
FROM discount_codes
ORDER BY show_on_products DESC, created_at DESC;
```

### Check Active Product Sales:
```sql
SELECT
    code,
    description,
    discount_type,
    discount_value,
    applicable_to
FROM discount_codes
WHERE show_on_products = true
    AND is_active = true
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW());
```

### Check Checkout-Only Codes:
```sql
SELECT
    code,
    description,
    first_purchase_only,
    usage_limit,
    usage_count
FROM discount_codes
WHERE show_on_products = false
    AND is_active = true;
```

## Troubleshooting

### Issue: Discount showing on products when it shouldn't
**Solution:**
```sql
UPDATE discount_codes
SET show_on_products = false
WHERE code = 'YOUR_CODE';
```

### Issue: Product sale not showing
**Check:**
1. Is `show_on_products = true`?
2. Is `is_active = true`?
3. Is current date between `valid_from` and `valid_until`?
4. Are `applicable_ids` correct?

### Issue: Functions not updating
**Solution:**
Re-run the safe migration script which drops and recreates functions:
```sql
-- Run the entire contents of:
-- /database/RUN_SHOW_ON_PRODUCTS_MIGRATION_SAFE.sql
```

## Success Criteria

✅ **Checkout codes** (like WELCOME30):
- Don't show on product listings
- Don't show on product detail pages
- Only work when manually entered at checkout

✅ **Product sales** (show_on_products = true):
- Show on product listing pages
- Show on product detail pages
- Apply automatically without code entry

✅ **First-purchase discounts**:
- Only work for users with no previous orders
- Don't show on product listings
- Require manual code entry

✅ **Database functions**:
- `get_product_best_discount` only returns discounts with `show_on_products = true`
- `get_variant_discount` only returns discounts with `show_on_products = true`
- Product API endpoints respect the new filtering
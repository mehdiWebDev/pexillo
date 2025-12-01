# Fix Per User Limit - Implementation Guide

## The Problem
1. The `user_usage_limit` field exists in the database and dashboard, but the validation function doesn't check it. This means users can use a discount code unlimited times even when a per-user limit is set.
2. The `minimum_items` field exists but isn't validated, allowing users to apply discounts even when they don't have enough items in their cart.

## The Solution
We need to:
1. Create a `discount_usage` table to track per-user usage
2. Update the `validate_discount_code` function to check user limits and minimum items
3. Update the `record_discount_usage` function to track usage properly
4. Update the frontend to pass cart items count to the validation function

## Implementation Steps

### Step 1: Run the Migration
Execute this migration in your Supabase SQL editor:

```sql
-- Copy and run the entire contents of:
/database/migrations/fix_user_usage_limit.sql
```

This migration will:
- Create the `discount_usage` table
- Add user usage limit validation
- Set up proper tracking

### Step 2: Verify the Setup

Check if the migration was successful:

```sql
-- Check if discount_usage table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'discount_usage'
);

-- Check current discount limits
SELECT
  code,
  description,
  user_usage_limit,
  usage_limit,
  usage_count
FROM discount_codes
ORDER BY created_at DESC;
```

### Step 3: Test the Functionality

#### Test Case 1: Single Use Per User

1. Create a test discount:
```sql
INSERT INTO discount_codes (
  code,
  description,
  discount_type,
  discount_value,
  user_usage_limit,  -- Each user can only use once
  usage_limit,       -- 100 total uses across all users
  is_active,
  valid_from
) VALUES (
  'ONEPERUSER',
  'Test - One use per customer',
  'percentage',
  15,
  1,    -- ← Per user limit
  100,  -- ← Total limit
  true,
  NOW()
);
```

2. Test as a user:
   - Apply code at checkout → ✅ Works first time
   - Complete the order
   - Try to use code again → ❌ Should show: "You have already used this discount 1 time(s). Maximum allowed: 1"

#### Test Case 2: Multiple Uses Per User

1. Create a test discount:
```sql
INSERT INTO discount_codes (
  code,
  description,
  discount_type,
  discount_value,
  user_usage_limit,  -- Each user can use 3 times
  is_active,
  valid_from
) VALUES (
  'THREEUSES',
  'Test - Three uses per customer',
  'percentage',
  10,
  3,  -- ← User can use 3 times
  true,
  NOW()
);
```

2. Test as a user:
   - Use code 1st time → ✅ Works
   - Use code 2nd time → ✅ Works
   - Use code 3rd time → ✅ Works
   - Use code 4th time → ❌ Should show: "You have already used this discount 3 time(s). Maximum allowed: 3"

#### Test Case 3: Minimum Items Requirement

1. Create a test discount:
```sql
INSERT INTO discount_codes (
  code,
  description,
  discount_type,
  discount_value,
  minimum_items,  -- Require at least 3 items
  is_active,
  valid_from
) VALUES (
  'BUY3SAVE',
  'Test - Buy 3 or more items',
  'percentage',
  20,
  3,  -- ← Minimum 3 items required
  true,
  NOW()
);
```

2. Test scenarios:
   - Cart with 1 item → ❌ "Minimum 3 item(s) required in cart. You have 1 item(s)"
   - Cart with 2 items → ❌ "Minimum 3 item(s) required in cart. You have 2 item(s)"
   - Cart with 3 items → ✅ Works
   - Cart with 5 items → ✅ Works

#### Test Case 4: First Purchase + Per User Limit

1. Update WELCOME30:
```sql
UPDATE discount_codes
SET
  user_usage_limit = 1,
  first_purchase_only = true
WHERE code = 'WELCOME30';
```

2. Test scenarios:
   - New user, first use → ✅ Works
   - Same user, second attempt → ❌ "You have already used this discount..."
   - User with existing orders → ❌ "This discount is only for first-time customers"

### Step 4: Monitor Usage

#### View Per-User Usage:
```sql
-- See how many times each user has used a specific discount
SELECT
  dc.code,
  p.email,
  COUNT(du.id) as times_used,
  dc.user_usage_limit as max_allowed,
  MAX(du.used_at) as last_used
FROM discount_codes dc
LEFT JOIN discount_usage du ON du.discount_code_id = dc.id
LEFT JOIN profiles p ON p.id = du.user_id
WHERE dc.code = 'WELCOME30'
GROUP BY dc.code, p.email, dc.user_usage_limit
ORDER BY times_used DESC;
```

#### Check If User Can Use Discount:
```sql
-- Check if a specific user can still use a discount
WITH user_usage AS (
  SELECT COUNT(*) as times_used
  FROM discount_usage
  WHERE user_id = 'USER_ID_HERE'
    AND discount_code_id = (SELECT id FROM discount_codes WHERE code = 'DISCOUNT_CODE_HERE')
)
SELECT
  dc.code,
  dc.user_usage_limit,
  uu.times_used,
  CASE
    WHEN uu.times_used >= dc.user_usage_limit THEN 'Limit reached'
    ELSE 'Can still use ' || (dc.user_usage_limit - uu.times_used) || ' more time(s)'
  END as status
FROM discount_codes dc
CROSS JOIN user_usage uu
WHERE dc.code = 'DISCOUNT_CODE_HERE';
```

### Step 5: Dashboard Management

In your admin dashboard when creating/editing discounts:

1. **Per User Limit** field controls how many times each user can use the code
2. **Usage Limit** field controls total uses across all users
3. Examples:
   - Welcome discount: Per User = 1, Total = Unlimited
   - Regular promo: Per User = 3, Total = 1000
   - Exclusive code: Per User = 1, Total = 50

## Common Configurations

### Welcome/First-Order Discount (Single Use):
```sql
UPDATE discount_codes SET
  user_usage_limit = 1,      -- One use per customer
  first_purchase_only = true, -- First order only
  usage_limit = NULL,         -- No total limit
  minimum_items = NULL        -- No minimum items
WHERE code = 'WELCOME30';
```

### Bulk Purchase Discount (Minimum Items):
```sql
INSERT INTO discount_codes (
  code, description, discount_type, discount_value,
  minimum_items, user_usage_limit, is_active, valid_from
) VALUES (
  'BULK10', 'Buy 5+ items get 10% off', 'percentage', 10,
  5, NULL, true, NOW()  -- Require 5 items, unlimited uses per user
);
```

### Limited Flash Sale (Items + Per User + Total Limit):
```sql
INSERT INTO discount_codes (
  code, description, discount_type, discount_value,
  minimum_items, user_usage_limit, usage_limit, is_active, valid_from
) VALUES (
  'FLASH50', 'Flash Sale - 50% off 3+ items', 'percentage', 50,
  3, 1, 100, true, NOW()  -- 3 items min, 1 use/user, 100 total
);
```

### Regular Campaign:
```sql
UPDATE discount_codes SET
  user_usage_limit = 2,    -- Each user can use twice
  usage_limit = 500,       -- 500 total uses
  minimum_items = NULL     -- No minimum items
WHERE code = 'SUMMER20';
```

### VIP Unlimited:
```sql
UPDATE discount_codes SET
  user_usage_limit = NULL,  -- No per-user limit
  usage_limit = NULL         -- No total limit
WHERE code = 'VIP2024';
```

## Troubleshooting

### Issue: User limit not working
1. Check if migration ran successfully
2. Verify discount_usage table exists
3. Check function with: `SELECT proname FROM pg_proc WHERE proname = 'validate_discount_code';`

### Issue: Usage not being tracked
1. Ensure orders are completing with `payment_status = 'completed'`
2. Check discount_usage table: `SELECT * FROM discount_usage WHERE user_id = 'USER_ID';`

### Issue: Wrong count shown
Clear test data and recount:
```sql
-- Reset usage count for a discount
UPDATE discount_codes
SET usage_count = (
  SELECT COUNT(DISTINCT order_id)
  FROM discount_usage
  WHERE discount_code_id = discount_codes.id
)
WHERE code = 'YOUR_CODE';
```

## Success Indicators

✅ Users see clear message when user limit reached
✅ Users see clear message when cart doesn't have enough items
✅ Usage is tracked in discount_usage table
✅ Dashboard shows correct usage counts
✅ Per-user limits are enforced at checkout
✅ Minimum items requirements are enforced
✅ First-purchase + per-user limits work together
✅ Minimum items + per-user limits work together

The Per User Limit and Minimum Items features are now fully functional!
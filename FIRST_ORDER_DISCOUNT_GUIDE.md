# First-Order Discount Management Guide

## Setup Instructions

### 1. Create the Discount in Database

Run this SQL in your Supabase dashboard:
```sql
cat /Users/mahdiouatah/Documents/personal-projects/pexillo/database/CREATE_FIRST_ORDER_DISCOUNT.sql
```

This creates a `WELCOME30` discount with:
- 30% off (adjustable)
- $50 maximum discount (adjustable)
- First-purchase only restriction
- 1000 total usage limit

### 2. Manage from Dashboard

Go to **Dashboard > Discounts** and find `WELCOME30`:

#### You can control:
- **Percentage**: Change from 30% to any value
- **Maximum Discount**: Cap the discount amount (e.g., $50 max)
- **Active/Inactive**: Turn on/off instantly
- **Usage Limit**: Set how many times total it can be used
- **Valid Dates**: Set start and end dates
- **Minimum Purchase**: Require minimum order amount

## How It Works

1. **New customer** creates account
2. **At checkout**, they enter code `WELCOME30`
3. **System checks** if they have any previous completed orders
4. **If first order**, discount applies (30% off, max $50)
5. **After order completes**, they can't use it again

## Examples of Different Configurations

### Conservative Approach (Small Discount)
- **Percentage**: 10%
- **Max Discount**: $20
- **Usage Limit**: 500

### Standard Approach (Balanced)
- **Percentage**: 20%
- **Max Discount**: $40
- **Usage Limit**: 1000

### Aggressive Approach (Big Welcome)
- **Percentage**: 30-40%
- **Max Discount**: $75
- **Usage Limit**: 2000

### Holiday Special
- **Percentage**: 50%
- **Max Discount**: $100
- **Valid**: Dec 1 - Dec 31

## Quick Controls

### Turn OFF First-Order Discount
```sql
UPDATE discount_codes
SET is_active = false
WHERE code = 'WELCOME30';
```

### Turn ON First-Order Discount
```sql
UPDATE discount_codes
SET is_active = true
WHERE code = 'WELCOME30';
```

### Change Percentage and Max
```sql
UPDATE discount_codes
SET
    discount_value = 25,  -- 25% off
    maximum_discount = 40 -- Max $40 discount
WHERE code = 'WELCOME30';
```

### Check Usage Statistics
```sql
SELECT
    code,
    discount_value || '%' as percentage,
    '$' || maximum_discount as max_discount,
    usage_count as times_used,
    usage_limit as max_uses,
    CASE WHEN is_active THEN '✅ Active' ELSE '❌ Inactive' END as status
FROM discount_codes
WHERE code = 'WELCOME30';
```

## Important Notes

- **First-purchase only**: Automatically enforced by the system
- **Not stackable**: Protects your margins
- **Maximum discount**: Prevents huge losses on expensive orders
- **Dashboard control**: Change everything without touching code
- **Usage tracking**: See exactly how many times it's been used

## Customer Experience

1. Customer sees "New customer? Use WELCOME30 for 30% off!"
2. They enter `WELCOME30` at checkout
3. Discount applies immediately
4. They complete order
5. Next time they shop, code won't work (first order only)

## Marketing Tips

- Email new signups with the code
- Show banner on site for non-logged-in users
- Include in welcome emails
- Mention in cart abandonment emails for new users

The discount is now fully under your control through the dashboard!
# Test Discount Flow - Debug Steps

## 1. Open Browser Console and Check SessionStorage

Run these commands in your browser console:

```javascript
// Check what's in sessionStorage
console.log('All sessionStorage keys:', Object.keys(sessionStorage));
console.log('checkout_discounts:', sessionStorage.getItem('checkout_discounts'));
```

## 2. Test Flow Step by Step

### Step 1: Apply Discount
1. Go to checkout
2. Enter discount code (e.g., SAVESAI4)
3. Click Apply
4. Check console for: `💡 Setting discounts in CheckoutClient`
5. Run in console: `sessionStorage.getItem('checkout_discounts')`
   - Should show your discount

### Step 2: Go to Payment
1. Fill shipping info
2. Click "Continue to Payment"
3. Check console for:
   - `🔍 Checking for saved discounts`
   - `📦 SessionStorage checkout_discounts`
   - `🎁 PaymentForm received appliedDiscounts`

### Step 3: Complete Payment
1. Enter card details
2. Complete payment
3. Check console for:
   - `💰 Applied discounts`
   - `📦 Order data being sent`

## 3. Manual Fix If Discounts Are Lost

If discounts are empty at payment, manually set them in console:

```javascript
// Set a test discount in sessionStorage
const testDiscount = [{
  discountId: "YOUR_DISCOUNT_ID_HERE",
  code: "SAVESAI4",
  discountType: "percentage",
  discountValue: 10,
  amountOff: 5.00,
  display: "10% off",
  stackable: false
}];

sessionStorage.setItem('checkout_discounts', JSON.stringify(testDiscount));

// Then refresh the page or continue to payment
```

## 4. Check Database After Order

Run in Supabase SQL Editor:

```sql
-- Check latest order
SELECT
    order_number,
    payment_status,
    discount_code_id,
    discount_amount,
    created_at
FROM orders
ORDER BY created_at DESC
LIMIT 1;

-- Check if discount usage was tracked
SELECT
    code,
    usage_count
FROM discount_codes
WHERE code = 'SAVESAI4';
```
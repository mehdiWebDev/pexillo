# Payment Methods Table Setup

This guide explains how to set up the payment_methods table for managing user payment methods securely.

## Security Notice

⚠️ **IMPORTANT**: This implementation stores only payment method references (Stripe Payment Method IDs), NOT actual card numbers or sensitive data. All card processing is handled securely by Stripe.

## Features

The payment_methods table supports:
- Secure storage of payment method references
- Card brand, last 4 digits, and expiry date
- Cardholder name
- Default payment method selection
- Integration with Stripe Elements for PCI-compliant card collection
- Automatic timestamp tracking
- Row Level Security (RLS) policies

## Prerequisites

1. **Stripe Account**: You need a Stripe account with API keys
2. **Environment Variables**: Ensure these are set in `.env.local`:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

## Setup Instructions

### Step 1: Install Stripe Packages

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 2: Run Database Migration

#### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `create_payment_methods_table.sql`
4. Paste and run the SQL

#### Option B: Using Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/mahdiouatah/Documents/personal-projects/pexillo

# Run the migration
supabase db push
```

## Table Schema

```sql
payment_methods (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  stripe_payment_method_id TEXT UNIQUE,  -- Stripe PM ID
  card_brand TEXT,                       -- 'visa', 'mastercard', etc.
  card_last4 TEXT,                       -- Last 4 digits only
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  cardholder_name TEXT,
  billing_address_id UUID,              -- Optional link to address
  is_default BOOLEAN,                   -- Only one can be true per user
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## How It Works

### Adding a Payment Method

1. User enters card details in Stripe Elements form (PCI-compliant)
2. Card data is sent directly to Stripe (never touches your server)
3. Stripe returns a Payment Method ID
4. Only the Payment Method ID and metadata are stored in your database
5. Actual card numbers are securely stored by Stripe

### Using a Payment Method

When processing a payment:
1. Retrieve the `stripe_payment_method_id` from your database
2. Use Stripe API to create a Payment Intent with that payment method
3. No sensitive card data needs to be handled by your application

## Security Features

- **Row Level Security (RLS)**: Users can only access their own payment methods
- **No Sensitive Data**: Only references and metadata are stored
- **Stripe PCI Compliance**: All card handling uses Stripe Elements
- **Single Default**: Automatic trigger ensures only one default per user
- **Cascade Delete**: Payment methods are deleted when user is deleted

## Automatic Features

1. **Single Default Payment Method**: Trigger ensures only one payment method per user can be marked as default
2. **Updated At Timestamp**: Automatically updates when payment method is modified
3. **Stripe Integration**: Seamless integration with Stripe's secure payment processing

## Testing

After running the migration and installing packages:

1. Go to your profile page
2. Click on the "Payment Methods" tab
3. Click "Add Card"
4. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date and any 3-digit CVC

5. Test setting default payment methods
6. Test deleting payment methods

## Stripe Test Cards

For testing in development:

- **Successful payment**: 4242 4242 4242 4242
- **Card declined**: 4000 0000 0000 0002
- **Insufficient funds**: 4000 0000 0000 9995
- **Expired card**: 4000 0000 0000 0069
- **Incorrect CVC**: 4000 0000 0000 0127

Use any future expiry date and any 3-digit CVC.

## Production Considerations

### Before Going Live

1. **Switch to Live Keys**: Replace test keys with live Stripe API keys
2. **Enable 3D Secure**: Configure Stripe for SCA compliance
3. **Detach Unused Cards**: Implement server-side endpoint to detach payment methods from Stripe when deleted
4. **Webhook Integration**: Set up Stripe webhooks for payment status updates
5. **Error Handling**: Implement comprehensive error handling for failed payments

### Recommended Server-Side Endpoint

Create an API endpoint to handle payment method deletion:

```typescript
// /api/payment-methods/[id]/route.ts
export async function DELETE(req: Request) {
  // 1. Verify user authentication
  // 2. Get payment method from database
  // 3. Detach payment method from Stripe
  // 4. Delete from database
  // 5. Return success response
}
```

## Troubleshooting

### "Stripe is not loaded"
- Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
- Ensure the key starts with `pk_test_` (test) or `pk_live_` (production)

### Payment method not appearing
- Check browser console for errors
- Verify RLS policies are correctly set
- Ensure user is authenticated

### Card declined during testing
- Make sure you're using valid Stripe test cards
- Check Stripe dashboard for detailed error messages

## Resources

- [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
- [Stripe Payment Methods API](https://stripe.com/docs/api/payment_methods)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [PCI Compliance](https://stripe.com/docs/security)

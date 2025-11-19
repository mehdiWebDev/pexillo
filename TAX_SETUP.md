# Provincial Tax Calculation Setup

This document explains how province-based tax calculation works in the Pexillo checkout system.

> **Note**: This system now supports **tax breakdown display** showing GST, PST, QST, and HST separately with bilingual support. See `TAX_BREAKDOWN_SETUP.md` for the updated feature.

## Overview

The checkout system automatically calculates taxes based on the customer's province selection using Canadian GST/HST/PST rates stored in the `tax_rates` database table.

## Database Setup

### 1. Tax Rates Table

The `tax_rates` table stores tax rates by country and state/province:

```sql
create table public.tax_rates (
  id uuid not null default extensions.uuid_generate_v4 (),
  country_code character varying(2) not null,
  state_code character varying(10) null,
  state_name character varying(100) null,
  rate numeric(5, 4) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint tax_rates_pkey primary key (id),
  constraint tax_rates_country_code_state_code_key unique (country_code, state_code)
);
```

### 2. Populate Canadian Tax Rates

Run the `setup-canadian-tax-rates.sql` file in your Supabase SQL Editor:

```bash
# In Supabase SQL Editor, run:
setup-canadian-tax-rates.sql
```

This will insert all 13 Canadian provinces/territories with their correct tax rates:

| Province | Code | Tax Type | Rate |
|----------|------|----------|------|
| Alberta | AB | GST | 5% |
| British Columbia | BC | GST + PST | 12% |
| Manitoba | MB | GST + PST | 12% |
| New Brunswick | NB | HST | 15% |
| Newfoundland and Labrador | NL | HST | 15% |
| Northwest Territories | NT | GST | 5% |
| Nova Scotia | NS | HST | 15% |
| Nunavut | NU | GST | 5% |
| Ontario | ON | HST | 13% |
| Prince Edward Island | PE | HST | 15% |
| Quebec | QC | GST + QST | 14.975% |
| Saskatchewan | SK | GST + PST | 11% |
| Yukon | YT | GST | 5% |

## Environment Variables

Add the Supabase Service Role Key to your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find this in your Supabase project settings under **Settings > API > service_role (secret)**.

⚠️ **Important**: The service role key should NEVER be exposed to the client. It's only used in the server-side API route.

## How It Works

### 1. User Selects Province

When a customer enters their shipping address in the checkout:

- They can use the Google Places autocomplete (which auto-fills the province)
- Or manually select a province from the dropdown

Located in: `src/app/[locale]/checkout/components/ShippingForm.tsx`

### 2. Tax Calculation Triggered

The `onAddressChange` callback is triggered when:
- A province is selected from the dropdown (line 625-635)
- Google Places autocomplete fills the province (line 404-409)

```typescript
onAddressChange({
  state: province,
  country: 'CA'
});
```

### 3. API Call to Calculate Tax

The `CheckoutClient` component calls the tax API:

```typescript
const handleAddressChange = async (address: any) => {
  if (address.state && address.country) {
    const response = await fetch('/api/tax/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: address.country,
        state: address.state,
      }),
    });

    if (response.ok) {
      const { rate } = await response.json();
      setTaxRate(rate); // Updates the tax rate in state
    }
  }
};
```

Located in: `src/app/[locale]/checkout/CheckoutClient.tsx` (line 162-182)

### 4. Tax API Route

The API route queries the database:

1. First tries to find a province-specific rate: `country_code = 'CA' AND state_code = 'ON'`
2. Falls back to country-level rate if no province rate exists
3. Returns 0 if no rate is found

Located in: `src/app/api/tax/calculate/route.ts`

### 5. Tax Applied to Order

The tax amount is calculated in the checkout:

```typescript
const tax = subtotal * taxRate; // taxRate is decimal (e.g., 0.13 for 13%)
const total = subtotal + tax + shipping;
```

This calculated tax is then:
- Displayed in the order summary
- Sent to Stripe for payment
- Stored in the order record

## Rate Format

Tax rates are stored as **decimals** in the database:
- 5% = `0.05`
- 13% = `0.13`
- 14.975% = `0.14975`

The API returns the rate in decimal format, and the frontend multiplies it by the subtotal to get the tax amount.

## Testing

To test tax calculation:

1. Go to checkout page
2. Select different provinces in the shipping address
3. Watch the tax amount update in the order summary
4. Verify the rates match the table above

### Test Cases

- **Ontario (13% HST)**: Subtotal $100 → Tax $13.00 → Total $113.00 (+ shipping)
- **Quebec (14.975% GST+QST)**: Subtotal $100 → Tax $14.98 → Total $114.98 (+ shipping)
- **Alberta (5% GST)**: Subtotal $100 → Tax $5.00 → Total $105.00 (+ shipping)

## Updating Tax Rates

If tax rates change (e.g., government updates):

1. Update the rates in the database:
   ```sql
   UPDATE public.tax_rates
   SET rate = 0.15, updated_at = now()
   WHERE country_code = 'CA' AND state_code = 'ON';
   ```

2. The changes take effect immediately (no code deployment needed)

## Troubleshooting

### Tax shows as $0.00

**Possible causes:**
1. `SUPABASE_SERVICE_ROLE_KEY` not set in `.env.local`
2. Tax rates not populated in database (run `setup-canadian-tax-rates.sql`)
3. Province not selected in checkout form
4. API route error (check browser console and server logs)

### Tax not updating when province changes

**Possible causes:**
1. `onAddressChange` callback not being triggered
2. JavaScript error in console (check browser DevTools)
3. Network error when calling `/api/tax/calculate`

### Incorrect tax rate

**Possible causes:**
1. Wrong rate in database (verify with SQL query)
2. Rate stored as percentage instead of decimal (should be 0.13, not 13)
3. Multiple rates for same province (check database unique constraint)

## Related Files

- **Tax API Route**: `src/app/api/tax/calculate/route.ts`
- **Checkout Client**: `src/app/[locale]/checkout/CheckoutClient.tsx`
- **Shipping Form**: `src/app/[locale]/checkout/components/ShippingForm.tsx`
- **Order Summary**: `src/app/[locale]/checkout/components/OrderSummary.tsx`
- **Setup SQL**: `setup-canadian-tax-rates.sql`
- **Database Schema**: `tax_rates` table in Supabase

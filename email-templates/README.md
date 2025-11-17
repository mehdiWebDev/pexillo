# Email Templates Setup Guide

This directory contains bilingual (English/French) email templates for SendGrid.

## Templates

### 1. Order Confirmation Email
**File:** `order-confirmation-bilingual.html`

**Template ID:** Set in `.env` as `SENDGRID_ORDER_TEMPLATE_ID`

**Dynamic Variables:**
- `language` - Auto-detected based on shipping province (QC = fr, others = en)
- `orderNumber` - Order number
- `lookupCode` - Guest lookup code (optional, only for guest orders)
- `customerName` - Customer's name
- `subtotal` - Order subtotal
- `shippingAmount` - Shipping cost
- `freeShipping` - Boolean for free shipping
- `taxAmount` - Tax amount
- `totalAmount` - Total amount
- `shippingAddress` - Complete shipping address object
- `items` - Array of order items
- `trackOrderUrl` - URL for tracking page

**Supported Languages:**
- English (default)
- French (when shipping to Quebec)

---

### 2. Order Tracking/Shipment Notification Email
**File:** `tracking-notification-bilingual.html` (existing)

**Template ID:** Set in `.env` as `SENDGRID_TRACKING_TEMPLATE_ID`

**Dynamic Variables:**
- `language` - Auto-detected based on shipping province
- `orderNumber` - Order number
- `customerName` - Customer's name
- `trackingNumber` - Shipping tracking number
- `trackingUrl` - Carrier tracking URL
- `carrier` - Shipping carrier name
- `estimatedDelivery` - Estimated delivery date (optional)
- `shippingAddress` - Complete shipping address object
- `items` - Array of order items
- `totalAmount` - Order total

---

## How to Set Up in SendGrid

### Step 1: Log into SendGrid
1. Go to [SendGrid](https://sendgrid.com/)
2. Log into your account
3. Navigate to **Email API** → **Dynamic Templates**

### Step 2: Create New Template
1. Click **Create a Dynamic Template**
2. Name it: `Order Confirmation (Bilingual EN/FR)`
3. Click **Create**

### Step 3: Add Version
1. Click **Add Version**
2. Select **Code Editor**
3. Click **Continue**

### Step 4: Add Template Code
1. In the left sidebar, select **Code** tab
2. Copy the entire contents of `order-confirmation-bilingual.html`
3. Paste into the code editor
4. Click **Save**

### Step 5: Preview and Test
1. Click on **Test Data** tab
2. Paste this test JSON:

```json
{
  "language": "en",
  "orderNumber": "ORD-123456",
  "lookupCode": "ABC123",
  "customerName": "John Doe",
  "subtotal": "100.00",
  "shippingAmount": "10.00",
  "freeShipping": false,
  "taxAmount": "16.50",
  "totalAmount": "126.50",
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "apartment": "Apt 4B",
    "city": "Montreal",
    "state": "QC",
    "postalCode": "H1A 1A1",
    "country": "Canada"
  },
  "items": [
    {
      "name": "Custom T-Shirt",
      "variant": "Large - Black",
      "quantity": 2,
      "price": "25.00",
      "total": "50.00"
    },
    {
      "name": "Custom Hoodie",
      "variant": "Medium - White",
      "quantity": 1,
      "price": "50.00",
      "total": "50.00"
    }
  ],
  "trackOrderUrl": "https://pixello.ca/track-order"
}
```

3. To test French version, change `"language": "en"` to `"language": "fr"`
4. Click **Preview** to see the rendered email

### Step 6: Get Template ID
1. After saving, go back to **Dynamic Templates** list
2. Click on your template
3. Copy the **Template ID** (starts with `d-`)
4. Add it to your `.env` file:

```env
SENDGRID_ORDER_TEMPLATE_ID=d-your-template-id-here
```

### Step 7: Activate Template
1. Make sure the version is set to **Active**
2. Click the toggle switch if needed

---

## Environment Variables Required

Add these to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_ORDER_TEMPLATE_ID=d-your-confirmation-template-id
SENDGRID_TRACKING_TEMPLATE_ID=d-your-tracking-template-id

# Email Settings
FROM_EMAIL=orders@pixello.ca
NEXT_PUBLIC_SITE_URL=https://pixello.ca
```

---

## Testing

### Test Order Confirmation Email
You can trigger a test email using the API or by creating a test order.

### Test in Different Languages
The language is automatically detected based on the shipping address province:
- **Quebec (QC)** → French
- **All other provinces/states** → English

To override for testing, you can modify the `language` variable in `sendOrderConfirmationEmail.ts`:
```typescript
// For testing French
const language = 'fr';

// For testing English
const language = 'en';
```

---

## Customization

### Changing Colors
The primary brand color is set as `#FF0000` (red). To change:

1. Find all instances of `#FF0000` in the template
2. Replace with your brand color

Main locations:
- Header background
- Order number border
- CTA button background

### Adding Social Media Links
Update the footer section:
```html
<a href="https://facebook.com/yourpage">Facebook</a> |
<a href="https://instagram.com/yourpage">Instagram</a> |
<a href="https://twitter.com/yourpage">Twitter</a>
```

### Modifying Support Contact
Update the support section:
```html
📧 support@pixello.ca<br>
📞 1-800-PIXELLO
```

---

## Troubleshooting

### Email Not Sending
1. Check SendGrid API key is valid
2. Verify template ID is correct
3. Check SendGrid dashboard for errors
4. Ensure `FROM_EMAIL` is verified in SendGrid

### Wrong Language Displayed
1. Check the `language` variable is being passed correctly
2. Verify province detection logic in `sendOrderConfirmationEmail.ts`
3. Test with both `"language": "en"` and `"language": "fr"` in SendGrid preview

### Variables Not Showing
1. Ensure variable names match exactly (case-sensitive)
2. Check the test data JSON format
3. Verify all required variables are being passed from the code

### Template Not Updating
1. Make sure to click **Save** after editing
2. Ensure the version is set to **Active**
3. Clear SendGrid cache (wait a few minutes)

---

## Support

For SendGrid-specific issues:
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Support](https://support.sendgrid.com/)

For template customization help:
- Check the inline styles in the HTML
- Use SendGrid's preview feature to test changes
- Reference the tracking email template for examples

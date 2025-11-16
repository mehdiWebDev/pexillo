# Admin Order Notifications

This feature sends email notifications to the admin when new orders are received.

## Setup

### Option 1: Using Admin Settings Table (Recommended)

1. Run the SQL script to create the admin setting:
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO public.admin_settings (setting_key, setting_value, description, is_active)
   VALUES (
     'admin_notification_email',
     '{"email": "your-email@example.com"}'::jsonb,
     'Email address to receive new order notifications',
     true
   );
   ```

2. Or run the provided setup script:
   ```bash
   # In Supabase SQL editor, run:
   setup-admin-notification-email.sql
   ```

3. Update the email address in the admin dashboard (when you build the settings page)

### Option 2: Using Environment Variable (Fallback)

Add to your `.env.local`:
```env
MAIL_TO_ME=your-email@example.com
```

The system will use this as a fallback if the database setting is not configured.

## How It Works

1. When a customer completes payment, the order status is updated to "confirmed"
2. Two emails are sent:
   - Customer confirmation email (to the customer's checkout email)
   - Admin notification email (to the admin email configured above)

3. The admin email includes:
   - Order number and date
   - Customer information
   - Shipping address
   - Order items and totals
   - Payment status
   - Link to view order in admin dashboard

## Managing Admin Notification Email

### From Database (Current)
```sql
-- View current setting
SELECT setting_value->>'email' as admin_email
FROM admin_settings
WHERE setting_key = 'admin_notification_email';

-- Update email
UPDATE admin_settings
SET setting_value = '{"email": "new-email@example.com"}'::jsonb
WHERE setting_key = 'admin_notification_email';

-- Disable notifications
UPDATE admin_settings
SET is_active = false
WHERE setting_key = 'admin_notification_email';
```

### From Admin Dashboard (Future)
You can create a settings page in your admin dashboard to manage this:
- Navigate to Admin > Settings
- Update "Order Notification Email"
- Toggle notifications on/off

## Email Template

The admin notification email is a simple HTML email (no SendGrid template needed) that includes:
- Order summary
- Customer details
- Shipping information
- Order items table
- Payment information
- Link to admin dashboard

## Notes

- Admin notifications are only sent when `paymentStatus` is set to `'completed'`
- If the email fails to send, the order update will still succeed (emails don't block orders)
- The system checks both `admin_settings` table and `MAIL_TO_ME` env variable
- SendGrid API key is required (`SENDGRID_API_KEY` in environment variables)

## Inventory Transactions Table

The `inventory_transactions` table is available for tracking inventory changes. You can:
- View inventory history in the admin dashboard
- Track stock adjustments, sales, returns, and cancellations
- Monitor inventory changes by product variant
- Audit inventory changes by admin user

This can be integrated into a future admin dashboard page for inventory management.

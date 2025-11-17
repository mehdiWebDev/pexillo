-- =================================================
-- SETUP ADMIN ORDER NOTIFICATION EMAIL
-- =================================================
-- This script creates an admin setting for order notification emails
-- Run this in your Supabase SQL editor

-- Insert admin notification email setting (if it doesn't exist)
INSERT INTO public.admin_settings (setting_key, setting_value, description, is_active)
VALUES (
  'admin_notification_email',
  '{"email": "admin@pixello.ca"}'::jsonb,  -- CHANGE THIS TO YOUR EMAIL
  'Email address to receive new order notifications',
  true
)
ON CONFLICT (setting_key) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Admin notification email setting created!';
    RAISE NOTICE 'Update the email address in admin_settings table to receive order notifications';
    RAISE NOTICE 'You can also manage this from your admin dashboard settings page';
END $$;

-- View current setting
SELECT
    setting_key,
    setting_value->>'email' as email,
    description,
    is_active
FROM public.admin_settings
WHERE setting_key = 'admin_notification_email';

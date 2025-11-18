# Supabase Email Configuration Guide

## 📧 Email Not Sending? Here's How to Fix It

### Issue: Users Not Receiving Confirmation Emails

When users sign up, they should receive a confirmation email. If emails aren't being sent, follow these steps:

---

## ✅ Step 1: Check Email Confirmation Settings

1. **Go to Supabase Dashboard**
   - Navigate to: `Authentication` → `Email Templates`

2. **Verify Email Confirmation is Enabled**
   - Go to: `Authentication` → `Providers` → `Email`
   - Check: **"Enable email confirmations"** should be toggled ON
   - If disabled, users can sign up without email verification

---

## ✅ Step 2: Configure SMTP Settings (Production)

For production, you MUST set up custom SMTP. Supabase's default email service has rate limits.

### Option A: Use Gmail SMTP

1. Go to `Project Settings` → `Auth` → `SMTP Settings`
2. Enable **"Enable Custom SMTP"**
3. Configure:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-email@gmail.com
   SMTP Password: your-app-specific-password (NOT your Gmail password)
   Sender Email: your-email@gmail.com
   Sender Name: Pexillo
   ```

4. **Get Gmail App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Create a new app password for "Mail"
   - Use this password in SMTP settings

### Option B: Use SendGrid (Recommended for Production)

1. Sign up at: https://sendgrid.com (Free tier: 100 emails/day)
2. Create an API Key
3. Configure in Supabase:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey (literally type "apikey")
   SMTP Password: YOUR_SENDGRID_API_KEY
   Sender Email: noreply@yourdomain.com
   Sender Name: Pexillo
   ```

### Option C: Use AWS SES (Best for Scale)

1. Set up AWS SES: https://aws.amazon.com/ses/
2. Verify your domain
3. Get SMTP credentials
4. Configure in Supabase SMTP settings

---

## ✅ Step 3: Customize Email Templates

1. Go to: `Authentication` → `Email Templates`
2. Click on **"Confirm signup"**
3. Customize your email template:

```html
<h2>Welcome to Pexillo!</h2>
<p>Hi {{ .FullName }},</p>
<p>Thanks for signing up! Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>If you didn't create this account, you can safely ignore this email.</p>
<p>Best regards,<br>The Pexillo Team</p>
```

---

## ✅ Step 4: Test Email Delivery

### Test with a Real Email

1. Try signing up with a real email address (use a different one than before)
2. Check your inbox AND spam folder
3. Look for the confirmation email

### Check Supabase Logs

1. Go to: `Logs` → `Auth Logs`
2. Look for recent signup events
3. Check for any email-related errors

### Common Issues:

**❌ Email goes to spam**
- Solution: Set up SPF, DKIM, DMARC records for your domain
- Use a verified sender email address

**❌ "Rate limit exceeded"**
- Solution: Set up custom SMTP (see Step 2)
- Supabase default has strict rate limits

**❌ "SMTP connection failed"**
- Solution: Check your SMTP credentials
- Verify SMTP host and port are correct
- Ensure firewall isn't blocking port 587

---

## ✅ Step 5: Email Confirmation Redirect

After users confirm their email, they should be redirected properly:

1. Go to: `Authentication` → `URL Configuration`
2. Set **Site URL**: `https://yourdomain.com`
3. Add **Redirect URLs**:
   ```
   https://yourdomain.com
   https://yourdomain.com/fr
   http://localhost:3000 (for development)
   http://localhost:3000/fr
   ```

---

## 🔧 Development vs Production

### Development (localhost)
- Default Supabase emails work fine
- Emails might be slow (up to 1 minute)
- Check spam folder
- Rate limited to a few emails per hour

### Production
- **MUST** use custom SMTP
- Much faster delivery
- Higher rate limits
- Better deliverability

---

## 🚨 Troubleshooting Checklist

- [ ] Email confirmation is enabled in Auth settings
- [ ] Custom SMTP is configured (for production)
- [ ] SMTP credentials are correct
- [ ] Sender email is verified
- [ ] Site URL and redirect URLs are configured
- [ ] Email template is customized
- [ ] Checked spam folder
- [ ] Checked Supabase Auth logs for errors
- [ ] Waited at least 2-3 minutes for email delivery
- [ ] Tried with a different email address

---

## 📝 Current Signup Flow (Updated)

1. User fills signup form with new fields
2. Frontend checks if email already exists
3. If email exists → Show error message ✅
4. If new email → Call `supabase.auth.signUp()`
5. Supabase creates user in `auth.users`
6. Database trigger `handle_new_user()` creates profile
7. Supabase sends confirmation email
8. User clicks confirmation link
9. User is redirected to app
10. Profile is ready with all data

---

## 🎯 Quick Fix for Testing

**Want to skip email confirmation during development?**

1. Go to: `Authentication` → `Providers` → `Email`
2. Toggle OFF: **"Enable email confirmations"**
3. Users will be immediately active after signup
4. **⚠️ Remember to turn this back ON for production!**

---

## 📞 Need Help?

If emails still aren't working:
1. Check Supabase Status: https://status.supabase.com
2. Review Auth logs in Supabase dashboard
3. Test with multiple email providers (Gmail, Outlook, Yahoo)
4. Contact Supabase support with your project ID

---

## 🔗 Useful Links

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Email Templates: https://supabase.com/docs/guides/auth/auth-email-templates
- SMTP Setup: https://supabase.com/docs/guides/auth/auth-smtp
- SendGrid Setup: https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api

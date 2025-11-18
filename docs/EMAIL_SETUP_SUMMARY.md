# Email Setup Summary - Pexillo

Quick reference for all email-related configurations.

---

## 📧 Current Email Flow

### Account Confirmation
1. User signs up at `/auth/sign-up`
2. Profile created via database trigger
3. SendGrid sends confirmation email
4. User clicks link in email
5. Account activated → User redirected to home

### Password Reset
1. User goes to `/auth/forgot-password`
2. Enters email address
3. SendGrid sends reset email
4. User clicks link in email
5. Redirected to `/auth/update-password`
6. Sets new password

---

## 🔧 Configuration Files

### Supabase (Dashboard - No code files)
- **SMTP Settings**: Authentication → Email Templates → SMTP Settings
- **Email Templates**: Authentication → Email Templates

### Database Functions
- `database/functions/check_email_exists.sql` - Email duplication check
- `database/triggers/handle_new_user.sql` - Auto-create profile on signup

### Application Components
- `src/components/sign-up-form.tsx` - Signup form with full profile fields
- `src/components/forgot-password-form.tsx` - Password reset request
- `src/app/[locale]/auth/update-password/page.tsx` - New password form

---

## ⚙️ SendGrid Configuration

### SMTP Values (Copy-Paste)

```plaintext
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: YOUR_SENDGRID_API_KEY
Sender Email: noreply@yourdomain.com (must be verified)
Sender Name: Pexillo
```

### Get API Key
1. https://app.sendgrid.com/settings/api_keys
2. Create API Key → Full Access
3. Copy and save immediately

### Verify Sender
1. https://app.sendgrid.com/settings/sender_auth
2. Verify a Single Sender
3. Use verified email in SMTP settings

---

## 📄 Documentation

- **Complete Setup Guide**: `docs/SENDGRID_SETUP.md`
- **SMTP Quick Reference**: `docs/SMTP_CONFIGURATION.md`
- **General Email Troubleshooting**: `docs/SUPABASE_EMAIL_SETUP.md`
- **Database Functions**: `database/functions/README.md`
- **Database Triggers**: `database/triggers/README.md`

---

## ✅ Setup Checklist

### SendGrid Setup
- [ ] Create SendGrid account (free tier)
- [ ] Verify sender email
- [ ] Create API key
- [ ] Save API key securely

### Supabase Configuration
- [ ] Enable Custom SMTP in Supabase
- [ ] Enter SendGrid SMTP credentials
- [ ] Save configuration
- [ ] Customize "Confirm signup" email template
- [ ] Customize "Reset password" email template
- [ ] Add redirect URLs in Supabase URL Configuration

### Database Setup
- [ ] Run `database/functions/check_email_exists.sql`
- [ ] Run `database/triggers/handle_new_user.sql` (enhanced version)
- [ ] Verify functions exist in Supabase

### Testing
- [ ] Test signup with new email
- [ ] Verify confirmation email arrives (check spam)
- [ ] Click confirmation link
- [ ] Account successfully activated
- [ ] Test forgot password flow
- [ ] Verify reset email arrives
- [ ] Successfully reset password
- [ ] Check SendGrid Activity dashboard

---

## 🧪 Testing Commands

### Test Email Exists Function
```sql
-- In Supabase SQL Editor
SELECT check_email_exists('test@example.com');
```

### Test Signup Flow
1. Visit: `/auth/sign-up`
2. Fill all fields (including new profile fields)
3. Click "Sign up"
4. Check email within 30 seconds

### Test Password Reset Flow
1. Visit: `/auth/forgot-password`
2. Enter registered email
3. Check email within 30 seconds
4. Click reset link
5. Enter new password

---

## 📊 Email Deliverability

### Check Email Status
1. Go to: https://app.sendgrid.com/email_activity
2. Find your email
3. Check status:
   - ✅ **Delivered**: Success!
   - ⏳ **Processed**: Still being sent
   - ❌ **Bounced**: Invalid email
   - ❌ **Dropped**: Sender not verified

### Improve Deliverability
1. **Domain Authentication** (Production)
   - SendGrid → Sender Authentication → Authenticate Domain
   - Add DNS records
   - Wait for verification

2. **Monitor Metrics**
   - Open rate
   - Bounce rate
   - Spam complaints

3. **Best Practices**
   - Use professional sender name
   - Keep email content clear and concise
   - Don't send too many emails too quickly
   - Include unsubscribe link (marketing only)

---

## 🔒 Security

### API Key Management
- ✅ Stored only in Supabase dashboard
- ✅ Never in source code or Git
- ✅ Rotate every 90 days
- ✅ Use restricted access if possible

### Email Security
- ✅ SMTP uses TLS (port 587)
- ✅ Sender authentication enabled
- ✅ Rate limiting in place
- ✅ Email validation before sending

---

## 🚨 Troubleshooting

### Emails Not Arriving

**1. Check SendGrid Activity**
```
https://app.sendgrid.com/email_activity
```

**2. Verify Sender Email**
```
Settings → Sender Authentication → Should see "Verified" ✅
```

**3. Check SMTP Credentials**
```
Username: Must be "apikey" (not your email)
Password: Must be API key (starts with SG.)
```

**4. Check Spam Folder**
```
New domains often go to spam initially
Ask recipient to mark as "Not Spam"
```

### Common Errors

| Error | Solution |
|-------|----------|
| "Username and Password not accepted" | Username must be `apikey`, password must be API key |
| "Sender not authenticated" | Verify sender email in SendGrid |
| "Daily limit exceeded" | Upgrade plan or wait until tomorrow |
| "Function does not exist" | Run database function SQL in Supabase |
| "Email already exists" not showing | Apply `check_email_exists` function |

---

## 📈 SendGrid Limits

| Plan | Emails/Day | Emails/Month | Cost |
|------|-----------|--------------|------|
| Free | 100 | 6,000 | $0 |
| Essentials | 333 | 10,000 | $14.95/mo |
| Pro | 5,000 | 150,000 | $89.95/mo |

**Recommended:**
- **Development**: Free plan
- **Small Production**: Essentials
- **Growing Business**: Pro

---

## 🔗 Quick Links

### SendGrid
- Dashboard: https://app.sendgrid.com/
- API Keys: https://app.sendgrid.com/settings/api_keys
- Sender Auth: https://app.sendgrid.com/settings/sender_auth
- Email Activity: https://app.sendgrid.com/email_activity

### Supabase
- Project Dashboard: https://app.supabase.com/
- Auth Settings: [Your Project] → Authentication
- SQL Editor: [Your Project] → SQL Editor
- Logs: [Your Project] → Logs

### Documentation
- SendGrid Docs: https://docs.sendgrid.com/
- Supabase Auth: https://supabase.com/docs/guides/auth
- SMTP Guide: https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api

---

## 🎯 Production Readiness

Before going live:

### Must Have ✅
- [x] SendGrid SMTP configured
- [x] Email templates customized
- [x] Sender email verified
- [x] Both flows tested (signup + reset)
- [x] Database functions deployed
- [x] Enhanced trigger deployed

### Recommended ✅
- [ ] Domain authentication configured
- [ ] Production URLs added to Supabase
- [ ] Monitoring/alerts set up
- [ ] Upgraded to paid SendGrid plan
- [ ] Email analytics tracking
- [ ] Customer support email set up

### Optional
- [ ] Custom email domain (e.g., @pexillo.com)
- [ ] Email template A/B testing
- [ ] Advanced email analytics
- [ ] Dedicated IP address (high volume)

---

## 📞 Support

### SendGrid Issues
- Support: https://support.sendgrid.com/
- Status: https://status.sendgrid.com/

### Supabase Issues
- Support: https://supabase.com/support
- Status: https://status.supabase.com/

### Application Issues
- Check browser console for errors
- Check Supabase logs
- Review this documentation

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Status**: ✅ Ready for Production

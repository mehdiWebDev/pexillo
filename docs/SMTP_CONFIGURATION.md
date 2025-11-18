# SMTP Configuration Quick Reference

Quick copy-paste values for Supabase SMTP setup with SendGrid.

---

## 📋 SendGrid SMTP Settings

Use these exact values in **Supabase Dashboard** → **Authentication** → **Email Templates** → **SMTP Settings**:

### Configuration Values

```
Enable Custom SMTP: ✅ ON

Sender email: noreply@yourdomain.com
(Replace with YOUR verified sender email from SendGrid)

Sender name: Pexillo

Host: smtp.sendgrid.net

Port number: 587

Minimum interval between emails (seconds): 0

Username: apikey
⚠️ Important: Literally type "apikey" - this is NOT a placeholder!

Password: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
⚠️ Important: Paste your actual SendGrid API Key here
```

---

## 🔑 How to Get SendGrid API Key

1. Go to: https://app.sendgrid.com/settings/api_keys
2. Click **"Create API Key"**
3. Name: `Pexillo-Supabase-SMTP`
4. Permissions: **Full Access** (or Mail Send only)
5. Click **"Create & View"**
6. **Copy the key immediately** (you won't see it again!)

---

## ✅ Verified Sender Email

Your sender email **MUST** be verified in SendGrid:

1. Go to: https://app.sendgrid.com/settings/sender_auth
2. Click **"Verify a Single Sender"**
3. Fill in the form with your email
4. Check your email and click verification link
5. Use this EXACT email in Supabase SMTP settings

---

## 🧪 Testing

### Test Connection (Quick)

After configuring SMTP in Supabase:

1. Try signing up with a new email
2. Email should arrive in 10-30 seconds
3. Check spam folder if not in inbox

### Verify in SendGrid Dashboard

1. Go to: https://app.sendgrid.com/email_activity
2. You should see emails with status "Delivered"

---

## 🔧 Common Issues

### Issue: "Username and Password not accepted"

**Fix:**
- Username must be: `apikey` (lowercase, no spaces)
- Password must be: Your SendGrid API Key (starts with `SG.`)

### Issue: "Sender not authenticated"

**Fix:**
- Go to SendGrid → Sender Authentication
- Verify your sender email
- Use the EXACT verified email in Supabase

### Issue: Emails not arriving

**Check:**
1. SendGrid Activity Feed: https://app.sendgrid.com/email_activity
2. Spam folder
3. Email address is valid
4. Sender is verified

---

## 📞 Support

- **SendGrid Login**: https://app.sendgrid.com/
- **Sender Auth**: https://app.sendgrid.com/settings/sender_auth
- **API Keys**: https://app.sendgrid.com/settings/api_keys
- **Email Activity**: https://app.sendgrid.com/email_activity

---

## 📝 Environment-Specific Settings

### Development (localhost)

```
Sender email: your-personal-email@gmail.com (verified in SendGrid)
Sender name: Pexillo Dev
```

### Production

```
Sender email: noreply@pexillo.com (with domain authentication)
Sender name: Pexillo
```

**Note:** For production, complete **Domain Authentication** in SendGrid for better deliverability.

---

## ✨ Quick Start Checklist

- [ ] SendGrid account created
- [ ] Sender email verified
- [ ] API Key created and saved
- [ ] SMTP configured in Supabase
- [ ] Email templates customized
- [ ] Test signup completed successfully
- [ ] Test password reset completed successfully
- [ ] Emails arriving within 30 seconds
- [ ] Not going to spam

**All checked?** You're ready to go! 🎉

# SendGrid Email Setup for Pexillo

Complete guide to configure SendGrid for account confirmation and password reset emails.

---

## 📋 Overview

**What you'll accomplish:**
- ✅ Set up SendGrid account (Free: 100 emails/day)
- ✅ Configure SMTP in Supabase
- ✅ Customize email templates for Pexillo branding
- ✅ Test confirmation and password reset emails

**Time required:** ~15 minutes

---

## 🚀 Step 1: Create SendGrid Account

### 1.1 Sign Up

1. Go to: https://signup.sendgrid.com/
2. Click **"Start for free"**
3. Fill in your information:
   - Email: Your business email
   - Password: Strong password
   - Choose: **Free Plan** (100 emails/day)

### 1.2 Verify Your Email

1. Check your inbox for SendGrid verification email
2. Click the verification link
3. Complete the account setup

### 1.3 Complete Sender Authentication (Important!)

SendGrid requires sender verification to prevent spam:

**Option A: Single Sender Verification** (Easiest - Good for testing)

1. Go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in the form:
   ```
   From Name: Pexillo
   From Email Address: noreply@yourdomain.com (or your personal email for testing)
   Reply To: support@yourdomain.com
   Company Address: Your business address
   City, State, ZIP: Your location
   Country: Your country
   ```
4. Click **"Create"**
5. Check your email and click the verification link
6. ✅ Your sender is now verified!

**Option B: Domain Authentication** (Recommended for production)

1. Go to **Settings** → **Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Follow the DNS setup wizard
4. Add the provided DNS records to your domain
5. Wait for verification (can take up to 48 hours)

---

## 🔑 Step 2: Create API Key

### 2.1 Generate API Key

1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Configure:
   ```
   API Key Name: Pexillo-Supabase-SMTP
   API Key Permissions: Full Access (or Restricted Access → Mail Send)
   ```
4. Click **"Create & View"**

### 2.2 Save Your API Key

⚠️ **IMPORTANT:** Copy the API key NOW - you won't see it again!

```
SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Save it securely:**
- Paste it in a password manager
- Or save in a secure note
- We'll use this in the next step

---

## ⚙️ Step 3: Configure Supabase SMTP

### 3.1 Open Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com
2. Select your **Pexillo** project
3. Navigate to: **Authentication** → **Email Templates** (left sidebar)

### 3.2 Enable Custom SMTP

1. Scroll down to **"SMTP Settings"**
2. Toggle **"Enable Custom SMTP"** to ON

### 3.3 Enter SendGrid SMTP Credentials

Fill in these exact values:

```
Sender email: noreply@yourdomain.com
(Use the EXACT email you verified in SendGrid)

Sender name: Pexillo

Host: smtp.sendgrid.net

Port: 587

Username: apikey
(Literally type "apikey" - this is not a placeholder!)

Password: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Paste your SendGrid API Key from Step 2.2)
```

### 3.4 Save Configuration

1. Click **"Save"** at the bottom
2. You should see: "SMTP settings updated successfully" ✅

---

## 📧 Step 4: Customize Email Templates

### 4.1 Confirmation Email Template

1. In Supabase Dashboard, go to: **Authentication** → **Email Templates**
2. Click on **"Confirm signup"**
3. Replace the template with this:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Pexillo!</h1>
  </div>

  <!-- Body -->
  <div style="background-color: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
      Hi <strong>{{ .FullName }}</strong>,
    </p>

    <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
      Thanks for signing up! We're excited to have you join the Pexillo community.
      Please confirm your email address to get started.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                display: inline-block;">
        Confirm Your Email
      </a>
    </div>

    <p style="font-size: 14px; color: #777; margin-top: 30px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
      {{ .ConfirmationURL }}
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 14px; color: #777;">
      If you didn't create a Pexillo account, you can safely ignore this email.
    </p>

    <p style="font-size: 14px; color: #555; margin-top: 30px;">
      Best regards,<br>
      <strong>The Pexillo Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 20px; padding: 20px;">
    <p style="font-size: 12px; color: #999;">
      © {{ .SiteURL }} | Pexillo - Wear Your Imagination
    </p>
  </div>
</div>
```

4. Click **"Save"**

### 4.2 Password Reset Email Template

1. Click on **"Reset password"** template
2. Replace with this:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
  </div>

  <!-- Body -->
  <div style="background-color: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
      Hi there,
    </p>

    <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
      We received a request to reset your password for your Pexillo account.
      Click the button below to create a new password.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                display: inline-block;">
        Reset Password
      </a>
    </div>

    <p style="font-size: 14px; color: #777; margin-top: 30px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
      {{ .ConfirmationURL }}
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 14px; color: #ff6b6b; background-color: #ffe0e0; padding: 15px; border-radius: 5px; border-left: 4px solid #ff6b6b;">
      ⚠️ <strong>Security Notice:</strong> If you didn't request this password reset,
      please ignore this email. Your password will remain unchanged.
    </p>

    <p style="font-size: 14px; color: #555; margin-top: 30px;">
      Best regards,<br>
      <strong>The Pexillo Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 20px; padding: 20px;">
    <p style="font-size: 12px; color: #999;">
      © {{ .SiteURL }} | Pexillo - Wear Your Imagination
    </p>
    <p style="font-size: 11px; color: #bbb; margin-top: 10px;">
      This link will expire in 1 hour for security reasons.
    </p>
  </div>
</div>
```

3. Click **"Save"**

### 4.3 Optional: Magic Link Template

1. Click on **"Magic Link"** template
2. Customize similarly if you want to use magic links for login

---

## ✅ Step 5: Test Email Delivery

### 5.1 Test Signup Confirmation

1. Go to your signup page: `http://localhost:3000/auth/sign-up` (or your production URL)
2. Register with a **NEW email address** (not one you've used before)
3. Fill in all the required fields
4. Click **"Sign up"**

**Expected behavior:**
- ✅ Redirected to success page
- ✅ Email arrives within 10-30 seconds
- ✅ Check inbox (and spam folder just in case)
- ✅ Click confirmation link
- ✅ Account is activated

### 5.2 Test Password Reset

1. Go to login page
2. Click **"Forgot password?"**
3. Enter an existing email address
4. Check email for reset link
5. Click the link and set new password

### 5.3 Check SendGrid Dashboard

1. Go to SendGrid: **Activity** → **Email Activity**
2. You should see your sent emails with status:
   - **Delivered** ✅ (Success!)
   - **Processed** (On the way)
   - **Bounced** ❌ (Email address invalid)
   - **Dropped** ❌ (Check sender authentication)

---

## 🔧 Troubleshooting

### Emails Not Arriving?

**1. Check SendGrid Activity Feed**
```
SendGrid Dashboard → Activity → Email Activity
```
Look for your email and check the status:
- **Delivered**: Email sent successfully (check spam folder)
- **Processed**: Still being delivered (wait a few minutes)
- **Bounced**: Invalid email address
- **Dropped**: Sender not authenticated

**2. Verify Sender Email**
- Make sure the sender email in Supabase matches the verified email in SendGrid
- Go to SendGrid: **Settings** → **Sender Authentication**
- Status should be **Verified** ✅

**3. Check SMTP Credentials**
- Username must be exactly: `apikey` (not your SendGrid username)
- Password must be your SendGrid API Key (starts with `SG.`)
- Host: `smtp.sendgrid.net`
- Port: `587`

**4. API Key Permissions**
- Go to SendGrid: **Settings** → **API Keys**
- Your API key must have **Mail Send** permission
- If not, create a new key with Full Access

**5. Emails Going to Spam?**
This is common in the beginning. Solutions:
- Complete **Domain Authentication** in SendGrid (not just single sender)
- Ask recipients to mark emails as "Not Spam"
- Wait a few days for SendGrid to build reputation
- Add SPF and DKIM records to your domain

### Error Messages

**"Username and Password not accepted"**
- Username must be `apikey` (not your email)
- Password must be the API key, not your SendGrid password

**"Sender not authenticated"**
- Go to SendGrid → **Sender Authentication**
- Verify the sender email address
- Make sure it matches the one in Supabase SMTP settings

**"Daily sending limit exceeded"**
- Free plan: 100 emails/day
- Upgrade to paid plan for higher limits
- Or wait until tomorrow (resets at midnight UTC)

---

## 📊 SendGrid Plans

| Plan | Emails/Day | Emails/Month | Price |
|------|-----------|--------------|-------|
| **Free** | 100 | 6,000 | $0 |
| **Essentials** | 333 | 10,000 | $14.95/mo |
| **Pro** | 5,000 | 150,000 | $89.95/mo |

**Free plan is perfect for:**
- Development and testing
- Small businesses
- Up to ~3,000 users (with average 2 emails per user)

---

## 🎯 Best Practices

### Email Deliverability

1. **Authenticate Your Domain** (Production)
   - Add SPF, DKIM, and DMARC records
   - Improves inbox placement significantly

2. **Use Professional Sender Names**
   - ✅ "Pexillo" or "Pexillo Team"
   - ❌ "noreply" or generic names

3. **Monitor Email Activity**
   - Check SendGrid dashboard weekly
   - Watch for high bounce/spam rates
   - Remove invalid emails from your database

4. **Provide Unsubscribe Links** (Marketing emails only)
   - Required by law for marketing emails
   - Not needed for transactional emails (confirmations, resets)

### Security

1. **Protect Your API Key**
   - Never commit to Git
   - Store only in Supabase dashboard
   - Rotate regularly (every 90 days)

2. **Monitor for Abuse**
   - Check for unusual sending patterns
   - Set up SendGrid alerts for high volume

3. **Rate Limiting**
   - Implement signup rate limiting in your app
   - Prevent email bombing attacks

---

## 🔗 Useful Links

- **SendGrid Dashboard**: https://app.sendgrid.com/
- **SendGrid Documentation**: https://docs.sendgrid.com/
- **Email Activity**: https://app.sendgrid.com/email_activity
- **Sender Authentication**: https://app.sendgrid.com/settings/sender_auth
- **API Keys**: https://app.sendgrid.com/settings/api_keys
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth

---

## ✨ Next Steps

After setup:
1. ✅ Test both confirmation and password reset emails
2. ✅ Customize templates to match Pexillo branding
3. ✅ Set up domain authentication (for production)
4. ✅ Monitor SendGrid activity for first few days
5. ✅ Consider upgrading to paid plan as you grow

---

## 📞 Need Help?

- **SendGrid Support**: https://support.sendgrid.com/
- **Supabase Support**: https://supabase.com/support
- **Email not working?** Check the troubleshooting section above

**Common issues solved:**
- 90% of issues: Sender email not verified
- 5% of issues: Wrong SMTP credentials
- 5% of issues: Emails in spam folder

---

**🎉 Congratulations!** Your email system is now powered by SendGrid with professional, branded templates!

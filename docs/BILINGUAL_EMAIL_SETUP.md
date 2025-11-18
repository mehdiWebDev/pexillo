# Bilingual Email Confirmation Setup

This guide explains how to configure Supabase to send bilingual (English/French) email confirmations based on the user's language preference.

## Overview

When users sign up on PEXILLO:
- **English site** (`pexillo.com`) → Email sent in **English**
- **French site** (`pexillo.com/fr`) → Email sent in **French**

The language is automatically detected from the URL the user visited and stored in their profile as `preferred_language`.

## How It Works

1. **User signs up** via the signup form
2. The form detects the language from the URL (`/` = English, `/fr` = French)
3. Language preference is stored in user metadata: `preferred_language: 'en'` or `'fr'`
4. Supabase sends a confirmation email using the custom template
5. The template checks `{{ .UserMetaData.preferred_language }}` and displays content in the appropriate language
6. User clicks confirmation link and is redirected to the correct language version of the site

## Setup Instructions

### Step 1: Configure Custom Email Template in Supabase

1. **Login to Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your PEXILLO project

2. **Navigate to Email Templates**
   - Click on **Authentication** in the left sidebar
   - Scroll down to **Email Templates** section
   - Click on **Confirm signup** template

3. **Upload the Bilingual Template**
   - Open the file: `email-templates/confirmation-email-bilingual.html`
   - Copy the entire HTML content
   - Paste it into the **Email body (HTML)** field in Supabase

4. **Configure Email Subject**

   Since Supabase doesn't support dynamic subjects in the UI, you can use one of these approaches:

   **Option A: Bilingual subject (recommended)**
   ```
   Confirm your email / Confirmez votre email - PEXILLO
   ```

   **Option B: English only** (default)
   ```
   Confirm Your Email - PEXILLO
   ```

5. **Save Changes**
   - Click **Save** at the bottom of the page
   - The template is now active

### Step 2: Verify SendGrid SMTP Configuration

Ensure your Supabase project is configured to use SendGrid SMTP:

1. In **Authentication** → **Email Settings** (or **SMTP Settings**)
2. Verify these settings:
   - **Host:** `smtp.sendgrid.net`
   - **Port:** `587`
   - **Username:** `apikey`
   - **Password:** Your SendGrid API key
   - **Sender email:** Your verified sender email (e.g., `noreply@pexillo.com`)
   - **Sender name:** `PEXILLO`

### Step 3: Test the Email Flow

#### Test English Email:
1. Open `https://pexillo.com` (or your production URL)
2. Go to **Sign Up**
3. Create a test account
4. Check your email inbox
5. ✅ Verify the email is in **English**

#### Test French Email:
1. Open `https://pexillo.com/fr`
2. Go to **Sign Up** (S'inscrire)
3. Create a test account with a different email
4. Check your email inbox
5. ✅ Verify the email is in **French**

### Step 4: Verify Redirect URLs

The signup form already configures the correct redirect URLs:

```typescript
// src/components/sign-up-form.tsx
const redirectUrl = isFrench
  ? `${window.location.origin}/fr`
  : `${window.location.origin}`;
```

This ensures:
- English users → Redirected to `/` after confirmation
- French users → Redirected to `/fr` after confirmation

## Template Variables Used

The email template has access to these Supabase variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Magic link for email confirmation | `https://pexillo.com/auth/confirm?token_hash=...` |
| `{{ .UserMetaData.preferred_language }}` | User's language preference | `en` or `fr` |
| `{{ .UserMetaData.full_name }}` | User's full name | `Jean Dupont` |
| `{{ .Email }}` | User's email address | `user@example.com` |

## Template Structure

The bilingual template uses Go template syntax:

```go
{{ if eq .UserMetaData.preferred_language "fr" }}
  <!-- French content -->
  <h2>Bienvenue chez PEXILLO!</h2>
{{ else }}
  <!-- English content -->
  <h2>Welcome to PEXILLO!</h2>
{{ end }}
```

### Sections translated:
- ✅ Email title
- ✅ Welcome message
- ✅ Call-to-action button text
- ✅ Alternative link instructions
- ✅ "What Happens Next?" section
- ✅ Footer tagline and copyright

## Troubleshooting

### Email not in the correct language?

**Check:**
1. The signup form is correctly setting `preferred_language` in metadata
2. The Supabase email template is using the correct variable: `{{ .UserMetaData.preferred_language }}`
3. Test with a fresh signup (metadata is set during signup, not retroactively)

**Debug:**
```bash
# Check user metadata in Supabase SQL Editor
SELECT
  email,
  raw_user_meta_data->>'preferred_language' as preferred_language
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

### Email not sending at all?

**Check:**
1. SendGrid SMTP credentials are correct
2. Sender email is verified in SendGrid
3. Email templates are enabled in Supabase
4. Check Supabase logs: **Authentication** → **Logs**

### Wrong redirect after confirmation?

**Check:**
1. The `emailRedirectTo` parameter in signup form
2. The confirm route at `src/app/[locale]/auth/confirm/route.ts`
3. Ensure the URL includes the locale segment if needed

### Users not receiving emails?

**Check:**
1. Spam/junk folder
2. SendGrid activity feed: [https://app.sendgrid.com/email_activity](https://app.sendgrid.com/email_activity)
3. Supabase email rate limits
4. Email deliverability settings in SendGrid

## Additional Notes

### Rate Limits
- Supabase has default email rate limits
- For production, consider upgrading your Supabase plan
- Monitor SendGrid sending limits

### Email Best Practices
- Always test both languages before deploying
- Use a verified sender domain (not Gmail/Yahoo)
- Monitor bounce rates in SendGrid
- Consider adding an unsubscribe link for marketing emails

### Future Enhancements

You can extend this pattern to other Supabase emails:

1. **Password Reset Email** - `email-templates/password-reset-bilingual.html`
2. **Magic Link Email** - `email-templates/magic-link-bilingual.html`
3. **Email Change Confirmation** - `email-templates/email-change-bilingual.html`

Each template would use the same `{{ if eq .UserMetaData.preferred_language "fr" }}` pattern.

## Support

If you encounter issues:
1. Check Supabase documentation: [https://supabase.com/docs/guides/auth/auth-email-templates](https://supabase.com/docs/guides/auth/auth-email-templates)
2. Check SendGrid documentation: [https://docs.sendgrid.com](https://docs.sendgrid.com)
3. Review the setup guide: `/docs/SENDGRID_EMAIL_SETUP.md`

## File Locations

- **Email template**: `/email-templates/confirmation-email-bilingual.html`
- **Signup form**: `/src/components/sign-up-form.tsx`
- **Confirm route**: `/src/app/[locale]/auth/confirm/route.ts`
- **Database trigger**: `/database/triggers/handle_new_user.sql`
- **This guide**: `/docs/BILINGUAL_EMAIL_SETUP.md`

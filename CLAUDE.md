# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pexillo is a bilingual (English/French) e-commerce platform built with Next.js 15, Supabase, and Stripe. The platform features a customer-facing storefront and an admin dashboard for managing products, orders, inventory, and customers.

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Backend**: Supabase (Auth, Database, Storage)
- **Payment**: Stripe
- **State Management**: Redux Toolkit (client state), React Query (server state)
- **Internationalization**: next-intl (en/fr)
- **Styling**: Tailwind CSS, shadcn/ui components
- **Email**: SendGrid (via Supabase SMTP)
- **TypeScript**: Full type coverage

## Development Commands

```bash
# Start dev server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

Required variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` - Google Places API
- `SENDGRID_API_KEY` - SendGrid API key
- `FROM_EMAIL` - SendGrid sender email
- `SENDGRID_ORDER_TEMPLATE_ID` - SendGrid order email template ID

## Architecture

### Directory Structure

- **`src/app/[locale]/`** - Next.js App Router with locale-based routing
  - `/products/` - Product listing and filtering
  - `/cart/` - Shopping cart
  - `/checkout/` - Checkout flow with Stripe
  - `/dashboard/` - Admin dashboard (requires `is_admin` flag)
  - `/auth/` - Authentication pages (login, sign-up, password reset)
  - `/profile/` - User profile management
  - `/track-order/` - Order tracking
- **`src/components/`** - Reusable React components
  - `/ui/` - shadcn/ui components
  - `/dashboard/` - Admin-specific components
  - `/cart/`, `/products/` - Feature-specific components
- **`src/services/`** - Business logic and API calls
  - `cartService.ts` - Cart operations
  - `productService.ts` - Product CRUD
  - `productListingService.ts` - Product filtering/search
  - `userService.ts` - User operations
- **`src/hooks/`** - Custom React hooks
  - `useCart.ts` - Cart state and operations
  - `useProductFilters.ts` - Product filtering logic
  - `useProductsQuery.ts` - Product data fetching
  - `useTranslate*.ts` - i18n helpers
- **`src/store/`** - Redux store
  - `slices/cartSlice.ts` - Cart state
  - `slices/authSlice.ts` - Auth state
- **`src/lib/`** - Utilities and configurations
  - `supabase/` - Supabase client utilities (client, server, middleware)
  - `queryClient.ts` - React Query config
  - `email/` - Email sending utilities
- **`src/i18n/`** - Internationalization config
- **`database/`** - Supabase SQL files
  - `functions/` - Database functions
  - `triggers/` - Database triggers (e.g., `handle_new_user.sql`)
- **`email-templates/`** - Email HTML templates
- **`docs/`** - Setup documentation (email, SendGrid, SMTP)

### Routing Structure

All routes are prefixed with locale:
- Default locale (en): `/products`, `/cart`, `/checkout`
- French: `/fr/products`, `/fr/cart`, `/fr/checkout`

The `src/middleware.ts` handles:
1. Locale routing (via next-intl)
2. Authentication checks
3. Admin-only route protection (`/dashboard`, `/admin`)

### Authentication & Authorization

- **Authentication**: Supabase Auth with email/password
- **User Profiles**: Created automatically via database trigger (`handle_new_user.sql`)
- **Admin Access**: Users require `is_admin: true` in `profiles` table
- **Protected Routes**:
  - `/dashboard/*` - Admin only
  - `/profile` - Authenticated users only
  - Middleware redirects to `/auth/login` with `?redirect=` param

### Internationalization

- **Supported Locales**: `en` (default), `fr`
- **Configuration**: `src/i18n/config.ts`, `src/i18n/routing.ts`
- **Translation Files**: `src/messages/en.json`, `src/messages/fr.json`
- **Locale-aware Navigation**: Use `Link`, `redirect`, `useRouter` from `src/i18n/routing.ts`
- **Translation Helpers**: `useTranslateCategories`, `useTranslatedProduct` hooks

### State Management

**Redux (Client State)**:
- Cart state (items, quantities, variants)
- Auth state (user info, session)
- Persisted to localStorage

**React Query (Server State)**:
- Product data
- User profile
- Orders
- Admin data (customers, inventory)
- Uses `@supabase-cache-helpers/postgrest-react-query` for Supabase integration

### Database

- **Main Tables**: `profiles`, `products`, `categories`, `orders`, `cart_items`, `product_images`, `admin_settings`
- **Key Functions**: `check_email_exists` (prevents duplicate emails)
- **Triggers**: `handle_new_user` (auto-creates profile on signup)
- **RLS**: Row Level Security enabled on most tables
- **Storage**: `avatars` bucket for user profile images

### Email System

- **Provider**: SendGrid (via Supabase SMTP)
- **Templates**: Dynamic templates for order confirmations
- **Admin Notifications**: Configured via `admin_settings` table or `MAIL_TO_ME` env var
- **Setup Docs**: See `docs/EMAIL_SETUP_SUMMARY.md`, `docs/SENDGRID_SETUP.md`

## Important Patterns

### Product Structure
Products have:
- Base product info (name, description, price, category)
- Variants (size, color combinations)
- Multiple images per product
- Featured flag and ordering
- Translations for name/description in both locales

### Cart Flow
1. Client-side cart state (Redux)
2. Guest users: localStorage only
3. Authenticated users: Synced with Supabase `cart_items` table
4. Checkout: Creates Stripe checkout session
5. Success webhook: Updates order status, sends emails

### Admin Dashboard
- Only accessible to users with `is_admin: true`
- Manage products, categories, orders, inventory, customers
- Order management includes notes, status updates, export
- Settings page for admin notification email

### Supabase Client Creation
Always use the appropriate client:
- **Client Components**: `lib/supabase/client.ts`
- **Server Components**: `lib/supabase/server.ts`
- **Server Actions**: `lib/supabase/server.ts`
- **Middleware**: Created inline with cookie handlers
- **Route Handlers**: Created inline with cookie handlers

### shadcn/ui Components
Components are in `src/components/ui/`. Configuration in `components.json`. To add new components, use:
```bash
npx shadcn@latest add <component-name>
```

## Common Tasks

### Adding a New Product Feature
1. Update database schema in Supabase dashboard
2. Add/update types in relevant service files
3. Update `productService.ts` or create new service
4. Create/update React Query hooks in `hooks/`
5. Update UI components
6. Add translations to `src/messages/en.json` and `fr.json`

### Modifying Cart Logic
1. Update `store/slices/cartSlice.ts` for Redux state
2. Update `services/cartService.ts` for Supabase sync
3. Update `hooks/useCart.ts` for component interface
4. Test with both guest and authenticated users

### Adding Protected Routes
1. Add route check in `src/middleware.ts`
2. Use `supabase.auth.getUser()` for auth check
3. For admin routes, check `profiles.is_admin` flag
4. Set proper redirect with locale prefix

### Database Changes
1. Make schema changes in Supabase dashboard
2. Document in appropriate SQL file in `database/`
3. Update TypeScript types
4. Test RLS policies
5. Update relevant services/hooks

### Email Template Updates
1. Update SendGrid dynamic template via dashboard
2. Update template ID in `.env.local`
3. Ensure both EN/FR content is included
4. Test with `lib/email/` utilities

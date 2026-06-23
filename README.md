# Zingte API Hub

B2B dashboard for the **Zingte AI Platform** — list 35+ enterprise AI APIs, let customers subscribe, and manage API tokens.

**Base URL:** `https://api.zingte.ai/v1` · **Auth:** Bearer tokens

## Features

### Admin Dashboard
- Overview with revenue, subscriber, and API stats
- Create and manage API products (pricing, rate limits, features)
- Activate/deactivate APIs
- View all B2B subscribers and their subscriptions

### Customer Portal
- Browse API catalog with pricing
- Subscribe to APIs (monthly or yearly billing)
- Manage subscriptions (view, cancel)
- Generate and revoke API tokens
- Dashboard overview with spend tracking

### API Token System
- Secure token generation (`zt_` prefixed)
- SHA-256 hashed storage (tokens shown once)
- Token verification endpoint for your APIs
- Subscription validation on each request

### Authentication
- Email/password sign up with **email verification** (required before login)
- Secure verification & password-reset tokens (SHA-256 hashed, time-limited)
- Forgot password flow with reset emails
- Resend verification email (60s cooldown)
- Branded HTML transactional emails via SMTP
- Demo accounts pre-verified for testing

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role     | Email              | Password  |
|----------|--------------------|-----------|
| Admin    | admin@zingte.com   | admin123  |
| Customer | demo@acme.com      | demo123   |

## API Token Verification

Your backend APIs can validate tokens by calling:

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Authorization: Bearer zt_your_token_here"
```

Response on success:
```json
{
  "valid": true,
  "api": {
    "name": "Weather Intelligence API",
    "baseUrl": "https://api.zingte.com/weather",
    "version": "v1",
    "rateLimit": 5000
  },
  "user": {
    "id": "...",
    "email": "demo@acme.com",
    "company": "Acme Corporation"
  }
}
```

## Tech Stack

- **Next.js 15** — App Router, Server Components
- **Prisma + SQLite** — Database (swap to PostgreSQL for production)
- **Tailwind CSS 4** — Styling
- **JWT** — Session authentication
- **Zod** — Input validation

## Project Structure

```
src/
├── app/
│   ├── admin/          # Admin dashboard pages
│   ├── dashboard/      # Customer portal pages
│   ├── api/            # REST API routes
│   ├── login/          # Auth pages
│   └── register/
├── components/         # UI components
└── lib/                # Auth, prisma, utils, tokens
prisma/
├── schema.prisma       # Database schema
└── seed.ts             # Demo data
```

## Stripe Payments

Subscriptions are processed through **Stripe Checkout** with recurring monthly/yearly billing.

### Setup

1. Add your Stripe keys to `.env` (see `.env.example`)
2. Sync products to Stripe:
   ```bash
   npm run stripe:sync
   ```
3. For local webhooks, install [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_...` secret into `STRIPE_WEBHOOK_SECRET` in `.env`

4. Enable **Customer Portal** in Stripe Dashboard → Settings → Billing → Customer portal

### Test cards

Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

### Flow

1. Customer clicks **Subscribe** → **Pay with Stripe**
2. Redirected to Stripe Checkout
3. On success, subscription activates (via webhook + success page verification)
4. **Manage Billing** opens Stripe Customer Portal for invoices & payment methods

## Email / SMTP Setup

Configure SMTP in `.env` for real emails (Gmail, SendGrid, Mailgun, etc.):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@email.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourdomain.com"
```

**Without SMTP (local dev):** verification and reset links print in the server terminal.

### Auth endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create account, send verification email |
| `/api/auth/login` | POST | Sign in (verified users only) |
| `/api/auth/verify-email` | GET | Verify email from link, auto sign-in |
| `/api/auth/resend-verification` | POST | Resend verification email |
| `/api/auth/forgot-password` | POST | Send password reset email |
| `/api/auth/reset-password` | POST | Set new password with token |

## Production Notes

1. Change `JWT_SECRET` in `.env` to a strong random value
2. Switch database from SQLite to PostgreSQL
3. Configure SMTP for transactional emails
4. Add rate limiting middleware for auth endpoints
5. Set up HTTPS and secure cookie settings

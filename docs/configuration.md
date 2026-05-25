# ExamDraft Configuration

This checklist prepares the production stack without storing secrets in git.

## 1. Cloudflare

Create the D1 database:

```bash
npx wrangler d1 create examdraft
```

Copy the returned `database_id` into `wrangler.toml`.

Apply migrations locally:

```bash
npm run db:migrate:local
```

Apply migrations to production:

```bash
npm run db:migrate:remote
```

## 2. Required Secrets

Set these with Wrangler. Do not place real values in committed files.

```bash
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_PRICE_ID
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put AUTH_RATE_LIMIT_SALT
```

## 3. Plain Environment Variables

Update `[vars]` in `wrangler.toml` for production:

```toml
APP_ORIGIN = "https://your-domain.com"
FREE_START_CREDITS = "1"
GENERATION_CREDITS = "4"
TYPE_TRAINING_CREDITS = "2"
STRIPE_CREDITS_PER_PACK = "30"
OPENROUTER_ANALYSIS_MODEL = "google/gemini-3-flash-preview"
OPENROUTER_GENERATION_MODEL = "anthropic/claude-sonnet-4.6"
OPENROUTER_GRADING_MODEL = "google/gemini-3-flash-preview"
```

Cloudflare Web Analytics is a public build-time value. Set it in the Cloudflare
Pages project under build environment variables:

```text
PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN=your_cloudflare_web_analytics_token
```

Recommended rate limits:

```toml
AUTH_EMAIL_HOURLY_LIMIT = "2"
AUTH_IP_HOURLY_LIMIT = "5"
AUTH_IP_DISTINCT_EMAIL_DAILY_LIMIT = "3"
AUTH_DOMAIN_DAILY_LIMIT = "25"
```

## 4. Resend

1. Verify your sending domain in Resend.
2. Create a Resend API key.
3. Set `RESEND_API_KEY`.
4. Set `RESEND_FROM` to a verified sender, for example:

```toml
RESEND_FROM = "ExamDraft <login@your-domain.com>"
```

## 5. Stripe

1. Create a one-time payment product, for example `30 Credits`.
2. Copy the Stripe Price ID into `STRIPE_PRICE_ID`.
3. Set `STRIPE_CREDITS_PER_PACK = "30"`.
4. Add a webhook endpoint:

```text
https://your-domain.com/api/billing/webhook
```

Listen for:

```text
checkout.session.completed
```

Important: the webhook handler requires Stripe signature verification with `STRIPE_WEBHOOK_SECRET`.

## 6. OpenRouter

1. Create an OpenRouter API key.
2. Set `OPENROUTER_API_KEY`.
3. Make sure the selected models are enabled/available for your account:
   - `google/gemini-3-flash-preview`
   - `anthropic/claude-sonnet-4.6`

## 7. Local Development

Copy the example env file:

```bash
cp .dev.vars.example .dev.vars
```

Fill in local test secrets, then run:

```bash
npm run dev
```

For a production-like local Worker environment, use:

```bash
npm run pages:dev
```

## 8. Pre-Deploy Check

Run:

```bash
npm run verify
```

Then deploy through Cloudflare Pages or:

```bash
npm run deploy
```

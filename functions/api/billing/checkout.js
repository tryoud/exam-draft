import { requireUser } from '../../_shared/auth.js';
import { json } from '../../_shared/http.js';

export async function onRequestPost({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: 'UNAUTHENTICATED' }, 401);
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return json({ error: 'BILLING_NOT_CONFIGURED' }, 501);
  }

  const origin = env.APP_ORIGIN || new URL(request.url).origin;
  const { locale } = await request.json().catch(() => ({}));
  const appPath = locale === 'en' ? '/en/app' : '/app';
  const body = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': env.STRIPE_PRICE_ID,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    success_url: `${origin}${appPath}?billing=success`,
    cancel_url: `${origin}${appPath}?billing=cancelled`,
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await response.json();
  return json(response.ok ? { url: data.url } : { error: 'STRIPE_ERROR', details: data }, response.ok ? 200 : 500);
}

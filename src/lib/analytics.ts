export type AnalyticsEvent =
  | 'landing_view'
  | 'app_opened'
  | 'demo_opened'
  | 'auth_started'
  | 'auth_success'
  | 'upload_started'
  | 'analysis_started'
  | 'analysis_success'
  | 'paywall_shown'
  | 'checkout_started'
  | 'checkout_success'
  | 'generation_started'
  | 'generation_success'
  | 'generation_failed'
  | 'byok_selected';

export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    event,
    properties: {
      path: window.location.pathname,
      locale: window.location.pathname.startsWith('/en') ? 'en' : 'de',
      ...properties,
    },
  };

  window.dispatchEvent(new CustomEvent('examdraft:analytics', { detail: payload }));

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/events', blob);
    return;
  }

  void fetch('/api/events', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

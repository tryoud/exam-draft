import { creditBalance, getSessionUser, purchasedCreditTotal } from '../_shared/auth.js';
import { json } from '../_shared/http.js';

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ user: null, credits: 0, plan: 'free' });
  const credits = await creditBalance(env, user.id);
  const purchasedCredits = await purchasedCreditTotal(env, user.id);
  return json({
    user: { id: user.id, email: user.email },
    credits,
    plan: purchasedCredits > 0 ? 'credits' : 'free',
  });
}

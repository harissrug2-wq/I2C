import {
  appBaseUrl,
  exchangeQuickBooksCode,
  supabaseAdmin,
  upsertConnection,
  verifyState,
} from '../../_lib/integrationServer.js';

function finish(res, params = {}) {
  const url = new URL('/connections', appBaseUrl());
  Object.entries(params).forEach(([key, value]) => value != null && url.searchParams.set(key, String(value)));
  return res.redirect(302, url.toString());
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return finish(res, { integration:'quickbooks', status:'error', message:'Invalid callback method.' });
    if (req.query?.error) return finish(res, { integration:'quickbooks', status:'error', message:req.query.error_description || req.query.error });
    const state = verifyState(req.query?.state, 'quickbooks');
    const code = String(req.query?.code || '');
    const realmId = String(req.query?.realmId || '');
    if (!code || !realmId) throw new Error('QuickBooks callback is missing code or realmId.');

    const token = await exchangeQuickBooksCode(code);
    const secret = {
      ...token,
      realm_id:realmId,
      expires_at:Date.now() + Number(token.expires_in || 3600) * 1000,
      refresh_expires_at:token.x_refresh_token_expires_in
        ? Date.now() + Number(token.x_refresh_token_expires_in) * 1000
        : null,
    };
    const admin = supabaseAdmin();
    await upsertConnection(admin, {
      workspaceId:state.workspaceId,
      ownerId:state.ownerId,
      provider:'quickbooks',
      status:'connected',
      secret,
      metadata:{ realmId },
    });
    return finish(res, { integration:'quickbooks', status:'connected' });
  } catch (error) {
    return finish(res, { integration:'quickbooks', status:'error', message:error?.message || 'QuickBooks connection failed.' });
  }
}

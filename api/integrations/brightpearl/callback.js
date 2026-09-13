import {
  appBaseUrl,
  exchangeBrightpearlCode,
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
    if (req.method !== 'GET') return finish(res, { integration:'brightpearl', status:'error', message:'Invalid callback method.' });
    if (req.query?.error) return finish(res, { integration:'brightpearl', status:'error', message:req.query.error_description || req.query.error });
    const state = verifyState(req.query?.state, 'brightpearl');
    const code = String(req.query?.code || '');
    if (!code || !state.accountCode) throw new Error('Brightpearl callback is missing authorization data.');

    const token = await exchangeBrightpearlCode(state.accountCode, code);
    if (!token?.access_token || !token?.refresh_token || !token?.api_domain) {
      throw new Error('Brightpearl did not return a complete OAuth token.');
    }

    const secret = {
      ...token,
      account_code:state.accountCode,
      expires_at:Date.now() + Number(token.expires_in || 604800) * 1000,
    };
    const admin = supabaseAdmin();
    await upsertConnection(admin, {
      workspaceId:state.workspaceId,
      ownerId:state.ownerId,
      provider:'brightpearl',
      status:'connected',
      secret,
      metadata:{
        accountCode:state.accountCode,
        apiDomain:token.api_domain,
        installationInstanceId:token.installation_instance_id || null,
      },
    });
    return finish(res, { integration:'brightpearl', status:'connected' });
  } catch (error) {
    return finish(res, { integration:'brightpearl', status:'error', message:error?.message || 'Brightpearl connection failed.' });
  }
}

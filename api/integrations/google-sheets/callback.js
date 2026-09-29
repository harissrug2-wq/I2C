import {
  appBaseUrl,
  supabaseAdmin,
  upsertConnection,
  verifyState,
} from '../../_lib/integrationServer.js';
import { exchangeGoogleCode } from '../../_lib/googleSheetsServer.js';

function finish(res, params = {}) {
  const url = new URL('/connections', appBaseUrl());
  Object.entries(params).forEach(([key, value]) => value != null && url.searchParams.set(key, String(value)));
  return res.redirect(302, url.toString());
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return finish(res, { integration:'google_sheets', status:'error', message:'Invalid callback method.' });
    if (req.query?.error) return finish(res, { integration:'google_sheets', status:'error', message:req.query.error_description || req.query.error });

    const state = verifyState(req.query?.state, 'google_sheets');
    const code = String(req.query?.code || '');
    if (!code) throw new Error('Google Sheets callback is missing an authorization code.');

    const token = await exchangeGoogleCode(code);
    if (!token?.access_token) throw new Error('Google did not return an access token.');
    if (!token?.refresh_token) throw new Error('Google did not return a refresh token. Reconnect and grant offline access.');

    const secret = {
      ...token,
      expires_at: Date.now() + Number(token.expires_in || 3600) * 1000,
    };

    const admin = supabaseAdmin();
    await upsertConnection(admin, {
      workspaceId:state.workspaceId,
      ownerId:state.ownerId,
      provider:'google_sheets',
      status:'connected',
      secret,
      metadata:{ mappings:[] },
    });

    return finish(res, { integration:'google_sheets', status:'connected' });
  } catch (error) {
    return finish(res, { integration:'google_sheets', status:'error', message:error?.message || 'Google Sheets connection failed.' });
  }
}

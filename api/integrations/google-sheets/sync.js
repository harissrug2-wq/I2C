import { apiError, getConnection, requireWorkspaceAuth, updateConnection } from '../../_lib/integrationServer.js';
import { ensureGoogleSheetsToken, readMappedGoogleSheetsPayload } from '../../_lib/googleSheetsServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed.' });

  let auth;
  try {
    auth = await requireWorkspaceAuth(req);
    const connection = await getConnection(auth.admin, auth.workspaceId, 'google_sheets', { withSecret:true });
    if (!connection) return res.status(409).json({ ok:false, error:'Google Sheets is not connected.' });

    const secret = await ensureGoogleSheetsToken(auth.admin, connection);
    const payload = await readMappedGoogleSheetsPayload(secret, connection.metadata || {});
    const syncedAt = new Date().toISOString();

    await updateConnection(auth.admin, auth.workspaceId, 'google_sheets', {
      status:'connected',
      last_sync_at:syncedAt,
      last_error:null,
      metadata:connection.metadata || {},
    });

    return res.status(200).json({ ok:true, provider:'google_sheets', syncedAt, payload });
  } catch (error) {
    if (auth?.admin && auth?.workspaceId) {
      try {
        await updateConnection(auth.admin, auth.workspaceId, 'google_sheets', {
          status:'error',
          last_error:error?.message || 'Google Sheets sync failed.',
        });
      } catch {}
    }
    return apiError(res, error);
  }
}

import { apiError, getConnection, requireWorkspaceAuth, updateConnection } from '../../_lib/integrationServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  try {
    const auth = await requireWorkspaceAuth(req);
    const connection = await getConnection(auth.admin, auth.workspaceId, 'google_sheets');
    if (!connection) return res.status(409).json({ ok:false, error:'Google Sheets is not connected.' });

    const spreadsheetId = String(req.body?.spreadsheetId || '').trim();
    const spreadsheetName = String(req.body?.spreadsheetName || '').trim();
    const mappings = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
    if (!spreadsheetId) return res.status(400).json({ ok:false, error:'Select a spreadsheet first.' });

    const metadata = {
      ...(connection.metadata || {}),
      spreadsheetId,
      spreadsheetName:spreadsheetName || spreadsheetId,
      mappings,
      configuredAt:new Date().toISOString(),
    };

    const updated = await updateConnection(auth.admin, auth.workspaceId, 'google_sheets', {
      status:'connected',
      metadata,
      lastError:null,
    });

    return res.status(200).json({ ok:true, connection:updated });
  } catch (error) {
    return apiError(res, error);
  }
}

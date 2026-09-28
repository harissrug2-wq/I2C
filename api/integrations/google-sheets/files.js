import { apiError, getConnection, requireWorkspaceAuth } from '../../_lib/integrationServer.js';
import { ensureGoogleSheetsToken, listGoogleSpreadsheets } from '../../_lib/googleSheetsServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  try {
    const auth = await requireWorkspaceAuth(req);
    const connection = await getConnection(auth.admin, auth.workspaceId, 'google_sheets', { withSecret:true });
    if (!connection) return res.status(409).json({ ok:false, error:'Google Sheets is not connected.' });

    const secret = await ensureGoogleSheetsToken(auth.admin, connection);
    const files = await listGoogleSpreadsheets(secret);
    return res.status(200).json({
      ok:true,
      files:files.map(file => ({
        id:file.id,
        name:file.name,
        modifiedTime:file.modifiedTime || null,
        webViewLink:file.webViewLink || null,
      })),
      selectedSpreadsheetId:connection.metadata?.spreadsheetId || null,
    });
  } catch (error) {
    return apiError(res, error);
  }
}

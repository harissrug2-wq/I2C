import { apiError, getConnection, requireWorkspaceAuth } from '../../_lib/integrationServer.js';
import { ensureGoogleSheetsToken, inspectGoogleSpreadsheet } from '../../_lib/googleSheetsServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  try {
    const auth = await requireWorkspaceAuth(req);
    const spreadsheetId = String(req.query?.spreadsheetId || '').trim();
    if (!spreadsheetId) return res.status(400).json({ ok:false, error:'Spreadsheet ID is required.' });

    const connection = await getConnection(auth.admin, auth.workspaceId, 'google_sheets', { withSecret:true });
    if (!connection) return res.status(409).json({ ok:false, error:'Google Sheets is not connected.' });

    const secret = await ensureGoogleSheetsToken(auth.admin, connection);
    const spreadsheet = await inspectGoogleSpreadsheet(secret, spreadsheetId);
    return res.status(200).json({ ok:true, spreadsheet });
  } catch (error) {
    return apiError(res, error);
  }
}

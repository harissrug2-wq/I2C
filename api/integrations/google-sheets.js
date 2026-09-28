import {
  apiError,
  getConnection,
  requireWorkspaceAuth,
  signState,
  updateConnection,
} from './_lib/integrationServer.js';
import {
  ensureGoogleSheetsToken,
  googleSheetsAuthorizationUrl,
  inspectGoogleSpreadsheet,
  listGoogleSpreadsheets,
  readMappedGoogleSheetsPayload,
} from './_lib/googleSheetsServer.js';

function actionFrom(req) {
  return String(req.query?.action || req.body?.action || '').trim().toLowerCase();
}

async function connect(req, res) {
  const { ownerId, workspaceId } = await requireWorkspaceAuth(req);
  const state = signState({
    provider:'google_sheets',
    ownerId,
    workspaceId,
    returnTo:'/connections',
  });
  return res.status(200).json({ ok:true, url:googleSheetsAuthorizationUrl(state) });
}

async function files(req, res) {
  const auth = await requireWorkspaceAuth(req);
  const connection = await getConnection(auth.admin, auth.workspaceId, 'google_sheets', { withSecret:true });
  if (!connection) return res.status(409).json({ ok:false, error:'Google Sheets is not connected.' });

  const secret = await ensureGoogleSheetsToken(auth.admin, connection);
  const rows = await listGoogleSpreadsheets(secret);
  return res.status(200).json({
    ok:true,
    files:rows.map(file => ({
      id:file.id,
      name:file.name,
      modifiedTime:file.modifiedTime || null,
      webViewLink:file.webViewLink || null,
    })),
    selectedSpreadsheetId:connection.metadata?.spreadsheetId || null,
  });
}

async function inspect(req, res) {
  const auth = await requireWorkspaceAuth(req);
  const spreadsheetId = String(req.query?.spreadsheetId || req.body?.spreadsheetId || '').trim();
  if (!spreadsheetId) return res.status(400).json({ ok:false, error:'Spreadsheet ID is required.' });

  const connection = await getConnection(auth.admin, auth.workspaceId, 'google_sheets', { withSecret:true });
  if (!connection) return res.status(409).json({ ok:false, error:'Google Sheets is not connected.' });

  const secret = await ensureGoogleSheetsToken(auth.admin, connection);
  const spreadsheet = await inspectGoogleSpreadsheet(secret, spreadsheetId);
  return res.status(200).json({ ok:true, spreadsheet });
}

async function configure(req, res) {
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
}

async function sync(req, res) {
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
    throw error;
  }
}

export default async function handler(req, res) {
  try {
    const action = actionFrom(req);
    if (action === 'connect' && req.method === 'POST') return await connect(req, res);
    if (action === 'files' && req.method === 'GET') return await files(req, res);
    if (action === 'inspect' && (req.method === 'GET' || req.method === 'POST')) return await inspect(req, res);
    if (action === 'configure' && req.method === 'POST') return await configure(req, res);
    if (action === 'sync' && req.method === 'POST') return await sync(req, res);

    return res.status(400).json({ ok:false, error:'Unknown or invalid Google Sheets action.' });
  } catch (error) {
    return apiError(res, error);
  }
}

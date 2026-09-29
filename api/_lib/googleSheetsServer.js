import {
  fetchJsonWithRetry,
  requireEnv,
  updateConnection,
} from './integrationServer.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export const GOOGLE_SHEETS_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
]);

export function googleSheetsAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: GOOGLE_SHEETS_SCOPES.join(' '),
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code) {
  return fetchJsonWithRetry(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      code,
      grant_type: 'authorization_code',
      redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    }),
  });
}

async function refreshGoogleToken(secret) {
  if (!secret?.refresh_token) throw new Error('Google Sheets refresh token is missing. Reconnect Google Sheets.');
  const token = await fetchJsonWithRetry(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: secret.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  return {
    ...secret,
    ...token,
    refresh_token: token.refresh_token || secret.refresh_token,
    expires_at: Date.now() + Number(token.expires_in || 3600) * 1000,
  };
}

export async function ensureGoogleSheetsToken(admin, connection) {
  let secret = connection?.secret;
  if (!secret?.access_token || !secret?.refresh_token) throw new Error('Google Sheets connection is incomplete.');

  if (!secret.expires_at || Number(secret.expires_at) - Date.now() < 5 * 60 * 1000) {
    secret = await refreshGoogleToken(secret);
    await updateConnection(admin, connection.workspace_id, 'google_sheets', {
      secret,
      status: 'connected',
      metadata: connection.metadata || {},
      lastError: null,
    });
  }

  return secret;
}

async function googleGet(secret, url) {
  return fetchJsonWithRetry(url, {
    headers: {
      Authorization: `Bearer ${secret.access_token}`,
      Accept: 'application/json',
    },
  });
}

export async function listGoogleSpreadsheets(secret, { pageSize = 100 } = {}) {
  const files = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      orderBy: 'modifiedTime desc',
      pageSize: String(Math.min(1000, Math.max(1, pageSize))),
      fields: 'nextPageToken,files(id,name,modifiedTime,webViewLink,owners(displayName,emailAddress))',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const json = await googleGet(secret, `${GOOGLE_DRIVE_FILES_URL}?${params.toString()}`);
    files.push(...(json?.files || []));
    pageToken = json?.nextPageToken || '';
    if (files.length >= 5000) break;
  } while (pageToken);
  return files;
}

function quoteSheetName(name) {
  return `'${String(name || '').replace(/'/g, "''")}'`;
}

export async function inspectGoogleSpreadsheet(secret, spreadsheetId) {
  const id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('Spreadsheet ID is required.');

  const fields = encodeURIComponent('spreadsheetId,properties(title),sheets(properties(sheetId,title,index,gridProperties(rowCount,columnCount)))');
  const meta = await googleGet(secret, `${GOOGLE_SHEETS_BASE}/${encodeURIComponent(id)}?fields=${fields}`);
  const sheets = [];

  for (const sheet of meta?.sheets || []) {
    const title = sheet?.properties?.title || '';
    const range = encodeURIComponent(`${quoteSheetName(title)}!1:10`);
    const preview = await googleGet(secret, `${GOOGLE_SHEETS_BASE}/${encodeURIComponent(id)}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`);
    const sampleRows = Array.isArray(preview?.values)
      ? preview.values.map(row => Array.isArray(row) ? row.map(value => String(value ?? '').trim()) : [])
      : [];
    sheets.push({
      sheetId: sheet?.properties?.sheetId,
      title,
      index: sheet?.properties?.index,
      rowCount: sheet?.properties?.gridProperties?.rowCount || 0,
      columnCount: sheet?.properties?.gridProperties?.columnCount || 0,
      headers: sampleRows[0] || [],
      sampleRows,
    });
  }

  return {
    spreadsheetId: meta?.spreadsheetId || id,
    title: meta?.properties?.title || id,
    sheets,
  };
}

function valueAt(row, index) {
  return index >= 0 && index < row.length ? row[index] : '';
}

export async function readMappedGoogleSheetsPayload(secret, config = {}) {
  const spreadsheetId = String(config.spreadsheetId || '').trim();
  if (!spreadsheetId) throw new Error('Google Sheets mapping has no spreadsheet selected.');

  const mappings = Array.isArray(config.mappings) ? config.mappings : [];
  if (!mappings.length) throw new Error('Google Sheets mapping has no configured datasets.');

  const payload = {};

  for (const mapping of mappings) {
    const dataset = String(mapping?.dataset || '').trim();
    const sheetName = String(mapping?.sheetName || '').trim();
    const columnMap = mapping?.columnMap && typeof mapping.columnMap === 'object' ? mapping.columnMap : {};
    const headerRow = Math.max(1, Number(mapping?.headerRow || 1));
    if (!dataset || !sheetName || !Object.keys(columnMap).length) continue;

    const range = encodeURIComponent(quoteSheetName(sheetName));
    const values = await googleGet(
      secret,
      `${GOOGLE_SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
    );
    const rows = Array.isArray(values?.values) ? values.values : [];
    const headers = Array.isArray(rows[headerRow - 1]) ? rows[headerRow - 1].map(value => String(value ?? '').trim()) : [];
    const indexByHeader = new Map(headers.map((header, index) => [header, index]));
    const dataRows = rows.slice(headerRow);

    if (dataset === 'companyMetrics') {
      const metricRow = dataRows.find(row => Array.isArray(row) && row.some(value => value !== '' && value != null)) || [];
      payload.companyMetrics = Object.fromEntries(
        Object.entries(columnMap)
          .map(([canonicalField, sourceHeader]) => [canonicalField, valueAt(metricRow, indexByHeader.get(String(sourceHeader)) ?? -1)])
          .filter(([, value]) => value !== '' && value != null)
      );
      continue;
    }

    payload[dataset] = dataRows
      .filter(row => Array.isArray(row) && row.some(value => value !== '' && value != null))
      .map(row => Object.fromEntries(
        Object.entries(columnMap).map(([canonicalField, sourceHeader]) => [
          canonicalField,
          valueAt(row, indexByHeader.get(String(sourceHeader)) ?? -1),
        ])
      ));
  }

  return payload;
}

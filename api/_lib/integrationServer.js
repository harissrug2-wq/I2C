import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const QUICKBOOKS_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QUICKBOOKS_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
export function quickBooksApiBaseUrl() {
  const environment = String(
    process.env.QUICKBOOKS_ENVIRONMENT || 'production'
  ).toLowerCase();

  if (environment === 'sandbox' || environment === 'development') {
    return 'https://sandbox-quickbooks.api.intuit.com/v3/company';
  }

  return 'https://quickbooks.api.intuit.com/v3/company';
}
const BRIGHTPEARL_TOKEN_BASE = 'https://oauth.brightpearlapp.com/token';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function requireEnv(name, fallback = null) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function appBaseUrl() {
  return String(requireEnv('APP_BASE_URL', process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null))
    .replace(/\/+$/, '');
}

export function supabaseAdmin() {
  const url = requireEnv('SUPABASE_URL', process.env.VITE_SUPABASE_URL);
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function bearerToken(req) {
  const header = String(req.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function requireWorkspaceAuth(req) {
  const token = bearerToken(req);
  if (!token) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  const admin = supabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    const error = new Error('Invalid or expired session.');
    error.statusCode = 401;
    throw error;
  }

  const ownerId = userData.user.id;
  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .select('id, owner_id')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (workspaceError || !workspace?.id) {
    const error = new Error(workspaceError?.message || 'Workspace not found.');
    error.statusCode = 404;
    throw error;
  }

  return { admin, user: userData.user, ownerId, workspaceId: workspace.id };
}

function stateSecret() {
  return requireEnv('INTEGRATION_STATE_SECRET');
}

export function signState(payload) {
  const body = {
    ...payload,
    exp: payload.exp || Date.now() + 10 * 60 * 1000,
    nonce: payload.nonce || crypto.randomBytes(16).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto.createHmac('sha256', stateSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyState(token, expectedProvider = null) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) throw new Error('Invalid OAuth state.');
  const expected = crypto.createHmac('sha256', stateSecret()).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('OAuth state verification failed.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload?.exp || Date.now() > Number(payload.exp)) throw new Error('OAuth state expired.');
  if (expectedProvider && payload.provider !== expectedProvider) throw new Error('OAuth provider mismatch.');
  return payload;
}

function encryptionKey() {
  const secret = requireEnv('INTEGRATION_ENCRYPTION_KEY');
  if (String(secret).length < 24) throw new Error('INTEGRATION_ENCRYPTION_KEY must be at least 24 characters.');
  return crypto.createHash('sha256').update(String(secret)).digest();
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(blob) {
  const [version, ivText, tagText, bodyText] = String(blob || '').split('.');
  if (version !== 'v1' || !ivText || !tagText || !bodyText) throw new Error('Stored integration secret is invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const decoded = Buffer.concat([decipher.update(Buffer.from(bodyText, 'base64url')), decipher.final()]);
  return JSON.parse(decoded.toString('utf8'));
}

export async function upsertConnection(admin, {
  workspaceId,
  ownerId,
  provider,
  status = 'connected',
  secret,
  metadata = {},
  lastSyncAt = null,
  lastError = null,
}) {
  const row = {
    workspace_id: workspaceId,
    owner_id: ownerId,
    provider,
    status,
    secret_blob: secret ? encryptSecret(secret) : '',
    metadata,
    last_sync_at: lastSyncAt,
    last_error: lastError,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await admin
    .from('integration_connections')
    .upsert(row, { onConflict: 'workspace_id,provider' })
    .select('workspace_id,owner_id,provider,status,metadata,last_sync_at,last_error,updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updateConnection(admin, workspaceId, provider, patch = {}) {
  const next = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.metadata !== undefined) next.metadata = patch.metadata;
  if (patch.lastSyncAt !== undefined || patch.last_sync_at !== undefined) {
    next.last_sync_at = patch.lastSyncAt ?? patch.last_sync_at;
  }
  if (patch.lastError !== undefined || patch.last_error !== undefined) {
    next.last_error = patch.lastError ?? patch.last_error;
  }
  if (patch.secret) next.secret_blob = encryptSecret(patch.secret);
  const { data, error } = await admin
    .from('integration_connections')
    .update(next)
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .select('workspace_id,owner_id,provider,status,metadata,last_sync_at,last_error,updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function getConnection(admin, workspaceId, provider, { withSecret = false } = {}) {
  const columns = withSecret
    ? 'workspace_id,owner_id,provider,status,metadata,last_sync_at,last_error,updated_at,secret_blob'
    : 'workspace_id,owner_id,provider,status,metadata,last_sync_at,last_error,updated_at';
  const { data, error } = await admin
    .from('integration_connections')
    .select(columns)
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (withSecret) return { ...data, secret: decryptSecret(data.secret_blob) };
  return data;
}

export async function listConnections(admin, workspaceId) {
  const { data, error } = await admin
    .from('integration_connections')
    .select('provider,status,metadata,last_sync_at,last_error,updated_at')
    .eq('workspace_id', workspaceId)
    .order('provider');
  if (error) throw error;
  return data || [];
}

export async function deleteConnection(admin, workspaceId, provider) {
  const { error } = await admin
    .from('integration_connections')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('provider', provider);
  if (error) throw error;
}

export async function fetchJsonWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }

      if (response.ok) return body;

      const retryable = response.status === 429 || response.status >= 500;
      const message = typeof body === 'string'
        ? body
        : body?.Fault?.Error?.[0]?.Message
          || body?.error_description
          || body?.message
          || `HTTP ${response.status}`;
      const error = new Error(message);
      error.statusCode = response.status;
      error.responseBody = body;
      if (!retryable || attempt === attempts) throw error;

      const retryAfter = Number(response.headers.get('retry-after') || 0);
      await sleep(Math.min(10000, retryAfter > 0 ? retryAfter * 1000 : 500 * (2 ** (attempt - 1))));
    } catch (error) {
      lastError = error;
      if (attempt === attempts || (error.statusCode && error.statusCode < 500 && error.statusCode !== 429)) throw error;
      await sleep(500 * (2 ** (attempt - 1)));
    }
  }
  throw lastError || new Error('Provider request failed.');
}

export function quickBooksAuthorizationUrl(state) {
  const clientId = requireEnv('QUICKBOOKS_CLIENT_ID');
  const redirectUri = requireEnv('QUICKBOOKS_REDIRECT_URI');
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: redirectUri,
    state,
  });
  return `${QUICKBOOKS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeQuickBooksCode(code) {
  const clientId = requireEnv('QUICKBOOKS_CLIENT_ID');
  const clientSecret = requireEnv('QUICKBOOKS_CLIENT_SECRET');
  const redirectUri = requireEnv('QUICKBOOKS_REDIRECT_URI');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return fetchJsonWithRetry(QUICKBOOKS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
}

async function refreshQuickBooksToken(secret) {
  const clientId = requireEnv('QUICKBOOKS_CLIENT_ID');
  const clientSecret = requireEnv('QUICKBOOKS_CLIENT_SECRET');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const token = await fetchJsonWithRetry(QUICKBOOKS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: secret.refresh_token,
    }),
  });
  return {
    ...secret,
    ...token,
    expires_at: Date.now() + Number(token.expires_in || 3600) * 1000,
    refresh_expires_at: token.x_refresh_token_expires_in
      ? Date.now() + Number(token.x_refresh_token_expires_in) * 1000
      : secret.refresh_expires_at,
  };
}

export async function ensureQuickBooksToken(admin, connection) {
  let secret = connection.secret;
  if (!secret?.access_token || !secret?.refresh_token || !secret?.realm_id) throw new Error('QuickBooks connection is incomplete.');
  if (!secret.expires_at || Number(secret.expires_at) - Date.now() < 5 * 60 * 1000) {
    secret = await refreshQuickBooksToken(secret);
    await updateConnection(admin, connection.workspace_id, 'quickbooks', {
      secret,
      status: 'connected',
      metadata: { ...(connection.metadata || {}), realmId: secret.realm_id },
      lastError: null,
    });
  }
  return secret;
}

export async function quickBooksQueryAll(secret, baseQuery, entityName, pageSize = 1000) {
  const rows = [];
  let startPosition = 1;
  while (true) {
    const query = `${baseQuery} STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`;
    const url = `${quickBooksApiBaseUrl()}/${encodeURIComponent(secret.realm_id)}/query?query=${encodeURIComponent(query)}`;
    const json = await fetchJsonWithRetry(url, {
      headers: {
        Authorization: `Bearer ${secret.access_token}`,
        Accept: 'application/json',
      },
    });
    const page = json?.QueryResponse?.[entityName] || [];
    rows.push(...page);
    if (page.length < pageSize) break;
    startPosition += page.length;
    if (rows.length > 100000) throw new Error(`QuickBooks ${entityName} pagination safety limit reached.`);
  }
  return rows;
}

export async function brightpearlAccountLocation(accountCode) {
  const developerRef = requireEnv('BRIGHTPEARL_DEVELOPER_REF', process.env.BRIGHTPEARL_CLIENT_ID);
  const url = `https://euw1.brightpearlconnect.com/developer-tools/${encodeURIComponent(developerRef)}/account-location/${encodeURIComponent(accountCode)}`;
  const json = await fetchJsonWithRetry(url, { headers: { Accept: 'application/json' } });
  const response = json?.response;
  if (!response?.urls?.authorizeServer) throw new Error('Brightpearl account could not be resolved.');
  return response;
}

export function brightpearlAuthorizationUrl({ authorizeServer, state }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: requireEnv('BRIGHTPEARL_CLIENT_ID'),
    redirect_uri: requireEnv('BRIGHTPEARL_REDIRECT_URI'),
    state,
  });
  const scope = process.env.BRIGHTPEARL_SCOPE;
  if (scope) params.set('scope', scope);
  return `${String(authorizeServer).replace(/\/+$/, '')}?${params.toString()}`;
}

export async function exchangeBrightpearlCode(accountCode, code) {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: requireEnv('BRIGHTPEARL_CLIENT_ID'),
    redirect_uri: requireEnv('BRIGHTPEARL_REDIRECT_URI'),
  });
  if (process.env.BRIGHTPEARL_CLIENT_SECRET) form.set('client_secret', process.env.BRIGHTPEARL_CLIENT_SECRET);
  return fetchJsonWithRetry(`${BRIGHTPEARL_TOKEN_BASE}/${encodeURIComponent(accountCode)}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
}

async function refreshBrightpearlToken(secret) {
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: secret.refresh_token,
    client_id: requireEnv('BRIGHTPEARL_CLIENT_ID'),
  });
  if (process.env.BRIGHTPEARL_CLIENT_SECRET) form.set('client_secret', process.env.BRIGHTPEARL_CLIENT_SECRET);
  const token = await fetchJsonWithRetry(`${BRIGHTPEARL_TOKEN_BASE}/${encodeURIComponent(secret.account_code)}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  return {
    ...secret,
    ...token,
    expires_at: Date.now() + Number(token.expires_in || 604800) * 1000,
    api_domain: token.api_domain || secret.api_domain,
  };
}

export async function ensureBrightpearlToken(admin, connection) {
  let secret = connection.secret;
  if (!secret?.access_token || !secret?.refresh_token || !secret?.account_code || !secret?.api_domain) {
    throw new Error('Brightpearl connection is incomplete.');
  }
  if (!secret.expires_at || Number(secret.expires_at) - Date.now() < 10 * 60 * 1000) {
    secret = await refreshBrightpearlToken(secret);
    await updateConnection(admin, connection.workspace_id, 'brightpearl', {
      secret,
      status: 'connected',
      metadata: {
        ...(connection.metadata || {}),
        accountCode: secret.account_code,
        apiDomain: secret.api_domain,
      },
      lastError: null,
    });
  }
  return secret;
}

export async function brightpearlRequest(secret, path, options = {}) {
  const base = `https://${secret.api_domain}/public-api/${encodeURIComponent(secret.account_code)}`;
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`;
  return fetchJsonWithRetry(`${base}${normalizedPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret.access_token}`,
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
}

export function parseBrightpearlSearch(json) {
  const response = json?.response || {};
  const results = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : [];
  const columnsRaw = response?.metaData?.columns || response?.metadata?.columns || response?.columns || [];
  const columns = columnsRaw.map(column => typeof column === 'string' ? column : column?.name || column?.field || column?.code).filter(Boolean);

  const rows = results.map(row => {
    if (!Array.isArray(row)) return row;
    return Object.fromEntries(row.map((value, index) => [columns[index] || `column_${index}`, value]));
  });

  const meta = response?.metaData || response?.metadata || {};
  return { rows, meta };
}

export async function brightpearlSearchAll(secret, path, pageSize = 200) {
  const rows = [];
  let firstResult = 1;
  while (true) {
    const separator = path.includes('?') ? '&' : '?';
    const json = await brightpearlRequest(secret, `${path}${separator}pageSize=${pageSize}&firstResult=${firstResult}`);
    const parsed = parseBrightpearlSearch(json);
    rows.push(...parsed.rows);

    const returned = Number(parsed.meta.resultsReturned ?? parsed.rows.length);
    const available = Number(parsed.meta.resultsAvailable ?? parsed.meta.totalResults ?? 0);
    const last = Number(parsed.meta.lastResult ?? (firstResult + Math.max(0, returned - 1)));
    const more = parsed.meta.morePagesAvailable === true
      || (available > 0 && last < available)
      || (available === 0 && returned === pageSize);

    if (!more || returned === 0) break;
    firstResult = last + 1;
    if (rows.length > 100000) throw new Error('Brightpearl pagination safety limit reached.');
  }
  return rows;
}

export function safeConnectionView(row) {
  if (!row) return null;
  return {
    provider: row.provider,
    status: row.status,
    metadata: row.metadata || {},
    lastSyncAt: row.last_sync_at || null,
    lastError: row.last_error || null,
    updatedAt: row.updated_at || null,
  };
}

export function apiError(res, error) {
  const status = Number(error?.statusCode || 500);
  res.status(status).json({ ok: false, error: error?.message || 'Unexpected integration error.' });
}

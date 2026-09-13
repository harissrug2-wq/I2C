import { supabase } from '../lib/supabase';

async function sessionToken() {
  if (!supabase) throw new Error('Supabase authentication is not configured.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please sign in again before managing integrations.');
  return token;
}

async function authorizedFetch(path, options = {}) {
  const token = await sessionToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || `Integration request failed (${response.status}).`);
  }
  return body;
}

export async function fetchLiveIntegrationStatus() {
  return authorizedFetch('/api/integrations/status');
}

export async function beginQuickBooksConnection() {
  return authorizedFetch('/api/integrations/quickbooks/connect', {
    method:'POST',
    body:JSON.stringify({}),
  });
}

export async function beginBrightpearlConnection(accountCode) {
  return authorizedFetch('/api/integrations/brightpearl/connect', {
    method:'POST',
    body:JSON.stringify({ accountCode }),
  });
}

export async function syncLiveIntegration(provider) {
  if (!['quickbooks','brightpearl'].includes(provider)) throw new Error('Unknown live provider.');
  return authorizedFetch(`/api/integrations/${provider}/sync`, {
    method:'POST',
    body:JSON.stringify({}),
  });
}

export async function disconnectLiveIntegration(provider) {
  return authorizedFetch('/api/integrations/disconnect', {
    method:'POST',
    body:JSON.stringify({ provider }),
  });
}

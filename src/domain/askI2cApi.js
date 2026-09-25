import { supabase } from '../lib/supabase';

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Sign in to use Ask i2C.');
  return token;
}

async function request(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Ask i2C could not load. Please try again.');
  return payload;
}

export function getAskI2cFaqs(path) {
  return request(`/api/ask-i2c?action=faqs&path=${encodeURIComponent(path || '/')}`);
}

export function getAskI2cHistory({ offset = 0, conversationId = null } = {}) {
  const params = new URLSearchParams({ action: 'history', offset: String(offset) });
  if (conversationId) params.set('conversationId', conversationId);
  return request(`/api/ask-i2c?${params.toString()}`);
}

export function sendAskI2cMessage(body) {
  return request('/api/ask-i2c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

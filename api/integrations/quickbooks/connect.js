import { apiError, quickBooksAuthorizationUrl, requireWorkspaceAuth, signState } from '../../_lib/integrationServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  try {
    const { ownerId, workspaceId } = await requireWorkspaceAuth(req);
    const state = signState({
      provider:'quickbooks',
      ownerId,
      workspaceId,
      returnTo:'/connections',
    });
    return res.status(200).json({ ok:true, url:quickBooksAuthorizationUrl(state) });
  } catch (error) {
    return apiError(res, error);
  }
}

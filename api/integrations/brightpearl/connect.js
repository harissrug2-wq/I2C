import {
  apiError,
  brightpearlAccountLocation,
  brightpearlAuthorizationUrl,
  requireWorkspaceAuth,
  signState,
} from '../../_lib/integrationServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  try {
    const { ownerId, workspaceId } = await requireWorkspaceAuth(req);
    const accountCode = String(req.body?.accountCode || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,80}$/i.test(accountCode)) {
      return res.status(400).json({ ok:false, error:'Enter a valid Brightpearl account code.' });
    }
    const location = await brightpearlAccountLocation(accountCode);
    const state = signState({
      provider:'brightpearl',
      ownerId,
      workspaceId,
      accountCode,
      returnTo:'/connections',
    });
    return res.status(200).json({
      ok:true,
      url:brightpearlAuthorizationUrl({ authorizeServer:location.urls.authorizeServer, state }),
      accountCode,
      datacentreCode:location.datacentreCode || null,
    });
  } catch (error) {
    return apiError(res, error);
  }
}

import { apiError, deleteConnection, requireWorkspaceAuth } from '../_lib/integrationServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  try {
    const { admin, workspaceId } = await requireWorkspaceAuth(req);
    const provider = String(req.body?.provider || '').trim().toLowerCase();
    if (!['quickbooks','brightpearl'].includes(provider)) return res.status(400).json({ ok:false, error:'Unknown provider.' });
    await deleteConnection(admin, workspaceId, provider);
    return res.status(200).json({ ok:true, provider });
  } catch (error) {
    return apiError(res, error);
  }
}

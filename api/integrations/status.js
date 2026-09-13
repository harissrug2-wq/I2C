import { apiError, listConnections, requireWorkspaceAuth, safeConnectionView } from '../_lib/integrationServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  try {
    const { admin, workspaceId } = await requireWorkspaceAuth(req);
    const rows = await listConnections(admin, workspaceId);
    return res.status(200).json({ ok:true, connections: rows.map(safeConnectionView) });
  } catch (error) {
    return apiError(res, error);
  }
}

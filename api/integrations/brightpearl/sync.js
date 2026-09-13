import {
  apiError,
  brightpearlRequest,
  brightpearlSearchAll,
  ensureBrightpearlToken,
  getConnection,
  requireWorkspaceAuth,
  updateConnection,
} from '../../_lib/integrationServer.js';

const chunks = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

function supplierContact(row) {
  const rel = row?.relationshipToAccount || {};
  if (rel.isSupplier !== true && row?.isSupplier !== true) return null;
  const id = row.contactId ?? row.id;
  if (id == null) return null;
  const name = row?.organisation?.name
    || row?.name
    || [row?.firstName, row?.lastName].filter(Boolean).join(' ')
    || String(id);
  const email = row?.communication?.emails?.PRI?.email
    || row?.emails?.PRI?.email
    || row?.primaryEmail
    || '';
  const phone = row?.communication?.telephones?.PRI
    || row?.telephones?.PRI
    || '';
  return {
    id:String(id),
    supplierId:String(id),
    name,
    email,
    phone,
    terms:row?.financialDetails?.creditTermDays ? `Net ${row.financialDetails.creditTermDays}` : '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  let auth;
  try {
    auth = await requireWorkspaceAuth(req);
    const connection = await getConnection(auth.admin, auth.workspaceId, 'brightpearl', { withSecret:true });
    if (!connection) return res.status(409).json({ ok:false, error:'Brightpearl is not connected.' });
    const secret = await ensureBrightpearlToken(auth.admin, connection);

    const productRows = await brightpearlSearchAll(secret, '/product-service/product-search', 200);
    const productIds = productRows
      .map(row => row?.productId ?? row?.id)
      .filter(value => value != null)
      .map(String);

    const availabilityById = new Map();
    for (const idChunk of chunks(productIds, 200)) {
      const json = await brightpearlRequest(secret, `/warehouse-service/product-availability/${idChunk.join(',')}`);
      for (const [productId, availability] of Object.entries(json?.response || {})) {
        availabilityById.set(String(productId), availability);
      }
    }

    const products = productRows.map(row => {
      const id = String(row?.productId ?? row?.id ?? '');
      const availability = availabilityById.get(id);
      return {
        ...row,
        productId:id,
        id,
        sku:row?.SKU || row?.sku || row?.productSku || id,
        name:row?.productName || row?.name || row?.SKU || id,
        supplierId:row?.primarySupplierId ?? row?.supplierId ?? '',
        onHand:Number(availability?.total?.onHand || 0),
      };
    });

    const contacts = [];
    let firstResult = 1;
    const pageSize = 200;
    while (true) {
      const json = await brightpearlRequest(secret, `/contact-service/contact?pageSize=${pageSize}&firstResult=${firstResult}`);
      const page = Array.isArray(json?.response) ? json.response : [];
      contacts.push(...page);
      const pagination = json?.pagination || {};
      if (!pagination.morePagesAvailable || !page.length) break;
      firstResult = Number(pagination.lastResult || (firstResult + page.length - 1)) + 1;
      if (contacts.length > 100000) throw new Error('Brightpearl contact pagination safety limit reached.');
    }
    const suppliers = contacts.map(supplierContact).filter(Boolean);

    const payload = { products, inventory:products, suppliers };
    const syncedAt = new Date().toISOString();
    await updateConnection(auth.admin, auth.workspaceId, 'brightpearl', {
      status:'connected',
      last_sync_at:syncedAt,
      last_error:null,
      metadata:{
        ...(connection.metadata || {}),
        accountCode:secret.account_code,
        apiDomain:secret.api_domain,
        counts:{ products:products.length, suppliers:suppliers.length },
        costBasisNote:'Brightpearl live sync updates stock/on-hand. Existing i2C/manual WAC is preserved unless an explicit weighted average cost is supplied.',
      },
    });

    return res.status(200).json({ ok:true, provider:'brightpearl', syncedAt, payload });
  } catch (error) {
    if (auth?.admin && auth?.workspaceId) {
      try {
        await updateConnection(auth.admin, auth.workspaceId, 'brightpearl', {
          status:'error',
          last_error:error?.message || 'Brightpearl sync failed.',
        });
      } catch {}
    }
    return apiError(res, error);
  }
}

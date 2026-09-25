import { requireWorkspaceAuth, apiError } from './_lib/integrationServer.js';
import { readI2cChat, sendI2cChat, compactI2cData } from './_lib/askI2cChat.js';

function pick(row, keys) {
  return Object.fromEntries(keys.filter(key => row?.[key] !== undefined).map(key => [key, row[key]]));
}

function summarizeWorkspace(data = {}) {
  const customers = (data.customers || []).slice(0, 120).map(row => pick(row, ['customer_id','id','name','company','payment_terms','credit_limit','risk_rating']));
  const invoices = (data.invoices || []).slice(0, 200).map(row => pick(row, ['invoice_id','id','invoice_no','invoiceNo','customer_id','customerId','customer_name','customerName','issue_date','due_date','status','total','amount','balance','amount_due']));
  const bills = (data.bills || []).slice(0, 160).map(row => pick(row, ['bill_id','id','bill_no','billNo','supplier_id','vendor_id','vendorId','supplier_name','vendorName','issue_date','due_date','status','total','amount','balance','amount_due','discount_percent','discount_due_date']));
  const products = (data.products || []).slice(0, 180).map(row => pick(row, ['sku','product_id','id','name','description','on_hand','onHand','unit_cost','wac','price','selling_price','lead_time_days','leadTimeDays','annual_demand','avg_daily_demand','last_sale_date','status']));
  const suppliers = (data.suppliers || []).slice(0, 120).map(row => pick(row, ['supplier_id','vendor_id','id','name','company','payment_terms','relationship_rating','single_source']));
  const bankAccounts = (data.bankAccounts || []).slice(0, 30).map(row => pick(row, ['account_id','id','name','type','institution','balance']));
  const paymentsReceived = (data.paymentsReceived || []).slice(0, 120).map(row => pick(row, ['payment_id','id','customer_id','invoice_id','date','amount']));
  const paymentsMade = (data.paymentsMade || []).slice(0, 120).map(row => pick(row, ['payment_id','id','supplier_id','vendor_id','bill_id','date','amount']));

  return {
    counts: {
      customers: data.customers?.length || 0,
      suppliers: data.suppliers?.length || 0,
      invoices: data.invoices?.length || 0,
      bills: data.bills?.length || 0,
      products: data.products?.length || 0,
      bankAccounts: data.bankAccounts?.length || 0,
      paymentsReceived: data.paymentsReceived?.length || 0,
      paymentsMade: data.paymentsMade?.length || 0,
    },
    companyMetrics: data.companyMetrics || {},
    customers,
    invoices,
    bills,
    products,
    suppliers,
    bankAccounts,
    paymentsReceived,
    paymentsMade,
  };
}

async function buildContext(admin, workspaceId, ownerId, currentPath) {
  const [{ data: state, error: stateError }, { data: connections, error: connectionError }] = await Promise.all([
    admin
      .from('workspace_state')
      .select('data,thresholds,updated_at')
      .eq('workspace_id', workspaceId)
      .eq('owner_id', ownerId)
      .maybeSingle(),
    admin
      .from('integration_connections')
      .select('provider,status,metadata,last_sync_at,last_error,updated_at')
      .eq('workspace_id', workspaceId)
      .eq('owner_id', ownerId)
      .order('provider'),
  ]);

  if (stateError) throw stateError;
  if (connectionError) throw connectionError;

  return {
    product: 'i2cashflow',
    currentPath: currentPath || '/',
    currentTime: new Date().toISOString(),
    workspaceUpdatedAt: state?.updated_at || null,
    integrations: connections || [],
    thresholds: state?.thresholds || {},
    workspaceData: compactI2cData(summarizeWorkspace(state?.data || {}), 30000),
  };
}

export default async function handler(req, res) {
  try {
    const { admin, ownerId, workspaceId } = await requireWorkspaceAuth(req);

    if (req.method === 'GET') {
      const result = await readI2cChat(admin, workspaceId, ownerId, {
        action: req.query?.action,
        path: req.query?.path,
        conversationId: req.query?.conversationId,
        offset: req.query?.offset,
      });
      return res.status(200).json({ ok: true, ...result });
    }

    if (req.method === 'POST') {
      const input = req.body || {};
      const context = await buildContext(admin, workspaceId, ownerId, input.currentPath);
      const result = await sendI2cChat(admin, workspaceId, ownerId, input, { context });
      return res.status(200).json({ ok: true, ...result });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (error) {
    return apiError(res, error);
  }
}

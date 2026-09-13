import {
  apiError,
  ensureQuickBooksToken,
  getConnection,
  quickBooksQueryAll,
  requireWorkspaceAuth,
  updateConnection,
} from '../../_lib/integrationServer.js';

function linkedDocumentNumbers(rows, idMap, txnType) {
  const allocations = [];
  for (const line of Array.isArray(rows) ? rows : []) {
    for (const txn of Array.isArray(line?.LinkedTxn) ? line.LinkedTxn : []) {
      if (String(txn?.TxnType || '').toLowerCase() !== txnType.toLowerCase()) continue;
      const invoiceNo = idMap.get(String(txn?.TxnId || '')) || txn?.DocNumber || txn?.TxnId;
      if (!invoiceNo) continue;
      allocations.push({ invoice_no:String(invoiceNo), amount:Number(line?.Amount || 0) });
    }
  }
  return allocations;
}

function prepareInvoiceLines(invoices, itemById) {
  return invoices.map(invoice => ({
    ...invoice,
    Line:(Array.isArray(invoice.Line) ? invoice.Line : []).map(line => {
      if (!line?.SalesItemLineDetail?.ItemRef?.value) return line;
      const itemId = String(line.SalesItemLineDetail.ItemRef.value);
      const sku = itemById.get(itemId) || itemId;
      return {
        ...line,
        SalesItemLineDetail:{
          ...line.SalesItemLineDetail,
          ItemRef:{ ...line.SalesItemLineDetail.ItemRef, value:sku },
        },
      };
    }),
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed.' });
  let auth;
  try {
    auth = await requireWorkspaceAuth(req);
    const connection = await getConnection(auth.admin, auth.workspaceId, 'quickbooks', { withSecret:true });
    if (!connection) return res.status(409).json({ ok:false, error:'QuickBooks is not connected.' });
    const secret = await ensureQuickBooksToken(auth.admin, connection);

    const [
      customers,
      vendors,
      invoicesRaw,
      bills,
      paymentsRaw,
      billPaymentsRaw,
      accounts,
      items,
    ] = await Promise.all([
      quickBooksQueryAll(secret, 'SELECT * FROM Customer', 'Customer'),
      quickBooksQueryAll(secret, 'SELECT * FROM Vendor', 'Vendor'),
      quickBooksQueryAll(secret, 'SELECT * FROM Invoice', 'Invoice'),
      quickBooksQueryAll(secret, 'SELECT * FROM Bill', 'Bill'),
      quickBooksQueryAll(secret, 'SELECT * FROM Payment', 'Payment'),
      quickBooksQueryAll(secret, 'SELECT * FROM BillPayment', 'BillPayment'),
      quickBooksQueryAll(secret, "SELECT * FROM Account WHERE AccountType = 'Bank'", 'Account'),
      quickBooksQueryAll(secret, 'SELECT * FROM Item', 'Item'),
    ]);

    const itemById = new Map(items.map(item => [String(item.Id), String(item.Sku || item.Name || item.Id)]));
    const invoices = prepareInvoiceLines(invoicesRaw, itemById);
    const invoiceById = new Map(invoices.map(invoice => [String(invoice.Id), String(invoice.DocNumber || invoice.Id)]));
    const billById = new Map(bills.map(bill => [String(bill.Id), String(bill.DocNumber || bill.Id)]));

    const paymentsReceived = paymentsRaw.map(payment => ({
      ...payment,
      applied_to:linkedDocumentNumbers(payment.Line, invoiceById, 'Invoice'),
    }));

    const paymentsMade = [];
    for (const payment of billPaymentsRaw) {
      const linked = linkedDocumentNumbers(payment.Line, billById, 'Bill');
      if (!linked.length) {
        paymentsMade.push({
          ...payment,
          applied_to_bill:'',
          amount_paid:Number(payment.TotalAmt || 0),
        });
        continue;
      }
      linked.forEach((allocation, index) => paymentsMade.push({
        ...payment,
        Id:`${payment.Id}:${index + 1}`,
        payment_no:`${payment.Id}:${index + 1}`,
        applied_to_bill:allocation.invoice_no,
        amount_paid:allocation.amount,
      }));
    }

    const payload = {
      customers,
      vendors,
      invoices,
      bills,
      paymentsReceived,
      paymentsMade,
      accounts,
    };

    const syncedAt = new Date().toISOString();
    await updateConnection(auth.admin, auth.workspaceId, 'quickbooks', {
      status:'connected',
      last_sync_at:syncedAt,
      last_error:null,
      metadata:{
        ...(connection.metadata || {}),
        realmId:secret.realm_id,
        counts:{
          customers:customers.length,
          vendors:vendors.length,
          invoices:invoices.length,
          bills:bills.length,
          paymentsReceived:paymentsReceived.length,
          paymentsMade:paymentsMade.length,
          accounts:accounts.length,
        },
      },
    });

    return res.status(200).json({ ok:true, provider:'quickbooks', syncedAt, payload });
  } catch (error) {
    if (auth?.admin && auth?.workspaceId) {
      try {
        await updateConnection(auth.admin, auth.workspaceId, 'quickbooks', {
          status:'error',
          last_error:error?.message || 'QuickBooks sync failed.',
        });
      } catch {}
    }
    return apiError(res, error);
  }
}

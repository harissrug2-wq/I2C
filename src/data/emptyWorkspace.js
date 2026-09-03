function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyWorkspaceData() {
  return {
    customers: [],
    suppliers: [],
    invoices: [],
    invoiceLines: [],
    bills: [],
    paymentsReceived: [],
    paymentsMade: [],
    products: [],
    bankAccounts: [],
    companyMetrics: {
      as_of_date: todayIso(),
      revenue_last_30_days: 0,
      cogs_last_30_days: 0,
      operating_expenses_last_30_days: 0,
      other_expenses_last_30_days: 0,
      other_current_liabilities: 0,
      forecast_baseline_other_outflows_60d: 0,
      forecast_baseline_other_inflows_60d: 0,
      monthly_payroll: 0,
      wcm_history: [],
    },
  };
}

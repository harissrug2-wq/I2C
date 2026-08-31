# i2cashflow — Module 1: Manual Data Collection Integration (CSV)

## Source hierarchy used

1. `i2C_Engineer_Handoff(2).zip` — canonical data architecture, schemas, reconciliation rules, expected KPIs.
2. `i2C - Calculation Visuals (1).xlsx` — expected outputs and verification checklist.
3. `i2c - Individual Customer (Test Data) (1).xlsx` — worked Northgate PayScore/ECL/cash examples for later Receivables work.
4. `i2C - Test Data (Manual Calculations) (1).xlsx` — accounting workbook/reference only when it agrees with the canonical handoff.

Important conflict: the accounting workbook's AR Ledger/Customers sheet shows $774,790 because it presents invoice amounts and does not consistently net Northgate's $30,000 partial payment. The canonical handoff, Calculation Visuals, seed data, and reconciliation rules all require open AR = **$744,790**. Module 1 therefore uses $744,790 as the development truth.

## Implemented

- Multi-file CSV upload from Manual Data Collection page.
- Dataset detection by canonical filename and schema headers.
- CSV parser supports quoted commas, CRLF/LF, escaped quotes, and BOM-prefixed files.
- Canonical CSV contracts for:
  - customers.csv
  - suppliers.csv
  - invoices.csv
  - invoice_lines.csv
  - bills.csv
  - payments_received.csv
  - payments_made.csv
  - products.csv
  - bank_accounts.csv
  - company_metrics.csv (optional calculation inputs)
- Downloadable empty template for each dataset.
- Download current workspace dataset as CSV.
- Partial imports replace only detected datasets; omitted datasets are retained.
- Full operational bundle is marked complete only when all 9 core datasets are supplied.
- Import is atomic: any blocking validation error keeps the current workspace unchanged.

## Blocking validation implemented

- Required IDs and required fields.
- Numeric and YYYY-MM-DD date validation.
- Duplicate primary/composite keys.
- Every invoice customer exists.
- Every bill/product supplier exists.
- Every invoice-line invoice and SKU exists.
- Every receipt customer and allocated invoice exists.
- Every supplier payment supplier and bill exists.
- Invoice numbers must use `INV-NNNN`.
- Bill numbers must use `BILL-NNNN`.
- Invoice line totals must equal parent invoice totals.
- Invoice total minus applied receipts must equal `balance_due`.
- Paid/partial invoice status must agree with balance.
- Bill total minus payments/discounts must equal `balance_due`.

## Automated gate

`npm run test:module1`

Current result:

- CSV quoted-field parser: PASS
- Full seed CSV bundle round-trip: PASS
- Cash after round-trip: $1,284,900 PASS
- Open AR after round-trip: $744,790 PASS
- Open AP after round-trip: $715,300 PASS
- Invalid foreign-key import rejection: PASS

The broader Node reconciliation/Decision System tests also pass. A clean Vite production build could not be executed in this sandbox because the local dependency install is incomplete; no new npm dependency was added for Module 1.

## Not part of Module 1

- QuickBooks/Brightpearl API connections — Module 7.
- Receivables/PayScore engine — Module 2.
- Payables intelligence — Module 3.
- Cash forecasting — Module 4.
- Inventory intelligence — Module 5.
- Cross-domain intelligence — Module 6.

## Storage limitation

The current demo persists imported data in browser `localStorage`. That is adequate for the manual demo workflow, but not multi-user production persistence. A shared backend/database should be added before production sign-off.

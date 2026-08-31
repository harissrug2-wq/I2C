# i2cashflow — Repaired Manual-Data Demo

This project is the repaired version of the i2cashflow demo. It keeps the existing UI and decision-system concept, replaces the inconsistent legacy seed data, and adds a complete manual-entry workspace so the application works without QuickBooks, Brightpearl, or any other external integration.

## Run locally

```bash
npm install
npm test
npm run dev
```

For a production build:

```bash
npm run build
```

Do not copy `node_modules` between operating systems. Install dependencies from `package-lock.json` on the machine that will run/build the project.

## Manual data entry

After opening the workspace, use **Data → Manual data entry** in the sidebar.

You can enter/edit/delete:

- Customers
- Invoices
- Invoice lines
- Suppliers
- Bills
- Products/SKUs
- Bank accounts
- Payments received
- Payments made
- Revenue, COGS, expenses, current liabilities, forecast baseline inputs, and as-of date

Changes are saved to browser `localStorage` and immediately recalculate all five decision systems. Payments entered against an invoice or bill automatically reduce the effective AR/AP balance. The page also supports workspace JSON import/export and reset to the repaired demo dataset.

## Repaired canonical demo targets

`npm test` blocks reconciliation failures and currently verifies:

| KPI | Repaired value |
|---|---:|
| Cash | $1,284,900 |
| Open AR | $744,790 |
| Open invoices | 17 |
| Open AP | $715,300 |
| Open bills | 12 |
| Inventory | $2,090,000 |
| SKUs | 33 |
| Dead stock | $329,360 |
| Early-pay discounts | $3,653 |
| Current ratio | 5.03 |
| Quick ratio | 2.48 |
| DIO | 98 days |
| DSO | 27 days |
| DPO | 34 days |
| CCC | 91 days |

Expected Credit Loss from the supplied AR aging rules calculates to approximately **$29,713**.

## Repairs made to the engineer handoff

1. Added the two missing invoice-line SKUs: `PVC-TEE-200` and `PVC-COP-200`.
2. Added explicit invoice adjustment lines so `INV-4412`, `INV-4463`, and `INV-4501` line totals reconcile to invoice headers.
3. Added the 14 historical paid bills referenced by `payments_made.json`; they have zero open balance, so open AP remains unchanged.
4. Removed the duplicate `$1,439` discount opportunity from `BILL-8851`, making open discount savings `$3,653`.
5. Expanded inventory to 33 SKUs and exactly `$2,090,000` of value.
6. Standardized dead stock on one rule: `days_quiet >= 180`; repaired dead stock is exactly `$329,360`.
7. Removed legacy phantom customer references from the rendered application.
8. Replaced fake QuickBooks/Brightpearl connection state with manual-data mode; the Connections screen now accurately shows external integrations as not connected.
9. Replaced hardcoded search/AI/dashboard narratives with values derived from the active workspace.

## Data architecture

```text
src/data/seed/*.json
        ↓
src/domain/dataAdapters.js
        ↓
src/utils/decisionSystems.js
        ↓
src/context/DataContext.jsx
        ↓
Dashboard / AR / AP / Inventory / Forecast / Manual Data Entry
```

The expected KPI file from the original handoff is treated as a test target, not a production data source.

## Vercel Windows deployment fix

This package includes a deployment hardening fix for Windows -> Vercel deployments:

- `.vercelignore` explicitly excludes local `node_modules` and `dist`.
- Vite is invoked through Node (`node ./node_modules/vite/bin/vite.js build`) rather than through the platform-specific `.bin/vite` shim.
- Vercel uses `npm ci` and Node 22.x.

Recommended clean deployment from Windows PowerShell / CMD:

```bat
rmdir /s /q node_modules
rmdir /s /q dist
rmdir /s /q .vercel
npm ci
npm run build
vercel --prod --force
```

If `.vercel` does not exist, the `rmdir` warning can be ignored. Running `vercel --prod --force` will relink the project if necessary and forces a fresh deployment.


## Windows clean install if npm reports EPERM

`EPERM ... lightningcss.win32-x64-msvc.node` means Windows has the native module file open. Close any running Vite/Node terminals and editors using the project, then from **Command Prompt as Administrator** run:

```bat
taskkill /F /IM node.exe /T 2>nul
cd /d C:\Users\haris.irfan\Documents\I2C
attrib -R node_modules\* /S /D 2>nul
rmdir /S /Q node_modules
rmdir /S /Q dist 2>nul
npm cache verify
npm ci
npm run build
vercel --prod --force
```

If `rmdir` still says Access Denied, reboot Windows and run the commands before opening VS Code or starting any Node process.

`vercel.json` includes a Vite SPA fallback, so direct URLs such as `/at-risk`, `/customers`, and `/forecast` are rewritten to `index.html` instead of returning Vercel `404: NOT_FOUND`.

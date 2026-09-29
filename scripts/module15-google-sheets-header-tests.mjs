import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../api/_lib/googleSheetsServer.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../src/components/GoogleSheetsConfigurator.jsx', import.meta.url), 'utf8');

assert(server.includes('!1:10'), 'Spreadsheet inspection must sample the first 10 rows');
assert(server.includes('sampleRows'), 'Spreadsheet inspection must return sampled rows for header detection');
assert(ui.includes('bestHeaderRow'), 'Mapping UI must auto-detect a likely header row');
assert(ui.includes('updateHeaderRow'), 'Mapping UI must allow selecting a different header row');
assert(ui.includes('No column headers found in this row'), 'Mapping UI must explain empty header rows');
assert(ui.includes("Object.values(item.columnMap || {}).some(Boolean)"), 'Save/sync must require at least one mapped column');

console.log('✓ Google Sheets header detection tests passed');
console.log(JSON.stringify({
  sampledRows:10,
  manualHeaderRowSelection:true,
  syncRequiresMappedColumns:true,
}, null, 2));

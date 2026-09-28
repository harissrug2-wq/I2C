import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const app = read('src/App.jsx');
const header = read('src/components/Header.jsx');
const ask = read('src/components/AskAiModal.jsx');
const sidebar = read('src/components/Sidebar.jsx');
const css = read('src/index.css');
const alerts = read('src/pages/AlertsPage.jsx');
const manual = read('src/pages/ManualDataPage.jsx');

assert(app.includes("lg:mr-[430px]"), 'Ask i2C push layout must wait until desktop width');
assert(!app.includes("md:mr-[430px]"), 'Tablet workspace must not lose 430px to Ask i2C');
assert(app.includes('overflow-x-hidden'), 'Workspace shell must guard against page-level horizontal overflow');
assert(app.includes('px-3 py-5 sm:px-5'), 'Workspace padding must scale from mobile upward');

assert(header.includes('hidden sm:inline">Ask i2C</span>'), 'Ask i2C label must collapse to an icon on mobile');
assert(header.includes('hidden items-center gap-2'), 'Save status pill must be hidden on narrow mobile headers');

assert(ask.includes('sm:w-[430px]'), 'Ask i2C must use full mobile width and fixed panel width from small screens up');
assert(ask.includes('lg:pointer-events-none'), 'Desktop push panel must not block the workspace outside its panel');
assert(ask.includes('bg-black/30'), 'Mobile/tablet Ask i2C overlay must retain a backdrop');

assert(sidebar.includes('md:hidden'), 'Sidebar mobile backdrop/close behavior must remain available');
assert(css.includes('overflow-x: hidden'), 'Global body horizontal overflow protection must remain enabled');
assert(css.includes('main table'), 'Responsive table safeguards must remain present');
assert(alerts.includes('overflow-x-auto'), 'Alert filters must scroll rather than overflow on narrow screens');
assert(manual.includes('sm:flex-row'), 'Manual data editor heading/actions must stack on mobile');

console.log('✓ Responsive UI source guards passed');
console.log(JSON.stringify({
  askDesktopPushBreakpoint: 'lg',
  mobileHeaderCompaction: true,
  mobileTableSafeguard: true,
  mobileSidebar: true,
}, null, 2));

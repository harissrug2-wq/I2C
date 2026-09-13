import assert from 'node:assert/strict';

process.env.INTEGRATION_STATE_SECRET = 'test-state-secret-that-is-long-enough-123456';
process.env.INTEGRATION_ENCRYPTION_KEY = 'test-encryption-secret-that-is-long-enough-123456';
process.env.QUICKBOOKS_CLIENT_ID = 'qb-client-test';
process.env.QUICKBOOKS_REDIRECT_URI = 'https://example.com/api/integrations/quickbooks/callback';

const {
  decryptSecret,
  encryptSecret,
  parseBrightpearlSearch,
  quickBooksAuthorizationUrl,
  signState,
  verifyState,
} = await import('../api/_lib/integrationServer.js');

const state = signState({ provider:'quickbooks', ownerId:'owner-1', workspaceId:'workspace-1' });
const decoded = verifyState(state, 'quickbooks');
assert.equal(decoded.ownerId, 'owner-1');
assert.equal(decoded.workspaceId, 'workspace-1');
assert.throws(() => verifyState(`${state}x`, 'quickbooks'));

const secret = { access_token:'access', refresh_token:'refresh', realm_id:'12345' };
const encrypted = encryptSecret(secret);
assert.notEqual(encrypted.includes('access_token'), true);
assert.deepEqual(decryptSecret(encrypted), secret);

const qbUrl = new URL(quickBooksAuthorizationUrl(state));
assert.equal(qbUrl.origin, 'https://appcenter.intuit.com');
assert.equal(qbUrl.searchParams.get('client_id'), 'qb-client-test');
assert.equal(qbUrl.searchParams.get('scope'), 'com.intuit.quickbooks.accounting');
assert.equal(qbUrl.searchParams.get('response_type'), 'code');
assert.equal(qbUrl.searchParams.get('state'), state);

const parsed = parseBrightpearlSearch({
  response:{
    metaData:{
      columns:[{name:'productId'},{name:'productName'},{name:'SKU'}],
      resultsReturned:2,
      resultsAvailable:2,
      lastResult:2,
    },
    results:[
      [1001,'Valve','VALVE-1'],
      [1002,'Pipe','PIPE-2'],
    ],
  },
});
assert.deepEqual(parsed.rows[0], { productId:1001, productName:'Valve', SKU:'VALVE-1' });
assert.equal(parsed.meta.resultsReturned, 2);

console.log('✓ Live integration security + OAuth helper tests passed');
console.log(JSON.stringify({
  stateVerified:true,
  encryptedSecrets:true,
  quickBooksOAuthHost:qbUrl.host,
  brightpearlSearchRows:parsed.rows.length,
}, null, 2));

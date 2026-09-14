import assert from 'node:assert/strict';

process.env.INTEGRATION_STATE_SECRET =
  'test-state-secret-that-is-long-enough-123456';

process.env.INTEGRATION_ENCRYPTION_KEY =
  'test-encryption-secret-that-is-long-enough-123456';

process.env.QUICKBOOKS_CLIENT_ID = 'qb-client-test';

process.env.QUICKBOOKS_REDIRECT_URI =
  'https://example.com/api/integrations/quickbooks/callback';

process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';

const {
  decryptSecret,
  encryptSecret,
  parseBrightpearlSearch,
  quickBooksApiBaseUrl,
  quickBooksAuthorizationUrl,
  signState,
  verifyState,
} = await import('../api/_lib/integrationServer.js');

//
// OAuth state signing / verification
//

const state = signState({
  provider: 'quickbooks',
  ownerId: 'owner-1',
  workspaceId: 'workspace-1',
});

const decoded = verifyState(state, 'quickbooks');

assert.equal(decoded.ownerId, 'owner-1');
assert.equal(decoded.workspaceId, 'workspace-1');

assert.throws(() => {
  verifyState(`${state}x`, 'quickbooks');
});

//
// Encrypted provider-secret storage
//

const secret = {
  access_token: 'access',
  refresh_token: 'refresh',
  realm_id: '12345',
};

const encrypted = encryptSecret(secret);

assert.notEqual(
  encrypted.includes('access_token'),
  true,
  'encrypted provider secret must not expose access token text'
);

assert.deepEqual(
  decryptSecret(encrypted),
  secret,
  'encrypted provider secret must decrypt back to original value'
);

//
// QuickBooks OAuth authorization URL
//

const qbUrl = new URL(
  quickBooksAuthorizationUrl(state)
);

assert.equal(
  qbUrl.origin,
  'https://appcenter.intuit.com'
);

assert.equal(
  qbUrl.searchParams.get('client_id'),
  'qb-client-test'
);

assert.equal(
  qbUrl.searchParams.get('scope'),
  'com.intuit.quickbooks.accounting'
);

assert.equal(
  qbUrl.searchParams.get('response_type'),
  'code'
);

assert.equal(
  qbUrl.searchParams.get('state'),
  state
);

assert.equal(
  qbUrl.searchParams.get('redirect_uri'),
  'https://example.com/api/integrations/quickbooks/callback'
);

//
// QuickBooks environment selection
//

assert.equal(
  quickBooksApiBaseUrl(),
  'https://sandbox-quickbooks.api.intuit.com/v3/company',
  'sandbox environment must use the QuickBooks sandbox API host'
);

process.env.QUICKBOOKS_ENVIRONMENT = 'development';

assert.equal(
  quickBooksApiBaseUrl(),
  'https://sandbox-quickbooks.api.intuit.com/v3/company',
  'development environment must also use the QuickBooks sandbox API host'
);

process.env.QUICKBOOKS_ENVIRONMENT = 'production';

assert.equal(
  quickBooksApiBaseUrl(),
  'https://quickbooks.api.intuit.com/v3/company',
  'production environment must use the live QuickBooks API host'
);

process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';

//
// Brightpearl paginated search-response parser
//

const parsed = parseBrightpearlSearch({
  response: {
    metaData: {
      columns: [
        { name: 'productId' },
        { name: 'productName' },
        { name: 'SKU' },
      ],
      resultsReturned: 2,
      resultsAvailable: 2,
      lastResult: 2,
    },
    results: [
      [1001, 'Valve', 'VALVE-1'],
      [1002, 'Pipe', 'PIPE-2'],
    ],
  },
});

assert.deepEqual(
  parsed.rows[0],
  {
    productId: 1001,
    productName: 'Valve',
    SKU: 'VALVE-1',
  }
);

assert.deepEqual(
  parsed.rows[1],
  {
    productId: 1002,
    productName: 'Pipe',
    SKU: 'PIPE-2',
  }
);

assert.equal(
  parsed.rows.length,
  2
);

assert.equal(
  parsed.meta.resultsReturned,
  2
);

assert.equal(
  parsed.meta.resultsAvailable,
  2
);

assert.equal(
  parsed.meta.lastResult,
  2
);

console.log(
  '✓ Live integration security + OAuth helper tests passed'
);

console.log(
  JSON.stringify(
    {
      stateVerified: true,
      encryptedSecrets: true,
      quickBooksOAuthHost: qbUrl.host,
      quickBooksEnvironment:
        process.env.QUICKBOOKS_ENVIRONMENT,
      quickBooksApiBase:
        quickBooksApiBaseUrl(),
      brightpearlSearchRows:
        parsed.rows.length,
    },
    null,
    2
  )
);
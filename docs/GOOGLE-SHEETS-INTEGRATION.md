# Google Sheets live integration

The i2cashflow Google Sheets provider is read-only. It reads spreadsheet data and maps selected tabs and headers into the same canonical workspace datasets used by Manual CSV, QuickBooks and Brightpearl.

## Google Cloud setup

Enable both APIs in the Google Cloud project:

- Google Sheets API
- Google Drive API

Create an OAuth 2.0 Web application client and configure these redirect URIs:

- Local: `http://localhost:3000/api/integrations/google-sheets/callback`
- Production: `https://i2-c-weld.vercel.app/api/integrations/google-sheets/callback`

If local Vite is using another port, add that exact callback URI in Google Cloud and use the same value in the local environment variable.

## Required server environment variables

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://i2-c-weld.vercel.app/api/integrations/google-sheets/callback
```

The existing integration variables are also required:

```
APP_BASE_URL=https://i2-c-weld.vercel.app
INTEGRATION_STATE_SECRET=...
INTEGRATION_ENCRYPTION_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Do not expose Google client secrets, refresh tokens, the integration encryption key, or the Supabase service-role key through `VITE_` variables.

## OAuth scopes

The provider requests:

- `https://www.googleapis.com/auth/spreadsheets.readonly`
- `https://www.googleapis.com/auth/drive.metadata.readonly`

The Sheets scope reads spreadsheet values. The Drive metadata scope is used only to list spreadsheet files and metadata for the spreadsheet selector.

The OAuth flow requests offline access so the encrypted refresh token can be used for later syncs without asking the user to reconnect.

## User flow

1. Sign in to i2cashflow.
2. Open Connections.
3. Connect Google Sheets.
4. Complete Google OAuth consent.
5. Select a spreadsheet.
6. Inspect its tabs.
7. Map each relevant tab to an i2cashflow dataset.
8. Map spreadsheet headers to canonical i2cashflow fields.
9. Choose **Save mapping & sync now**.
10. Later spreadsheet changes can be pulled with **Sync now**.

Google Sheets sync is authoritative only for rows previously owned by the Google Sheets provider. Manual rows and rows owned by other providers are preserved unless an incoming Google Sheets row uses the same canonical key.

## Public production note

`drive.metadata.readonly` is a restricted Google Drive scope. A public production OAuth app using it may require Google's restricted-scope verification. Keep the integration in test/internal mode until the OAuth consent screen, domain verification and any required Google verification are complete.

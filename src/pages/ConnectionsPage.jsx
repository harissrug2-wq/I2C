import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleOff,
  Database,
  Loader2,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  beginBrightpearlConnection,
  beginQuickBooksConnection,
  disconnectLiveIntegration,
  fetchLiveIntegrationStatus,
  syncLiveIntegration,
} from '../domain/integrationApi';

const datasetLabel = value => ({
  customers:'Customers',
  suppliers:'Suppliers',
  invoices:'Invoices',
  invoiceLines:'Invoice lines',
  bills:'Bills',
  paymentsReceived:'Customer payments',
  paymentsMade:'Supplier payments',
  products:'Products / inventory',
  bankAccounts:'Bank accounts',
  companyMetrics:'Calculation inputs',
}[value] || value);

function formatSync(value) {
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function badge(provider, live) {
  if (provider.id === 'manual') return {
    label:'Active',
    className:'bg-green-50 text-green-700 border-green-200',
    icon:CheckCircle2,
  };
  if (live?.status === 'error') return {
    label:'Connection error',
    className:'bg-red-50 text-red-700 border-red-200',
    icon:AlertTriangle,
  };
  if (provider.status === 'synced') return {
    label:'Synced',
    className:'bg-green-50 text-green-700 border-green-200',
    icon:CheckCircle2,
  };
  if (live?.status === 'connected') return {
    label:'Connected',
    className:'bg-blue-50 text-blue-700 border-blue-200',
    icon:CheckCircle2,
  };
  return {
    label:'Not connected',
    className:'bg-surface text-muted-foreground border-border',
    icon:CircleOff,
  };
}

export default function ConnectionsPage() {
  const {
    integrationSummary = [],
    syncIntegrationPayload,
    disconnectIntegration,
  } = useData();

  const [liveConnections, setLiveConnections] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busyProvider, setBusyProvider] = useState('');
  const [message, setMessage] = useState('');
  const [brightpearlAccount, setBrightpearlAccount] = useState('');

  const liveByProvider = useMemo(
    () => new Map(liveConnections.map(row => [row.provider, row])),
    [liveConnections]
  );

  const refreshStatus = async ({ silent = false } = {}) => {
    if (!silent) setLoadingStatus(true);
    try {
      const result = await fetchLiveIntegrationStatus();
      setLiveConnections(result.connections || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      if (!silent) setLoadingStatus(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('integration');
    const status = params.get('status');
    const callbackMessage = params.get('message');
    if (provider && status) {
      setMessage(
        status === 'connected'
          ? `${provider === 'quickbooks' ? 'QuickBooks Online' : 'Brightpearl'} connected. Run Sync now to import live data.`
          : callbackMessage || `${provider} connection failed.`
      );
      window.history.replaceState(null, '', '/connections');
    }
    refreshStatus();
  }, []);

  const connectQuickBooks = async () => {
    setBusyProvider('quickbooks');
    setMessage('');
    try {
      const result = await beginQuickBooksConnection();
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error.message);
      setBusyProvider('');
    }
  };

  const connectBrightpearl = async () => {
    const accountCode = brightpearlAccount.trim();
    if (!accountCode) {
      setMessage('Enter your Brightpearl account code first.');
      return;
    }
    setBusyProvider('brightpearl');
    setMessage('');
    try {
      const result = await beginBrightpearlConnection(accountCode);
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error.message);
      setBusyProvider('');
    }
  };

  const syncProvider = async providerId => {
    setBusyProvider(providerId);
    setMessage('');
    try {
      const result = await syncLiveIntegration(providerId);
      const applied = syncIntegrationPayload(providerId, result.payload, { syncedAt:result.syncedAt });
      const warningText = applied.warnings?.length
        ? ` ${applied.warnings.length} mapping warning(s) were recorded.`
        : '';
      setMessage(`${providerId === 'quickbooks' ? 'QuickBooks Online' : 'Brightpearl'} sync completed.${warningText}`);
      await refreshStatus({ silent:true });
    } catch (error) {
      setMessage(error.message);
      await refreshStatus({ silent:true });
    } finally {
      setBusyProvider('');
    }
  };

  const disconnect = async provider => {
    const remove = window.confirm(
      `Disconnect ${provider.name} and remove records synced from this provider?\n\nManual data and data from other providers will remain.`
    );
    if (!remove) return;

    setBusyProvider(provider.id);
    setMessage('');
    try {
      await disconnectLiveIntegration(provider.id);
      disconnectIntegration(provider.id, { removeSyncedData:true });
      setMessage(`${provider.name} disconnected.`);
      await refreshStatus({ silent:true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyProvider('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[.16em] text-muted-foreground uppercase">DATA</p>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <PlugZap className="size-6 text-[#0d9488]" />
            Connections
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Connect accounting and inventory systems without changing the verified i2cashflow calculation layer.
            Live provider data is normalized into the same workspace schema used by Manual CSV.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0d9488]/20 bg-[#0d9488]/10 px-3 py-1.5 text-xs font-semibold text-[#0d9488]">
          <ShieldCheck className="size-3.5" />
          OAuth tokens stay server-side
        </span>
      </div>

      {message && (
        <div className="rounded-xl border border-[#0d9488]/20 bg-[#0d9488]/10 px-4 py-3 text-xs text-foreground">
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488]">
            <RefreshCw className="size-5" />
          </div>
          <div>
            <h2 className="font-bold">One calculation layer, multiple data sources</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Provider API <ArrowRight className="mx-1 inline size-3" />
              secure server sync <ArrowRight className="mx-1 inline size-3" />
              canonical workspace data <ArrowRight className="mx-1 inline size-3" />
              existing AR, AP, cash, inventory and cross-domain engines.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {integrationSummary.map(provider => {
          const live = liveByProvider.get(provider.id);
          const meta = badge(provider, live);
          const StatusIcon = meta.icon;
          const isManual = provider.id === 'manual';
          const isBusy = busyProvider === provider.id;
          const connected = Boolean(live && ['connected','error'].includes(live.status));
          const providerLastSync = live?.lastSyncAt || provider.lastSyncAt;

          return (
            <article key={provider.id} className="card-surface flex min-h-[390px] flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488]">
                  {isManual ? <Database className="size-5" /> : <PlugZap className="size-5" />}
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${meta.className}`}>
                  <StatusIcon className="size-3" />
                  {meta.label}
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold">{provider.name}</h3>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{provider.category}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{provider.description}</p>

              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Canonical coverage</p>
                <div className="flex flex-wrap gap-1.5">
                  {provider.datasets.map(dataset => (
                    <span key={dataset} className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-muted-foreground">
                      {datasetLabel(dataset)}
                      {dataset !== 'companyMetrics' && provider.datasetCounts?.[dataset] > 0
                        ? ` · ${provider.datasetCounts[dataset]}`
                        : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-5">
                {isManual ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                    Manual entry and flexible CSV stay available as a fallback and reconciliation source.
                  </div>
                ) : connected ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-surface p-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Last sync</span>
                        <span className="text-right font-semibold">{formatSync(providerLastSync)}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-muted-foreground">Workspace records</span>
                        <span className="font-semibold">{provider.totalRecords}</span>
                      </div>
                      {provider.id === 'brightpearl' && live?.metadata?.accountCode && (
                        <div className="mt-2 flex justify-between gap-3">
                          <span className="text-muted-foreground">Account</span>
                          <span className="font-semibold">{live.metadata.accountCode}</span>
                        </div>
                      )}
                      {live?.lastError && <p className="mt-2 text-red-700">{live.lastError}</p>}
                    </div>

                    <button
                      onClick={() => syncProvider(provider.id)}
                      disabled={isBusy}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f766e] disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                      Sync now
                    </button>

                    <button
                      onClick={() => disconnect(provider)}
                      disabled={isBusy}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      <CircleOff className="size-3.5" />
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <div className="flex items-start gap-2">
                        <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                        <p>Authorization happens through a server-side OAuth callback. Provider secrets are never written into workspace JSON.</p>
                      </div>
                    </div>

                    {provider.id === 'brightpearl' && (
                      <input
                        value={brightpearlAccount}
                        onChange={event => setBrightpearlAccount(event.target.value)}
                        placeholder="Brightpearl account code"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-[#0d9488]"
                      />
                    )}

                    <button
                      onClick={provider.id === 'quickbooks' ? connectQuickBooks : connectBrightpearl}
                      disabled={isBusy || loadingStatus}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f766e] disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <ServerCog className="size-3.5" />}
                      Connect {provider.id === 'quickbooks' ? 'QuickBooks' : 'Brightpearl'}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#701a75]/10 text-[#701a75]">
            <ServerCog className="size-5" />
          </div>
          <div>
            <h2 className="font-bold">Secure sync behavior</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Access and refresh tokens are encrypted before storage. The browser receives only connection status and provider data returned by an authenticated sync.
              QuickBooks payments are reconciled to invoice/bill document numbers before entering the existing adapters. Brightpearl updates live stock while preserving an existing i2C/manual cost basis when Brightpearl does not provide an explicit weighted average cost.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

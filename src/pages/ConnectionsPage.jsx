import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleOff,
  Database,
  ExternalLink,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../context/DataContext';

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

function statusMeta(provider) {
  if (provider.id === 'manual') return {
    label:'Active',
    className:'bg-green-50 text-green-700 border-green-200',
    icon:CheckCircle2,
  };
  if (provider.status === 'synced') return {
    label:'Synced',
    className:'bg-green-50 text-green-700 border-green-200',
    icon:CheckCircle2,
  };
  return {
    label:provider.authMode === 'oauth2-server' ? 'OAuth setup next' : 'API setup next',
    className:'bg-amber-50 text-amber-800 border-amber-200',
    icon:ServerCog,
  };
}

function formatSync(value) {
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function ConnectionsPage() {
  const { integrationSummary = [], disconnectIntegration } = useData();

  const disconnect = provider => {
    const shouldRemove = window.confirm(
      `Disconnect ${provider.name} and remove records that were synced from this provider?\n\nManual data and data from other providers will remain.`
    );
    if (!shouldRemove) return;
    disconnectIntegration(provider.id, { removeSyncedData:true });
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
            External systems feed the same canonical i2cashflow workspace used by Manual CSV.
            Calculation rules remain provider-independent.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0d9488]/20 bg-[#0d9488]/10 px-3 py-1.5 text-xs font-semibold text-[#0d9488]">
          <ShieldCheck className="size-3.5" />
          No provider secrets stored in workspace data
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488]">
            <RefreshCw className="size-5" />
          </div>
          <div>
            <h2 className="font-bold">One calculation layer, multiple data sources</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Provider response <ArrowRight className="mx-1 inline size-3" />
              provider adapter <ArrowRight className="mx-1 inline size-3" />
              canonical customers / invoices / bills / products / cash
              <ArrowRight className="mx-1 inline size-3" />
              existing verified i2cashflow engines.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {integrationSummary.map(provider => {
          const meta = statusMeta(provider);
          const StatusIcon = meta.icon;
          const isManual = provider.id === 'manual';
          const isSynced = provider.status === 'synced';

          return (
            <article key={provider.id} className="card-surface flex min-h-[360px] flex-col p-5">
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
                    Manual entry and flexible CSV remain active even after external providers are connected.
                  </div>
                ) : isSynced ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-surface p-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Last sync</span>
                        <span className="text-right font-semibold">{formatSync(provider.lastSyncAt)}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-muted-foreground">Provider records</span>
                        <span className="font-semibold">{provider.totalRecords}</span>
                      </div>
                      {provider.lastSyncWarnings?.length > 0 && (
                        <p className="mt-2 text-amber-700">{provider.lastSyncWarnings.length} mapping warning(s) recorded.</p>
                      )}
                    </div>
                    <button
                      onClick={() => disconnect(provider)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      <CircleOff className="size-3.5" />
                      Disconnect synced source
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <div className="flex items-start gap-2">
                        <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                        <p>
                          Provider mapping is ready. Live authentication must be completed through a server-side
                          {provider.authMode === 'oauth2-server' ? ' OAuth' : ' API'} endpoint so credentials never enter browser workspace storage.
                        </p>
                      </div>
                    </div>
                    <button
                      disabled
                      className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-border"
                    >
                      <ServerCog className="size-3.5" />
                      Backend authentication setup required
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
          <div className="flex-1">
            <h2 className="font-bold">Live-provider step</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The next integration checkpoint adds server-side credential exchange, encrypted token storage,
              scheduled refresh/sync jobs, provider pagination and retry handling. This page will then use the
              same adapter foundation without changing AR, AP, cash, inventory or cross-domain calculations.
            </p>
          </div>
          <ExternalLink className="hidden size-4 text-muted-foreground sm:block" />
        </div>
      </div>
    </div>
  );
}

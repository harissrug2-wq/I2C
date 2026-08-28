import React from 'react';
import { Network, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function CrossDomainAlerts({ onOpenActionModal }) {
  const { sys2, sys4, sys5 } = useData();

  const hostageCust = sys4.collectionQueue.find(c => c.inventoryDeliveredValue > 0) || { name: 'Anchor Distributors', balance: 14200, inventoryDeliveredValue: 6400 };

  const alerts = [
    {
      id: 'anchor',
      tag: 'AR × Inventory',
      domainBadge: 'Cross-domain',
      metricLabel: 'Recoverable stock',
      metricValue: `$${hostageCust.inventoryDeliveredValue.toLocaleString()}`,
      borderClass: 'border-l-4 border-l-[#ef4444] border-t border-r border-b border-border',
      title: `${hostageCust.name}: $${hostageCust.balance.toLocaleString()} balance overdue. Write-off economics justified — but don't write off blind.`,
      description: `Brightpearl shows $${hostageCust.inventoryDeliveredValue.toLocaleString()} of inventory was delivered on the unpaid invoices. A financial write-off would ignore recoverable physical stock.`,
      recommendation: `Two-step: (1) send formal demand for return of unsold inventory within 30 days, (2) write off only the residual ~$${(hostageCust.balance - hostageCust.inventoryDeliveredValue).toLocaleString()} after recovery.`,
      confidence: '72% confidence',
      evidence: [`AR aging · ${hostageCust.name}`, 'Brightpearl delivery lines'],
      primaryAction: 'Pause Order & Request Return',
      secondaryAction: 'View Details'
    },
    {
      id: 'exposure',
      tag: 'AR × Inventory',
      domainBadge: 'Cross-domain',
      metricLabel: 'Exposure',
      metricValue: `$${(sys4.moneyAtRisk / 1000).toFixed(0)}K`,
      borderClass: 'border-l-4 border-l-[#f59e0b] border-t border-r border-b border-border',
      title: "You're financing your riskiest customers' inventory.",
      description: `$${(sys4.moneyAtRisk * 0.9).toFixed(0)} of receivables sits with slow-payers whose lines are the same SKUs on the $90,000 Meridian reorder landing Sep 2. You buy the stock in 30 days and get paid in 61.`,
      recommendation: 'Review terms with Northgate and Sierra Mechanical before the next shipment releases, or split the reorder into two half lots.',
      confidence: '88% confidence',
      evidence: ['AR aging · 4 accounts', 'Brightpearl reorder queue'],
      primaryAction: 'Split Reorder Queue',
      secondaryAction: 'Review Terms'
    },
    {
      id: 'margin',
      tag: 'Margin × Risk',
      domainBadge: 'Cross-domain',
      metricLabel: 'True margin',
      metricValue: `${sys5.trueMarginSkus[1]?.grossMarginPercent || 29.8}% → ${sys5.trueMarginSkus[1]?.trueMarginPercent || 24.6}%`,
      borderClass: 'border-l-4 border-l-[#0d9488] border-t border-r border-b border-border',
      title: 'Your best margins are your riskiest cash.',
      description: `THHN Wire volume ships to elevated-risk accounts paying 47 days on average. Headline margin holds at ${sys5.trueMarginSkus[1]?.grossMarginPercent || 29.8}%; realised margin after carrying cost is ${sys5.trueMarginSkus[1]?.trueMarginPercent || 24.6}%.`,
      recommendation: 'Tighten terms on the four elevated-risk buyers of this line before extending more credit against it.',
      confidence: '91% confidence',
      evidence: ['MarginSense line margin', 'PayScore payment behaviour'],
      primaryAction: 'Tighten Credit Terms',
      secondaryAction: 'View Margin Analysis'
    }
  ];

  return (
    <section className="mt-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl flex items-center gap-2">
            <Network className="size-5 text-[#0d9488]" />
            Cross-domain alerts
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Findings that join receivables, inventory and cash — the things neither QuickBooks nor Brightpearl can see alone.
          </p>
        </div>
        <a 
          href="#insights" 
          onClick={(e) => {
            e.preventDefault();
            onOpenActionModal({
              title: 'All Cross-Domain Insights',
              type: 'all-insights',
              details: 'Showing 6 cross-domain findings across AR, AP, Inventory and Cash forecasting.'
            });
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:text-[#bef264] transition-colors"
        >
          All cross-domain insights <ArrowUpRight className="size-3.5" />
        </a>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {alerts.map((card) => (
          <article 
            key={card.id}
            className={`relative overflow-hidden rounded-xl bg-card p-5 shadow-xs transition-all hover:shadow-md ${card.borderClass}`}
          >
            {/* Header badges */}
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#701a75]/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#701a75] uppercase">
                  <Network className="size-3" />
                  {card.tag}
                </span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase ring-1 ring-border ring-inset">
                  {card.domainBadge}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {card.metricLabel}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {card.metricValue}
                </span>
              </div>
            </header>

            {/* Title & Description */}
            <h3 className="text-base font-semibold text-foreground leading-snug">
              {card.title}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {card.description}
            </p>

            {/* Recommendation Box */}
            <div className="mt-3 rounded-lg bg-surface p-3 text-xs text-foreground ring-1 ring-border ring-inset">
              <span className="font-semibold text-[#0d9488] block mb-1">Recommended action:</span>
              <span>{card.recommendation}</span>
            </div>

            {/* Evidence Footer */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-semibold text-[#16a34a]">{card.confidence}</span>
              {card.evidence.map((ev, idx) => (
                <React.Fragment key={idx}>
                  <span>·</span>
                  <span>{ev}</span>
                </React.Fragment>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
              <button
                onClick={() => onOpenActionModal({
                  title: card.primaryAction,
                  type: card.id,
                  details: card.title
                })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" />
                {card.primaryAction}
              </button>
              <button
                onClick={() => onOpenActionModal({
                  title: card.secondaryAction,
                  type: card.id,
                  details: card.description
                })}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors cursor-pointer"
              >
                {card.secondaryAction}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

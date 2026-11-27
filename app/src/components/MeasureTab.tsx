import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Wallet, Target, Layers, AlertTriangle } from 'lucide-react';
import type { GrowthCenterState } from '../types/growth';
import {
  computeFunnel,
  computeOverviewMetrics,
  formatINR,
  formatLakhs,
} from '../lib/analytics';

interface MeasureTabProps {
  state: GrowthCenterState;
}

export const MeasureTab: React.FC<MeasureTabProps> = ({ state }) => {
  const m = computeOverviewMetrics(state);
  const funnel = computeFunnel(state);

  const funnelChartData = funnel.stages.map((s) => ({
    name: s.stage,
    Actual: s.actualCount,
    Base: s.baseTarget,
    Stretch: s.stretchTarget,
  }));

  const budgetChartData = state.campaigns_bets.map((b) => ({
    id: b.id,
    Allocated: b.budget_inr,
    Spent: b.spent_inr,
    RealizedLakhs: Number((b.realized_incremental_inr / 1000).toFixed(1)),
  }));

  const channelChartData = state.historical_channels.map((h) => ({
    id: h.campaign_id,
    name: h.campaign_name.replace(' ', '\n'),
    ConfirmedCashK: Math.round(h.confirmed_cash_inr / 1000),
    Attempts: h.attempts,
  }));

  const cards = [
    {
      label: 'Pre-Fest Cash Collected',
      value: formatINR(m.confirmedCashCollectedInr),
      sub: `${m.collectionRatePct}% of ${formatINR(m.confirmedCashSignedInr)} signed cash`,
      icon: Wallet,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Live Projected Outcome',
      value: formatINR(m.projectedOutcomeInr),
      sub:
        m.varianceVsStretchInr >= 0
          ? `+${formatINR(m.varianceVsStretchInr)} vs Stretch (${formatLakhs(state.targets.stretch_cash_collected_target_inr)})`
          : `${formatINR(m.varianceVsStretchInr)} vs Stretch (${formatLakhs(state.targets.stretch_cash_collected_target_inr)})`,
      icon: TrendingUp,
      tone:
        m.varianceVsStretchInr >= 0
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      label: 'Cash Inventory Filled',
      value: `${m.inventoryCashUsed} / ${m.inventoryCashCap}`,
      sub: `+ ${m.confirmedInkindDeals} in-kind (${formatINR(m.confirmedInkindInr)})`,
      icon: Layers,
      tone: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      label: 'Budget Spent vs Cap',
      value: `${formatINR(m.totalBudgetSpentInr)} / ${formatINR(state.targets.budget_cap_inr)}`,
      sub: `${formatINR(m.budgetRemainingInr)} unspent remaining`,
      icon: Target,
      tone: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      label: 'Uncollected Signed Risk',
      value: formatINR(m.uncollectedSignedCashInr),
      sub: `${m.droppedQualifiedRemaining} qualified brands unworked`,
      icon: AlertTriangle,
      tone: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {c.label}
                </span>
                <span className={`rounded-lg border p-1.5 ${c.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">{c.value}</div>
              <div className="mt-1 text-xs text-slate-600">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Funnel Chart + Funnel Conversion Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Full Sponsorship Funnel: Actual vs. Base & Stretch
              </h3>
              <p className="text-xs text-slate-500">
                Updates live when opportunities or dropped qualified brands change
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              Base: {formatLakhs(state.targets.base_cash_collected_target_inr)} | Stretch:{' '}
              {formatLakhs(state.targets.stretch_cash_collected_target_inr)}
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelChartData} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Actual" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Base" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Stretch" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Stage-by-Stage Conversion & Stretch Gap
            </h3>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
              Worst Drop: {funnel.worstBottleneckStage}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-medium">Stage</th>
                  <th className="py-2 text-right font-medium">Actual</th>
                  <th className="py-2 text-right font-medium">Base</th>
                  <th className="py-2 text-right font-medium">Stretch</th>
                  <th className="py-2 text-right font-medium">Step Conv %</th>
                  <th className="py-2 text-right font-medium">Stretch %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funnel.stages.map((s) => (
                  <tr key={s.stage} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">{s.stage}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {s.actualCount}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{s.baseTarget}</td>
                    <td className="py-2.5 text-right text-blue-700 font-medium">{s.stretchTarget}</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {s.actualConvFromPrevPct !== null ? `${s.actualConvFromPrevPct}%` : '—'}
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      {s.stretchConvFromPrevPct !== null ? `${s.stretchConvFromPrevPct}%` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/60 font-semibold">
                  <td className="py-2.5 text-emerald-900">Pre-Fest Cash Collected</td>
                  <td className="py-2.5 text-right text-emerald-900">
                    {formatINR(m.confirmedCashCollectedInr)}
                  </td>
                  <td className="py-2.5 text-right text-slate-700">
                    {formatINR(state.targets.base_cash_collected_target_inr)}
                  </td>
                  <td className="py-2.5 text-right text-blue-700">
                    {formatINR(state.targets.stretch_cash_collected_target_inr)}
                  </td>
                  <td className="py-2.5 text-right text-emerald-800">{m.collectionRatePct}%</td>
                  <td className="py-2.5 text-right text-slate-600">90.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Budget vs Spend & Historical Channel Cash */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">
            Growth Bets Budget vs. Spend (I1–I5)
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Total Cap: {formatINR(state.targets.budget_cap_inr)} | Realized Incremental Cash:{' '}
            {formatINR(state.campaigns_bets.reduce((s, b) => s + b.realized_incremental_inr, 0))}
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Allocated" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">
            Historical Channel Yield: Confirmed Cash (₹K) vs Attempts (SC01–SC06)
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            100% of historical cash came from SC02, SC04 & SC05 (48 attempts); 0% from SC01/SC03/SC06 (322 attempts)
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ConfirmedCashK" name="Confirmed Cash (₹K)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Attempts" name="Outreach Attempts" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

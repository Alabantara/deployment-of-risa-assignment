import React from 'react';
import { AlertCircle, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import type { GrowthCenterState } from '../types/growth';
import { FROZEN_INITIAL_STATE } from '../data/seedBundle';
import {
  computeDecisionBadge,
  computeFunnel,
  computeOverviewMetrics,
  computeWhatChanged,
  formatINR,
} from '../lib/analytics';

interface DiagnoseTabProps {
  state: GrowthCenterState;
}

export const DiagnoseTab: React.FC<DiagnoseTabProps> = ({ state }) => {
  const m = computeOverviewMetrics(state);
  const funnel = computeFunnel(state);
  const diff = computeWhatChanged(state, FROZEN_INITIAL_STATE);

  const badgeStyle = (badge: string) =>
    badge === 'SCALE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : badge === 'CHANGE'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-rose-100 text-rose-800 border-rose-200';

  const bottlenecks = [
    {
      title: '1. Worst Stage Bottleneck vs. Stretch',
      metric: `${funnel.worstBottleneckStage} (-${funnel.worstDropGapPct}pp)`,
      detail:
        'Proposal-to-Signed & Pre-Fest Cash Collection lag Stretch benchmarks: 26 open cold/revival opps sit idle while 25% of signed cash sits in post-event PoP risk.',
      severity: 'high',
    },
    {
      title: '2. Dropped Qualified Brands (Zero Opp)',
      metric: `${m.droppedQualifiedRemaining} / 60 qualified brands`,
      detail:
        '12 of these come from SC04 (Partner Interest Form) & SC05 (Creator Referrals) — both 100% historical win-rate channels.',
      severity: m.droppedQualifiedRemaining > 0 ? 'high' : 'ok',
    },
    {
      title: '3. Cold Media & Premature Pipeline Bloat',
      metric: `${m.coldMediaLossesCount} Media losses | ${m.nonQualifiedOppsCount} non-qual opps`,
      detail:
        '6 of 7 total dataset losses were cold Media brands pitched at ₹1.25L cash (0% win rate), while 15 opps were created for dormant/engaged/unqualified brands.',
      severity: 'medium',
    },
    {
      title: '4. Stalled Proposals (>7 Days) & Withdrawal Risk',
      metric: `${m.stalledProposalsCount} opps stalled >7d | 4.0% withdrawal`,
      detail:
        'Won deals close in 5 days post-proposal vs. 11 days for losses. Cobalt Learning (₹80k) withdrew 23 days after signing.',
      severity: 'medium',
    },
  ];

  const deltaFmt = (n: number, isCurrency = true) => {
    const sign = n > 0 ? '+' : '';
    return isCurrency ? `${sign}${formatINR(n)}` : `${sign}${n}`;
  };

  return (
    <div className="space-y-6">
      {/* Bottleneck Highlights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {bottlenecks.map((b) => (
          <div
            key={b.title}
            className={`rounded-xl border p-4 shadow-xs ${
              b.severity === 'high'
                ? 'border-rose-200 bg-rose-50/50'
                : b.severity === 'ok'
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-amber-200 bg-amber-50/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-slate-700" />
                <h4 className="text-sm font-semibold text-slate-900">{b.title}</h4>
              </div>
              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-slate-900 shadow-2xs">
                {b.metric}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">{b.detail}</p>
          </div>
        ))}
      </div>

      {/* Campaign Leaderboard */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Growth Campaign Leaderboard (I1–I5)
            </h3>
            <p className="text-xs text-slate-500">
              Ranked by RICE & live Phase 4 threshold status
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 font-medium">Bet</th>
                <th className="py-2 font-medium">Owner</th>
                <th className="py-2 text-right font-medium">RICE</th>
                <th className="py-2 text-right font-medium">Leading Signal</th>
                <th className="py-2 text-right font-medium">Realized / Target ₹</th>
                <th className="py-2 text-right font-medium">Spent / Budget</th>
                <th className="py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.campaigns_bets.map((b) => {
                const { badge } = computeDecisionBadge(b);
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-900">
                        {b.id}: {b.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{b.leading_indicator_name}</div>
                    </td>
                    <td className="py-2.5 text-slate-700">{b.owner}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {b.rice_score.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {b.leading_actual}
                      {b.leading_unit}
                      <span className="ml-1 text-[10px] font-normal text-slate-500">
                        (Scale ≥{b.scale_min}
                        {b.leading_unit})
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-800">
                      {formatINR(b.realized_incremental_inr)} / {formatINR(b.net_incremental_inr)}
                    </td>
                    <td className="py-2.5 text-right text-slate-700">
                      {formatINR(b.spent_inr)} / {formatINR(b.budget_inr)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeStyle(
                          badge
                        )}`}
                      >
                        {badge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* What Changed vs Frozen Snapshot */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">
            What Changed (Live State vs. Frozen Original Snapshot)
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Δ Cash Collected', val: deltaFmt(diff.deltaCashCollectedInr), raw: diff.deltaCashCollectedInr },
            { label: 'Δ Signed Cash', val: deltaFmt(diff.deltaSignedCashInr), raw: diff.deltaSignedCashInr },
            { label: 'Δ Projected Outcome', val: deltaFmt(diff.deltaProjectedOutcomeInr), raw: diff.deltaProjectedOutcomeInr },
            { label: 'Δ Cash Deals', val: deltaFmt(diff.deltaConfirmedDeals, false), raw: diff.deltaConfirmedDeals },
            { label: 'Δ Dropped Converted', val: deltaFmt(diff.deltaDroppedConverted, false), raw: diff.deltaDroppedConverted },
            { label: 'Δ Tasks Done', val: deltaFmt(diff.deltaTasksCompleted, false), raw: diff.deltaTasksCompleted },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-medium text-slate-500">{item.label}</div>
              <div className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-900">
                {item.raw > 0 && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />}
                {item.raw < 0 && <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />}
                <span>{item.val}</span>
              </div>
            </div>
          ))}
        </div>

        {diff.badgeChanges.length > 0 && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <strong>Decision Badge Shifts:</strong>{' '}
            {diff.badgeChanges.map((bc) => `${bc.id} (${bc.was} -> ${bc.now})`).join(', ')}
          </div>
        )}

        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent Change Log
          </h4>
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {state.change_log.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs"
              >
                <div>
                  <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                    {entry.entity_id}
                  </span>
                  <span className="text-slate-800">{entry.summary}</span>
                </div>
                <span className="shrink-0 pl-3 text-[11px] text-slate-500">{entry.actor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

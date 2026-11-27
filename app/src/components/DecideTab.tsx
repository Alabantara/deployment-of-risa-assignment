import React from 'react';
import { ArrowRightLeft, CheckCircle2, PauseCircle, RefreshCw } from 'lucide-react';
import type { GrowthCampaignBet, GrowthCenterState } from '../types/growth';
import {
  computeBudgetSuggestions,
  computeDecisionBadge,
  formatINR,
} from '../lib/analytics';

interface DecideTabProps {
  state: GrowthCenterState;
  onUpdateBet: (bet: GrowthCampaignBet, summary: string) => Promise<void>;
  onReallocateBudget: (fromId: string, toId: string, amountInr: number) => Promise<void>;
}

export const DecideTab: React.FC<DecideTabProps> = ({
  state,
  onUpdateBet,
  onReallocateBudget,
}) => {
  const suggestions = computeBudgetSuggestions(state);

  const badgeColors = {
    SCALE: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    CHANGE: 'border-amber-300 bg-amber-50 text-amber-800',
    STOP: 'border-rose-300 bg-rose-50 text-rose-800',
  };

  const badgeIcons = {
    SCALE: CheckCircle2,
    CHANGE: RefreshCw,
    STOP: PauseCircle,
  };

  return (
    <div className="space-y-6">
      {/* Budget Reallocation Engine */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Automated Budget Reallocation Recommendations
          </h3>
        </div>
        {suggestions.length === 0 ? (
          <p className="text-xs text-slate-600">
            No STOP-status unspent funds currently pending reallocation. Edit campaign leading indicators below or in Execute to simulate threshold triggers.
          </p>
        ) : (
          <div className="space-y-2.5">
            {suggestions.map((s) => (
              <div
                key={`${s.fromCampaignId}-${s.toCampaignId}`}
                className="flex flex-col justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Move {formatINR(s.suggestedAmountInr)} from {s.fromCampaignId} ({s.fromBadge}) →{' '}
                    {s.toCampaignId} (SCALE)
                  </div>
                  <p className="mt-0.5 text-xs text-slate-700">{s.rationale}</p>
                </div>
                <button
                  onClick={() =>
                    onReallocateBudget(s.fromCampaignId, s.toCampaignId, s.suggestedAmountInr)
                  }
                  className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Apply Shift ({formatINR(s.suggestedAmountInr)})
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-Computed Decision Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {state.campaigns_bets.map((b) => {
          const { badge, recommendedAction } = computeDecisionBadge(b);
          const Icon = badgeIcons[badge];
          const progressPct = Math.min(100, Math.round((b.leading_actual / b.scale_min) * 100));

          return (
            <div
              key={b.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                      #{b.rank} {b.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      Owner: {b.owner} · RICE {b.rice_score}
                    </span>
                  </div>
                  <h4 className="mt-1.5 text-sm font-bold text-slate-900">{b.name}</h4>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${badgeColors[badge]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {badge}
                </span>
              </div>

              {/* Leading Indicator Bar */}
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{b.leading_indicator_name}</span>
                  <span className="font-bold text-slate-900">
                    {b.leading_actual}
                    {b.leading_unit} ({b.window})
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all ${
                      badge === 'SCALE'
                        ? 'bg-emerald-500'
                        : badge === 'CHANGE'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                  <span>STOP &lt; {b.stop_below}{b.leading_unit}</span>
                  <span>CHANGE {b.change_min}–{b.scale_min - 1}{b.leading_unit}</span>
                  <span>SCALE ≥ {b.scale_min}{b.leading_unit}</span>
                </div>
              </div>

              {/* Quick Live Simulation Slider */}
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <label className="font-medium text-slate-600">Test Threshold Sensitivity:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={b.leading_actual}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateBet(
                        { ...b, leading_actual: val },
                        `Updated ${b.id} leading indicator to ${val}${b.leading_unit}.`
                      );
                    }}
                    className="w-32 accent-blue-600"
                  />
                  <span className="w-10 text-right font-semibold">{b.leading_actual}%</span>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
                <span className="font-semibold text-slate-800">Triggered Action: </span>
                <span className="text-slate-700">{recommendedAction}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

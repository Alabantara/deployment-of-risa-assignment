import React, { useState } from 'react';
import { Plus, CheckSquare, ArrowRight, Filter } from 'lucide-react';
import type {
  ExecutionTask,
  GrowthCampaignBet,
  GrowthCenterState,
  OpportunityStage,
  SponsorOpportunity,
  TaskPriority,
  TaskStatus,
} from '../types/growth';
import { formatINR } from '../lib/analytics';

interface ExecuteTabProps {
  state: GrowthCenterState;
  onUpsertTask: (task: ExecutionTask, isNew: boolean) => Promise<void>;
  onUpdateBet: (bet: GrowthCampaignBet, summary: string) => Promise<void>;
  onUpdateOpp: (opp: SponsorOpportunity, summary: string) => Promise<void>;
  onConvertDropped: (brandId: string, proposedValueInr: number) => Promise<void>;
}

const STAGES: OpportunityStage[] = [
  'prospecting',
  'contacted',
  'proposal_sent',
  'negotiating',
  'partner_confirmed',
  'lost',
  'withdrawn',
];

export const ExecuteTab: React.FC<ExecuteTabProps> = ({
  state,
  onUpsertTask,
  onUpdateBet,
  onUpdateOpp,
  onConvertDropped,
}) => {
  const [subView, setSubView] = useState<'tasks' | 'campaigns' | 'pipeline'>('tasks');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [oppFilter, setOppFilter] = useState<string>('open');
  const [newTitle, setNewTitle] = useState('');
  const [newOwner, setNewOwner] = useState('Kabir Shah');
  const [newCampaign, setNewCampaign] = useState('I2');
  const [newDeadline, setNewDeadline] = useState('2025-03-30');
  const [newPriority, setNewPriority] = useState<TaskPriority>('high');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const task: ExecutionTask = {
      id: `TSK-${String(state.tasks.length + 1).padStart(2, '0')}`,
      title: newTitle.trim(),
      campaign_id: newCampaign,
      owner: newOwner,
      deadline: newDeadline,
      status: 'todo',
      priority: newPriority,
      notes: 'Added via Execute board.',
    };
    await onUpsertTask(task, true);
    setNewTitle('');
  };

  const filteredTasks =
    statusFilter === 'all'
      ? state.tasks
      : state.tasks.filter((t) => t.status === statusFilter);

  const filteredOpps = state.opportunities.filter((o) => {
    if (oppFilter === 'open')
      return !['partner_confirmed', 'lost', 'withdrawn'].includes(o.stage);
    if (oppFilter === 'confirmed') return o.stage === 'partner_confirmed';
    if (oppFilter === 'media') return o.industry === 'Media';
    return true;
  });

  const unworkedDropped = state.dropped_qualified_brands.filter((d) => !d.converted_to_opp);

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'tasks', label: `Execution Tasks (${state.tasks.length})` },
          { id: 'campaigns', label: 'Edit Campaigns & Metrics (I1–I5)' },
          {
            id: 'pipeline',
            label: `Sponsor Pipeline (${state.opportunities.length}) & Dropped Leads (${unworkedDropped.length})`,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubView(t.id as 'tasks' | 'campaigns' | 'pipeline')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              subView === t.id
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. TASKS BOARD */}
      {subView === 'tasks' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddTask}
            className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-6"
          >
            <input
              type="text"
              placeholder="New action item (e.g., Re-pitch FMCG leads with Co-Title bundle)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs md:col-span-2"
            />
            <select
              value={newCampaign}
              onChange={(e) => setNewCampaign(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
            >
              {state.campaigns_bets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id}
                </option>
              ))}
            </select>
            <select
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
            >
              {['Kabir Shah', 'Riya Kapoor', 'Nisha Rao', 'Meera Iyer'].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-xs"
              >
                <option value="high">High</option>
                <option value="medium">Med</option>
                <option value="low">Low</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                Action Items
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                {['all', 'todo', 'in_progress', 'blocked', 'done'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded px-2 py-1 text-[11px] font-medium ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredTasks.map((tk) => (
                <div
                  key={tk.id}
                  className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {tk.id} · {tk.campaign_id}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          tk.priority === 'high'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tk.priority}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">{tk.title}</span>
                    </div>
                    {tk.notes && <p className="mt-1 text-[11px] text-slate-500">{tk.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-slate-600">{tk.owner}</span>
                    <span className="text-slate-400">Due {tk.deadline}</span>
                    <select
                      value={tk.status}
                      onChange={(e) =>
                        onUpsertTask({ ...tk, status: e.target.value as TaskStatus }, false)
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. LIVE CAMPAIGNS EDITOR */}
      {subView === 'campaigns' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">
            Live Campaign Metrics & Budgets Editor
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Any edit persists immediately and recalculates Measure, Diagnose, Decide, and AI Copilot answers.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Campaign</th>
                  <th className="py-2">Leading Signal (%)</th>
                  <th className="py-2">Budget (INR)</th>
                  <th className="py-2">Spent (INR)</th>
                  <th className="py-2">Realized Incremental (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.campaigns_bets.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-slate-900">
                        {b.id}: {b.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{b.leading_indicator_name}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        value={b.leading_actual}
                        onChange={(e) =>
                          onUpdateBet(
                            { ...b, leading_actual: Number(e.target.value) || 0 },
                            `Edited ${b.id} leading indicator to ${e.target.value}%.`
                          )
                        }
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right font-semibold"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        step={1000}
                        value={b.budget_inr}
                        onChange={(e) =>
                          onUpdateBet(
                            { ...b, budget_inr: Number(e.target.value) || 0 },
                            `Edited ${b.id} budget to ${formatINR(Number(e.target.value) || 0)}.`
                          )
                        }
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        step={500}
                        value={b.spent_inr}
                        onChange={(e) =>
                          onUpdateBet(
                            { ...b, spent_inr: Number(e.target.value) || 0 },
                            `Edited ${b.id} spend to ${formatINR(Number(e.target.value) || 0)}.`
                          )
                        }
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        type="number"
                        step={5000}
                        value={b.realized_incremental_inr}
                        onChange={(e) =>
                          onUpdateBet(
                            { ...b, realized_incremental_inr: Number(e.target.value) || 0 },
                            `Edited ${b.id} realized cash to ${formatINR(Number(e.target.value) || 0)}.`
                          )
                        }
                        className="w-28 rounded border border-slate-300 px-2 py-1 text-right font-semibold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PIPELINE & DROPPED QUALIFIED LEADS */}
      {subView === 'pipeline' && (
        <div className="space-y-5">
          {unworkedDropped.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900">
                Dropped Qualified Brands ({unworkedDropped.length} unworked — 1-Click Recovery)
              </h3>
              <p className="mb-3 text-xs text-slate-600">
                Converting SC04 / SC05 qualified brands into proposals immediately updates the live funnel and projected outcome.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unworkedDropped.slice(0, 9).map((d) => (
                  <div
                    key={d.brand_id}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{d.brand_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {d.industry} · {d.source_campaign_id} ({d.owner_name})
                      </div>
                    </div>
                    <button
                      onClick={() => onConvertDropped(d.brand_id, 95000)}
                      className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Prop ₹95k <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Sponsor Opportunities ({filteredOpps.length})
              </h3>
              <div className="flex gap-1.5 text-xs">
                {[
                  { id: 'open', label: 'Open Pipeline' },
                  { id: 'confirmed', label: 'Confirmed Deals' },
                  { id: 'media', label: 'Media Vertical' },
                  { id: 'all', label: 'All 58+' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOppFilter(f.id)}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                      oppFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2">Brand</th>
                    <th className="py-2">Industry / Source</th>
                    <th className="py-2">Stage</th>
                    <th className="py-2 text-right">Proposed ₹</th>
                    <th className="py-2 text-right">Confirmed ₹</th>
                    <th className="py-2 text-right">Cash Collected ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOpps.map((o) => (
                    <tr key={o.opportunity_id} className="hover:bg-slate-50">
                      <td className="py-2 pr-2">
                        <div className="font-semibold text-slate-900">
                          {o.opportunity_id}: {o.brand_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {o.support_type} · {o.qualification_status}
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-slate-700">
                        <div>{o.industry}</div>
                        <div className="text-[11px] text-slate-500">{o.originating_campaign_id}</div>
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          value={o.stage}
                          onChange={(e) => {
                            const nextStage = e.target.value as OpportunityStage;
                            const nextConf =
                              nextStage === 'partner_confirmed'
                                ? o.confirmed_value_inr || o.proposed_value_inr
                                : 0;
                            const nextCash =
                              nextStage === 'partner_confirmed' && o.support_type === 'cash'
                                ? o.cash_collected_inr || Math.round(nextConf * 0.75)
                                : 0;
                            onUpdateOpp(
                              {
                                ...o,
                                stage: nextStage,
                                confirmed_value_inr: nextConf,
                                cash_collected_inr: nextCash,
                              },
                              `Moved ${o.brand_name} (${o.opportunity_id}) stage ${o.stage} -> ${nextStage}.`
                            );
                          }}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                          {STAGES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2 text-right">{formatINR(o.proposed_value_inr)}</td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          step={5000}
                          value={o.confirmed_value_inr}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            onUpdateOpp(
                              { ...o, confirmed_value_inr: val },
                              `Updated ${o.brand_name} confirmed value to ${formatINR(val)}.`
                            );
                          }}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          step={5000}
                          value={o.cash_collected_inr}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            onUpdateOpp(
                              { ...o, cash_collected_inr: val },
                              `Updated ${o.brand_name} cash collected to ${formatINR(val)}.`
                            );
                          }}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-right font-semibold text-emerald-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

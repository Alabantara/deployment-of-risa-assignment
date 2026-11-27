import { useEffect, useState } from 'react';
import {
  BarChart3,
  Stethoscope,
  SlidersHorizontal,
  ListChecks,
  RotateCcw,
  Settings,
  Database,
} from 'lucide-react';
import type {
  ExecutionTask,
  GrowthCampaignBet,
  GrowthCenterState,
  SponsorOpportunity,
} from './types/growth';
import { FROZEN_INITIAL_STATE } from './data/seedBundle';
import { computeDecisionBadge } from './lib/analytics';
import {
  applyBudgetReallocation,
  convertDroppedBrandToOpp,
  loadGrowthState,
  resetToOriginalState,
  updateCampaignBet,
  updateOpportunity,
  upsertTask,
} from './lib/supabaseStore';
import type { CopilotConfig, LlmProvider } from './lib/copilotEngine';
import { MeasureTab } from './components/MeasureTab';
import { DiagnoseTab } from './components/DiagnoseTab';
import { DecideTab } from './components/DecideTab';
import { ExecuteTab } from './components/ExecuteTab';
import { CopilotPanel } from './components/CopilotPanel';
import { SettingsModal } from './components/SettingsModal';

const CONFIG_STORAGE_KEY = 'campusfest_kolkata_copilot_config_v1';

function loadInitialConfig(): CopilotConfig {
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as CopilotConfig;
    } catch {
      // ignore
    }
  }
  return {
    provider: ((import.meta.env.VITE_DEFAULT_LLM_PROVIDER as LlmProvider) || 'gemini_lite'),
    geminiKey: (import.meta.env.VITE_GEMINI_API_KEY as string) || '',
    geminiModel: (import.meta.env.VITE_GEMINI_MODEL as string) || 'gemini-2.5-flash-lite',
    groqKey: (import.meta.env.VITE_GROQ_API_KEY as string) || '',
    groqModel: (import.meta.env.VITE_GROQ_MODEL as string) || 'llama-3.3-70b-versatile',
  };
}

export function App() {
  const [state, setState] = useState<GrowthCenterState>(FROZEN_INITIAL_STATE);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');
  const [activeTab, setActiveTab] = useState<'measure' | 'diagnose' | 'decide' | 'execute'>(
    'measure'
  );
  const [config, setConfig] = useState<CopilotConfig>(loadInitialConfig);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadGrowthState().then(({ state: loaded, storageMode: mode, notice }) => {
      setState(loaded);
      setStorageMode(mode);
      if (notice) showToast(notice);
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSaveConfig = (next: CopilotConfig) => {
    setConfig(next);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
  };

  const handleReset = async () => {
    const restored = await resetToOriginalState();
    setState(restored);
    showToast('Restored frozen original dataset & initial Kolkata targets.');
  };

  const handleUpdateBet = async (bet: GrowthCampaignBet, summary: string) => {
    const next = await updateCampaignBet(state, bet, summary);
    setState(next);
  };

  const handleUpdateOpp = async (opp: SponsorOpportunity, summary: string) => {
    const next = await updateOpportunity(state, opp, summary);
    setState(next);
  };

  const handleConvertDropped = async (brandId: string, proposedValueInr: number) => {
    const next = await convertDroppedBrandToOpp(state, brandId, proposedValueInr);
    setState(next);
    showToast('Converted qualified brand to proposal_sent — funnel & projections updated.');
  };

  const handleUpsertTask = async (task: ExecutionTask, isNew: boolean, actor = 'Growth Team') => {
    const next = await upsertTask(state, task, isNew, actor);
    setState(next);
    if (isNew) showToast(`Added ${task.id} to Execute board.`);
  };

  const handleReallocate = async (fromId: string, toId: string, amountInr: number) => {
    const next = await applyBudgetReallocation(state, fromId, toId, amountInr);
    setState(next);
    showToast(`Reallocated ₹${amountInr.toLocaleString('en-IN')} from ${fromId} to ${toId}.`);
  };

  const alertCount = state.campaigns_bets.filter(
    (b) => computeDecisionBadge(b).badge !== 'SCALE'
  ).length;
  const openTaskCount = state.tasks.filter((t) => t.status !== 'done').length;

  const tabs = [
    { id: 'measure', label: 'Measure', icon: BarChart3 },
    { id: 'diagnose', label: 'Diagnose', icon: Stethoscope },
    { id: 'decide', label: `Decide (${alertCount} Alerts)`, icon: SlidersHorizontal },
    { id: 'execute', label: `Execute (${openTaskCount})`, icon: ListChecks },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                CHALLENGE B
              </span>
              <h1 className="text-base font-bold tracking-tight text-slate-900">
                CampusFest Kolkata — Sponsorship Growth Center
              </h1>
            </div>
            <p className="text-[11px] text-slate-500">
              North Star: Pre-Fest Cash Collected · Base ₹17.24L | Stretch ₹30.99L | Cap: 32 Slots / ₹1.00L Budget
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                storageMode === 'supabase'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <Database className="h-3 w-3" />
              {storageMode === 'supabase' ? 'Supabase Connected' : 'Local Demo Store'}
            </span>

            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-3.5 w-3.5" /> AI & DB Setup
            </button>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to Original
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto flex max-w-[1600px] gap-1 px-4 pb-2 sm:px-6">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Main Split Grid */}
      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          {activeTab === 'measure' && <MeasureTab state={state} />}
          {activeTab === 'diagnose' && <DiagnoseTab state={state} />}
          {activeTab === 'decide' && (
            <DecideTab
              state={state}
              onUpdateBet={handleUpdateBet}
              onReallocateBudget={handleReallocate}
            />
          )}
          {activeTab === 'execute' && (
            <ExecuteTab
              state={state}
              onUpsertTask={(t, isNew) => handleUpsertTask(t, isNew)}
              onUpdateBet={handleUpdateBet}
              onUpdateOpp={handleUpdateOpp}
              onConvertDropped={handleConvertDropped}
            />
          )}
        </div>

        <div className="xl:col-span-4">
          <CopilotPanel
            state={state}
            config={config}
            onConfirmTask={(t) => handleUpsertTask(t, true, 'AI Copilot (Confirmed)')}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        storageMode={storageMode}
      />
    </div>
  );
}

export default App;

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { FROZEN_INITIAL_STATE } from '../data/seedBundle';
import type {
  ChangeLogEntry,
  ExecutionTask,
  GrowthCampaignBet,
  GrowthCenterState,
  SponsorOpportunity,
} from '../types/growth';

const LOCAL_STORAGE_KEY = 'campusfest_kolkata_growth_center_v1';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
      !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
  );
}

let supabaseClient: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return supabaseClient;
}

export function cloneFrozenState(): GrowthCenterState {
  return JSON.parse(JSON.stringify(FROZEN_INITIAL_STATE)) as GrowthCenterState;
}

export async function loadGrowthState(): Promise<{
  state: GrowthCenterState;
  storageMode: 'supabase' | 'local';
  notice?: string;
}> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const [tRes, cRes, hRes, oRes, dRes, tkRes, clRes] = await Promise.all([
        client.from('gc_targets').select('*').eq('id', 'default').single(),
        client.from('gc_campaigns').select('*').order('rank', { ascending: true }),
        client.from('gc_historical_channels').select('*').order('campaign_id', { ascending: true }),
        client.from('gc_opportunities').select('*').order('opportunity_id', { ascending: true }),
        client.from('gc_dropped_qualified_brands').select('*').order('brand_id', { ascending: true }),
        client.from('gc_tasks').select('*').order('id', { ascending: true }),
        client.from('gc_change_log').select('*').order('changed_at', { ascending: false }),
      ]);

      if (!tRes.error && tRes.data && cRes.data && cRes.data.length > 0) {
        const state: GrowthCenterState = {
          targets: tRes.data,
          campaigns_bets: cRes.data.map((r) => ({
            ...r,
            rice_score: Number(r.rice_score),
            overlap_haircut_pct: Number(r.overlap_haircut_pct),
            leading_actual: Number(r.leading_actual),
            scale_min: Number(r.scale_min),
            change_min: Number(r.change_min),
            stop_below: Number(r.stop_below),
          })),
          historical_channels: hRes.data ?? FROZEN_INITIAL_STATE.historical_channels,
          opportunities: oRes.data ?? FROZEN_INITIAL_STATE.opportunities,
          dropped_qualified_brands: dRes.data ?? FROZEN_INITIAL_STATE.dropped_qualified_brands,
          tasks: tkRes.data ?? FROZEN_INITIAL_STATE.tasks,
          change_log: clRes.data ?? FROZEN_INITIAL_STATE.change_log,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        return { state, storageMode: 'supabase' };
      }
    } catch (err) {
      console.warn('Supabase load failed, falling back to localStorage:', err);
    }
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return {
        state: JSON.parse(saved) as GrowthCenterState,
        storageMode: 'local',
        notice: client ? 'Supabase tables not seeded yet — using local demo store' : undefined,
      };
    } catch {
      // fall through
    }
  }
  const initial = cloneFrozenState();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  return { state: initial, storageMode: 'local' };
}

function saveLocal(state: GrowthCenterState) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

async function appendChangeLog(
  client: SupabaseClient | null,
  entry: ChangeLogEntry
): Promise<void> {
  if (!client) return;
  await client.from('gc_change_log').insert(entry);
}

export async function updateCampaignBet(
  state: GrowthCenterState,
  updated: GrowthCampaignBet,
  summary: string
): Promise<GrowthCenterState> {
  const logEntry: ChangeLogEntry = {
    id: `CHG-${Date.now().toString().slice(-5)}`,
    changed_at: new Date().toISOString(),
    entity_type: 'campaign',
    entity_id: updated.id,
    summary,
    actor: 'Growth Team',
  };
  const next: GrowthCenterState = {
    ...state,
    campaigns_bets: state.campaigns_bets.map((b) => (b.id === updated.id ? updated : b)),
    change_log: [logEntry, ...state.change_log],
  };
  saveLocal(next);

  const client = getSupabaseClient();
  if (client) {
    await client.from('gc_campaigns').update(updated).eq('id', updated.id);
    await appendChangeLog(client, logEntry);
  }
  return next;
}

export async function updateOpportunity(
  state: GrowthCenterState,
  updated: SponsorOpportunity,
  summary: string
): Promise<GrowthCenterState> {
  const logEntry: ChangeLogEntry = {
    id: `CHG-${Date.now().toString().slice(-5)}`,
    changed_at: new Date().toISOString(),
    entity_type: 'opportunity',
    entity_id: updated.opportunity_id,
    summary,
    actor: 'Growth Team',
  };
  const next: GrowthCenterState = {
    ...state,
    opportunities: state.opportunities.map((o) =>
      o.opportunity_id === updated.opportunity_id ? updated : o
    ),
    change_log: [logEntry, ...state.change_log],
  };
  saveLocal(next);

  const client = getSupabaseClient();
  if (client) {
    await client
      .from('gc_opportunities')
      .update(updated)
      .eq('opportunity_id', updated.opportunity_id);
    await appendChangeLog(client, logEntry);
  }
  return next;
}

export async function convertDroppedBrandToOpp(
  state: GrowthCenterState,
  brandId: string,
  proposedValueInr: number
): Promise<GrowthCenterState> {
  const brand = state.dropped_qualified_brands.find((b) => b.brand_id === brandId);
  if (!brand || brand.converted_to_opp) return state;

  const newOppId = `O${String(state.opportunities.length + 1).padStart(3, '0')}`;
  const newOpp: SponsorOpportunity = {
    opportunity_id: newOppId,
    brand_id: brand.brand_id,
    brand_name: brand.brand_name,
    opportunity_name: `${brand.brand_name} festival partnership`,
    industry: brand.industry,
    originating_campaign_id: brand.source_campaign_id,
    originating_campaign_name: brand.source_campaign_name,
    primary_contact_name: 'Partnerships Contact',
    primary_contact_job_title: 'Partnerships Manager',
    owner_name: brand.owner_name,
    qualification_status: 'qualified',
    support_type: 'cash',
    stage: 'proposal_sent',
    proposed_value_inr: proposedValueInr,
    confirmed_value_inr: 0,
    cash_collected_inr: 0,
    early_bird_terms: true,
    days_in_stage: 1,
    effective_at: new Date().toISOString().slice(0, 19),
  };

  const logEntry: ChangeLogEntry = {
    id: `CHG-${Date.now().toString().slice(-5)}`,
    changed_at: new Date().toISOString(),
    entity_type: 'opportunity',
    entity_id: newOppId,
    summary: `Converted dropped qualified brand ${brand.brand_name} (${brand.source_campaign_id}) into proposal_sent at ₹${proposedValueInr.toLocaleString('en-IN')}.`,
    actor: 'Growth Team',
  };

  const next: GrowthCenterState = {
    ...state,
    dropped_qualified_brands: state.dropped_qualified_brands.map((b) =>
      b.brand_id === brandId ? { ...b, converted_to_opp: true } : b
    ),
    opportunities: [newOpp, ...state.opportunities],
    change_log: [logEntry, ...state.change_log],
  };
  saveLocal(next);

  const client = getSupabaseClient();
  if (client) {
    await client
      .from('gc_dropped_qualified_brands')
      .update({ converted_to_opp: true })
      .eq('brand_id', brandId);
    await client.from('gc_opportunities').insert(newOpp);
    await appendChangeLog(client, logEntry);
  }
  return next;
}

export async function upsertTask(
  state: GrowthCenterState,
  task: ExecutionTask,
  isNew: boolean,
  actor = 'Growth Team'
): Promise<GrowthCenterState> {
  const logEntry: ChangeLogEntry = {
    id: `CHG-${Date.now().toString().slice(-5)}`,
    changed_at: new Date().toISOString(),
    entity_type: 'task',
    entity_id: task.id,
    summary: isNew
      ? `Created task ${task.id}: "${task.title}" (Owner: ${task.owner}, Due: ${task.deadline}).`
      : `Updated task ${task.id} -> ${task.status} (${task.owner}).`,
    actor,
  };

  const next: GrowthCenterState = {
    ...state,
    tasks: isNew
      ? [task, ...state.tasks]
      : state.tasks.map((t) => (t.id === task.id ? task : t)),
    change_log: [logEntry, ...state.change_log],
  };
  saveLocal(next);

  const client = getSupabaseClient();
  if (client) {
    await client.from('gc_tasks').upsert(task);
    await appendChangeLog(client, logEntry);
  }
  return next;
}

export async function applyBudgetReallocation(
  state: GrowthCenterState,
  fromId: string,
  toId: string,
  amountInr: number
): Promise<GrowthCenterState> {
  const fromBet = state.campaigns_bets.find((b) => b.id === fromId);
  const toBet = state.campaigns_bets.find((b) => b.id === toId);
  if (!fromBet || !toBet || amountInr <= 0) return state;

  const actualShift = Math.min(amountInr, Math.max(0, fromBet.budget_inr - fromBet.spent_inr));
  if (actualShift <= 0) return state;

  const updatedFrom = { ...fromBet, budget_inr: fromBet.budget_inr - actualShift };
  const updatedTo = { ...toBet, budget_inr: toBet.budget_inr + actualShift };

  const logEntry: ChangeLogEntry = {
    id: `CHG-${Date.now().toString().slice(-5)}`,
    changed_at: new Date().toISOString(),
    entity_type: 'budget',
    entity_id: `${fromId}->${toId}`,
    summary: `Reallocated ₹${actualShift.toLocaleString('en-IN')} from ${fromId} to ${toId}.`,
    actor: 'Growth Team',
  };

  const next: GrowthCenterState = {
    ...state,
    campaigns_bets: state.campaigns_bets.map((b) =>
      b.id === fromId ? updatedFrom : b.id === toId ? updatedTo : b
    ),
    change_log: [logEntry, ...state.change_log],
  };
  saveLocal(next);

  const client = getSupabaseClient();
  if (client) {
    await Promise.all([
      client.from('gc_campaigns').update(updatedFrom).eq('id', fromId),
      client.from('gc_campaigns').update(updatedTo).eq('id', toId),
      appendChangeLog(client, logEntry),
    ]);
  }
  return next;
}

export async function resetToOriginalState(): Promise<GrowthCenterState> {
  let baseState = cloneFrozenState();
  const client = getSupabaseClient();

  if (client) {
    try {
      const snap = await client
        .from('gc_frozen_snapshot')
        .select('payload')
        .eq('snapshot_id', 'original')
        .single();
      if (!snap.error && snap.data?.payload) {
        baseState = snap.data.payload as GrowthCenterState;
      }

      // Restore Supabase tables cleanly
      await Promise.all([
        client.from('gc_campaigns').upsert(baseState.campaigns_bets),
        client.from('gc_opportunities').upsert(baseState.opportunities),
        client.from('gc_dropped_qualified_brands').upsert(baseState.dropped_qualified_brands),
      ]);
      // Reset tasks & change log by deleting non-original rows and upserting originals
      await client.from('gc_tasks').delete().neq('id', '__never__');
      await client.from('gc_tasks').insert(baseState.tasks);
      await client.from('gc_change_log').delete().neq('id', '__never__');
      await client.from('gc_change_log').insert(baseState.change_log);
    } catch (err) {
      console.warn('Supabase reset error (local reset still applied):', err);
    }
  }

  saveLocal(baseState);
  return baseState;
}

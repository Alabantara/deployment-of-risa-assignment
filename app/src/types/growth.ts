export type OpportunityStage =
  | 'prospecting'
  | 'contacted'
  | 'proposal_sent'
  | 'negotiating'
  | 'partner_confirmed'
  | 'lost'
  | 'withdrawn';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export type DecisionBadge = 'SCALE' | 'CHANGE' | 'STOP';

export interface GrowthTargets {
  event_name: string;
  city: string;
  total_prospects_target: number;
  conversations_target: number;
  proposals_target: number;
  signed_deals_target: number;
  cash_deals_target: number;
  base_cash_collected_target_inr: number;
  stretch_cash_collected_target_inr: number;
  risk_adjusted_target_inr: number;
  budget_cap_inr: number;
  inventory_cash_slots: number;
  team_hours_cap: number;
  historical_qualified_goal: number;
  historical_confirmed_goal: number;
}

export interface GrowthCampaignBet {
  id: string;
  name: string;
  rank: number;
  rice_score: number;
  owner: string;
  timeline: string;
  gross_inr: number;
  overlap_haircut_pct: number;
  net_incremental_inr: number;
  realized_incremental_inr: number;
  budget_inr: number;
  spent_inr: number;
  leading_indicator_name: string;
  leading_unit: string;
  leading_actual: number;
  sample_completed: number;
  sample_target: number;
  window: string;
  scale_min: number;
  change_min: number;
  stop_below: number;
  scale_action: string;
  change_action: string;
  stop_action: string;
  status: string;
}

export interface HistoricalChannel {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  tier_group: string;
  owner_name: string;
  attempts: number;
  brands_touched: number;
  meetings_held: number;
  opt_outs: number;
  qualified_brands: number;
  opportunities_created: number;
  proposals_sent: number;
  confirmed_deals: number;
  lost_or_withdrawn: number;
  confirmed_cash_inr: number;
  confirmed_inkind_inr: number;
}

export interface SponsorOpportunity {
  opportunity_id: string;
  brand_id: string;
  brand_name: string;
  opportunity_name: string;
  industry: string;
  originating_campaign_id: string;
  originating_campaign_name: string;
  primary_contact_name: string;
  primary_contact_job_title: string;
  owner_name: string;
  qualification_status: string;
  support_type: 'cash' | 'in_kind';
  stage: OpportunityStage;
  proposed_value_inr: number;
  confirmed_value_inr: number;
  cash_collected_inr: number;
  early_bird_terms: boolean;
  days_in_stage: number;
  effective_at: string;
}

export interface DroppedQualifiedBrand {
  brand_id: string;
  brand_name: string;
  industry: string;
  source_campaign_id: string;
  source_campaign_name: string;
  owner_name: string;
  qualified_at: string;
  converted_to_opp: boolean;
}

export interface ExecutionTask {
  id: string;
  title: string;
  campaign_id: string;
  owner: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  notes: string;
}

export interface ChangeLogEntry {
  id: string;
  changed_at: string;
  entity_type: 'campaign' | 'opportunity' | 'task' | 'budget' | 'reset';
  entity_id: string;
  summary: string;
  actor: string;
}

export interface GrowthCenterState {
  targets: GrowthTargets;
  campaigns_bets: GrowthCampaignBet[];
  historical_channels: HistoricalChannel[];
  opportunities: SponsorOpportunity[];
  dropped_qualified_brands: DroppedQualifiedBrand[];
  tasks: ExecutionTask[];
  change_log: ChangeLogEntry[];
}

export interface ProposedTaskAction {
  type: 'create_task';
  title: string;
  campaign_id: string;
  owner: string;
  deadline: string;
  priority: TaskPriority;
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface ToolTraceItem {
  name: string;
  args: Record<string, unknown>;
  resultPreview: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  toolTraces?: ToolTraceItem[];
  pendingAction?: ProposedTaskAction;
}

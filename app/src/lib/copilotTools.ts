import { FROZEN_INITIAL_STATE } from '../data/seedBundle';
import type { GrowthCenterState, ProposedTaskAction, TaskPriority } from '../types/growth';
import {
  computeBudgetSuggestions,
  computeDecisionBadge,
  computeFunnel,
  computeOverviewMetrics,
  computeWhatChanged,
} from './analytics';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export const COPILOT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_overview_kpis',
    description:
      'Returns live Challenge B sponsorship KPIs computed from current database state: Base/Stretch targets, confirmed signed cash, pre-fest cash collected, collection %, projected outcome, variance vs targets, inventory slots used, and remaining dropped qualified leads.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_funnel',
    description:
      'Returns full sponsorship funnel counts (Prospects -> Conversations -> Proposals Sent -> Net Signed Deals -> Cash Deals) vs Base and Stretch targets, stage conversion rates, and the worst bottleneck stage.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'compare_campaigns',
    description:
      'Compares performance of the 5 Kolkata strategic growth bets (I1-I5 with RICE, budget, spend, leading indicator, and auto Scale/Change/Stop decisions) and/or the 6 historical acquisition channels (SC01-SC06).',
    parameters: {
      type: 'object',
      properties: {
        group: {
          type: 'string',
          enum: ['all', 'bets', 'historical'],
          description: 'Which group to return: bets (I1-I5), historical (SC01-SC06), or all.',
        },
      },
    },
  },
  {
    name: 'diagnose_bottlenecks',
    description:
      'Runs deterministic diagnostic checks across current opportunities, dropped qualified brands, Media category losses, contact role split, stalled proposals >7 days, and the signed-vs-collected cash gap.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_budget_status',
    description:
      'Returns budget vs actual spend for each campaign bet (I1-I5), remaining budget vs the ₹1,00,000 cap, and deterministic budget reallocation suggestions from STOP to SCALE campaigns.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'query_sponsors',
    description:
      'Searches live sponsor opportunities and dropped qualified brands by industry, stage, originating campaign ID (e.g., SC01..SC06), or brand name.',
    parameters: {
      type: 'object',
      properties: {
        industry: { type: 'string', description: 'Optional industry filter, e.g. Media, Mobility, Education, Food and beverage, Consumer products, Personal care.' },
        stage: { type: 'string', description: 'Optional stage filter: prospecting, contacted, proposal_sent, negotiating, partner_confirmed, lost, withdrawn.' },
        campaign_id: { type: 'string', description: 'Optional originating campaign ID: SC01..SC06.' },
        brand_name: { type: 'string', description: 'Optional substring match on brand name, e.g. Beardo or Cobalt.' },
      },
    },
  },
  {
    name: 'get_what_changed',
    description:
      'Compares current live Growth Center metrics against the Frozen Original Dataset snapshot and returns the recent change_log entries.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_tasks',
    description:
      'Lists execution tasks on the board with optional filters for status, owner, or campaign_id.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'], description: 'Filter tasks by status.' },
        owner: { type: 'string', description: 'Owner name, e.g. Kabir Shah, Riya Kapoor, Nisha Rao, Meera Iyer.' },
        campaign_id: { type: 'string', description: 'Campaign ID I1..I5.' },
      },
    },
  },
  {
    name: 'propose_task',
    description:
      'Proposes creating a new execution task on the Growth Center task board. Does NOT write immediately — surfaces a confirmation card that the user must click Confirm on.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short actionable task title.' },
        owner: { type: 'string', description: 'Assigned owner: Kabir Shah, Riya Kapoor, Nisha Rao, or Meera Iyer.' },
        deadline: { type: 'string', description: 'YYYY-MM-DD deadline.' },
        campaign_id: { type: 'string', description: 'Linked bet ID: I1, I2, I3, I4, or I5.' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority level.' },
        reason: { type: 'string', description: 'Data-backed reason why this task addresses the diagnosed issue.' },
      },
      required: ['title', 'owner', 'deadline', 'campaign_id', 'priority', 'reason'],
    },
  },
];

export function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  state: GrowthCenterState
): { result: unknown; proposedAction?: ProposedTaskAction } {
  switch (name) {
    case 'get_overview_kpis': {
      const m = computeOverviewMetrics(state);
      return {
        result: {
          observed_live_data: {
            confirmed_total_deals: m.confirmedTotalDeals,
            confirmed_cash_deals: m.confirmedCashDeals,
            confirmed_inkind_deals: m.confirmedInkindDeals,
            confirmed_cash_signed_inr: m.confirmedCashSignedInr,
            confirmed_cash_collected_inr: m.confirmedCashCollectedInr,
            confirmed_inkind_inr: m.confirmedInkindInr,
            avg_cash_deal_inr:
              m.confirmedCashDeals > 0
                ? Math.round(m.confirmedCashSignedInr / m.confirmedCashDeals)
                : 0,
            avg_inkind_deal_inr:
              m.confirmedInkindDeals > 0
                ? Math.round(m.confirmedInkindInr / m.confirmedInkindDeals)
                : 0,
            collection_rate_pct: m.collectionRatePct,
            uncollected_signed_cash_inr: m.uncollectedSignedCashInr,
            open_pipeline_count: m.openPipelineCount,
            open_pipeline_proposed_inr: m.openPipelineProposedInr,
            budget_spent_inr: m.totalBudgetSpentInr,
            budget_allocated_inr: m.totalAllocatedBudgetInr,
            budget_cap_inr: state.targets.budget_cap_inr,
            inventory_cash_used: m.inventoryCashUsed,
            inventory_cash_cap: m.inventoryCashCap,
          },
          model_targets_and_projection: {
            base_target_inr: state.targets.base_cash_collected_target_inr,
            stretch_target_inr: state.targets.stretch_cash_collected_target_inr,
            risk_adjusted_target_inr: state.targets.risk_adjusted_target_inr,
            projected_outcome_inr: m.projectedOutcomeInr,
            variance_vs_base_inr: m.varianceVsBaseInr,
            variance_vs_stretch_inr: m.varianceVsStretchInr,
          },
          data_scope_note:
            'confirmed_value_inr comes from Partner Opportunities; pre-fest cash_collected_inr is seeded at 75% benchmark realization (not actual bank statement API) and updates dynamically when edited.',
        },
      };
    }

    case 'get_funnel': {
      const f = computeFunnel(state);
      return { result: f };
    }

    case 'compare_campaigns': {
      const group = String(args.group ?? 'all');
      const bets = state.campaigns_bets.map((b) => {
        const d = computeDecisionBadge(b);
        return {
          id: b.id,
          name: b.name,
          rank: b.rank,
          rice_score: b.rice_score,
          owner: b.owner,
          net_incremental_target_inr: b.net_incremental_inr,
          realized_incremental_inr: b.realized_incremental_inr,
          budget_inr: b.budget_inr,
          spent_inr: b.spent_inr,
          roi_on_budget: Number((b.net_incremental_inr / Math.max(1, b.budget_inr)).toFixed(1)),
          leading_indicator: b.leading_indicator_name,
          leading_actual: `${b.leading_actual}${b.leading_unit}`,
          thresholds: {
            scale_min: b.scale_min,
            change_min: b.change_min,
            stop_below: b.stop_below,
          },
          auto_decision: d.badge,
          recommended_action: d.recommendedAction,
        };
      });

      const betsSummary = {
        count: bets.length,
        total_net_incremental_target_inr: bets.reduce((s, b) => s + b.net_incremental_target_inr, 0),
        total_realized_incremental_inr: bets.reduce((s, b) => s + b.realized_incremental_inr, 0),
        total_budget_allocated_inr: bets.reduce((s, b) => s + b.budget_inr, 0),
        portfolio_budget_cap_inr: state.targets.budget_cap_inr,
        total_spent_inr: bets.reduce((s, b) => s + b.spent_inr, 0),
        decisions_breakdown: {
          SCALE: bets.filter((b) => b.auto_decision === 'SCALE').map((b) => b.id),
          CHANGE: bets.filter((b) => b.auto_decision === 'CHANGE').map((b) => b.id),
          STOP: bets.filter((b) => b.auto_decision === 'STOP').map((b) => b.id),
        },
        note: 'I1-I5 are the 5 Kolkata strategic growth initiatives layered on top of Base ₹17,23,800 to reach Stretch ₹30,98,542 (not separate historical channels).',
      };

      const historical = state.historical_channels.map((h) => ({
        ...h,
        opp_win_rate_pct:
          h.opportunities_created > 0
            ? Number(((h.confirmed_deals / h.opportunities_created) * 100).toFixed(1))
            : 0,
        total_confirmed_inr: h.confirmed_cash_inr + h.confirmed_inkind_inr,
      }));

      const warmRows = historical.filter((h) => h.tier_group === 'Warm/Inbound');
      const coldRows = historical.filter((h) => h.tier_group === 'Cold/Revival');
      const totalConfirmed = historical.reduce((s, h) => s + h.confirmed_deals, 0);
      const totalProps = historical.reduce((s, h) => s + h.proposals_sent, 0);
      const totalCashInr = historical.reduce((s, h) => s + h.confirmed_cash_inr, 0);
      const totalInkindInr = historical.reduce((s, h) => s + h.confirmed_inkind_inr, 0);

      const historicalSummary = {
        total_attempts: historical.reduce((s, h) => s + h.attempts, 0),
        total_opportunities: historical.reduce((s, h) => s + h.opportunities_created, 0),
        total_proposals_sent: totalProps,
        total_confirmed_deals: totalConfirmed,
        overall_proposal_to_confirmed_pct:
          totalProps > 0 ? Number(((totalConfirmed / totalProps) * 100).toFixed(1)) : 0,
        total_confirmed_cash_inr: totalCashInr,
        total_confirmed_inkind_inr: totalInkindInr,
        total_confirmed_value_inr: totalCashInr + totalInkindInr,
        warm_inbound_trio_SC02_SC04_SC05: {
          attempts: warmRows.reduce((s, h) => s + h.attempts, 0),
          confirmed_deals: warmRows.reduce((s, h) => s + h.confirmed_deals, 0),
          confirmed_cash_inr: warmRows.reduce((s, h) => s + h.confirmed_cash_inr, 0),
          confirmed_inkind_inr: warmRows.reduce((s, h) => s + h.confirmed_inkind_inr, 0),
        },
        cold_revival_trio_SC01_SC03_SC06: {
          attempts: coldRows.reduce((s, h) => s + h.attempts, 0),
          confirmed_deals: coldRows.reduce((s, h) => s + h.confirmed_deals, 0),
          confirmed_cash_inr: coldRows.reduce((s, h) => s + h.confirmed_cash_inr, 0),
        },
      };

      if (group === 'bets') return { result: { bets_summary: betsSummary, growth_bets: bets } };
      if (group === 'historical')
        return { result: { historical_summary: historicalSummary, historical_channels: historical } };
      return {
        result: {
          historical_summary: historicalSummary,
          bets_summary: betsSummary,
          historical_channels: historical,
          growth_bets: bets,
        },
      };
    }

    case 'diagnose_bottlenecks': {
      const m = computeOverviewMetrics(state);
      const funnel = computeFunnel(state);
      const warmChannels = state.historical_channels.filter((h) => h.tier_group === 'Warm/Inbound');
      const coldChannels = state.historical_channels.filter((h) => h.tier_group === 'Cold/Revival');
      const warmAttempts = warmChannels.reduce((s, h) => s + h.attempts, 0);
      const coldAttempts = coldChannels.reduce((s, h) => s + h.attempts, 0);
      const warmWins = warmChannels.reduce((s, h) => s + h.confirmed_deals, 0);
      const coldWins = coldChannels.reduce((s, h) => s + h.confirmed_deals, 0);

      const mediaLost = state.opportunities.filter(
        (o) => o.industry === 'Media' && o.stage === 'lost'
      );
      const totalLost = state.opportunities.filter((o) => o.stage === 'lost');
      const withdrawn = state.opportunities.filter((o) => o.stage === 'withdrawn');

      const stopBets = state.campaigns_bets
        .filter((b) => computeDecisionBadge(b).badge === 'STOP')
        .map((b) => ({ id: b.id, name: b.name, actual: b.leading_actual, stop_below: b.stop_below }));
      const changeBets = state.campaigns_bets
        .filter((b) => computeDecisionBadge(b).badge === 'CHANGE')
        .map((b) => ({ id: b.id, name: b.name, actual: b.leading_actual, scale_min: b.scale_min }));

      return {
        result: {
          worst_funnel_bottleneck: funnel.worstBottleneckStage,
          worst_drop_gap_pp: funnel.worstDropGapPct,
          cold_vs_warm_chasm: {
            warm_attempts: warmAttempts,
            warm_confirmed_deals: warmWins,
            cold_attempts: coldAttempts,
            cold_confirmed_deals: coldWins,
          },
          dropped_qualified_brands_unactioned: m.droppedQualifiedRemaining,
          non_qualified_opportunities_clogging_pipeline: m.nonQualifiedOppsCount,
          media_loss_concentration: {
            media_lost_count: mediaLost.length,
            total_lost_count: totalLost.length,
            share_of_losses_pct:
              totalLost.length > 0
                ? Number(((mediaLost.length / totalLost.length) * 100).toFixed(1))
                : 0,
          },
          post_signing_withdrawn_deals: withdrawn.map((w) => ({
            brand: w.brand_name,
            proposed_inr: w.proposed_value_inr,
          })),
          stalled_proposals_over_7_days: m.stalledProposalsCount,
          signed_vs_collected_gap_inr: m.uncollectedSignedCashInr,
          bets_needing_intervention: { stop: stopBets, change: changeBets },
        },
      };
    }

    case 'get_budget_status': {
      const m = computeOverviewMetrics(state);
      const suggestions = computeBudgetSuggestions(state);
      return {
        result: {
          budget_cap_inr: state.targets.budget_cap_inr,
          total_allocated_inr: m.totalAllocatedBudgetInr,
          total_spent_inr: m.totalBudgetSpentInr,
          remaining_unspent_inr: m.budgetRemainingInr,
          per_campaign: state.campaigns_bets.map((b) => ({
            id: b.id,
            name: b.name,
            decision: computeDecisionBadge(b).badge,
            budget_inr: b.budget_inr,
            spent_inr: b.spent_inr,
            unspent_inr: Math.max(0, b.budget_inr - b.spent_inr),
          })),
          reallocation_suggestions: suggestions,
        },
      };
    }

    case 'query_sponsors': {
      let rows = [...state.opportunities];
      if (args.industry) {
        const q = String(args.industry).toLowerCase();
        rows = rows.filter((r) => r.industry.toLowerCase().includes(q));
      }
      if (args.stage) {
        const q = String(args.stage).toLowerCase();
        rows = rows.filter((r) => r.stage.toLowerCase() === q);
      }
      if (args.campaign_id) {
        const q = String(args.campaign_id).toUpperCase();
        rows = rows.filter((r) => r.originating_campaign_id === q);
      }
      if (args.brand_name) {
        const q = String(args.brand_name).toLowerCase();
        rows = rows.filter((r) => r.brand_name.toLowerCase().includes(q));
      }
      const droppedMatches = state.dropped_qualified_brands.filter((d) => {
        if (args.industry && !d.industry.toLowerCase().includes(String(args.industry).toLowerCase()))
          return false;
        if (args.campaign_id && d.source_campaign_id !== String(args.campaign_id).toUpperCase())
          return false;
        if (args.brand_name && !d.brand_name.toLowerCase().includes(String(args.brand_name).toLowerCase()))
          return false;
        return !args.stage;
      });

      return {
        result: {
          matched_opportunities_count: rows.length,
          total_proposed_inr: rows.reduce((s, r) => s + r.proposed_value_inr, 0),
          total_confirmed_inr: rows.reduce((s, r) => s + r.confirmed_value_inr, 0),
          total_cash_collected_inr: rows.reduce((s, r) => s + r.cash_collected_inr, 0),
          opportunities: rows.slice(0, 20),
          dropped_qualified_brands_count: droppedMatches.length,
          dropped_qualified_brands: droppedMatches.slice(0, 12),
        },
      };
    }

    case 'get_what_changed': {
      const diff = computeWhatChanged(state, FROZEN_INITIAL_STATE);
      return {
        result: {
          diff_vs_frozen_original: diff,
          recent_change_log: state.change_log.slice(0, 8),
        },
      };
    }

    case 'list_tasks': {
      let tasks = [...state.tasks];
      if (args.status) tasks = tasks.filter((t) => t.status === args.status);
      if (args.owner) {
        const q = String(args.owner).toLowerCase();
        tasks = tasks.filter((t) => t.owner.toLowerCase().includes(q));
      }
      if (args.campaign_id) {
        tasks = tasks.filter((t) => t.campaign_id === String(args.campaign_id).toUpperCase());
      }
      return { result: { count: tasks.length, tasks } };
    }

    case 'propose_task': {
      const action: ProposedTaskAction = {
        type: 'create_task',
        title: String(args.title || 'Follow up on high-priority sponsorship bottleneck'),
        owner: String(args.owner || 'Kabir Shah'),
        deadline: String(args.deadline || '2025-03-29'),
        campaign_id: String(args.campaign_id || 'I2'),
        priority: (['high', 'medium', 'low'].includes(String(args.priority))
          ? String(args.priority)
          : 'high') as TaskPriority,
        reason: String(args.reason || 'Data-backed action from Growth Center diagnosis.'),
        status: 'pending',
      };
      return {
        result: {
          queued_for_user_confirmation: true,
          proposed_task: action,
          instruction:
            'Present this proposed task clearly to the user and ask them to click the Confirm button below the message to save it.',
        },
        proposedAction: action,
      };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

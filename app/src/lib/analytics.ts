import type {
  DecisionBadge,
  GrowthCampaignBet,
  GrowthCenterState,
} from '../types/growth';

export function formatINR(value: number): string {
  return '₹' + Math.round(value).toLocaleString('en-IN');
}

export function formatLakhs(value: number): string {
  const lakhs = value / 100000;
  return `₹${lakhs.toFixed(2)}L`;
}

export function computeDecisionBadge(bet: GrowthCampaignBet): {
  badge: DecisionBadge;
  recommendedAction: string;
  gapToScale: number;
} {
  if (bet.leading_actual >= bet.scale_min) {
    return {
      badge: 'SCALE',
      recommendedAction: bet.scale_action,
      gapToScale: 0,
    };
  }
  if (bet.leading_actual >= bet.change_min) {
    return {
      badge: 'CHANGE',
      recommendedAction: bet.change_action,
      gapToScale: Number((bet.scale_min - bet.leading_actual).toFixed(1)),
    };
  }
  return {
    badge: 'STOP',
    recommendedAction: bet.stop_action,
    gapToScale: Number((bet.scale_min - bet.leading_actual).toFixed(1)),
  };
}

export interface OverviewMetrics {
  confirmedTotalDeals: number;
  confirmedCashDeals: number;
  confirmedInkindDeals: number;
  confirmedCashSignedInr: number;
  confirmedCashCollectedInr: number;
  confirmedInkindInr: number;
  collectionRatePct: number;
  uncollectedSignedCashInr: number;
  openPipelineCount: number;
  openPipelineProposedInr: number;
  openQualifiedNegotiatingInr: number;
  openQualifiedProposalInr: number;
  projectedOutcomeInr: number;
  varianceVsBaseInr: number;
  varianceVsStretchInr: number;
  totalAllocatedBudgetInr: number;
  totalBudgetSpentInr: number;
  budgetRemainingInr: number;
  inventoryCashUsed: number;
  inventoryCashCap: number;
  droppedQualifiedRemaining: number;
  nonQualifiedOppsCount: number;
  coldMediaLossesCount: number;
  stalledProposalsCount: number;
}

export function computeOverviewMetrics(state: GrowthCenterState): OverviewMetrics {
  const confirmed = state.opportunities.filter((o) => o.stage === 'partner_confirmed');
  const confirmedCash = confirmed.filter((o) => o.support_type === 'cash');
  const confirmedInkind = confirmed.filter((o) => o.support_type === 'in_kind');

  const confirmedCashSignedInr = confirmedCash.reduce((s, o) => s + o.confirmed_value_inr, 0);
  const confirmedCashCollectedInr = confirmedCash.reduce((s, o) => s + o.cash_collected_inr, 0);
  const confirmedInkindInr = confirmedInkind.reduce((s, o) => s + o.confirmed_value_inr, 0);
  const collectionRatePct =
    confirmedCashSignedInr > 0 ? (confirmedCashCollectedInr / confirmedCashSignedInr) * 100 : 0;
  const uncollectedSignedCashInr = Math.max(0, confirmedCashSignedInr - confirmedCashCollectedInr);

  const openOpps = state.opportunities.filter(
    (o) => !['partner_confirmed', 'lost', 'withdrawn'].includes(o.stage)
  );
  const openPipelineProposedInr = openOpps.reduce((s, o) => s + o.proposed_value_inr, 0);

  const qualOpenCash = openOpps.filter(
    (o) => o.qualification_status === 'qualified' && o.support_type === 'cash'
  );
  const openQualifiedNegotiatingInr = qualOpenCash
    .filter((o) => o.stage === 'negotiating')
    .reduce((s, o) => s + o.proposed_value_inr, 0);
  const openQualifiedProposalInr = qualOpenCash
    .filter((o) => o.stage === 'proposal_sent')
    .reduce((s, o) => s + o.proposed_value_inr, 0);

  // Live deterministic projection reacting to BOTH opportunity pipeline & Phase 4 bet decisions
  const i1 = state.campaigns_bets.find((b) => b.id === 'I1');
  const i1Decision = i1 ? computeDecisionBadge(i1).badge : 'CHANGE';
  const recoveryFactor = i1Decision === 'SCALE' ? 0.65 : i1Decision === 'CHANGE' ? 0.45 : 0.25;
  const recoverableSignedCash = uncollectedSignedCashInr * recoveryFactor;

  const effectiveCollectionRatio = Math.min(0.95, Math.max(0.55, collectionRatePct / 100));
  const weightedOpenPipeline =
    (openQualifiedNegotiatingInr * 0.55 + openQualifiedProposalInr * 0.35) *
    effectiveCollectionRatio;

  const activeBetsUplift = state.campaigns_bets.reduce((sum, bet) => {
    const { badge } = computeDecisionBadge(bet);
    const unrealized = Math.max(0, bet.net_incremental_inr - bet.realized_incremental_inr);
    if (badge === 'SCALE') return sum + unrealized * 1.0;
    if (badge === 'CHANGE') return sum + unrealized * 0.5;
    return sum; // STOP contributes 0 further upside
  }, 0);

  const projectedOutcomeInr = Math.round(
    confirmedCashCollectedInr + recoverableSignedCash + weightedOpenPipeline + activeBetsUplift
  );

  const totalAllocatedBudgetInr = state.campaigns_bets.reduce((s, b) => s + b.budget_inr, 0);
  const totalBudgetSpentInr = state.campaigns_bets.reduce((s, b) => s + b.spent_inr, 0);

  const droppedQualifiedRemaining = state.dropped_qualified_brands.filter(
    (d) => !d.converted_to_opp
  ).length;
  const nonQualifiedOppsCount = state.opportunities.filter(
    (o) => o.qualification_status !== 'qualified'
  ).length;
  const coldMediaLossesCount = state.opportunities.filter(
    (o) => o.industry === 'Media' && o.stage === 'lost'
  ).length;
  const stalledProposalsCount = state.opportunities.filter(
    (o) =>
      ['proposal_sent', 'negotiating'].includes(o.stage) && o.days_in_stage > 7
  ).length;

  return {
    confirmedTotalDeals: confirmed.length,
    confirmedCashDeals: confirmedCash.length,
    confirmedInkindDeals: confirmedInkind.length,
    confirmedCashSignedInr,
    confirmedCashCollectedInr,
    confirmedInkindInr,
    collectionRatePct: Number(collectionRatePct.toFixed(1)),
    uncollectedSignedCashInr,
    openPipelineCount: openOpps.length,
    openPipelineProposedInr,
    openQualifiedNegotiatingInr,
    openQualifiedProposalInr,
    projectedOutcomeInr,
    varianceVsBaseInr: projectedOutcomeInr - state.targets.base_cash_collected_target_inr,
    varianceVsStretchInr: projectedOutcomeInr - state.targets.stretch_cash_collected_target_inr,
    totalAllocatedBudgetInr,
    totalBudgetSpentInr,
    budgetRemainingInr: Math.max(0, state.targets.budget_cap_inr - totalBudgetSpentInr),
    inventoryCashUsed: confirmedCash.length,
    inventoryCashCap: state.targets.inventory_cash_slots,
    droppedQualifiedRemaining,
    nonQualifiedOppsCount,
    coldMediaLossesCount,
    stalledProposalsCount,
  };
}

export interface FunnelStageRow {
  stage: string;
  actualCount: number;
  baseTarget: number;
  stretchTarget: number;
  actualConvFromPrevPct: number | null;
  stretchConvFromPrevPct: number | null;
  gapToStretch: number;
}

export function computeFunnel(state: GrowthCenterState): {
  stages: FunnelStageRow[];
  worstBottleneckStage: string;
  worstDropGapPct: number;
} {
  const overview = computeOverviewMetrics(state);
  const convertedDropped = state.dropped_qualified_brands.filter((d) => d.converted_to_opp).length;

  const prospectsActual = 180 + convertedDropped;
  const conversationsActual = 60 + convertedDropped;
  const proposalsActual = state.opportunities.filter((o) =>
    ['proposal_sent', 'negotiating', 'partner_confirmed', 'lost', 'withdrawn'].includes(o.stage)
  ).length;
  const signedTotalActual = overview.confirmedTotalDeals;
  const cashDealsActual = overview.confirmedCashDeals;

  const raw: Array<{
    stage: string;
    actualCount: number;
    baseTarget: number;
    stretchTarget: number;
  }> = [
    { stage: 'Prospects', actualCount: prospectsActual, baseTarget: 200, stretchTarget: 200 },
    { stage: 'Conversations', actualCount: conversationsActual, baseTarget: 65, stretchTarget: 72 },
    { stage: 'Proposals Sent', actualCount: proposalsActual, baseTarget: 52, stretchTarget: 63 },
    { stage: 'Net Signed Deals', actualCount: signedTotalActual, baseTarget: 26, stretchTarget: 34 },
    { stage: 'Cash Deals', actualCount: cashDealsActual, baseTarget: 22, stretchTarget: 30 },
  ];

  let worstStage = 'Proposals Sent -> Net Signed Deals';
  let worstGap = 0;

  const stages: FunnelStageRow[] = raw.map((row, idx) => {
    const prev = idx > 0 ? raw[idx - 1] : null;
    const actualConv = prev && prev.actualCount > 0 ? (row.actualCount / prev.actualCount) * 100 : null;
    const stretchConv =
      prev && prev.stretchTarget > 0 ? (row.stretchTarget / prev.stretchTarget) * 100 : null;
    if (actualConv !== null && stretchConv !== null) {
      const gap = stretchConv - actualConv;
      if (gap > worstGap) {
        worstGap = gap;
        worstStage = `${prev!.stage} -> ${row.stage}`;
      }
    }
    return {
      ...row,
      actualConvFromPrevPct: actualConv !== null ? Number(actualConv.toFixed(1)) : null,
      stretchConvFromPrevPct: stretchConv !== null ? Number(stretchConv.toFixed(1)) : null,
      gapToStretch: row.actualCount - row.stretchTarget,
    };
  });

  // Also check Pre-Fest Cash Collection gap vs 90% Stretch benchmark
  const collGap = 90.0 - overview.collectionRatePct;
  if (collGap > worstGap) {
    worstGap = collGap;
    worstStage = 'Signed Cash -> Pre-Fest Cash Collected';
  }

  return {
    stages,
    worstBottleneckStage: worstStage,
    worstDropGapPct: Number(worstGap.toFixed(1)),
  };
}

export interface BudgetReallocationSuggestion {
  fromCampaignId: string;
  fromCampaignName: string;
  fromBadge: DecisionBadge;
  toCampaignId: string;
  toCampaignName: string;
  suggestedAmountInr: number;
  rationale: string;
}

export function computeBudgetSuggestions(state: GrowthCenterState): BudgetReallocationSuggestion[] {
  const withBadges = state.campaigns_bets.map((b) => ({
    ...b,
    decision: computeDecisionBadge(b),
    unspent: Math.max(0, b.budget_inr - b.spent_inr),
  }));

  const donors = withBadges.filter((b) => b.decision.badge === 'STOP' && b.unspent > 0);
  const recipients = withBadges
    .filter((b) => b.decision.badge === 'SCALE')
    .sort((a, b) => b.rice_score - a.rice_score);

  const suggestions: BudgetReallocationSuggestion[] = [];
  if (donors.length > 0 && recipients.length > 0) {
    for (const donor of donors) {
      const topScale = recipients[0];
      const secondScale = recipients[1] ?? recipients[0];
      const splitA = Math.round(donor.unspent * 0.6);
      const splitB = donor.unspent - splitA;
      if (splitA > 0) {
        suggestions.push({
          fromCampaignId: donor.id,
          fromCampaignName: donor.name,
          fromBadge: donor.decision.badge,
          toCampaignId: topScale.id,
          toCampaignName: topScale.name,
          suggestedAmountInr: splitA,
          rationale: `${donor.id} is at ${donor.leading_actual}${donor.leading_unit} (<${donor.stop_below}${donor.leading_unit} STOP). Shift 60% of remaining unspent budget to #${topScale.rank} RICE ${topScale.id} (${topScale.leading_actual}${topScale.leading_unit} SCALE).`,
        });
      }
      if (splitB > 0 && secondScale.id !== topScale.id) {
        suggestions.push({
          fromCampaignId: donor.id,
          fromCampaignName: donor.name,
          fromBadge: donor.decision.badge,
          toCampaignId: secondScale.id,
          toCampaignName: secondScale.name,
          suggestedAmountInr: splitB,
          rationale: `Shift remaining 40% (${formatINR(splitB)}) from ${donor.id} to ${secondScale.id} to accelerate 24h inbound opp conversion.`,
        });
      }
    }
  }
  return suggestions;
}

export interface WhatChangedDiff {
  deltaCashCollectedInr: number;
  deltaSignedCashInr: number;
  deltaConfirmedDeals: number;
  deltaProjectedOutcomeInr: number;
  deltaBudgetSpentInr: number;
  deltaTasksCompleted: number;
  deltaDroppedConverted: number;
  badgeChanges: Array<{ id: string; name: string; was: DecisionBadge; now: DecisionBadge }>;
}

export function computeWhatChanged(
  current: GrowthCenterState,
  frozen: GrowthCenterState
): WhatChangedDiff {
  const curM = computeOverviewMetrics(current);
  const frzM = computeOverviewMetrics(frozen);

  const curDone = current.tasks.filter((t) => t.status === 'done').length;
  const frzDone = frozen.tasks.filter((t) => t.status === 'done').length;

  const badgeChanges: WhatChangedDiff['badgeChanges'] = [];
  for (const curBet of current.campaigns_bets) {
    const frzBet = frozen.campaigns_bets.find((b) => b.id === curBet.id);
    if (frzBet) {
      const was = computeDecisionBadge(frzBet).badge;
      const now = computeDecisionBadge(curBet).badge;
      if (was !== now) {
        badgeChanges.push({ id: curBet.id, name: curBet.name, was, now });
      }
    }
  }

  return {
    deltaCashCollectedInr: curM.confirmedCashCollectedInr - frzM.confirmedCashCollectedInr,
    deltaSignedCashInr: curM.confirmedCashSignedInr - frzM.confirmedCashSignedInr,
    deltaConfirmedDeals: curM.confirmedCashDeals - frzM.confirmedCashDeals,
    deltaProjectedOutcomeInr: curM.projectedOutcomeInr - frzM.projectedOutcomeInr,
    deltaBudgetSpentInr: curM.totalBudgetSpentInr - frzM.totalBudgetSpentInr,
    deltaTasksCompleted: curDone - frzDone,
    deltaDroppedConverted: frzM.droppedQualifiedRemaining - curM.droppedQualifiedRemaining,
    badgeChanges,
  };
}

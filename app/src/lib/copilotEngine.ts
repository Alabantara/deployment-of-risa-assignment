import type {
  ChatMessage,
  GrowthCenterState,
  ProposedTaskAction,
  ToolTraceItem,
} from '../types/growth';
import { formatINR } from './analytics';
import { COPILOT_TOOLS, executeToolCall } from './copilotTools';

export type LlmProvider = 'gemini_lite' | 'groq' | 'local_deterministic';

export interface CopilotConfig {
  provider: LlmProvider;
  geminiKey: string;
  geminiModel: string;
  groqKey: string;
  groqModel: string;
}

const SYSTEM_PROMPT = `You are the CampusFest Kolkata Growth Analyst & Copilot for Challenge B (Sponsorship Growth — North Star: Cash Collected Before Fest in INR).

STRICT GROUNDING & ARITHMETIC RULES:
1. NEVER calculate, sum, or divide numbers in your head! ALWAYS read pre-computed totals from the tool summary objects (e.g. historical_summary, bets_summary, observed_live_data, model_targets_and_projection).
2. NEVER tell the user "ask tool X" or "run get_overview_kpis". If you need KPIs, funnel, budget, or bottleneck context to answer completely, CALL those tools yourself in the same turn!
3. Distinguish clearly between:
   - Historical Channels (SC01–SC06): past acquisition channels from CampusFest 2025 dataset.
   - Growth Bets (I1–I5): the 5 prioritized Kolkata strategies (total portfolio budget cap ₹1,00,000, net incremental target ₹12,53,000) built to lift Base ₹17,23,800 toward Stretch ₹30,98,542.
4. HONEST UNCERTAINTY: If the user asks for metrics NOT in the database (sponsor satisfaction/NPS, Instagram impressions, social reach, bank UTR numbers), explicitly state: "The current dataset does not contain [X]..." and cite what related data IS available.
5. RESPONSE STRUCTURE: Keep every answer crisp, executive, and scannable:
   - Start with a 1–2 sentence direct takeaway.
   - Use at most ONE clean Markdown table (only when comparing 3+ items) OR 3–5 tight bullet points with exact ₹ numbers and IDs.
   - End with 1 concrete recommended action (and call propose_task when a concrete action item should be added to the board).`;

function previewJson(val: unknown): string {
  const s = JSON.stringify(val);
  return s.length > 220 ? s.slice(0, 217) + '...' : s;
}

export async function runCopilotTurn(
  userText: string,
  history: ChatMessage[],
  state: GrowthCenterState,
  config: CopilotConfig
): Promise<{
  reply: string;
  providerUsed: string;
  toolTraces: ToolTraceItem[];
  pendingAction?: ProposedTaskAction;
}> {
  const traces: ToolTraceItem[] = [];
  let pendingAction: ProposedTaskAction | undefined;

  // Use Gemini Lite if selected & key present
  if (config.provider === 'gemini_lite' && config.geminiKey.trim()) {
    const model = config.geminiModel.trim() || 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.geminiKey.trim())}`;

    const geminiTools = [
      {
        functionDeclarations: COPILOT_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];

    const contents: Array<Record<string, unknown>> = history.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: userText }] });

    for (let step = 0; step < 5; step++) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          tools: geminiTools,
          generationConfig: { temperature: 0.2 },
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Gemini API (${resp.status}): ${errBody.slice(0, 200)}`);
      }

      const data = await resp.json();
      const candidate = data?.candidates?.[0];
      const parts: Array<Record<string, unknown>> = candidate?.content?.parts ?? [];
      contents.push({ role: 'model', parts });

      const fnCalls = parts.filter((p) => p.functionCall);
      if (fnCalls.length === 0) {
        const textOut = parts
          .map((p) => (typeof p.text === 'string' ? p.text : ''))
          .join('\n')
          .trim();
        return {
          reply: textOut || 'No response generated.',
          providerUsed: `Gemini (${model})`,
          toolTraces: traces,
          pendingAction,
        };
      }

      const fnResponseParts: Array<Record<string, unknown>> = [];
      for (const p of fnCalls) {
        const fc = p.functionCall as { name: string; args?: Record<string, unknown> };
        const toolArgs = fc.args ?? {};
        const exec = executeToolCall(fc.name, toolArgs, state);
        if (exec.proposedAction) pendingAction = exec.proposedAction;
        traces.push({
          name: fc.name,
          args: toolArgs,
          resultPreview: previewJson(exec.result),
        });
        fnResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: exec.result },
          },
        });
      }
      contents.push({ role: 'user', parts: fnResponseParts });
    }
  }

  // Use Groq OpenAI-compatible Tool Calling if selected & key present
  if (config.provider === 'groq' && config.groqKey.trim()) {
    const model = config.groqModel.trim() || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const groqTools = COPILOT_TOOLS.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: userText },
    ];

    for (let step = 0; step < 5; step++) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groqKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools: groqTools,
          tool_choice: 'auto',
          temperature: 0.2,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Groq API (${resp.status}): ${errBody.slice(0, 200)}`);
      }

      const data = await resp.json();
      const msg = data?.choices?.[0]?.message;
      messages.push(msg);

      const toolCalls = msg?.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return {
          reply: String(msg?.content ?? '').trim() || 'No response generated.',
          providerUsed: `Groq (${model})`,
          toolTraces: traces,
          pendingAction,
        };
      }

      for (const tc of toolCalls) {
        const fnName = tc.function?.name as string;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          parsedArgs = {};
        }
        const exec = executeToolCall(fnName, parsedArgs, state);
        if (exec.proposedAction) pendingAction = exec.proposedAction;
        traces.push({
          name: fnName,
          args: parsedArgs,
          resultPreview: previewJson(exec.result),
        });
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(exec.result),
        });
      }
    }
  }

  // Deterministic Offline Tool Router (no API key yet — still uses actual tools!)
  return runLocalDeterministicCopilot(userText, state, traces);
}

function runLocalDeterministicCopilot(
  userText: string,
  state: GrowthCenterState,
  traces: ToolTraceItem[]
): {
  reply: string;
  providerUsed: string;
  toolTraces: ToolTraceItem[];
  pendingAction?: ProposedTaskAction;
} {
  const q = userText.toLowerCase();
  const call = (name: string, args: Record<string, unknown> = {}) => {
    const res = executeToolCall(name, args, state);
    traces.push({ name, args, resultPreview: previewJson(res.result) });
    return res;
  };

  // Unanswerable check
  if (
    q.includes('satisfaction') ||
    q.includes('nps') ||
    q.includes('impression') ||
    q.includes('instagram') ||
    q.includes('follower') ||
    q.includes('bank transaction') ||
    q.includes('utr')
  ) {
    const kpi = call('get_overview_kpis').result as Record<string, Record<string, unknown>>;
    return {
      reply:
        `**Insufficient Data (Honest Uncertainty):** The current Growth Center dataset does **not** contain sponsor satisfaction/NPS scores, social/ad impressions, or live bank UTR transaction logs.\n\n` +
        `What **is** observed in the live database:\n` +
        `- Confirmed Cash Signed: **${formatINR(Number(kpi.observed_live_data.confirmed_cash_signed_inr))}** across **${kpi.observed_live_data.confirmed_cash_deals}** cash deals.\n` +
        `- Simulated Pre-Fest Cash Collected (at ${kpi.observed_live_data.collection_rate_pct}% collection): **${formatINR(Number(kpi.observed_live_data.confirmed_cash_collected_inr))}**.\n\n` +
        `*(Running in Offline Tool Mode — add a Gemini Lite or Groq API key in Settings for full LLM reasoning.)*`,
      providerUsed: 'Local Tool Mode (Add Gemini Lite / Groq key)',
      toolTraces: traces,
    };
  }

  // Why behind target / bottleneck / task workflow
  if (
    q.includes('behind') ||
    q.includes('bottleneck') ||
    q.includes('why') ||
    q.includes('create task') ||
    q.includes('recommend')
  ) {
    const kpi = call('get_overview_kpis').result as {
      observed_live_data: Record<string, number>;
      model_targets_and_projection: Record<string, number>;
    };
    const diag = call('diagnose_bottlenecks').result as {
      worst_funnel_bottleneck: string;
      dropped_qualified_brands_unactioned: number;
      media_loss_concentration: { media_lost_count: number; total_lost_count: number };
      signed_vs_collected_gap_inr: number;
      bets_needing_intervention: {
        stop: Array<{ id: string; name: string; actual: number; stop_below: number }>;
        change: Array<{ id: string; name: string; actual: number; scale_min: number }>;
      };
    };
    const bdg = call('get_budget_status').result as {
      reallocation_suggestions: Array<{ fromCampaignId: string; toCampaignId: string; suggestedAmountInr: number }>;
    };

    const stopBet = diag.bets_needing_intervention.stop[0];
    const changeBet = diag.bets_needing_intervention.change[0];
    const proposed = call('propose_task', {
      title: stopBet
        ? `Reallocate ₹20k from ${stopBet.id} (STOP) & convert ${diag.dropped_qualified_brands_unactioned} dropped SC04/SC05 leads`
        : `Convert ${diag.dropped_qualified_brands_unactioned} dropped qualified brands into proposals`,
      owner: 'Kabir Shah',
      deadline: '2025-03-29',
      campaign_id: 'I2',
      priority: 'high',
      reason: `Projected outcome (${formatINR(kpi.model_targets_and_projection.projected_outcome_inr)}) is ${formatINR(Math.abs(kpi.model_targets_and_projection.variance_vs_stretch_inr))} below Stretch target due to ${diag.worst_funnel_bottleneck}.`,
    });

    const lines = [
      `**Live Diagnosis (Computed via 4 Tools):**`,
      `- **Target Gap:** Live Projected Outcome is **${formatINR(kpi.model_targets_and_projection.projected_outcome_inr)}** vs. Stretch Target **${formatINR(kpi.model_targets_and_projection.stretch_target_inr)}** (**${formatINR(kpi.model_targets_and_projection.variance_vs_stretch_inr)}** variance).`,
      `- **Worst Bottleneck:** \`${diag.worst_funnel_bottleneck}\`, plus **${diag.dropped_qualified_brands_unactioned} qualified brands** still waiting without an opportunity and **${formatINR(diag.signed_vs_collected_gap_inr)}** uncollected signed cash.`,
      `- **Experiment Signals:** ${stopBet ? `**${stopBet.id}** is in **STOP** (${stopBet.actual}% < ${stopBet.stop_below}%)` : 'No STOP bets'}; ${changeBet ? `**${changeBet.id}** is in **CHANGE** (${changeBet.actual}% vs ${changeBet.scale_min}% scale).` : ''}`,
    ];
    if (bdg.reallocation_suggestions.length > 0) {
      const s = bdg.reallocation_suggestions[0];
      lines.push(
        `- **Recommended Shift:** Move **${formatINR(s.suggestedAmountInr)}** unspent from **${s.fromCampaignId}** to **${s.toCampaignId}**.`
      );
    }
    lines.push(`\nI've drafted a high-priority task below — click **Confirm & Create Task** to add it to the Execute board.`);

    return {
      reply: lines.join('\n'),
      providerUsed: 'Local Tool Mode (Add Gemini Lite / Groq key)',
      toolTraces: traces,
      pendingAction: proposed.proposedAction,
    };
  }

  // What changed
  if (q.includes('change') || q.includes('delta') || q.includes('reset')) {
    const chg = call('get_what_changed').result as {
      diff_vs_frozen_original: {
        deltaCashCollectedInr: number;
        deltaProjectedOutcomeInr: number;
        deltaDroppedConverted: number;
        deltaTasksCompleted: number;
      };
    };
    const d = chg.diff_vs_frozen_original;
    return {
      reply:
        `**Changes vs. Frozen Original Snapshot:**\n` +
        `- Δ Cash Collected: **${formatINR(d.deltaCashCollectedInr)}**\n` +
        `- Δ Projected Outcome: **${formatINR(d.deltaProjectedOutcomeInr)}**\n` +
        `- Dropped Qualified Brands Converted: **${d.deltaDroppedConverted}**\n` +
        `- Tasks Completed: **${d.deltaTasksCompleted}**`,
      providerUsed: 'Local Tool Mode (Add Gemini Lite / Groq key)',
      toolTraces: traces,
    };
  }

  // Default overview + campaigns
  const kpi = call('get_overview_kpis').result as {
    observed_live_data: Record<string, number>;
    model_targets_and_projection: Record<string, number>;
  };
  const cmp = call('compare_campaigns', { group: 'bets' }).result as {
    growth_bets: Array<{ id: string; auto_decision: string; leading_actual: string; budget_inr: number }>;
  };
  return {
    reply:
      `**Live Growth Center Snapshot:**\n` +
      `- **Cash Collected Before Fest:** ${formatINR(kpi.observed_live_data.confirmed_cash_collected_inr)} (${kpi.observed_live_data.collection_rate_pct}% of ${formatINR(kpi.observed_live_data.confirmed_cash_signed_inr)} signed cash)\n` +
      `- **Projected Outcome:** ${formatINR(kpi.model_targets_and_projection.projected_outcome_inr)} (Base: ${formatINR(kpi.model_targets_and_projection.base_target_inr)} | Stretch: ${formatINR(kpi.model_targets_and_projection.stretch_target_inr)})\n` +
      `- **Bet Decisions:** ${cmp.growth_bets.map((b) => `${b.id}: **${b.auto_decision}** (${b.leading_actual})`).join(' · ')}\n\n` +
      `*Tip: Paste your Gemini Lite or Groq API key in the top-right **AI & DB Setup** drawer to unlock full conversational tool-calling.*`,
    providerUsed: 'Local Tool Mode (Add Gemini Lite / Groq key)',
    toolTraces: traces,
  };
}

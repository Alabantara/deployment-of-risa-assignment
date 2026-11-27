import React, { useState } from 'react';
import {
  Bot,
  Send,
  Wrench,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  ChatMessage,
  ExecutionTask,
  GrowthCenterState,
  ProposedTaskAction,
} from '../types/growth';
import { runCopilotTurn, type CopilotConfig } from '../lib/copilotEngine';
import { MarkdownText } from './MarkdownText';

interface CopilotPanelProps {
  state: GrowthCenterState;
  config: CopilotConfig;
  onConfirmTask: (task: ExecutionTask) => Promise<void>;
  onOpenSettings: () => void;
}

const DEMO_PROMPTS = [
  'Why are we behind our stretch target? Diagnose bottlenecks and propose a task.',
  'Compare SC01-SC06 historical channels vs I1-I5 growth bets.',
  'What is our Media category win rate and why did those deals fail?',
  'What was our sponsor satisfaction NPS score last year?',
];

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  state,
  config,
  onConfirmTask,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content:
        'Hi! I am your **CampusFest Kolkata Growth Copilot** (Challenge B). I query your live database via deterministic tools — ask me why we are behind target, compare campaigns, check cash collection, or draft tasks.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});

  const sendMessage = async (textToSend?: string) => {
    const q = (textToSend ?? input).trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const res = await runCopilotTurn(q, nextHistory, state, config);
      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        provider: res.providerUsed,
        toolTraces: res.toolTraces,
        pendingAction: res.pendingAction,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `**API Error:** ${errMsg}\n\nCheck your API key or switch provider in **AI & DB Setup**.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionDecision = async (msgId: string, action: ProposedTaskAction, accept: boolean) => {
    if (accept) {
      const newTask: ExecutionTask = {
        id: `TSK-${String(state.tasks.length + 1).padStart(2, '0')}`,
        title: action.title,
        campaign_id: action.campaign_id,
        owner: action.owner,
        deadline: action.deadline,
        status: 'todo',
        priority: action.priority,
        notes: `AI Copilot confirmed: ${action.reason}`,
      };
      await onConfirmTask(newTask);
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.pendingAction
          ? {
              ...m,
              pendingAction: {
                ...m.pendingAction,
                status: accept ? 'confirmed' : 'cancelled',
              },
            }
          : m
      )
    );
  };

  const activeProviderLabel =
    config.provider === 'gemini_lite' && config.geminiKey
      ? `Gemini (${config.geminiModel || 'gemini-2.5-flash-lite'})`
      : config.provider === 'groq' && config.groqKey
      ? `Groq (${config.groqModel || 'llama-3.3-70b-versatile'})`
      : 'Local Tool Mode (Click Setup for Gemini/Groq)';

  return (
    <aside className="flex h-[calc(100vh-5.5rem)] flex-col rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-1.5 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">AI Growth Copilot</h2>
            <button
              onClick={onOpenSettings}
              className="text-[11px] font-medium text-blue-600 hover:underline"
            >
              {activeProviderLabel}
            </button>
          </div>
        </div>
        <button
          onClick={() => setMessages(messages.slice(0, 1))}
          title="Clear chat session"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <Sparkles className="h-3 w-3 text-blue-600" /> Demo & Test Prompts
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-[11px] text-slate-700 hover:border-blue-300 hover:bg-blue-50"
            >
              {p.length > 44 ? p.slice(0, 42) + '...' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[95%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'whitespace-pre-wrap bg-slate-900 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              {m.role === 'user' ? m.content : <MarkdownText content={m.content} />}
            </div>

            {/* Tool-Call Audit Trace */}
            {m.toolTraces && m.toolTraces.length > 0 && (
              <div className="mt-1 w-full max-w-[92%]">
                <button
                  onClick={() =>
                    setExpandedTraces((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                  }
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  <Wrench className="h-3 w-3" />
                  {m.toolTraces.length} tool call{m.toolTraces.length > 1 ? 's' : ''} executed in code
                  {expandedTraces[m.id] ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                {expandedTraces[m.id] && (
                  <div className="mt-1 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-[10px] font-mono text-slate-600">
                    {m.toolTraces.map((tr, i) => (
                      <div key={i}>
                        <span className="font-bold text-blue-700">
                          {tr.name}({JSON.stringify(tr.args)})
                        </span>
                        <div className="truncate text-slate-500">{tr.resultPreview}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation Card for Write Action */}
            {m.pendingAction && (
              <div className="mt-2 w-full max-w-[92%] rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs">
                <div className="font-bold text-blue-950">Proposed Task Confirmation</div>
                <div className="mt-1 text-slate-800">
                  <strong>Title:</strong> {m.pendingAction.title}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-600">
                  Owner: <strong>{m.pendingAction.owner}</strong> · Campaign:{' '}
                  <strong>{m.pendingAction.campaign_id}</strong> · Due:{' '}
                  <strong>{m.pendingAction.deadline}</strong>
                </div>
                <div className="mt-1 text-[11px] text-slate-600">{m.pendingAction.reason}</div>

                {m.pendingAction.status === 'pending' ? (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => handleActionDecision(m.id, m.pendingAction!, true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Create Task
                    </button>
                    <button
                      onClick={() => handleActionDecision(m.id, m.pendingAction!, false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] font-bold text-emerald-700">
                    {m.pendingAction.status === 'confirmed'
                      ? 'Confirmed & added to Execute board!'
                      : 'Cancelled — no changes written.'}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-xs italic text-slate-500">Running database tools & reasoning...</div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about bottlenecks, deals, thresholds, or tasks..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </aside>
  );
};

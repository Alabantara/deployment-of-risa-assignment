import React from 'react';
import { X, Database, KeyRound } from 'lucide-react';
import type { CopilotConfig, LlmProvider } from '../lib/copilotEngine';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: CopilotConfig;
  onSaveConfig: (next: CopilotConfig) => void;
  storageMode: 'supabase' | 'local';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  config,
  onSaveConfig,
  storageMode,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">AI Copilot & Database Setup</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Storage status */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-700" />
              <div>
                <div className="font-semibold text-slate-900">
                  Persistence: {storageMode === 'supabase' ? 'Supabase Postgres Connected' : 'Local Browser Store (Demo Mode)'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Configure VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in app/.env.local to sync with Postgres.
                </div>
              </div>
            </div>
          </div>

          {/* Provider selector */}
          <div>
            <label className="mb-1 block font-semibold text-slate-700">AI Tool-Calling Provider</label>
            <select
              value={config.provider}
              onChange={(e) =>
                onSaveConfig({ ...config, provider: e.target.value as LlmProvider })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="gemini_lite">Google Gemini Lite (Recommended — gemini-2.5-flash-lite)</option>
              <option value="groq">Groq API (OpenAI-Compatible — llama-3.3-70b-versatile)</option>
              <option value="local_deterministic">Local Deterministic Tool Mode (No API Key Needed)</option>
            </select>
          </div>

          {config.provider === 'gemini_lite' && (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Gemini API Key (Google AI Studio)</label>
                <input
                  type="password"
                  placeholder="AIza..."
                  value={config.geminiKey}
                  onChange={(e) => onSaveConfig({ ...config, geminiKey: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Gemini Lite Model</label>
                <select
                  value={config.geminiModel}
                  onChange={(e) => onSaveConfig({ ...config, geminiModel: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Default Lite)</option>
                  <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                </select>
              </div>
            </div>
          )}

          {config.provider === 'groq' && (
            <div className="space-y-3 rounded-lg border border-orange-100 bg-orange-50/50 p-3">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Groq API Key (console.groq.com)</label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={config.groqKey}
                  onChange={(e) => onSaveConfig({ ...config, groqKey: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Groq Model</label>
                <select
                  value={config.groqModel}
                  onChange={(e) => onSaveConfig({ ...config, groqModel: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Best Tool Calling)</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Ultra Fast)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

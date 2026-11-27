# Phase 5 & Phase 6 Setup Guide, AI Copilot Architecture & 25-Question Test Suite

## 1. Architecture Overview
* **Frontend & Analytics:** React + TypeScript + Vite + Tailwind CSS + Recharts in [app/](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/).
* **Persistence Layer:** Supabase Postgres ([schema.sql](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/supabase/schema.sql), [seed.sql](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/supabase/seed.sql)) with automatic `localStorage` fallback for instant offline/local evaluation and a **Reset to Original** button backed by `gc_frozen_snapshot`.
* **AI Copilot (Phase 6):** Multi-provider tool-calling engine ([copilotEngine.ts](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/src/lib/copilotEngine.ts), [copilotTools.ts](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/src/lib/copilotTools.ts)) executing **9 deterministic TypeScript tools** (`get_overview_kpis`, `get_funnel`, `compare_campaigns`, `diagnose_bottlenecks`, `get_budget_status`, `query_sponsors`, `get_what_changed`, `list_tasks`, `propose_task`). All math happens in TypeScript; write actions require explicit user confirmation.

---

## 2. Step-by-Step Setup: Supabase (Persistence + Frozen Snapshot)

1. **Create a free Supabase project:**
   * Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New Project** → name it `campusfest-kolkata-growth` (region: `Mumbai (ap-south-1)` for lowest latency).
2. **Create the database tables:**
   * Open **SQL Editor** in the Supabase sidebar → **New Query**.
   * Copy the full contents of [app/supabase/schema.sql](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/supabase/schema.sql) and click **Run**.
   * This creates `gc_targets`, `gc_campaigns`, `gc_historical_channels`, `gc_opportunities`, `gc_dropped_qualified_brands`, `gc_tasks`, `gc_change_log`, and `gc_frozen_snapshot` with RLS enabled.
3. **Seed the cleaned dataset + frozen original snapshot:**
   * Open a new **SQL Editor** tab.
   * Copy the full contents of [app/supabase/seed.sql](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/supabase/seed.sql) and click **Run**.
   * Verify `58` rows in `gc_opportunities`, `18` in `gc_dropped_qualified_brands`, `6` in `gc_historical_channels`, `5` in `gc_campaigns`, `6` in `gc_tasks`, and `1` `'original'` row in `gc_frozen_snapshot`.
4. **Copy your API credentials:**
   * Go to **Project Settings → API** (or **Data API**).
   * Copy **Project URL** and **anon / public key** into `app/.env.local`:
     ```env
     VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
     VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
     ```
   * When the app loads, the top-right pill will switch from `Local Demo Store` to **`Supabase Connected`**.

---

## 3. Step-by-Step Setup: Gemini Lite & Groq API (AI Copilot)

You can configure **either or both** providers via `app/.env.local` OR directly inside the app's **AI & DB Setup** modal at runtime!

### Option A — Google Gemini Lite (`gemini-2.5-flash-lite` — Default)
1. Visit [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and click **Create API Key** (free tier available).
2. Add to `app/.env.local` (or paste into the **AI & DB Setup** drawer in the UI):
   ```env
   VITE_DEFAULT_LLM_PROVIDER=gemini_lite
   VITE_GEMINI_API_KEY=AIzaSy...
   VITE_GEMINI_MODEL=gemini-2.5-flash-lite
   ```
   *(Also supports `gemini-2.0-flash-lite` and `gemini-2.5-flash` in the model dropdown.)*

### Option B — Groq API (Ultra-Fast OpenAI-Compatible Tool Calling)
1. Visit [https://console.groq.com/keys](https://console.groq.com/keys) and click **Create API Key**.
2. Add to `app/.env.local` (or switch provider to **Groq API** inside **AI & DB Setup**):
   ```env
   VITE_DEFAULT_LLM_PROVIDER=groq
   VITE_GROQ_API_KEY=gsk_...
   VITE_GROQ_MODEL=llama-3.3-70b-versatile
   ```
   *(You can also switch between `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` in the UI.)*

### Run Locally & Deploy to Vercel
```bash
cd app
npm install
npm run dev
```
To deploy to **Vercel**:
1. Import the repo in Vercel and set **Root Directory** to `app`.
2. Add the same `VITE_SUPABASE_*` and `VITE_GEMINI_*` / `VITE_GROQ_*` environment variables in Vercel Project Settings.
3. Build command: `npm run build`, Output directory: `dist` (SPA routing configured in [vercel.json](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/app/vercel.json)).

---

## 4. Complete End-to-End Demo Workflow (For Live Recording / Evaluation)

1. **Ask:** *"Why are we behind our stretch target? Diagnose bottlenecks and propose a task."*
2. **Observe Tool Execution:** Expand the **"4 tool calls executed in code"** dropdown (`get_overview_kpis`, `diagnose_bottlenecks`, `get_budget_status`, `propose_task`).
3. **Copilot Diagnosis:** Reports current Projected Outcome (`₹25,93,625` vs Stretch `₹30,98,542`), highlights `I5` hitting **STOP** (`35% < 40%`), `I3` in **CHANGE** (`27%` vs `40%`), `18` dropped qualified brands, and `₹5,00,000` uncollected signed cash.
4. **Human-in-the-Loop Confirmation:** Click **"Confirm & Create Task"** on the proposed task card.
5. **Verify Persistence & Live Update:** Switch to **Execute → Action Items** to see the new task persisted, and check **Diagnose → What Changed** to see the `AI Copilot (Confirmed)` audit entry.
6. **Test Reset:** Click **Reset to Original** in the top bar to verify clean restoration to the frozen baseline.

---

## 5. 25-Question AI Copilot Evaluation Test Suite

### Category A — Direct Lookups (Questions 1–4)
1. *"What is our current confirmed cash signed and confirmed cash collected before the fest?"* → Expect `₹20,00,000` signed across `20` cash deals and `₹15,00,000` (`75.0%`) collected.
2. *"Which brand had a deal confirmed and later withdrawn, and for how much?"* → Expect `Cobalt Learning` (`O006`, `Education`, `₹80,000` proposed/confirmed before withdrawing).
3. *"List all opportunities in the Media industry and their current stages."* → Expect `10` Media opps (`4` partner_confirmed via warm/inbound at `₹35k–₹95k`, `6` lost via cold/revival at `₹1.25L`).
4. *"Who owns campaign I3 and what is its current leading indicator?"* → Expect `Riya Kapoor`, `27%` Exclusivity/Title shortlist rate (`CHANGE` band).

### Category B — Calculations (Questions 5–8)
5. *"What is the average cash deal size vs. average in-kind deal size on confirmed partnerships?"* → Expect `₹1,00,000` cash (`₹20,00,000 / 20`) vs `₹60,000` in-kind (`₹2,40,000 / 4`).
6. *"How much unspent budget remains on I5, and what is our total spent vs the ₹1,00,000 cap?"* → Expect `₹20,000` unspent on `I5` (`₹42,000 - ₹22,000`); `₹54,000` total spent across `I1–I5`, `₹46,000` remaining vs `₹1,00,000` cap.
7. *"What percentage of our 32 cash inventory slots are currently filled?"* → Expect `20 / 32 = 62.5%`.
8. *"If we shift all unspent funds from STOP campaigns into our top two SCALE campaigns, how much moves where?"* → Expect `₹20,000` from `I5` split `₹12,000` (`60%`) to `I1` and `₹8,000` (`40%`) to `I2`.

### Category C — Comparisons (Questions 9–12)
9. *"Compare Warm/Inbound channels (SC02, SC04, SC05) against Cold/Revival channels (SC01, SC03, SC06)."* → Expect `48` attempts → `24` wins (`₹22.40L`) vs `322` attempts → `0` wins.
10. *"Which of our 5 growth bets (I1–I5) has the highest RICE score vs. highest budget?"* → Expect `I1` highest RICE (`32.40`, `₹12k` budget) vs `I5` highest budget (`₹42k`, lowest RICE `11.90`).
11. *"Compare Beardo's two opportunities."* → Expect `O001` (`partner_confirmed`, `₹2,00,000` cash) vs `O002` additional sampling (`lost`, `₹30,000`).
12. *"Which campaign has the most open tasks right now?"* → Calls `list_tasks()` and compares open counts across `I1–I5`.

### Category D — Diagnosis & Recommendations (Questions 13–16)
13. *"Why did we beat the 55-qualified-brands target (60) yet miss the 28-confirmed-deals target (24)?"* → Cites `18` dropped qualified brands (`12` from `SC04/SC05`), `15` premature non-qualified opps, and `0/33` cold closes.
14. *"What is our worst funnel bottleneck right now?"* → Calls `get_funnel()` & `diagnose_bottlenecks()`, flags `Signed Cash -> Pre-Fest Cash Collected` / `Proposals Sent -> Net Signed Deals`.
15. *"Which campaign should we STOP or CHANGE immediately, and what exact action is triggered?"* → Cites `I5` (`35% < 40%` **STOP**: freeze `₹25k+` spend, reallocate to `I2/I3`) and `I3` (`27%` **CHANGE**: split `₹4L` Title into `2× ₹2.25L` Co-Titles).
16. *"Create a high-priority task for Riya Kapoor to launch the 2x ₹2.25L Co-Title pitch by 2025-03-31."* → Calls `propose_task()` and waits for user confirmation without writing prematurely.

### Category E — Follow-Up Memory (Questions 17–19)
17. *(Follow-up to Q3):* *"Out of those Media losses, which campaigns originated them?"* → References the `6` Media losses (`SC01`: 2, `SC03`: 2, `SC06`: 2) from session context.
18. *(Follow-up to Q15):* *"If we reallocate I5's unspent budget to I2, who owns I2 and what tasks do they already have?"* → Identifies `Kabir Shah` and lists `TSK-01`, `TSK-05`.
19. *(Follow-up to Q16):* *"Actually make the deadline 2025-04-02 instead and propose it again."* → Updates `propose_task()` deadline to `2025-04-02`.

### Category F — Honest Uncertainty / Unanswerable (Questions 20–22)
20. *"What was our sponsor NPS or satisfaction score from last year's fest?"* → Must state the dataset does **not** contain sponsor satisfaction/NPS scores.
21. *"How many Instagram impressions did Beardo's creator activation generate?"* → Must state social/ad impressions are **not** in the dataset (and note `Sponsor activations` explicitly warns associations do not measure causal uplift).
22. *"Which bank UTR reference number cleared Harbor Beverages' payment?"* → Must state bank transaction logs/UTR numbers are **not** present (`Harbor Beverages` is `in_kind`, `₹1,00,000`, and cash collection is a model tracking field).

### Category G — Live Data Mutation + Re-Ask Tests (Questions 23–25)
23. **Edit in Execute:** Convert `3` dropped `SC04` qualified brands (`Prop ₹95k`) → **Re-Ask:** *"How many dropped qualified brands remain and what changed?"* → Must reflect `15` remaining (`-3` converted) and updated funnel proposals (`49`).
24. **Edit in Decide:** Slide `I5` leading indicator from `35%` → `70%` → **Re-Ask:** *"What is I5's status now?"* → Must flip from `STOP` to **`SCALE`** and reflect increased `Projected Outcome`.
25. **Edit in Execute:** Move `Evergreen Pantry` (`O048`, `₹90,000`) to `partner_confirmed` with `₹90,000` cash collected → **Re-Ask:** *"What is our new pre-fest cash collected and collection rate?"* → Must report `₹15,90,000` collected across `21` cash deals (`76.1%` of `₹20,90,000`).
